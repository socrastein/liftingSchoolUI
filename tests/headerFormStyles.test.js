import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The header's CSS draws the phone form by default and the wide form only as the exception, at a window of 900px or more and
 * while the header is not forced into the phone form (components.css). That is what lets JavaScript only ever ask for the phone
 * menu: no class it adds, and no failure of it to run, can show the wide row under 900px. These tests read the stylesheet.
 */

const stylesheet = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");

/** The text of the `@media (min-width: 900px)` block that draws the wide form. */
const WIDE_FORM_BLOCK = (() => {
  const start = stylesheet.indexOf("@media (min-width: 900px) {");
  const end = stylesheet.indexOf("\n}\n", start);
  return stylesheet.slice(start, end);
})();

/** The stylesheet without that block: every rule that applies at any width. */
const RULES_AT_ANY_WIDTH = stylesheet.replace(WIDE_FORM_BLOCK, "");

describe("the header's wide form in CSS", () => {
  it("is drawn by a block that exists", () => {
    expect(WIDE_FORM_BLOCK).toContain(".siteHeaderLinks");
  });

  it("draws the row only inside the 900px-and-over block", () => {
    expect(WIDE_FORM_BLOCK).toMatch(/\.siteHeaderLinks\s*\{[^}]*display:\s*flex/);
    expect(RULES_AT_ANY_WIDTH).not.toMatch(/\.siteHeaderLinks[^{]*\{[^}]*display:\s*flex/);
  });

  it("applies every wide-form rule only while the header is not forced into the phone form", () => {
    const selectors = [...WIDE_FORM_BLOCK.matchAll(/^\s{2}([^\s@][^{]*)\{/gm)].map((match) => (match[1] ?? "").trim());
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) expect(selector).toContain(":not(.siteHeaderCompact)");
  });

  it("does not draw the row by default, with display: none (out of sight, the tab order and the accessibility tree)", () => {
    const row = RULES_AT_ANY_WIDTH.match(/\n\.siteHeaderLinks \{([^}]*)\}/)?.[1] ?? "";
    expect(row).toContain("display: none");
  });

  it("has no other media query at 900px that changes the header", () => {
    expect(stylesheet).not.toContain("max-width: 899px");
    expect(stylesheet.match(/@media[^{]*\b900px/g)).toHaveLength(1);
  });
});
