/**
 * Accessibility check for the showcase page: `npm run a11y` (builds it first).
 *
 * In each theme it loads the built showcase in headless Firefox and runs two checks:
 *
 * 1. axe (WCAG 2.2 A/AA rules): labels, roles, ARIA, contrast where axe can measure it, and so on.
 * 2. A pixel-based text contrast check. axe gives up on text over translucent washes and gradients, so this one measures the
 *    background that was actually drawn: it screenshots the page with all text made transparent, samples the pixels behind
 *    each run of text, and compares the text colour against the worst one.
 *
 * Exits with code 1 if either check finds a problem, so it can gate a release. Ported from the retired styleStandards kit.
 * First run on a machine: `npx playwright install firefox`.
 */
import { preview } from "vite";
import { firefox } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";

/**
 * The runs: each theme once. Each run is the localStorage a returning visitor would have; the showcase reads "theme" before
 * its first paint (showcase/index.html).
 */
const RUNS = [
  { name: "light", storage: { theme: "light" } },
  { name: "dark", storage: { theme: "dark" } },
];

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const VIEWPORT = { width: 1280, height: 900 };

/** The widths the header's notifications bell is checked at: both sides of the 900px breakpoint and the narrowest phones. */
const BELL_WIDTHS = [320, 375, 899, 900, 1280];

/** WCAG minimums: 4.5:1 for normal text, 3:1 for large text. */
const MIN_RATIO_NORMAL = 4.5;
const MIN_RATIO_LARGE = 3;

/* ---------------------------------------------------------------------------
   Color math (WCAG 2 definitions)
   --------------------------------------------------------------------------- */

/** Relative luminance of an [r, g, b] color with 0-255 channels. */
function luminance([r, g, b]) {
  const linearize = (channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio between two opaque colors, from 1 (none) to 21 (black on white). */
function contrastRatio(colorA, colorB) {
  const lumA = luminance(colorA);
  const lumB = luminance(colorB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/** The opaque color you see when `foreground` at `alpha` is painted over `background`. */
function blend(foreground, alpha, background) {
  return foreground.map((channel, i) => channel * alpha + background[i] * (1 - alpha));
}

/** Formats an [r, g, b] color as #rrggbb for the report. */
function toHex(color) {
  const pairs = color.map((channel) => Math.round(channel).toString(16).padStart(2, "0"));
  return "#" + pairs.join("");
}

/* ---------------------------------------------------------------------------
   Page setup
   --------------------------------------------------------------------------- */

/** Turns { key: value } into [key, text] pairs; non-string values are stored as JSON. */
function toStorageEntries(storage) {
  return Object.entries(storage).map(([key, value]) => {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return [key, text];
  });
}

/**
 * Opens a page with preset localStorage, the same way a returning visitor would
 * arrive: storage is set before the page's own scripts run.
 */
async function openPage(browser, url, storage) {
  // Reduced motion: the kit then makes transitions instant, so colors are final sooner.
  const context = await browser.newContext({ viewport: VIEWPORT, reducedMotion: "reduce" });
  const entries = toStorageEntries(storage);
  await context.addInitScript((pairs) => {
    for (const [key, text] of pairs) localStorage.setItem(key, text);
  }, entries);
  const page = await context.newPage();
  // Wait for the network to go quiet: apps may show a loading screen until images arrive.
  await page.goto(url, { waitUntil: "networkidle" });
  await waitUntilSettled(page);
  return { context, page };
}

/**
 * Waits until fonts are loaded and nothing is animating. Checking mid-transition measures
 * colors that are still fading in (e.g. an app-wide `transition: color 0.3s`), which reports
 * contrast failures that no user would ever see.
 */
async function waitUntilSettled(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running"), null, {
    timeout: 10_000,
  });
}

/* ---------------------------------------------------------------------------
   Check 1: axe
   --------------------------------------------------------------------------- */

/**
 * Runs axe and returns report lines plus the number of failing elements.
 * Contrast results axe couldn't decide are left to the pixel check.
 */
async function runAxe(page) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const lines = [];
  let count = 0;
  for (const violation of results.violations) {
    count += violation.nodes.length;
    lines.push(`[${violation.impact}] ${violation.id}: ${violation.help} (${violation.nodes.length} element(s))`);
    for (const node of violation.nodes.slice(0, 8)) {
      lines.push(`    ${node.target.join(" ")}`);
    }
  }
  return { lines, count };
}

/* ---------------------------------------------------------------------------
   Check 2: pixel-based text contrast
   --------------------------------------------------------------------------- */

/**
 * Collects every visible run of text on the page (one per text node) with
 * what the contrast check needs: its color, how opaque it really is (its own
 * alpha times every ancestor's opacity), whether it counts as large text, and
 * its box in page coordinates.
 *
 * Skipped, as WCAG allows: disabled controls and their labels. Also skipped:
 * gradient-filled text (.textHero), which has no single text color to test.
 */
function collectTextRuns() {
  /** Parses a computed color into [r, g, b] (0-255) and alpha (0-1). */
  function parseColor(value) {
    const numbers = value.match(/[\d.]+/g).map(Number);
    const rgb = numbers.slice(0, 3);
    // color-mix() results come back as color(srgb r g b) with 0-1 channels.
    const isUnitScale = value.startsWith("color(srgb");
    const rgb255 = isUnitScale ? rgb.map((channel) => channel * 255) : rgb;
    const alpha = numbers[3] ?? 1;
    return { rgb: rgb255, alpha };
  }

  /**
   * How opaque text really is: its colour's own alpha times the opacity of the element and every ancestor, since a faded
   * group (a disabled-looking row, an idle phase) uses opacity on a container rather than on the text.
   */
  function effectiveOpacity(element, alpha) {
    let opacity = alpha;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      opacity *= Number(getComputedStyle(ancestor).opacity);
    }
    return opacity;
  }

  /** Whether text counts as WCAG "large text", which needs only 3:1: 24px, or 18.66px (14pt) when bold. */
  function isLargeText(style) {
    const fontSize = parseFloat(style.fontSize);
    const isBold = Number(style.fontWeight) >= 700;
    return fontSize >= 24 || (fontSize >= 18.66 && isBold);
  }

  const runs = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    const text = textNode.textContent.trim();
    if (!text) continue;

    const element = textNode.parentElement;
    const label = element.closest("label");
    const isInsideDisabled = element.closest(':disabled, [aria-disabled="true"]') !== null;
    const isLabelOfDisabled = label?.querySelector(":disabled") != null;
    if (isInsideDisabled || isLabelOfDisabled) continue;

    // Text kept only for screen readers (.visuallyHidden) is clipped to a pixel: nobody sees it, so it has no contrast to measure
    if (element.closest(".visuallyHidden") !== null) continue;

    const style = getComputedStyle(element);
    if (style.visibility === "hidden") continue;
    const isGradientText = style.webkitTextFillColor === "rgba(0, 0, 0, 0)";
    const { rgb, alpha } = parseColor(style.color);
    if (isGradientText || alpha === 0) continue;

    const range = document.createRange();
    range.selectNodeContents(textNode);
    const box = range.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;

    const effectiveAlpha = effectiveOpacity(element, alpha);
    const isLarge = isLargeText(style);

    runs.push({
      text: text.slice(0, 40),
      where: element.className || element.tagName.toLowerCase(),
      rgb,
      alpha: effectiveAlpha,
      isLarge,
      box: { x: box.left + scrollX, y: box.top + scrollY, width: box.width, height: box.height },
    });
  }
  return runs;
}

