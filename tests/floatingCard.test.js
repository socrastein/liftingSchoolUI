import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Everything drawn above the page has one look from one place (.floatingCard, .floatingEdge and .menu in css/components.css, the
 * edge in --floatingBorder). These tests pin that both themes define the edge, that the shared rule gives it its edge and shadow,
 * and that the library's own floating parts take that look instead of drawing their own, so a part cannot quietly lose its edge.
 */

const TOKENS_CSS = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
const COMPONENTS_CSS = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");

/**
 * The text of a component file.
 *
 * @param {string} name The component's file name, such as "StatusToast".
 * @returns {string} The whole .vue file.
 */
function readComponent(name) {
  return readFileSync(new URL(`../components/${name}.vue`, import.meta.url), "utf8");
}

/**
 * The text of one theme's block in the tokens file.
 *
 * @param {string} startMarker The line that opens the block (":root {" or ".dark {").
 * @returns {string} Everything from the marker to the block's closing brace at the start of a line.
 */
function themeBlock(startMarker) {
  const start = TOKENS_CSS.indexOf(`\n${startMarker}`);
  const end = TOKENS_CSS.indexOf("\n}\n", start);
  return TOKENS_CSS.slice(start, end);
}

describe("the floating edge token", () => {
  it("is defined in the light theme, from the border colour", () => {
    expect(themeBlock(":root {")).toMatch(/--floatingBorder:\s*color-mix\(in srgb, var\(--borderMuted\) \d+%, var\(--bgTop\)\);/);
  });

  it("is defined in the dark theme too, where there is no shadow to separate a floating card", () => {
    expect(themeBlock(".dark {")).toMatch(/--floatingBorder:\s*color-mix\(in srgb, var\(--borderMuted\) \d+%, var\(--bgTop\)\);/);
  });
});

describe("the shared floating rule", () => {
  it("gives every floating class a visible edge and the popup shadow", () => {
    const rule = COMPONENTS_CSS.match(/\.floatingCard,\s*\.floatingEdge,\s*\.menu\s*\{([^}]*)\}/);
    expect(rule?.[1]).toContain("border: 1px solid var(--floatingBorder)");
    expect(rule?.[1]).toContain("box-shadow: var(--shadowRaised)");
  });

  it("draws the floating bar of the header with the same edge, at the bottom", () => {
    expect(COMPONENTS_CSS).toMatch(/\.siteHeader \{[^}]*border-bottom: 1px solid var\(--floatingBorder\)/);
  });
});

describe("the library's floating parts", () => {
  it.each([
    ["AnchoredCard", 'class="floatingCard anchoredCard"'],
    ["StatusToast", 'class="toast floatingCard"'],
    ["ConfirmDialog", 'class="floatingCard confirmCard"'],
    ["CelebrationOverlay", "celebrationMessage floatingCard"],
    ["CelebrationOverlay", "floatingEdge celebrationClose"],
    ["ScrollToTop", "floatingEdge scrollToTop"],
    ["DropdownSelect", 'class="floatingCard dropdownList"'],
    ["SiteHeaderDropdown", 'class="menu siteHeaderList"'],
    ["SiteHeaderNotifications", 'class="menu siteHeaderList siteHeaderNoticeList"'],
    ["SiteHeaderPhoneMenu", 'class="menu siteHeaderPanel"'],
    ["ActionsMenu", 'class="menu actionsList"'],
  ])("%s takes the shared look (%s)", (component, expectedClass) => {
    expect(readComponent(component)).toContain(expectedClass);
  });

  it("does not draw a floating part's own border or shadow in a component's style", () => {
    for (const name of ["AnchoredCard", "StatusToast", "DropdownSelect"]) {
      const style = readComponent(name).split("<style")[1] ?? "";
      expect(style, name).not.toMatch(/\.(anchoredCard|toast|dropdownList)\s*\{[^}]*(border:|box-shadow:)/);
    }
  });
});
