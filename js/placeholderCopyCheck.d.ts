/**
 * Every call of the placeholder wrapper in a project's source.
 *
 * @param {string[]} folders The folders to scan, such as ["app", "shared"].
 * @returns {string[]} One "path:line" for each line that holds a call; empty when no drafted copy remains.
 */
export function findPlaceholderCopy(folders: string[]): string[];
