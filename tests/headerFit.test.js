import { describe, expect, it } from "vitest";
import { roomLeftForRow, rowFits, SUBPIXEL_TOLERANCE_PX } from "../js/headerFit.js";

/**
 * Whether the header's wide row fits: the room it has is what the bar leaves after the title and the statuses, and it fits
 * when its natural width is no more than that room, up to a rounding tolerance. Each bound is tested at the bound itself.
 */

/**
 * A bar 1000px wide with 16px of padding on each side, a 200px title, an 8px gap after it and no status: 760px of room.
 *
 * @param {Partial<import("../js/headerFit.js").HeaderWidths>} [changes] What differs from that bar.
 * @returns {import("../js/headerFit.js").HeaderWidths} The measured widths.
 */
function widths(changes = {}) {
  return { barWidth: 1000, barPadding: 32, barGap: 8, titleWidth: 200, statusWidths: [], endGap: 8, ...changes };
}

describe("roomLeftForRow", () => {
  it("is the bar's inside width less the title and its gap", () => {
    expect(roomLeftForRow(widths())).toBe(1000 - 32 - 200 - 8);
  });

  it("also takes away each status and the gap that follows it", () => {
    expect(roomLeftForRow(widths({ statusWidths: [60] }))).toBe(760 - 60 - 8);
    expect(roomLeftForRow(widths({ statusWidths: [60, 40] }))).toBe(760 - 60 - 8 - 40 - 8);
  });

  it("goes negative when the title alone is wider than the bar", () => {
    expect(roomLeftForRow(widths({ barWidth: 200 }))).toBeLessThan(0);
  });
});

describe("rowFits", () => {
  it("fits when the row is narrower than the room", () => {
    expect(rowFits(700, 760)).toBe(true);
  });

  it("fits at exactly the room", () => {
    expect(rowFits(760, 760)).toBe(true);
  });

  it("does not fit one pixel over", () => {
    expect(rowFits(761, 760)).toBe(false);
  });

  it("fits a sub-pixel rounding difference, up to the tolerance itself", () => {
    expect(rowFits(760 + SUBPIXEL_TOLERANCE_PX, 760)).toBe(true);
  });

  it("does not fit just past the tolerance", () => {
    expect(rowFits(760 + SUBPIXEL_TOLERANCE_PX + 0.01, 760)).toBe(false);
  });

  it("does not fit when there is no room at all, and a row of no width (not drawn) fits any room that is not negative", () => {
    expect(rowFits(1, -10)).toBe(false);
    expect(rowFits(0, 0)).toBe(true);
  });
});
