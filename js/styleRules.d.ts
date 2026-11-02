/**
 * Finds every place in one stylesheet that breaks a style rule.
 *
 * @param {string} file The file's path (used in the problems and to match exceptions).
 * @param {string} css The stylesheet's text: a .css file, or the contents of a component's <style> blocks.
 * @param {StyleException[]} [exceptions] The deliberate exceptions; a problem that matches one is not reported.
 * @returns {StyleProblem[]} The problems, in the order they appear.
 */
export function findStyleProblems(file: string, css: string, exceptions?: StyleException[]): StyleProblem[];
/**
 * Finds every place that breaks a style rule in every .css file and every Vue component's <style> blocks under a folder,
 * at any depth.
 *
 * @param {string} folder The folder to check, such as "src" or "app" (relative to the working folder, or absolute).
 * @param {StyleException[]} [exceptions] The deliberate exceptions; a problem that matches one is not reported.
 * @returns {StyleProblem[]} The problems, file by file, with each file's path relative to the working folder.
 */
export function findStyleProblemsUnder(folder: string, exceptions?: StyleException[]): StyleProblem[];
/**
 * One problem as a line of a test's failure report, such as
 * "src/App.vue:12  font-size: 0.8rem  (font sizes are a --fontSize… token)".
 *
 * @param {StyleProblem} problem The problem to describe.
 * @returns {string} The report line.
 */
export function describeStyleProblem(problem: StyleProblem): string;
/**
 * The text of every <style> block in a Vue component, with the lines before and between them blanked out so line numbers
 * match the file. A block that loads its CSS from another file (<style src="…">) is skipped: that file is checked on its own.
 *
 * @param {string} vueSource The component's whole source.
 * @returns {string} The style blocks' text, with every other line empty.
 */
export function styleBlocksOf(vueSource: string): string;
/**
 * The rules a declaration can break.
 */
export type StyleRuleName = "colour" | "fontSize" | "radius" | "spacing" | "timing";
/**
 * One place in a stylesheet that breaks a rule.
 */
export type StyleProblem = {
    /**
     * The file, as given to findStyleProblems (a path relative to the working folder, from
     * findStyleProblemsUnder).
     */
    file: string;
    /**
     * The 1-based line number within the file.
     */
    line: number;
    /**
     * The CSS property, such as "font-size".
     */
    property: string;
    /**
     * The value as written.
     */
    value: string;
    /**
     * Which rule it breaks, in words.
     */
    rule: string;
};
/**
 * A deliberate exception to the rules. Each one says why, so the list stays short and every entry is a decision, not an
 * oversight.
 */
export type StyleException = {
    /**
     * The file it applies to; matched against the end of the problem's path.
     */
    file: string;
    /**
     * The rule it allows breaking.
     */
    rule: StyleRuleName;
    /**
     * The property it applies to, or "*" for every property the rule covers in that file.
     */
    property: string;
    /**
     * Only this exact value is allowed; leave it out to allow any value of the property in the file.
     */
    value?: string | undefined;
    /**
     * Why the exception exists.
     */
    reason: string;
};
