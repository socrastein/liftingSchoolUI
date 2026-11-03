/**
 * Where a page's fixed header ends. A site or app whose header is fixed to the top of the window marks that header with the
 * `data-fixed-header` attribute. The header is drawn over everything, so the strip it covers is not room a popup can use: one
 * that opened upward into it would slide underneath, out of sight. FloatingPanel (and any other popup that measures the room
 * it has) uses this as the top edge of the usable window.
 *
 * A browser-only module: call it while the page is showing (from an event or a computed value), never while rendering on a
 * server.
 */

/** The attribute a project puts on its fixed header. */
export const FIXED_HEADER_ATTRIBUTE = "data-fixed-header";

/**
 * The distance from the window's top to the fixed header's bottom edge.
 *
 * @returns {number} The header's bottom edge, in pixels; 0 when the page has no fixed header (or a component is mounted on its
 *   own, in a test).
 */
export function fixedHeaderBottom() {
  const header = document.querySelector(`[${FIXED_HEADER_ATTRIBUTE}]`);
  if (header === null) {
    return 0;
  }
  return header.getBoundingClientRect().bottom;
}