/** Hides all text (but keeps its layout) so a screenshot shows only what is behind it. */
const HIDE_TEXT_CSS = `
  *, *::before, *::after, ::placeholder {
    color: transparent !important;
    -webkit-text-fill-color: transparent !important;
    text-shadow: none !important;
    caret-color: transparent !important;
  }`;

/**
 * Finds the lowest contrast between a text run and the background pixels
 * behind it, by sampling a grid across its box (7 columns x 3 rows).
 */
function worstContrast(run, png) {
  const readPixel = (x, y) => {
    const offset = (Math.round(y) * png.width + Math.round(x)) * 4;
    return [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
  };

  let worst = { ratio: Infinity, background: null };
  for (let fx = 0.05; fx < 1; fx += 0.15) {
    for (let fy = 0.2; fy < 0.9; fy += 0.25) {
      const x = run.box.x + run.box.width * fx;
      const y = run.box.y + run.box.height * fy;
      if (x >= png.width || y >= png.height) continue;

      const background = readPixel(x, y);
      const shownText = blend(run.rgb, run.alpha, background);
      const ratio = contrastRatio(shownText, background);
      if (ratio < worst.ratio) worst = { ratio, background };
    }
  }
  return worst;
}

/** Runs the pixel contrast check and returns report lines for every failing text run. */
async function runPixelContrast(page) {
  const runs = await page.evaluate(collectTextRuns);

  await page.addStyleTag({ content: HIDE_TEXT_CSS });
  const screenshot = await page.screenshot({ fullPage: true });
  const png = PNG.sync.read(screenshot);

  const lines = [];
  for (const run of runs) {
    const minimum = run.isLarge ? MIN_RATIO_LARGE : MIN_RATIO_NORMAL;
    const worst = worstContrast(run, png);
    if (worst.ratio >= minimum) continue;

    const textColor = toHex(run.rgb);
    const fade = run.alpha < 1 ? ` at ${Math.round(run.alpha * 100)}% opacity` : "";
    const backgroundColor = toHex(worst.background);
    lines.push(
      `${worst.ratio.toFixed(2)}:1 (needs ${minimum}) "${run.text}" .${run.where}: ${textColor}${fade} on ${backgroundColor}`,
    );
  }
  return { lines, checked: runs.length };
}

/* ---------------------------------------------------------------------------
   Check 3: the header's notifications bell
   --------------------------------------------------------------------------- */

/** Gives the showcase's sample header two notifications, so it draws the bell. */
async function giveHeaderTwoNotifications(page) {
  await page.getByRole("button", { name: "Two", exact: true }).click();
}

/** Opens the bell's panel (the bell that is on screen at this width) and waits for it to settle. */
async function openBellPanel(page) {
  const bell = page.locator(".siteHeaderBell:visible");
  await bell.click();
  await page.locator(".siteHeaderNoticeList").waitFor();
  await waitUntilSettled(page);
  return bell;
}

/**
 * What must hold with the panel open: it adds no sideways scroll (the showcase page itself is wider than a phone because of its
 * wide sample frame, so the width is compared with the page's width before the panel opened), the panel inside the window, and (under 900px) the bell in the bar
 * on the same row as the Menu button, not inside the phone menu. Returns report lines for what does not.
 */
async function measureBellLayout(page, width, widthBeforeOpening) {
  return page.evaluate(
    ([viewportWidth, scrollWidthBefore]) => {
      const lines = [];
      if (document.documentElement.scrollWidth > scrollWidthBefore) lines.push("the page scrolls sideways with the panel open");
      const panel = document.querySelector(".siteHeaderNoticeList").getBoundingClientRect();
      if (panel.left < 0 || panel.right > viewportWidth)
        lines.push(`the panel leaves the window (${panel.left} to ${panel.right})`);
      // The bell's button keeps a target of at least 24 by 24 CSS pixels (WCAG 2.2 target size), however small its drawing is
      const MINIMUM_TARGET = 24;
      const visibleBell = [...document.querySelectorAll(".siteHeaderBell")].find((element) => element.offsetParent !== null);
      const button = visibleBell.getBoundingClientRect();
      if (button.width < MINIMUM_TARGET || button.height < MINIMUM_TARGET)
        lines.push(`the bell's button is ${button.width} by ${button.height}px (needs ${MINIMUM_TARGET} by ${MINIMUM_TARGET})`);
      // The badge sits inside the header's bar, and inside the button, so it is neither clipped nor over a neighbour
      const header = document.querySelector(".siteHeader").getBoundingClientRect();
      const badge = visibleBell.querySelector(".siteHeaderBellBadge").getBoundingClientRect();
      if (badge.top < header.top || badge.bottom > header.bottom)
        lines.push(`the badge leaves the header (${badge.top} to ${badge.bottom}, header ${header.top} to ${header.bottom})`);
      if (badge.left < button.left || badge.right > button.right)
        lines.push(
          `the badge leaves the bell's button (${badge.left} to ${badge.right}, button ${button.left} to ${button.right})`,
        );
      if (viewportWidth < 900) {
        const bell = document.querySelector(".siteHeaderBell").getBoundingClientRect();
        const menuButton = document.querySelector("#phoneMenuButton").getBoundingClientRect();
        if (Math.abs(bell.top - menuButton.top) > 8) lines.push("the bell is not beside the Menu button");
        if (document.querySelector(".siteHeaderPhoneMenu .siteHeaderBell")) lines.push("the bell is inside the phone menu");
      }
      return lines;
    },
    [width, widthBeforeOpening],
  );
}

/** Runs the bell checks at every width in this theme, with axe over the page with the panel open. Returns report lines. */
async function runBellChecks(browser, run) {
  const lines = [];
  for (const width of BELL_WIDTHS) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await context.addInitScript((pairs) => {
      for (const [key, text] of pairs) localStorage.setItem(key, text);
    }, toStorageEntries(run.storage));
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await giveHeaderTwoNotifications(page);
    const widthBeforeOpening = await page.evaluate(() => document.documentElement.scrollWidth);
    await openBellPanel(page);
    for (const line of await measureBellLayout(page, width, widthBeforeOpening)) lines.push(`at ${width}px: ${line}`);
    const axe = await runAxe(page);
    for (const line of axe.lines) lines.push(`at ${width}px, axe ${line}`);
    await context.close();
  }
  return lines;
}

