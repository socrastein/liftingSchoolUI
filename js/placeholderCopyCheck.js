/**
 * Finds the drafted copy a project still has to rewrite: every call of the placeholderCopy wrapper (placeholderCopy.js) in its
 * source. The `check-placeholder-copy` command (checkPlaceholderCopy.js) runs it for a project's scripts and CI; a project's
 * own tests can call it directly.
 *
 * Plain JavaScript for Node (it reads files), with no Vue or Nuxt: only scripts and tests import it, never a page.
 */

import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

/** The file types that can hold user-facing copy. */
const SOURCE_EXTENSIONS = new Set([".ts", ".vue", ".js"]);

/** Tests may call the wrapper freely; they never ship. */
const TEST_FOLDER = "__tests__";

/** Installed packages are not the project's own copy. */
const DEPENDENCY_FOLDER = "node_modules";

/** A call: the name, optional spaces, then an opening parenthesis. An import of the name has no parenthesis, so it is not one. */
const CALL_PATTERN = /\bplaceholderCopy\s*\(/;

/**
 * Whether a folder's files are left out of the scan.
 *
 * @param {string} folderName The folder's name, not its path.
 * @returns {boolean} True for test folders and installed packages.
 */
function isSkippedFolder(folderName) {
  return folderName === TEST_FOLDER || folderName === DEPENDENCY_FOLDER;
}

/**
 * Every source file under a folder, in the folder's own spelling ("app/pages/about.vue" for the folder "app").
 *
 * @param {string} folder The folder to walk.
 * @returns {string[]} The paths of the .ts, .vue and .js files, skipping test folders and installed packages.
 */
function sourceFilesUnder(folder) {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => sourceFilesIn(folder, entry));
}

/**
 * The source files one entry of a folder stands for: itself when it is a source file, its contents when it is a folder worth
 * walking, and nothing otherwise.
 *
 * @param {string} folder The folder the entry is in.
 * @param {import("node:fs").Dirent} entry The file or folder.
 * @returns {string[]} The paths of the source files found.
 */
function sourceFilesIn(folder, entry) {
  const path = join(folder, entry.name);
  if (!entry.isDirectory()) {
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  }
  if (isSkippedFolder(entry.name)) {
    return [];
  }
  return sourceFilesUnder(path);
}

/**
 * Every wrapped call in a file.
 *
 * @param {string} file The path of the file to scan.
 * @returns {string[]} One "path:line" for each line that holds a call, with 1-based line numbers.
 */
function placeholderLocationsIn(file) {
  const lines = readFileSync(file, "utf8").split("\n");
  /** @type {string[]} */
  const locations = [];
  lines.forEach((line, index) => {
    if (CALL_PATTERN.test(line)) {
      locations.push(`${file}:${index + 1}`);
    }
  });
  return locations;
}

/**
 * Every call of the placeholder wrapper in a project's source.
 *
 * @param {string[]} folders The folders to scan, such as ["app", "shared"].
 * @returns {string[]} One "path:line" for each line that holds a call; empty when no drafted copy remains.
 */
export function findPlaceholderCopy(folders) {
  return folders.flatMap((folder) => sourceFilesUnder(folder).flatMap(placeholderLocationsIn));
}
