#!/usr/bin/env node
/**
 * The `check-placeholder-copy` command: lists the drafted copy a project still has to rewrite and exits 1 while any remains.
 * Usage (in a project's package.json): `"copy:check": "check-placeholder-copy app shared"`, naming the source folders (just
 * "src" when none are given). It looks only at source files (.ts, .vue, .js), skipping test folders and node_modules.
 *
 * Where to run it is the project's choice: a deploy must not ship drafts, but a branch may hold them, so it belongs in the
 * deploy step and, as a report only, in CI. See placeholderCopy.js for the wrapper it looks for.
 */

import { findPlaceholderCopy } from "./placeholderCopyCheck.js";

/** The folders scanned when the command is given none. */
const DEFAULT_FOLDERS = ["src"];

/**
 * Scans, reports, and sets the exit code: 0 when no drafted copy remains, 1 when any does.
 *
 * @param {string[]} folders The folders to scan.
 * @returns {void}
 */
function main(folders) {
  const locations = findPlaceholderCopy(folders);
  if (locations.length === 0) {
    console.log("[placeholder copy] none found: the copy is ready to ship");
    return;
  }
  console.error(`[placeholder copy] ${locations.length} drafted text(s) must be rewritten by hand before they ship:`);
  for (const location of locations) {
    console.error(`  ${location}`);
  }
  process.exitCode = 1;
}

const folderArguments = process.argv.slice(2);
main(folderArguments.length > 0 ? folderArguments : DEFAULT_FOLDERS);
