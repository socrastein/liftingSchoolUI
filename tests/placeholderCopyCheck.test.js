import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { findPlaceholderCopy } from "../js/placeholderCopyCheck.js";

/**
 * Drafted copy must be rewritten by hand before it ships. The check finds every wrapped call (and only real ones), and the
 * `check-placeholder-copy` command turns what it finds into an exit code a deploy can fail on.
 */

const COMMAND = fileURLToPath(new URL("../js/checkPlaceholderCopy.js", import.meta.url));

/** A fresh folder for each test, holding a project's source. */
let fixtureRoot = "";

beforeEach(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "placeholder-copy-"));
});

afterEach(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

/**
 * Writes a file into the fixture tree, creating its folders.
 * @param {string} relativePath
 * @param {string} content
 */
function writeFixture(relativePath, content) {
  const fullPath = join(fixtureRoot, relativePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}

/**
 * Runs the command on folders, as a project's script would.
 * @param {string[]} folders
 */
function runCommand(folders) {
  const result = spawnSync("node", [COMMAND, ...folders], { encoding: "utf8" });
  return { exitCode: result.status, output: result.stdout + result.stderr };
}

describe("findPlaceholderCopy", () => {
  it("finds nothing when no placeholder copy remains", () => {
    writeFixture("model/vocabulary.ts", "export const LABEL = 'Hypertrophy'\n");

    expect(findPlaceholderCopy([fixtureRoot])).toEqual([]);
  });

  it("lists path:line for every wrapped call, in .ts and .vue files", () => {
    writeFixture(
      "model/vocabulary.ts",
      "const a = 'x'\nconst b = placeholderCopy('Muscle growth.')\nconst c = placeholderCopy(\"Strength.\")\n",
    );
    writeFixture("components/Tooltip.vue", "<script setup>\nconst text = placeholderCopy(`Hello`)\n</script>\n");

    const locations = findPlaceholderCopy([fixtureRoot]);

    expect(locations).toHaveLength(3);
    expect(locations).toContain(join(fixtureRoot, "model/vocabulary.ts") + ":2");
    expect(locations).toContain(join(fixtureRoot, "model/vocabulary.ts") + ":3");
    expect(locations).toContain(join(fixtureRoot, "components/Tooltip.vue") + ":2");
  });

  it("scans every folder it is given", () => {
    writeFixture("app/page.vue", "placeholderCopy('a')\n");
    writeFixture("shared/text.ts", "placeholderCopy('b')\n");

    const locations = findPlaceholderCopy([join(fixtureRoot, "app"), join(fixtureRoot, "shared")]);

    expect(locations).toHaveLength(2);
  });

  it("counts a call with a space before the parenthesis", () => {
    writeFixture("a.ts", "placeholderCopy ('spaced')\n");

    expect(findPlaceholderCopy([fixtureRoot])).toHaveLength(1);
  });

  it("ignores test folders, since tests may call the wrapper freely", () => {
    writeFixture("copy/__tests__/thing.spec.ts", "placeholderCopy('draft')\n");

    expect(findPlaceholderCopy([fixtureRoot])).toEqual([]);
  });

  it("ignores installed packages", () => {
    writeFixture("node_modules/some-package/index.js", "placeholderCopy('theirs')\n");

    expect(findPlaceholderCopy([fixtureRoot])).toEqual([]);
  });

  it("ignores an import of the wrapper, since only calls count", () => {
    writeFixture("model/vocabulary.ts", "import { placeholderCopy } from 'lifting-school-ui/placeholderCopy'\n");

    expect(findPlaceholderCopy([fixtureRoot])).toEqual([]);
  });

  it("only scans source files (.ts, .vue, .js)", () => {
    writeFixture("notes.md", "placeholderCopy('a note about the wrapper')\n");

    expect(findPlaceholderCopy([fixtureRoot])).toEqual([]);
  });
});

describe("the check-placeholder-copy command", () => {
  it("exits 0 when the copy is ready to ship", () => {
    writeFixture("model/vocabulary.ts", "export const LABEL = 'Hypertrophy'\n");

    const { exitCode, output } = runCommand([fixtureRoot]);

    expect(exitCode).toBe(0);
    expect(output).toContain("ready to ship");
  });

  it("exits 1 and lists each drafted text while any remains", () => {
    writeFixture("model/vocabulary.ts", "const b = placeholderCopy('Muscle growth.')\n");

    const { exitCode, output } = runCommand([fixtureRoot]);

    expect(exitCode).toBe(1);
    expect(output).toContain("1 drafted text(s)");
    expect(output).toContain("model/vocabulary.ts:1");
  });

  it("scans src when it is given no folder", () => {
    const result = spawnSync("node", [COMMAND], { encoding: "utf8", cwd: fixtureRoot });

    // The fixture folder has no src: the command fails to read it rather than reporting a clean project
    expect(result.status).not.toBe(0);
  });
});
