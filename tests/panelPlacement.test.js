import { describe, expect, it } from "vitest";
import { PANEL_EDGE_MARGIN_PX, PANEL_GAP_PX, placePanel } from "../js/panelPlacement.js";

/**
 * Where a FloatingPanel opens: below its anchor when it fits, above when it fits only there, and otherwise on the roomier
 * side, cut to that room so it scrolls instead of running off the window. Each bound is tested at the bound itself.
 */

/**
 * A 1000px window with a 50px header, and a 20px anchor whose top is at `anchorTop`.
 *
 * @param {number} anchorTop The anchor's top edge.
 * @param {number} panelHeight The panel's full height.
 * @returns {import("../js/panelPlacement.js").PanelRoom} The room to place it in.
 */
function roomFor(anchorTop, panelHeight) {
  return { anchorTop, anchorBottom: anchorTop + 20, panelHeight, windowHeight: 1000, headerBottom: 50 };
}

/**
 * The room under an anchor at `anchorTop` in that window: down to the window's bottom margin.
 *
 * @param {number} anchorTop The anchor's top edge.
 * @returns {number} The room, in pixels.
 */
function roomBelow(anchorTop) {
  return 1000 - PANEL_EDGE_MARGIN_PX - (anchorTop + 20 + PANEL_GAP_PX);
}

/**
 * The room over an anchor at `anchorTop` in that window: up to the header's bottom margin.
 *
 * @param {number} anchorTop The anchor's top edge.
 * @returns {number} The room, in pixels.
 */
function roomAbove(anchorTop) {
  return anchorTop - PANEL_GAP_PX - (50 + PANEL_EDGE_MARGIN_PX);
}

describe("placePanel", () => {
  it("opens below, whole, when the panel exactly fills the room there", () => {
    const placement = placePanel(roomFor(600, roomBelow(600)));

    expect(placement).toEqual({ side: "below", top: 600 + 20 + PANEL_GAP_PX, maxHeight: undefined });
  });

  it("opens above, whole, when it is one pixel too tall for below and fits above", () => {
    const panelHeight = roomBelow(600) + 1;

    const placement = placePanel(roomFor(600, panelHeight));

    expect(placement).toEqual({ side: "above", top: 600 - PANEL_GAP_PX - panelHeight, maxHeight: undefined });
  });

  it("opens above, whole, when the panel exactly fills the room there, its top just under the header", () => {
    const placement = placePanel(roomFor(600, roomAbove(600)));

    expect(placement.side).toBe("above");
    expect(placement.top).toBe(50 + PANEL_EDGE_MARGIN_PX);
    expect(placement.maxHeight).toBeUndefined();
  });

  it("when it fits on neither side, opens on the roomier one, cut to that room", () => {
    // An anchor half-way down: more room below than above, and a panel taller than both.
    const placement = placePanel(roomFor(450, 900));

    expect(placement).toEqual({ side: "below", top: 450 + 20 + PANEL_GAP_PX, maxHeight: roomBelow(450) });
  });

  it("when the roomier side is above, the cut panel's top sits just under the header", () => {
    const placement = placePanel(roomFor(700, 900));

    expect(placement.side).toBe("above");
    expect(placement.maxHeight).toBe(roomAbove(700));
    expect(placement.top).toBe(50 + PANEL_EDGE_MARGIN_PX);
  });

  it("opens below on a tie", () => {
    // Equal room both sides: anchorTop such that roomBelow === roomAbove.
    const anchorTop = (1000 - PANEL_EDGE_MARGIN_PX - 20 + 50 + PANEL_EDGE_MARGIN_PX) / 2;
    expect(roomBelow(anchorTop)).toBe(roomAbove(anchorTop));

    expect(placePanel(roomFor(anchorTop, 2000)).side).toBe("below");
  });

  it("cuts to no height, never a negative one, when neither side has any room", () => {
    // A header reaching almost to the window's bottom, and an anchor squeezed between them.
    const placement = placePanel({ anchorTop: 980, anchorBottom: 1000, panelHeight: 300, windowHeight: 990, headerBottom: 975 });

    expect(placement.maxHeight).toBe(0);
  });
});
