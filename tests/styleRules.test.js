import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { describeStyleProblem, findStyleProblems, findStyleProblemsUnder, styleBlocksOf } from "../js/styleRules.js";

/** @typedef {import("../js/styleRules.js").StyleException} StyleException */

/**
 * The library's own deliberate exceptions to the style rules, each a decision recorded with its reason. Everything else in
 * css/ must use the tokens, like any project's styles.
 * @type {StyleException[]}
 */
const LIBRARY_EXCEPTIONS = [
  { file: "css/tokens.css", rule: "colour", property: "*", reason: "the tokens are where the colours are defined" },
  {
    file: "css/base.css",
    rule: "fontSize",
    property: "font-size",
    value: "4rem",
    reason: "the hero headline (.textHero)",
  },
  {
    file: "css/base.css",
    rule: "timing",
    property: "animation-duration",
    reason: "the reduced-motion rule cuts animations to nothing",
  },
  {
    file: "css/base.css",
    rule: "timing",
    property: "transition-duration",
    reason: "the reduced-motion rule cuts transitions to nothing",
  },
];

describe("findStyleProblems", () => {
  it("accepts values that come from the tokens", () => {
    const css = [
      ".a {",
      "  color: var(--textFull);",
      "  font-size: var(--fontSizeSm);",
      "  border-radius: var(--radius) 0 0 var(--radius);",
      "  padding: var(--space1) var(--space2);",
      "  margin-top: calc(var(--space4) * 4);",
      "  transition: color var(--duration) ease;",
      "}",
    ].join("\n");
    expect(findStyleProblems("a.css", css)).toEqual([]);
  });

  it("finds a hand-typed colour, font size, radius, spacing and duration", () => {
    const css = [
      ".a {",
      "  color: #c62828;",
      "  background-color: rgba(0, 0, 0, 0.4);",
      "  font-size: 0.8rem;",
      "  border-radius: 12px;",
      "  gap: 0.75rem;",
      "  transition: transform 0.15s ease;",
      "}",
    ].join("\n");
    const problems = findStyleProblems("a.css", css);
    expect(problems.map((problem) => problem.property)).toEqual([
      "color",
      "background-color",
      "font-size",
      "border-radius",
      "gap",
      "transition",
    ]);
    expect(problems[0]).toMatchObject({ file: "a.css", line: 2, value: "#c62828" });
  });

  it("allows hairline spacing and radii, percentages, 0, circles and custom property definitions", () => {
    const css = [
      ".a {",
      "  padding: 2px var(--space1);",
      "  gap: 0.125rem;",
      "  margin: -1px;",
      "  padding: 0 2%;",
      "  border-radius: 50%;",
      "  border-radius: calc(var(--radius) - 2px);",
      "  --glow: #ff95ff;",
      "}",
    ].join("\n");
    expect(findStyleProblems("a.css", css)).toEqual([]);
  });

  it("allows a zero duration, which is no duration at all, but not a real one beside it", () => {
    const css = [".a {", "  transition-delay: 0s;", "  animation-delay: 0ms;", "  transition: opacity 0s, color 0.3s;", "}"].join(
      "\n",
    );
    const problems = findStyleProblems("a.css", css);
    expect(problems.map((problem) => problem.value)).toEqual(["opacity 0s, color 0.3s"]);
  });

  it("ignores values written in comments", () => {
    const css = "/* the old value was font-size: 0.8rem; */\n.a {\n  /* color: #fff; */\n  color: var(--textFull);\n}";
    expect(findStyleProblems("a.css", css)).toEqual([]);
  });

  it("skips a problem that a listed exception allows, and only that one", () => {
    const css = ".a {\n  font-size: 4rem;\n  font-size: 3rem;\n}";
    /** @type {StyleException[]} */
    const exceptions = [{ file: "a.css", rule: "fontSize", property: "font-size", value: "4rem", reason: "test" }];
    const problems = findStyleProblems("a.css", css, exceptions);
    expect(problems.map((problem) => problem.value)).toEqual(["3rem"]);
  });
});

describe("styleBlocksOf", () => {
  it("keeps only the <style> blocks of a component, with its line numbers", () => {
    const vue = [
      "<template>",
      '  <p style="color: #fff">x</p>',
      "</template>",
      "<style scoped>",
      ".a { color: red; }",
      "</style>",
    ].join("\n");
    const lines = styleBlocksOf(vue).split("\n");
    expect(lines).toHaveLength(6);
    expect(lines[4]).toBe(".a { color: red; }");
    expect(lines[1]).toBe("");
  });

  it("skips a block that loads its CSS from another file, and keeps checking the blocks after it", () => {
    const vue = ['<style scoped src="./card.css"></style>', "<style>", ".b { color: red; }", "</style>"].join("\n");
    const lines = styleBlocksOf(vue).split("\n");
    expect(lines).toEqual(["", "", ".b { color: red; }", ""]);
  });

  it("does not treat the lines after a block opened and closed on one line as styles", () => {
    const vue = ["<style></style>", "<p>color: #fff;</p>"].join("\n");
    expect(styleBlocksOf(vue).split("\n")).toEqual(["", ""]);
  });
});

describe("findStyleProblemsUnder", () => {
  /** The temporary project folder each test builds, removed after it. */
  let folder = "";

  afterEach(() => {
    rmSync(folder, { recursive: true, force: true });
  });

  /**
   * Builds a temporary folder of files to check.
   * @param {Record<string, string>} files Each file's path inside the folder, and its text.
   */
  function makeFolder(files) {
    folder = mkdtempSync(join(tmpdir(), "styleRules-"));
    for (const [path, text] of Object.entries(files)) {
      const fullPath = join(folder, path);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, text);
    }
  }

  it("checks .css files and components' <style> blocks at any depth, with the line in the file", () => {
    makeFolder({
      "a.css": ".a {\n  gap: 0.75rem;\n}",
      "deep/B.vue": "<template><p>x</p></template>\n<style scoped>\n.b {\n  color: #fff;\n}\n</style>",
      "notes.txt": "color: #fff;",
    });
    const problems = findStyleProblemsUnder(folder);
    const found = problems.map((problem) => [problem.file.split("/").slice(-2).join("/"), problem.line, problem.property]);
    expect(found).toContainEqual([expect.stringMatching(/a\.css$/), 2, "gap"]);
    expect(found).toContainEqual(["deep/B.vue", 4, "color"]);
    expect(problems).toHaveLength(2);
  });

  it("skips node_modules and hidden folders, whose files are installed or generated", () => {
    makeFolder({
      "node_modules/lib/a.css": ".a {\n  color: #fff;\n}",
      ".nuxt/b.css": ".b {\n  color: #fff;\n}",
    });
    expect(findStyleProblemsUnder(folder)).toEqual([]);
  });
});

describe("describeStyleProblem", () => {
  it("writes a problem as one line of a report: where, what, and the rule", () => {
    const line = describeStyleProblem({ file: "src/A.vue", line: 12, property: "font-size", value: "0.8rem", rule: "r" });
    expect(line).toBe("src/A.vue:12  font-size: 0.8rem  (r)");
  });
});

describe("the library's stylesheets", () => {
  it("take every colour, font size, radius, spacing value and duration from the tokens, apart from the listed exceptions", () => {
    const problems = findStyleProblemsUnder("css", LIBRARY_EXCEPTIONS);
    expect(problems.map(describeStyleProblem)).toEqual([]);
  });

  it("include the showcase's own layout, which follows the same rules with no exceptions", () => {
    const problems = findStyleProblemsUnder("showcase");
    expect(problems.map(describeStyleProblem)).toEqual([]);
  });
});
