/**
 * Accessibility check for the showcase page: `npm run a11y` (builds it first).
 *
 * In each theme it loads the built showcase in headless Firefox and runs these checks:
 *
 * 1. axe (WCAG 2.2 A/AA rules): labels, roles, ARIA, contrast where axe can measure it, and so on.
 * 2. A pixel-based text contrast check. axe gives up on text over translucent washes and gradients, so this one measures the
 *    background that was actually drawn: it screenshots the page with all text made transparent, samples the pixels behind
 *    each run of text, and compares the text colour against the worst one.
 * 3. The header's notifications bell at both sides of the 900px rule and on the narrowest phones: its panel, badge and place.
 * 4. The header's fit: the sample header with many pages shows its wide row exactly when the row fits (and the Menu button
 *    exactly when it does not) at windows from 899px to 1280px in both themes, with no sideways overflow and axe clean; the
 *    ordinary sample header behaves as it always did; stepping the window narrower and wider never flips the form without
 *    cause; and an open drop-down or phone menu closes, with focus kept on screen, when the form changes.
 * 5. The confirm dialog opened inside a parent that zeroes its children's margins: its card is centred in the window within
 *    a pixel at 320x640, 375x800 and 1280x800, a long question on a 375x360 window is reachable whole, and axe is clean.
 * 6. The floating surfaces' edge: every floating card, menu, drop-down list, dialog card, toast and floating button the showcase can
 *    open (and the static samples) has an edge of at least 3:1 against the surface drawn behind it, measured from the pixels
 *    around it, with the page, a card and a raised panel behind it. A dialog's scrim already separates its card by tone, so
 *    there the card's face against the dimmed page may stand in for the edge.
 *
 * 7. Each .menuItemWarning row (the sample menu's and the open actions menu's) hovered: the orange text against the hover wash
 *    actually drawn, 4.5:1 or better.
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

/** The widths the header's fit is checked at: either side of the 900px rule, and across the span where the many-pages row gives way. */
const FIT_WIDTHS = [899, 900, 950, 1000, 1100, 1280];

/** The widths the ordinary sample header is checked at to show it behaves as it did before the header measured its row. */
const ORDINARY_HEADER_WIDTHS = [899, 900, 1280];

/** How far over its room the row may be, in pixels, and still count as fitting (rounding; js/headerFit.js has the same tolerance). */
const SUBPIXEL_TOLERANCE = 0.5;

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
   Check 4: the header's fit (the wide row, or the phone menu when the row does not fit)
   --------------------------------------------------------------------------- */

/** Opens the showcase at a window width, in this theme, and returns its page. */
async function openAtWidth(browser, run, width) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
  await context.addInitScript((pairs) => {
    for (const [key, text] of pairs) localStorage.setItem(key, text);
  }, toStorageEntries(run.storage));
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  return { context, page };
}

/** Gives the sample header many pages: enough that its row needs about 1000px to 1100px of window. */
async function giveHeaderManyPages(page) {
  await page.getByRole("button", { name: "Many", exact: true }).click();
}

/** How many frames to wait for the header to settle: see waitForHeaderToSettle. */
const FRAMES_TO_SETTLE = 8;

/**
 * Waits long enough for the header to measure and apply its form after a change. Under reduced motion (which these runs use) every
 * transition lasts 0.01ms, not nothing, so a size that a stylesheet changes (the many-pages sample's frame, when it is chosen)
 * reaches its new value a frame late, and the header, which re-measures when its bar resizes, settles a few frames after that.
 */
async function waitForHeaderToSettle(page) {
  await page.evaluate(async (frames) => {
    for (let frame = 0; frame < frames; frame += 1) await new Promise((resolve) => requestAnimationFrame(resolve));
  }, FRAMES_TO_SETTLE);
}

