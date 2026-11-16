import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The warning button (.btnWarning, the quiet orange one that starts something destructive) is drawn from two colour tokens, and
 * a token defined for one theme only would leave the button unreadable in the other. This pins that both themes define them, and
 * that the button is drawn from them rather than from typed colours.
 */

const TOKENS_CSS = readFileSync(new URL("../css/tokens.css", import.meta.url), "utf8");
const COMPONENTS_CSS = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");

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

describe("the warning button", () => {
  it("has its orange defined in the light theme", () => {
    expect(themeBlock(":root {")).toMatch(/--warning:\s*#[0-9a-f]{6};/i);
  });

  it("has its orange defined in the dark theme too", () => {
    expect(themeBlock(".dark {")).toMatch(/--warning:\s*#[0-9a-f]{6};/i);
  });

  it("draws its wash from the orange, so the wash follows the theme", () => {
    expect(TOKENS_CSS).toMatch(/--warningSubtle:\s*color-mix\(in srgb, var\(--warning\) 10%, transparent\);/);
  });

  it("colours its text, edge and wash from the tokens, for the button and for a link drawn as one", () => {
    const rule = COMPONENTS_CSS.match(/\.btnWarning,\s*\.btnWarning:link,\s*\.btnWarning:visited\s*\{([^}]*)\}/);
    expect(rule?.[1]).toContain("background-color: var(--warningSubtle)");
    expect(rule?.[1]).toContain("border-color: var(--warning)");
    expect(rule?.[1]).toContain("color: var(--warning)");
  });

  it("colours a menu row that starts a destructive action from the same orange, as a link too, with a wash on hover", () => {
    const rule = COMPONENTS_CSS.match(/\.menuItemWarning,\s*\.menuItemWarning:link,\s*\.menuItemWarning:visited\s*\{([^}]*)\}/);
    expect(rule?.[1]).toContain("color: var(--warning)");
    const hover = COMPONENTS_CSS.match(/\.menuItemWarning:hover\s*\{([^}]*)\}/);
    expect(hover?.[1]).toContain("background-color: var(--warningSubtle)");
  });
});
