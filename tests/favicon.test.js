import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The browser-tab icon every product shares (icons/favicon/): the files must exist, be the sizes their names say, and the SVG
 * must scale to any size.
 */

const FAVICON_FOLDER = new URL("../icons/favicon/", import.meta.url);

/** Reads a PNG's width and height from its IHDR chunk (bytes 16-23, big-endian). */
function readPngSize(/** @type {string} */ fileName) {
  const bytes = readFileSync(new URL(fileName, FAVICON_FOLDER));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

describe("favicon", () => {
  it.each([32, 48])("favicon-%i.png is that many pixels square", (size) => {
    expect(readPngSize(`favicon-${size}.png`)).toEqual({ width: size, height: size });
  });

  it("favicon.svg has a viewBox and no fixed width or height, so it scales to any tab size", () => {
    const svg = readFileSync(new URL("favicon.svg", FAVICON_FOLDER), "utf8");
    const rootTag = svg.match(/<svg\b[^>]*>/)?.[0] ?? "";
    expect(rootTag).toMatch(/\sviewBox="/);
    expect(rootTag).not.toMatch(/\swidth=/);
    expect(rootTag).not.toMatch(/\sheight=/);
  });
});