/** Reads, in the page, which form the sample header shows and whether it overflows sideways. */
function readWhatHeaderShows() {
  const header = document.querySelector(".siteHeader");

  /** Whether the element is drawn and can be seen, reached by keyboard and read by a screen reader (not display: none, not visibility: hidden). */
  const isShown = (element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible";

  return {
    isForced: header.classList.contains("siteHeaderCompact"),
    isMenuShown: isShown(header.querySelector(".siteHeaderMenuButton")),
    isRowShown: isShown(header.querySelector(".siteHeaderLinks")),
    // The header's own box: its content never extends past its edge in either form
    headerOverflow: header.scrollWidth - header.clientWidth,
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
  };
}

/**
 * Reads, in the page, whether the row would fit in the wide form, from the real layout and independently of the header's own
 * arithmetic: it takes the forcing class off for a moment (in one script task, so nothing is painted and the header's observer
 * sees no change), lets the wide form lay out, checks that the row, with the squeeze it causes in the title, ends inside the bar's padding, and puts the class back.
 */
function readWhetherRowFitsInWideForm() {
  const header = document.querySelector(".siteHeader");
  const nav = header.querySelector(".siteHeaderNav");
  const row = header.querySelector(".siteHeaderLinks");
  const title = header.querySelector(".siteHeaderTitle");

  const wasForced = header.classList.contains("siteHeaderCompact");
  header.classList.remove("siteHeaderCompact");
  const rowRight = row.getBoundingClientRect().right;
  const roomEdge = nav.getBoundingClientRect().right - parseFloat(getComputedStyle(nav).paddingRight);
  // A row too wide squeezes the title's box (its logo and name then overflow it) before it pushes past the bar's padding: the
  // overflow is how far the row ends past its room plus how far the title's content spills out of its box
  const squeeze = Math.max(0, title.scrollWidth - title.getBoundingClientRect().width);
  if (wasForced) header.classList.add("siteHeaderCompact");
  // Taking the class off and on is the probe's doing, not a change of form: drop it from the count of the sweep's observer
  window.classObserver?.takeRecords();

  return rowRight - roomEdge + squeeze <= 0.5;
}

/** What the sample header shows now, and whether its row would fit, as one object. */
async function readHeaderForm(page) {
  const shown = await page.evaluate(readWhatHeaderShows);
  const rowFitsInWideForm = await page.evaluate(readWhetherRowFitsInWideForm);
  return { ...shown, rowFitsInWideForm };
}

/** Whether the row must be the form shown at this width: never under 900px, and at 900px or more exactly when it fits. */
function mustShowRow(width, form) {
  return width >= 900 && form.rowFitsInWideForm;
}

/** Checks that the row is shown exactly when it fits (and the Menu button exactly when it does not). Returns report lines. */
function judgeWhichFormShows(width, form) {
  const lines = [];
  const mustShow = mustShowRow(width, form);
  const fitWords = mustShow ? "fits" : "does not fit";
  if (form.isMenuShown === mustShow)
    lines.push(`the Menu button is ${form.isMenuShown ? "shown" : "hidden"} but the row ${fitWords}`);
  if (form.isRowShown !== mustShow) lines.push(`the wide row is ${form.isRowShown ? "shown" : "hidden"} but it ${fitWords}`);
  return lines;
}

/** Checks that the header does not overflow sideways in the form it shows. Returns report lines. */
function judgeHeaderOverflow(form) {
  return form.headerOverflow > 1 ? [`the header overflows sideways by ${form.headerOverflow}px`] : [];
}

/** Checks that the page does not scroll sideways (true of the many-pages sample, whose frame is as wide as the window). */
function judgePageOverflow(form) {
  return form.pageOverflow > 0 ? [`the page scrolls sideways by ${form.pageOverflow}px`] : [];
}

/** Checks the many-pages sample at every width of FIT_WIDTHS, in both forms, with axe. Returns report lines. */
async function runManyPagesChecks(browser, run) {
  const lines = [];
  for (const width of FIT_WIDTHS) {
    const { context, page } = await openAtWidth(browser, run, width);
    await giveHeaderManyPages(page);
    await waitForHeaderToSettle(page);
    const form = await readHeaderForm(page);
    const problems = [...judgeWhichFormShows(width, form), ...judgeHeaderOverflow(form), ...judgePageOverflow(form)];
    for (const line of problems) lines.push(`many pages at ${width}px: ${line}`);
    const axe = await runAxe(page);
    for (const line of axe.lines) lines.push(`many pages at ${width}px, axe ${line}`);
    await context.close();
  }
  return lines;
}

/** Checks the ordinary sample header: the row at 900px and over, the phone menu under it, and the forcing class never added. */
async function runOrdinaryHeaderChecks(browser, run) {
  const lines = [];
  for (const width of ORDINARY_HEADER_WIDTHS) {
    const { context, page } = await openAtWidth(browser, run, width);
    await waitForHeaderToSettle(page);
    const form = await readHeaderForm(page);
    const problems = [...judgeWhichFormShows(width, form), ...judgeHeaderOverflow(form)];
    if (form.isForced) problems.push("forced into the phone menu, which only a row too wide may be");
    for (const line of problems) lines.push(`ordinary header at ${width}px: ${line}`);
    const axe = await runAxe(page);
    for (const line of axe.lines) lines.push(`ordinary header at ${width}px, axe ${line}`);
    await context.close();
  }
  return lines;
}

/** The window widths of the sweep: from 1280px down to 880px in steps of 4px (through the 900px rule), then back up. */
function sweepWidths() {
  const widths = [];
  for (let width = 1280; width >= 880; width -= 4) widths.push(width);
  for (let width = 884; width <= 1280; width += 4) widths.push(width);
  return widths;
}

/** Starts counting, in the page, how many times the sample header's class attribute changes. */
async function startCountingClassChanges(page) {
  await page.evaluate(() => {
    window.classChanges = 0;
    const observer = new MutationObserver((records) => (window.classChanges += records.length));
    window.classObserver = observer;
    observer.observe(document.querySelector(".siteHeader"), { attributes: true, attributeFilter: ["class"] });
  });
}

/** Sets the window to a width, waits for the header to settle, and returns what it shows with the report lines for what is wrong. */
async function sweepStep(page, width) {
  await page.setViewportSize({ width, height: 900 });
  await waitForHeaderToSettle(page);
  const form = await readHeaderForm(page);
  const problems = [...judgeWhichFormShows(width, form), ...judgeHeaderOverflow(form), ...judgePageOverflow(form)];
  return { form, lines: problems.map((problem) => `sweep at ${width}px: ${problem}`) };
}

/** Compares the class changes counted in the page with the changes of form between steps. Returns report lines. */
async function judgeClassChanges(page, changesBetweenSteps) {
  const classChanges = await page.evaluate(() => window.classChanges);
  if (classChanges === changesBetweenSteps) return [];
  return [
    `the class changed ${classChanges} times but the form it asks for changed ${changesBetweenSteps} times (it flipped without cause)`,
  ];
}

/**
 * Narrows and widens the window in small steps with the many-pages sample, and checks that at every step the form shown is the
 * one that fits (so it neither lags a step behind nor flips without cause) and that the header's class changed no more often
 * than the form it asks for did between steps.
 */
async function runResizeSweep(browser, run) {
  const lines = [];
  const { context, page } = await openAtWidth(browser, run, 1280);
  await giveHeaderManyPages(page);
  await waitForHeaderToSettle(page);
  await startCountingClassChanges(page);

  let changesBetweenSteps = 0;
  let previousForced = (await readHeaderForm(page)).isForced;
  for (const width of sweepWidths()) {
    const step = await sweepStep(page, width);
    lines.push(...step.lines);
    if (step.form.isForced !== previousForced) changesBetweenSteps += 1;
    previousForced = step.form.isForced;
  }

  lines.push(...(await judgeClassChanges(page, changesBetweenSteps)));
  await context.close();
  return lines;
}

/** Whether the element leaves the page within a second (a popup eases out before it is removed). */
async function isGone(locator) {
  try {
    await locator.waitFor({ state: "detached", timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * With the many-pages sample wide, a drop-down open and focus on its button, narrows the window until the row gives way and
 * checks that the drop-down closed and focus moved to the Menu button. Returns report lines.
 */
async function checkRowGivingWayToPhoneMenu(page) {
  const lines = [];
  await page.locator('.siteHeaderLinks [data-menu="tools"] button').click();
  await page.locator("#toolsList").waitFor();
  await page.setViewportSize({ width: 950, height: 900 });
  await waitForHeaderToSettle(page);
  if (!(await isGone(page.locator("#toolsList")))) lines.push("an open drop-down stayed open when the row gave way");
  const isOnMenuButton = await page.evaluate(() => document.activeElement?.classList.contains("siteHeaderMenuButton"));
  if (!isOnMenuButton) lines.push("focus was not moved to the Menu button when the row gave way");
  return lines;
}

/**
 * With the phone menu open and focus in it, widens the window until the row fits and checks that the menu closed and focus
 * moved to the name. Returns report lines.
 */
async function checkRowReturning(page) {
  const lines = [];
  await page.locator("#phoneMenuButton").click();
  await page.locator("#phoneMenuPanel").waitFor();
  await page.setViewportSize({ width: 1280, height: 900 });
  await waitForHeaderToSettle(page);
  if (!(await isGone(page.locator("#phoneMenuPanel")))) lines.push("the phone menu stayed open when the row returned");
  const isOnName = await page.evaluate(() => document.activeElement?.classList.contains("siteHeaderName"));
  if (!isOnName) lines.push("focus was not moved to the name when the row returned");
  return lines;
}

/** Runs both switches, in one page: wide to phone menu, then back. Returns report lines. */
async function runSwitchChecks(browser, run) {
  const { context, page } = await openAtWidth(browser, run, 1280);
  await giveHeaderManyPages(page);
  await waitForHeaderToSettle(page);
  const lines = [...(await checkRowGivingWayToPhoneMenu(page)), ...(await checkRowReturning(page))];
  await context.close();
  return lines;
}

/* ---------------------------------------------------------------------------
   Check 5: the confirm dialog stays centred inside a parent that zeroes its children's margins
   --------------------------------------------------------------------------- */

/** Window sizes the dialog's centring is measured at: two phones and a desktop. */
const DIALOG_WINDOWS = [
  { width: 320, height: 640 },
  { width: 375, height: 800 },
  { width: 1280, height: 800 },
];

/** The shortest window the dialog must stay reachable in, with the long question. */
const SHORT_WINDOW = { width: 375, height: 360 };

/** How far the dialog card's centre may be from the window's centre, in pixels. */
const CENTRE_TOLERANCE_PX = 1;

/** Opens the sample dialog (inside the showcase's `> * { margin: 0 }` parent) and returns where its card is. */
async function openSampleDialog(browser, run, size, query) {
  const context = await browser.newContext({ viewport: size, reducedMotion: "reduce" });
  await context.addInitScript((pairs) => {
    for (const [key, text] of pairs) localStorage.setItem(key, text);
  }, toStorageEntries(run.storage));
  const page = await context.newPage();
  await page.goto(baseUrl + query, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Delete the sample" }).click();
  await page.locator(".confirmCard").waitFor();
  await waitUntilSettled(page);
  return { context, page };
}

/** Reads the card's box, and whether the dialog is scrolled or taller than the window, in the page. */
function readDialogCard() {
  const box = document.querySelector(".confirmCard").getBoundingClientRect();
  const dialog = document.querySelector("dialog.confirmDialog");
  return {
    centreX: box.left + box.width / 2,
    centreY: box.top + box.height / 2,
    top: box.top,
    bottom: box.bottom,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    isScrollable: dialog.scrollHeight > dialog.clientHeight,
  };
}

/** Centred within a pixel at each window size, axe clean with the dialog open; returns report lines. */
async function runDialogCentringChecks(browser, run) {
  const lines = [];
  for (const size of DIALOG_WINDOWS) {
    const { context, page } = await openSampleDialog(browser, run, size, "");
    const card = await page.evaluate(readDialogCard);
    const offX = Math.abs(card.centreX - card.windowWidth / 2);
    const offY = Math.abs(card.centreY - card.windowHeight / 2);
    const label = `dialog at ${size.width}x${size.height}`;
    if (offX > CENTRE_TOLERANCE_PX) lines.push(`${label}: off centre horizontally by ${offX.toFixed(1)}px`);
    if (offY > CENTRE_TOLERANCE_PX) lines.push(`${label}: off centre vertically by ${offY.toFixed(1)}px`);
    const axe = await runAxe(page);
    for (const line of axe.lines) lines.push(`${label}, axe ${line}`);
    await context.close();
  }
  return lines;
}

/** The dialog with a primary confirm button is axe clean (contrast included) at a phone width; returns report lines. */
async function runPrimaryDialogCheck(browser, run) {
  const lines = [];
  const context = await browser.newContext({ viewport: { width: 375, height: 800 }, reducedMotion: "reduce" });
  await context.addInitScript((pairs) => {
    for (const [key, text] of pairs) localStorage.setItem(key, text);
  }, toStorageEntries(run.storage));
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Send the sample" }).click();
  await page.locator(".confirmCard").waitFor();
  await waitUntilSettled(page);
  const isPrimary = await page.evaluate(() => document.querySelector(".confirmButton")?.classList.contains("btnPrimary"));
  if (!isPrimary) lines.push("primary dialog: the confirm button is not primary");
  const axe = await runAxe(page);
  for (const line of axe.lines) lines.push(`primary dialog, axe ${line}`);
  await context.close();
  return lines;
}

/**
 * The warning button's edge against the surface it sits on, in the page as drawn: at least 3:1 (WCAG 1.4.11) on the page, a
 * card, a panel inside a card, a raised panel and a card inside it. Returns report lines. (Its text on its wash is measured
 * by the pixel contrast check, which covers every text run on the page, and axe.)
 */
async function runWarningEdgeCheck(page) {
  const readings = await page.evaluate(() => {
    const parseColour = (text) => (text.match(/[\d.]+/g) ?? []).map(Number);
    const solidBehind = (element) => {
      for (let node = element.parentElement; node; node = node.parentElement) {
        const [r, g, b, a = 1] = parseColour(getComputedStyle(node).backgroundColor);
        if (a === 1) return [r, g, b];
      }
      return [255, 255, 255];
    };
    return [...document.querySelectorAll(".btnWarning")].map((button) => {
      const [r, g, b] = parseColour(getComputedStyle(button).borderTopColor);
      return { edge: [r, g, b], surface: solidBehind(button), label: button.textContent.trim() };
    });
  });
  const lines = [];
  for (const { edge, surface, label } of readings) {
    const ratio = contrastRatio(edge, surface);
    if (ratio < 3) lines.push(`warning button "${label}": edge ${ratio.toFixed(2)}:1 against its surface (needs 3:1)`);
  }
  return lines;
}

/**
 * The text contrast of each .menuItemWarning row while it is hovered, in the sample menu and in the open actions menu: the
 * pixel check sees only the resting row, and the hover wash is what could drop the orange below 4.5:1. Hides the page's
 * text, so it runs last. Returns report lines and how many rows were measured.
 */
async function runWarningMenuRowChecks(page) {
  const lines = [];
  let measured = 0;
  const measureHoveredRow = async (row) => {
    await row.hover();
    await waitUntilSettled(page);
    const run = await row.evaluate((element) => {
      const [r, g, b] = getComputedStyle(element)
        .color.match(/[\d.]+/g)
        .map(Number);
      const box = element.getBoundingClientRect();
      const textBox = { x: box.left + box.width * 0.1, y: box.top, width: box.width * 0.5, height: box.height };
      return { rgb: [r, g, b], alpha: 1, box: textBox };
    });
    // Text hidden for the screenshot only, so the pixels are the row's own face and hover wash
    const styleTag = await page.addStyleTag({ content: HIDE_TEXT_CSS });
    // The row's colour transition would otherwise still be fading the text out when the screenshot is taken
    await waitUntilSettled(page);
    const png = PNG.sync.read(await page.screenshot());
    await styleTag.evaluate((element) => element.remove());
    const worst = worstContrast(run, png);
    measured += 1;
    const label = (await row.textContent()).trim();
    if (process.env.A11Y_VERBOSE) console.log(`    hovered warning row "${label}": ${worst.ratio.toFixed(2)}:1`);
    if (worst.ratio < MIN_RATIO_NORMAL)
      lines.push(`hovered warning menu row "${label}": ${worst.ratio.toFixed(2)}:1 (needs 4.5)`);
  };

  // The sample menu is always on the page; the actions menu's row exists only while it is open (and scrolling would close it)
  const sampleRow = page.locator(".sampleMenu .menuItemWarning");
  await sampleRow.scrollIntoViewIfNeeded();
  await measureHoveredRow(sampleRow);
  await page.locator("#sampleActions").scrollIntoViewIfNeeded();
  await page.locator("#sampleActions").click();
  await waitUntilSettled(page);
  await measureHoveredRow(page.locator(".actionsList .menuItemWarning"));
  return { lines, measured };
}

/** On a short window with a long question, the card stays inside the window or the dialog scrolls to all of it; returns report lines. */
async function runDialogShortWindowCheck(browser, run) {
  const lines = [];
  const { context, page } = await openSampleDialog(browser, run, SHORT_WINDOW, "?longDialog");
  // Opening focuses Cancel, which scrolls a tall dialog down to it: go back to the top to check the card's top is reachable
  await page.evaluate(() => document.querySelector("dialog.confirmDialog").scrollTo(0, 0));
  const card = await page.evaluate(readDialogCard);
  const label = `dialog at ${SHORT_WINDOW.width}x${SHORT_WINDOW.height}`;
  const fitsInWindow = card.top >= 0 && card.bottom <= card.windowHeight;
  if (!fitsInWindow && !card.isScrollable) lines.push(`${label}: the card is cut off and the dialog does not scroll`);
  if (card.top < 0) lines.push(`${label}: the card starts above the window even scrolled to the top (its top is out of reach)`);
  // Scroll to the end: the last button must then be fully inside the window
  await page.evaluate(() => document.querySelector("dialog.confirmDialog").scrollTo(0, 1e6));
  const lastBottom = await page.evaluate(() => {
    const buttons = [...document.querySelectorAll(".confirmCard .btn")];
    return buttons[buttons.length - 1].getBoundingClientRect().bottom;
  });
  if (lastBottom > card.windowHeight) lines.push(`${label}: the last button is below the window even when scrolled to the end`);
  const axe = await runAxe(page);
  for (const line of axe.lines) lines.push(`${label}, axe ${line}`);
  await context.close();
  return lines;
}

/* ---------------------------------------------------------------------------
   Check 6: the edge of floating surfaces
   --------------------------------------------------------------------------- */

/** Everything the library draws above the page, as the classes that give the floating look (css/components.css). */
const FLOATING_SELECTOR = ".floatingCard, .floatingEdge, .menu, .dropdownList";

/** WCAG 1.4.11: the edge that tells a component from what is behind it needs 3:1. */
const MIN_RATIO_EDGE = 3;

/** How far outside a floating surface's box the pixel standing for "what is behind it" is read, past the 1px edge and its blur. */
const OUTSIDE_PX = 4;

/** How far inside the box the face is read: past the edge and the corner rounding, in the padding. */
const FACE_INSET_PX = 4;

/** Reads where each visible floating surface is, its edge colour, and whether a modal dialog's scrim is behind it. */
function readFloatingSurfaces(selector) {
  // Firefox reports a colour made by color-mix() as color(srgb 0.5 0.5 0.6), so the colour is turned into 0-255 channels by drawing it
  const canvas = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const toRgb = (text) => {
    canvas.clearRect(0, 0, 1, 1);
    canvas.fillStyle = text;
    canvas.fillRect(0, 0, 1, 1);
    return [...canvas.getImageData(0, 0, 1, 1).data].slice(0, 3);
  };
  // While a modal dialog is open everything else is inert and dimmed by its scrim, so only the dialog's own surfaces are judged
  const modal = document.querySelector("dialog[open]");
  return [...document.querySelectorAll(selector)]
    .filter((element) => modal === null || modal.contains(element))
    .filter((element) => element.getBoundingClientRect().width > 0 && getComputedStyle(element).visibility !== "hidden")
    .map((element) => {
      const box = element.getBoundingClientRect();
      return {
        name: `${element.tagName.toLowerCase()}.${[...element.classList].join(".")}`,
        box: { x: box.x, y: box.y, width: box.width, height: box.height },
        edge: toRgb(getComputedStyle(element).borderTopColor),
        hasScrim: element.closest("dialog[open]") !== null,
      };
    });
}

/** The pixels just outside the middle of each side of a box that are inside the picture. */
function readPixelsOutside(box, png) {
  const middleX = box.x + box.width / 2;
  const middleY = box.y + box.height / 2;
  const points = [
    [middleX, box.y - OUTSIDE_PX],
    [middleX, box.y + box.height + OUTSIDE_PX],
    [box.x - OUTSIDE_PX, middleY],
    [box.x + box.width + OUTSIDE_PX, middleY],
  ];
  return points
    .filter(([x, y]) => x >= 0 && y >= 0 && x < png.width && y < png.height)
    .map(([x, y]) => {
      const offset = (Math.round(y) * png.width + Math.round(x)) * 4;
      return [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
    });
}

/** The face's pixel just inside the left side, in the padding. */
function readFacePixel(box, png) {
  const offset = (Math.round(box.y + box.height / 2) * png.width + Math.round(box.x + FACE_INSET_PX)) * 4;
  return [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
}

/**
 * The middle value of a list of numbers (the lower one of two). The sides of a surface are judged by their median, so another
 * edge that happens to be close on one side (the header's own edge a few pixels above its drop-down) does not decide the result.
 */
function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

/** Takes the shadow off every floating surface, so the pixels around one show the surface behind it and not its own shadow. */
const NO_SHADOW_CSS = `${FLOATING_SELECTOR} { box-shadow: none !important; }`;

/**
 * Judges every floating surface open on the page right now, from a screenshot of the window. Returns the report lines for the ones
 * whose edge is under 3:1 against what is behind them, and how many were measured (with the lowest figure, for the summary).
 */
async function measureFloatingEdges(page, where) {
  const surfaces = await page.evaluate(readFloatingSurfaces, FLOATING_SELECTOR);
  const noShadow = await page.addStyleTag({ content: NO_SHADOW_CSS });
  const png = PNG.sync.read(await page.screenshot());
  await noShadow.evaluate((tag) => tag.remove());
  const lines = [];
  const figures = [];
  for (const surface of surfaces) {
    const behind = readPixelsOutside(surface.box, png);
    if (behind.length === 0) continue;
    const edgeRatio = median(behind.map((pixel) => contrastRatio(surface.edge, pixel)));
    const faceRatio = median(behind.map((pixel) => contrastRatio(readFacePixel(surface.box, png), pixel)));
    // Under a scrim the dimmed page behind the card is told from it by its face, which is what a person sees first
    const ratio = surface.hasScrim ? Math.max(edgeRatio, faceRatio) : edgeRatio;
    figures.push(ratio);
    // A11Y_VERBOSE=1 lists every figure, for the numbers in a token's comment
    if (process.env.A11Y_VERBOSE)
      console.log(`    ${where}, ${surface.name}: edge ${edgeRatio.toFixed(2)}:1, face ${faceRatio.toFixed(2)}:1`);
    if (ratio < MIN_RATIO_EDGE) {
      lines.push(
        `${where}, ${surface.name}: edge ${edgeRatio.toFixed(2)}:1 (face ${faceRatio.toFixed(2)}:1) against what is behind it (needs 3:1)`,
      );
    }
  }
  return { lines, figures };
}

/**
 * The popups of the showcase page, each as its name, a move that opens it and a move that closes it again (a table of steps: the
 * runner below measures every floating surface on screen between the two).
 */
function floatingSteps(page) {
  const closeWithEscape = () => page.keyboard.press("Escape");
  const doNothing = async () => {};
  const noteButton = page.getByRole("button", { name: "Add a note" });
  const scrollTo = (selector) => () => page.locator(selector).scrollIntoViewIfNeeded();
  return [
    { where: "static samples", open: scrollTo("#floating"), close: doNothing },
    {
      where: "header Tools menu",
      open: async () => {
        await giveHeaderTwoNotifications(page);
        await scrollTo(".sampleHeaderFrame")();
        await page.locator(".sampleHeaderFrame").getByRole("button", { name: "Tools" }).click();
      },
      close: closeWithEscape,
    },
    { where: "header notifications", open: () => openBellPanel(page), close: closeWithEscape },
    {
      where: "actions menu",
      open: async () => {
        await scrollTo("#popups")();
        await page.locator("#sampleActions").click();
      },
      close: closeWithEscape,
    },
    { where: "anchored card", open: () => noteButton.click(), close: () => noteButton.click() },
    { where: "toast", open: () => page.getByRole("button", { name: "Copy the sample" }).click(), close: doNothing },
    {
      where: "drop-down list",
      open: async () => {
        await scrollTo("#sampleGoal")();
        await page.locator("#sampleGoal").click();
      },
      close: closeWithEscape,
    },
    { where: "searchable drop-down list", open: () => page.locator("#sampleCountry").click(), close: closeWithEscape },
    {
      where: "celebration message",
      open: async () => {
        await scrollTo("#celebrations")();
        await page.getByRole("button", { name: "Play Confetti" }).click();
      },
      close: closeWithEscape,
    },
    // The scroll-to-top button appears two screens down
    {
      where: "scroll-to-top button",
      open: () => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)),
      close: doNothing,
    },
  ];
}

/** Opens each popup the showcase has, one at a time, and measures every floating surface on screen at each step. */
async function runFloatingEdgeChecks(browser, run) {
  const lines = [];
  const figures = [];
  const record = (result) => {
    lines.push(...result.lines);
    figures.push(...result.figures);
  };

  const { context, page } = await openPage(browser, baseUrl, run.storage);
  for (const step of floatingSteps(page)) {
    await step.open();
    await waitUntilSettled(page);
    record(await measureFloatingEdges(page, step.where));
    await step.close();
    await waitUntilSettled(page);
  }
  await context.close();

  // The dialog, with its scrim, on its own page since a modal dialog blocks the rest
  const dialog = await openSampleDialog(browser, run, { width: 1280, height: 800 }, "");
  record(await measureFloatingEdges(dialog.page, "dialog"));
  await dialog.context.close();

  // The phone menu's panel, under 900px
  const phone = await openAtWidth(browser, run, 375);
  await phone.page.locator(".siteHeaderMenuButton").click();
  await waitUntilSettled(phone.page);
  record(await measureFloatingEdges(phone.page, "phone menu"));
  await phone.context.close();

  const header = await runHeaderEdgeChecks(browser, run);
  record(header);

  return { lines, count: figures.length, lowest: Math.min(...figures) };
}

/**
 * Makes the sample header a real fixed header: the showcase draws it inside a frame whose transform would make "fixed" mean
 * "fixed to the frame", and a header over scrolling content is exactly what its edge is for.
 */
const REAL_FIXED_HEADER_CSS = `
  .sampleHeaderFrame { transform: none !important; translate: none !important; overflow: visible !important; }
  .sampleHeaderFrame .siteHeader { position: fixed !important; top: 0; left: 0; width: 100%; }
`;

/** What can scroll under the header: a card, a raised panel, or (at the page's far left) the page itself. */
const HEADER_BEHIND_TARGETS = [
  { label: "a card", selector: ".sampleCard" },
  { label: "a raised panel", selector: ".raisedPanel" },
  { label: "the page", selector: null },
];

/**
 * Scrolls so the target sits under the header's bottom edge, and returns the header's bottom and the x where the surface behind
 * the header is read: just inside the target's left side (the padding, not its text), or the page's left margin.
 */
function scrollTargetUnderHeader(selector) {
  const headerBottom = document.querySelector(".siteHeader").getBoundingClientRect().bottom;
  if (selector === null) {
    window.scrollTo(0, 0);
    return { headerBottom, x: 2 };
  }
  const target = document.querySelector(selector);
  // Ten pixels of the target are above the header's bottom, so the pixels under the edge are the target's own face
  window.scrollBy(0, target.getBoundingClientRect().top - (headerBottom - 10));
  return { headerBottom, x: target.getBoundingClientRect().left + 6 };
}

/** The header's bottom edge against a card, a raised panel and the page scrolling under it, at a desktop and a phone width. */
async function runHeaderEdgeChecks(browser, run) {
  const lines = [];
  const figures = [];
  for (const width of [1280, 375]) {
    const { context, page } = await openAtWidth(browser, run, width);
    await page.addStyleTag({ content: REAL_FIXED_HEADER_CSS });
    for (const target of HEADER_BEHIND_TARGETS) {
      const place = await page.evaluate(scrollTargetUnderHeader, target.selector);
      await waitUntilSettled(page);
      const png = PNG.sync.read(await page.screenshot());
      const pixelAt = (x, y) => {
        const offset = (Math.round(y) * png.width + Math.round(x)) * 4;
        return [png.data[offset], png.data[offset + 1], png.data[offset + 2]];
      };
      // The edge is the bottom row of the header's own box; the surface behind starts a few pixels below it
      const edge = pixelAt(place.x, place.headerBottom - 1);
      const behind = pixelAt(place.x, place.headerBottom + OUTSIDE_PX);
      const ratio = contrastRatio(edge, behind);
      figures.push(ratio);
      if (process.env.A11Y_VERBOSE) console.log(`    header at ${width}px over ${target.label}: edge ${ratio.toFixed(2)}:1`);
      if (ratio < MIN_RATIO_EDGE) lines.push(`header at ${width}px over ${target.label}: edge ${ratio.toFixed(2)}:1 (needs 3:1)`);
    }
    await context.close();
  }
  return { lines, figures };
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
    const warningEdgeLines = await runWarningEdgeCheck(page);
    // Runs last: it hides the page's text.
    const contrast = await runPixelContrast(page);
    await context.close();

    const menuPage = await openPage(browser, baseUrl, run.storage);
    const menuRows = await runWarningMenuRowChecks(menuPage.page);
    await menuPage.context.close();

    const floating = await runFloatingEdgeChecks(browser, run);
    const bellLines = await runBellChecks(browser, run);
    const fitLines = [
      ...(await runOrdinaryHeaderChecks(browser, run)),
      ...(await runManyPagesChecks(browser, run)),
      ...(await runResizeSweep(browser, run)),
      ...(await runSwitchChecks(browser, run)),
      ...(await runDialogCentringChecks(browser, run)),
      ...(await runDialogShortWindowCheck(browser, run)),
      ...(await runPrimaryDialogCheck(browser, run)),
    ];

    const problems =
      axe.count +
      contrast.lines.length +
      menuRows.lines.length +
      warningEdgeLines.length +
      floating.lines.length +
      bellLines.length +
      fitLines.length;
    failures += problems;
    const status = problems === 0 ? "pass" : `${problems} problem(s)`;
    console.log(`\n${run.name}: ${status} (${contrast.checked} text runs measured)`);
    for (const line of axe.lines) console.log(`  axe       ${line}`);
    for (const line of contrast.lines) console.log(`  contrast  ${line}`);
    console.log(`  menu rows ${menuRows.measured} hovered warning rows measured`);
    for (const line of menuRows.lines) console.log(`  menu rows ${line}`);
    for (const line of warningEdgeLines) console.log(`  warning   ${line}`);
    console.log(`  floating  ${floating.count} surfaces measured, lowest edge ${floating.lowest.toFixed(2)}:1`);
    for (const line of floating.lines) console.log(`  floating  ${line}`);
    for (const line of bellLines) console.log(`  bell      ${line}`);
    for (const line of fitLines) console.log(`  fit       ${line}`);
  }
} finally {
  await browser.close();
  await server.close();
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} problem(s) found.`);
process.exitCode = failures === 0 ? 0 : 1;
