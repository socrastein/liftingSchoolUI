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
export function placePanel(room: PanelRoom): PanelPlacement;
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
export const PANEL_GAP_PX: 4;
/** The gap kept between the panel and the window's edges (or the fixed header). */
export const PANEL_EDGE_MARGIN_PX: 8;
/**
 * The boxes a placement is worked out from, in pixels from the window's top.
 */
export type PanelRoom = {
    /**
     * The anchor's top edge.
     */
    anchorTop: number;
    /**
     * The anchor's bottom edge.
     */
    anchorBottom: number;
    /**
     * The panel's full height, uncut: what its content needs. It must be measured from the
     * content, never from the cut panel, so cutting the panel cannot change the side it is on.
     */
    panelHeight: number;
    /**
     * The window's height.
     */
    windowHeight: number;
    /**
     * Where the page's fixed header ends (fixedHeader.js); 0 when there is none.
     */
    headerBottom: number;
};
export type PanelPlacement = {
    /**
     * The side of the anchor the panel opens on.
     */
    side: "below" | "above";
    /**
     * The panel's top edge, in pixels from the window's top.
     */
    top: number;
    /**
     * The height the panel is cut to (it scrolls inside); undefined when it fits whole.
     */
    maxHeight: number | undefined;
};
