import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A link drawn as a button (`<a class="btn btnSecondary">`, a RouterLink or NuxtLink) must look like the button, not like a
 * link. The global a:link and a:visited colours (base.css) are more specific than a lone class, so every button colour rule
 * has to name its :link and :visited states too, or the label turns the accent purple. This reads the stylesheet's rules for
 * the button colours and checks each one does.
 */

const COMPONENTS_CSS = readFileSync(new URL("../css/components.css", import.meta.url), "utf8");

/**
 * Every rule in the stylesheet as its selector list and body. Comments are dropped first, so a brace inside one never splits a
 * rule. Good enough for this flat file, which has no nested rules outside @media blocks.
 *
 * @param {string} css The stylesheet's text.
 * @returns {{ selectors: string[], body: string }[]} The rules, in order.
 */
function rulesOf(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  for (const [, selectorList = "", body = ""] of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = selectorList.split(",").map((selector) => selector.trim());
    rules.push({ selectors, body });
  }
  return rules;
}

/**
 * Whether a selector is a button colour on its own: `.btnSecondary`, not `.btnSecondary:hover` or `.btn`.
 *
 * @param {string} selector One selector from a rule's list.
 * @returns {boolean} True for a lone button colour class.
 */
function isButtonColourClass(selector) {
  return /^\.btn[A-Z]\w*$/.test(selector);
}

describe("buttons drawn on links", () => {
  const colourRules = rulesOf(COMPONENTS_CSS).filter(
    (rule) => rule.selectors.some(isButtonColourClass) && /(^|;|\s)color:/.test(rule.body),
  );

  it("finds the button colours to check", () => {
    expect(colourRules.length).toBeGreaterThanOrEqual(5);
  });

  it.each(colourRules.map((rule) => [rule.selectors.find(isButtonColourClass), rule]))(
    "%s also names its :link and :visited states",
    (buttonClass, rule) => {
      expect(rule.selectors).toContain(`${buttonClass}:link`);
      expect(rule.selectors).toContain(`${buttonClass}:visited`);
    },
  );
});
