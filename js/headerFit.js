/**
 * Whether the site header's wide row fits in the room the header has, as plain arithmetic on widths the component measured.
 * SiteHeader gathers the numbers (it needs the page) and shows the phone menu when this says the row does not fit; keeping the
 * rule here, with no page in it, lets the bounds be tested exactly.
 */

/**
 * How far over the room the row may be and still count as fitting, in pixels. Browsers report widths to a fraction of a pixel
 * and round them differently, so a row measured at 915.3px in 915px of room is a rounding difference, not an overflow: nobody
 * can see it, and treating it as one would show the phone menu at a window where the row sits comfortably.
 */
export const SUBPIXEL_TOLERANCE_PX = 0.5;

/**
 * The widths of the parts of the header's bar that take room from the wide row, all in pixels and all independent of which
 * form (wide or phone) the header is showing, so the answer cannot change because of the answer.
 *
 * @typedef {object} HeaderWidths
 * @property {number} barWidth The bar's whole width, padding included.
 * @property {number} barPadding The bar's left and right padding added together.
 * @property {number} barGap The space between the bar's title (logo and name) and the end, where the row is.
 * @property {number} titleWidth The title's width (logo and name).
 * @property {number[]} statusWidths The width of each thing the project put before the row (the `status` slot), in order.
 * @property {number} endGap The space between two neighbours in the end, which is also between the last status and the row.
 */

/**
 * How much room the wide row has: the bar's inside width, less the title and its gap, less every status and the gap after it
 * (each status is followed by one gap, before the next status or the row).
 *
 * @param {HeaderWidths} widths What the header measured.
 * @returns {number} The room, in pixels; negative when the title and statuses alone overflow the bar.
 */
export function roomLeftForRow(widths) {
  const insideWidth = widths.barWidth - widths.barPadding;
  const titleAndGap = widths.titleWidth + widths.barGap;
  const statusesAndGaps = widths.statusWidths.reduce((total, width) => total + width + widths.endGap, 0);
  return insideWidth - titleAndGap - statusesAndGaps;
}

/**
 * Whether the row, at its natural width (nothing wrapped, squeezed or clipped), fits in the room.
 *
 * @param {number} naturalRowWidth The row's width as it lays out with all the room it wants, in pixels.
 * @param {number} roomForRow The room the header has for it, in pixels (see roomLeftForRow).
 * @returns {boolean} True when it fits, up to SUBPIXEL_TOLERANCE_PX of rounding; false when the phone menu should be shown.
 */
export function rowFits(naturalRowWidth, roomForRow) {
  return naturalRowWidth <= roomForRow + SUBPIXEL_TOLERANCE_PX;
}