/* ---------------------------------------------------------------------------
   Main
   --------------------------------------------------------------------------- */

// The showcase is served from this repo's build (npm run build writes dist/)
const server = await preview({ preview: { port: 4174, strictPort: false }, logLevel: "silent" });
const baseUrl = server.resolvedUrls.local[0];
const browser = await firefox.launch();

let failures = 0;
try {
  for (const run of RUNS) {
    const { context, page } = await openPage(browser, baseUrl, run.storage);
    // The sample header with a bell and its panel open, so axe and the contrast check cover them (a closed panel has no text)
    await giveHeaderTwoNotifications(page);
    await openBellPanel(page);
    const axe = await runAxe(page);
    // Runs last: it hides the page's text.
    const contrast = await runPixelContrast(page);
    await context.close();

    const bellLines = await runBellChecks(browser, run);

    const problems = axe.count + contrast.lines.length + bellLines.length;
    failures += problems;
    const status = problems === 0 ? "pass" : `${problems} problem(s)`;
    console.log(`\n${run.name}: ${status} (${contrast.checked} text runs measured)`);
    for (const line of axe.lines) console.log(`  axe       ${line}`);
    for (const line of contrast.lines) console.log(`  contrast  ${line}`);
    for (const line of bellLines) console.log(`  bell      ${line}`);
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} problem(s) found.`);
process.exitCode = failures === 0 ? 0 : 1;
