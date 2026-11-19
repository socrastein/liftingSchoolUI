import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The page title (.pageTitle in css/components.css) is set very large, so a single long word ("Measurements") does not fit
 * a 320 to 375 px phone. The rule must break such a word with a visible hyphen, not mid-word and not off the screen. These
 * tests read the stylesheet.
 */

const stylesheet = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");

/** The `.pageTitle` rule, without its selector and closing brace. */
const PAGE_TITLE_RULE = (() => {
  const start = stylesheet.indexOf(".pageTitle {");
  const end = stylesheet.indexOf("\n}", start);
  return stylesheet.slice(start + ".pageTitle {".length, end);
})();

describe("the page title's wrapping in CSS", () => {
  it("is a rule that exists", () => {
    expect(PAGE_TITLE_RULE.length).toBeGreaterThan(0);
  });

  it("lets a long word break with a visible hyphen, by the page's lang", () => {
    expect(PAGE_TITLE_RULE).toContain("hyphens: auto");
  });

  it("keeps a long word inside the column when there is no hyphen position", () => {
    expect(PAGE_TITLE_RULE).toContain("overflow-wrap: break-word");
  });
});
