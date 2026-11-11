/**
 * Where a FloatingPanel (components/FloatingPanel.vue) is drawn above or below its anchor, and how tall it may be. Plain
 * arithmetic with no Vue or DOM, so it is tested in Node; the component measures the boxes, passes them in, and is its only
 * user.
 *
 * A panel opens below its anchor when it fits there, and above when it fits only there. When it fits on neither side (a tall
 * card beside an anchor half-way down the window), it opens on the side with more room, cut to that room, and scrolls inside.
 * Left at full height, it would run off the window, and a panel fixed to the window can never be scrolled to.
 */

/** The gap between the anchor and the panel. */
export const PANEL_GAP_PX = 4;

/** The gap kept between the panel and the window's edges (or the fixed header). */
export const PANEL_EDGE_MARGIN_PX = 8;

/**
 * @typedef {object} PanelRoom The boxes a placement is worked out from, in pixels from the window's top.
 * @property {number} anchorTop The anchor's top edge.
 * @property {number} anchorBottom The anchor's bottom edge.
 * @property {number} panelHeight The panel's full height, uncut: what its content needs. It must be measured from the
 *   content, never from the cut panel, so cutting the panel cannot change the side it is on.
 * @property {number} windowHeight The window's height.
 * @property {number} headerBottom Where the page's fixed header ends (fixedHeader.js); 0 when there is none.
 */

/**
 * @typedef {object} PanelPlacement
 * @property {"below" | "above"} side The side of the anchor the panel opens on.
 * @property {number} top The panel's top edge, in pixels from the window's top.
 * @property {number | undefined} maxHeight The height the panel is cut to (it scrolls inside); undefined when it fits whole.
 */

/**
 * The side a panel opens on, its top edge, and its height when it has to be cut to fit.
 *
 * @param {PanelRoom} room The anchor's box, the panel's full height and the window's usable height.
 * @returns {PanelPlacement} Below when it fits there, else above when it fits there, else the roomier side, cut to its room.
 */
export function placePanel(room) {
  const topWhenBelow = room.anchorBottom + PANEL_GAP_PX;
  const roomBelow = room.windowHeight - PANEL_EDGE_MARGIN_PX - topWhenBelow;
  // Above ends at the fixed header, not the window's top: the header is drawn over everything.
  const roomAbove = room.anchorTop - PANEL_GAP_PX - (room.headerBottom + PANEL_EDGE_MARGIN_PX);
  const side = sideWithRoom(room.panelHeight, roomBelow, roomAbove);

  // An anchor scrolled almost out of the window leaves no room at all, never less.
  const roomOnSide = Math.max(0, side === "below" ? roomBelow : roomAbove);
  const isCut = room.panelHeight > roomOnSide;
  const shownHeight = isCut ? roomOnSide : room.panelHeight;
  // Above, the panel's bottom sits on the anchor, so its top depends on the height it is shown at.
  const topWhenAbove = room.anchorTop - PANEL_GAP_PX - shownHeight;
  const top = side === "below" ? topWhenBelow : topWhenAbove;
  return { side, top, maxHeight: isCut ? roomOnSide : undefined };
}

/**
 * Below when the panel fits there (the usual place), above when it fits only there, else whichever side has more room
 * (below on a tie).
 *
 * @param {number} panelHeight The panel's full height.
 * @param {number} roomBelow The room under the anchor.
 * @param {number} roomAbove The room over it, under the fixed header.
 * @returns {"below" | "above"} The side to open on.
 */
function sideWithRoom(panelHeight, roomBelow, roomAbove) {
  if (panelHeight <= roomBelow) return "below";
  if (panelHeight <= roomAbove) return "above";
  return roomAbove > roomBelow ? "above" : "below";
}
