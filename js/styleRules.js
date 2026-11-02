/**
 * The style rules: every colour, font size, corner radius, spacing value and timing in a project's stylesheets must come from
 * the design tokens in css/tokens.css (a var(--…) or a calc() of one), so every project stays consistent and anything added
 * later matches. This module finds the places that break a rule. A project runs it over its own source from one of its tests,
 * with the list of its deliberate exceptions:
 *
 *   import { findStyleProblemsUnder } from "lifting-school-ui/styleRules";
 *   const problems = findStyleProblemsUnder("src", EXCEPTIONS);
 *   expect(problems.map(describeStyleProblem)).toEqual([]);
 *
 * Plain JavaScript for Node (it reads files), with no Vue or Nuxt: only tests import it, never a page.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * @typedef {"colour" | "fontSize" | "radius" | "spacing" | "timing"} StyleRuleName The rules a declaration can break.
 */

/**
 * One place in a stylesheet that breaks a rule.
 * @typedef {object} StyleProblem
 * @property {string} file The file, as given to findStyleProblems (a path relative to the working folder, from
 *   findStyleProblemsUnder).
 * @property {number} line The 1-based line number within the file.
 * @property {string} property The CSS property, such as "font-size".
 * @property {string} value The value as written.
 * @property {string} rule Which rule it breaks, in words.
 */

/**
 * A deliberate exception to the rules. Each one says why, so the list stays short and every entry is a decision, not an
 * oversight.
 * @typedef {object} StyleException
 * @property {string} file The file it applies to; matched against the end of the problem's path.
 * @property {StyleRuleName} rule The rule it allows breaking.
 * @property {string} property The property it applies to, or "*" for every property the rule covers in that file.
 * @property {string} [value] Only this exact value is allowed; leave it out to allow any value of the property in the file.
 * @property {string} reason Why the exception exists.
 */

/** Spacing properties: their lengths must be spacing tokens. */
const SPACING_PROPERTY = /^(gap|row-gap|column-gap|padding(-[a-z-]+)?|margin(-[a-z-]+)?)$/;

/** Timing properties: their durations must be the duration tokens. */
const TIMING_PROPERTY = /^(transition(-[a-z-]+)?|animation(-[a-z-]+)?)$/;

/** A colour written by hand: #rgb … #rrggbbaa, or rgb() / rgba() / hsl() / hsla() with numbers in it. */
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\(\s*[0-9]/;

/** A length written by hand, such as 0.75rem, 12px or 1.2em (a number directly followed by a length unit). */
const LENGTH_LITERAL = /(-?\d*\.?\d+)(rem|px|em)\b/g;

/** A duration written by hand, such as 0.3s or 150ms. */
const DURATION_LITERAL = /(?<![\w.-])\d*\.?\d+m?s\b/;

/**
 * A length this small is a hairline adjustment (a 2px nudge to line something up, or a radius 2px smaller than the one
 * around it so the corners stay concentric), not a step in the layout, so it is allowed as written: up to 2px or 0.15rem.
 */
const HAIRLINE_PX = 2;

/** Font sizes are a token or "inherit"; nothing else. */
const FONT_SIZE_VALUE = /^(var\(--fontSize\w+\)|inherit)$/;

/**
 * Finds every place in one stylesheet that breaks a style rule.
 *
 * @param {string} file The file's path (used in the problems and to match exceptions).
 * @param {string} css The stylesheet's text: a .css file, or the contents of a component's <style> blocks.
 * @param {StyleException[]} [exceptions] The deliberate exceptions; a problem that matches one is not reported.
 * @returns {StyleProblem[]} The problems, in the order they appear.
 */
export function findStyleProblems(file, css, exceptions = []) {
  const withoutComments = blankOutComments(css);
  const lines = withoutComments.split("\n");
  /** @type {StyleProblem[]} */
  const problems = [];

  lines.forEach((text, index) => {
    const declaration = parseDeclaration(text);
    if (!declaration) return;

    const brokenRule = ruleBrokenBy(declaration.property, declaration.value);
    if (!brokenRule) return;

    const isAllowed = exceptions.some((exception) => matchesException(exception, file, brokenRule, declaration));
    if (isAllowed) return;

    problems.push({
      file,
      line: index + 1,
      property: declaration.property,
      value: declaration.value,
      rule: describeRule(brokenRule),
    });
  });

  return problems;
}

/**
 * Finds every place that breaks a style rule in every .css file and every Vue component's <style> blocks under a folder,
 * at any depth.
 *
 * @param {string} folder The folder to check, such as "src" or "app" (relative to the working folder, or absolute).
 * @param {StyleException[]} [exceptions] The deliberate exceptions; a problem that matches one is not reported.
 * @returns {StyleProblem[]} The problems, file by file, with each file's path relative to the working folder.
 */
export function findStyleProblemsUnder(folder, exceptions = []) {
  const paths = styleFilesUnder(folder);
  return paths.flatMap((path) => {
    const source = readFileSync(path, "utf8");
    const isComponent = path.endsWith(".vue");
    const css = isComponent ? styleBlocksOf(source) : source;
    const file = relative(".", path);
    return findStyleProblems(file, css, exceptions);
  });
}

/**
 * One problem as a line of a test's failure report, such as
 * "src/App.vue:12  font-size: 0.8rem  (font sizes are a --fontSize… token)".
 *
 * @param {StyleProblem} problem The problem to describe.
 * @returns {string} The report line.
 */
export function describeStyleProblem(problem) {
  return `${problem.file}:${problem.line}  ${problem.property}: ${problem.value}  (${problem.rule})`;
}

/**
 * The text of every <style> block in a Vue component, with the lines before and between them blanked out so line numbers
 * match the file. A block that loads its CSS from another file (<style src="…">) is skipped: that file is checked on its own.
 *
 * @param {string} vueSource The component's whole source.
 * @returns {string} The style blocks' text, with every other line empty.
 */
export function styleBlocksOf(vueSource) {
  const lines = vueSource.split("\n");
  /** @type {string[]} */
  const kept = [];
  // Whether the line being read is inside a <style> block: the state carried from one line to the next
  let insideStyle = false;

  for (const line of lines) {
    const opensStyle = /<style\b/.test(line);
    const closesStyle = /<\/style>/.test(line);

    if (opensStyle) {
      // A block opened and closed on one line holds nothing to check, and one with src= loads its CSS from another file
      const loadsFromAnotherFile = /\bsrc=/.test(line);
      insideStyle = !closesStyle && !loadsFromAnotherFile;
      kept.push("");
    } else if (closesStyle) {
      insideStyle = false;
      kept.push("");
    } else {
      const keptLine = insideStyle ? line : "";
      kept.push(keptLine);
    }
  }

  return kept.join("\n");
}

/**
 * Every .vue and .css file under a folder, at any depth. node_modules and hidden folders (.nuxt, .output) are skipped, since
 * their files are installed or generated, not written in the project.
 *
 * @param {string} folder The folder to search.
 * @returns {string[]} The files' paths, starting with `folder`.
 */
function styleFilesUnder(folder) {
  const entries = readdirSync(folder, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      const isSkipped = entry.name === "node_modules" || entry.name.startsWith(".");
      return isSkipped ? [] : styleFilesUnder(path);
    }
    const isStyleFile = path.endsWith(".vue") || path.endsWith(".css");
    return isStyleFile ? [path] : [];
  });
}

/**
 * Replaces each comment with spaces, keeping its line breaks, so a value written in a comment is not checked.
 *
 * @param {string} css The stylesheet's text.
 * @returns {string} The same text with every comment blanked out.
 */
function blankOutComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
}

/**
 * The property and value of a one-line declaration such as "  font-size: 1rem;", or null for anything else.
 *
 * @param {string} line One line of a stylesheet.
 * @returns {{ property: string, value: string } | null} The declaration, without any !important.
 */
function parseDeclaration(line) {
  const match = /^\s*([a-z-]+)\s*:\s*(.+?)\s*;?\s*$/.exec(line);
  if (!match) return null;

  // The pattern has both groups, so they are always set when the match succeeds
  const property = /** @type {string} */ (match[1]);
  const rawValue = /** @type {string} */ (match[2]);
  const value = rawValue.replace(/\s*!important$/, "");
  return { property, value };
}

/**
 * Which rule a declaration breaks, or null when it follows them all.
 *
 * @param {string} property The CSS property.
 * @param {string} value Its value.
 * @returns {StyleRuleName | null} The first rule it breaks.
 */
function ruleBrokenBy(property, value) {
  // Custom properties (--name: …) are where values are defined, so they may be written by hand
  if (property.startsWith("--")) return null;

  if (COLOUR_LITERAL.test(value)) return "colour";
  if (property === "font-size" && !FONT_SIZE_VALUE.test(value)) return "fontSize";
  if (property === "border-radius" && hasLayoutLengthLiteral(value)) return "radius";
  if (SPACING_PROPERTY.test(property) && hasLayoutLengthLiteral(value)) return "spacing";
  if (TIMING_PROPERTY.test(property) && DURATION_LITERAL.test(value)) return "timing";
  return null;
}

/**
 * True when the value has a length written by hand that is bigger than a hairline.
 *
 * @param {string} value A CSS value.
 * @returns {boolean}
 */
function hasLayoutLengthLiteral(value) {
  const lengths = [...value.matchAll(LENGTH_LITERAL)];
  return lengths.some((length) => {
    const size = Math.abs(Number(length[1]));
    const unit = length[2];
    const sizeInPx = unit === "px" ? size : size * 16;
    return sizeInPx > HAIRLINE_PX + 0.4; // 0.15rem is 2.4px
  });
}

/**
 * True when an exception covers this broken rule in this file.
 *
 * @param {StyleException} exception The exception to test.
 * @param {string} file The file the problem is in.
 * @param {StyleRuleName} rule The rule the declaration breaks.
 * @param {{ property: string, value: string }} declaration The declaration that breaks it.
 * @returns {boolean}
 */
function matchesException(exception, file, rule, declaration) {
  const sameFile = file.endsWith(exception.file);
  const sameRule = exception.rule === rule;
  const sameProperty = exception.property === "*" || exception.property === declaration.property;
  const sameValue = exception.value === undefined || exception.value === declaration.value;
  return sameFile && sameRule && sameProperty && sameValue;
}

/**
 * The rule in words, for a test's failure report.
 *
 * @param {StyleRuleName} rule The rule.
 * @returns {string} What the rule asks for.
 */
function describeRule(rule) {
  /** @type {Record<StyleRuleName, string>} */
  const descriptions = {
    colour: "colours come from the colour tokens",
    fontSize: "font sizes are a --fontSize… token",
    radius: "corner radii are --radius, --radiusLg, --radiusFull, 50% or 0 (or a hairline of 2px or less)",
    spacing: "gaps, padding and margins are --space1 to --space4 (or a hairline of 2px or less)",
    timing: "durations are --duration or --durationSlow",
  };
  return descriptions[rule];
}
