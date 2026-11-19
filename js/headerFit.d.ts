/**
 * The widths of the parts of the header's bar that take room from the wide row, all in pixels and all independent of which
 * form (wide or phone) the header is showing, so the answer cannot change because of the answer.
 *
 * @typedef {object} HeaderWidths
 * @property {number} barWidth The bar's whole width, padding included.
 * @property {number} barPadding The bar's left and right padding added together.
 * @property {number} barGap The space between the bar's title (logo and name) and the end, where the row is.
 * @property {number} titleWidth The title's width with its name shown (logo, gap and name), whether or not the name is hidden now.
 * @property {number[]} statusWidths The width of each thing the project put before the row (the `status` slot), in order.
 * @property {number} endGap The space between two neighbours in the end, which is also between the last status and the row.
 * @property {number} menuWidth The Menu button's block (with the bell beside it, when there is one): what the phone form takes at the end.
 */
/**
 * How much room the wide row has: the bar's inside width, less the title and its gap, less every status and the gap after it
 * (each status is followed by one gap, before the next status or the row).
 *
 * @param {HeaderWidths} widths What the header measured.
 * @returns {number} The room, in pixels; negative when the title and statuses alone overflow the bar.
 */
export function roomLeftForRow(widths: HeaderWidths): number;
/**
 * Whether the row, at its natural width (nothing wrapped, squeezed or clipped), fits in the room.
 *
 * @param {number} naturalRowWidth The row's width as it lays out with all the room it wants, in pixels.
 * @param {number} roomForRow The room the header has for it, in pixels (see roomLeftForRow).
 * @returns {boolean} True when it fits, up to SUBPIXEL_TOLERANCE_PX of rounding; false when the phone menu should be shown.
 */
export function rowFits(naturalRowWidth: number, roomForRow: number): boolean;
/**
 * Whether the title's name fits on the bar beside the things at the end that the phone form always shows: the statuses and the
 * Menu button's block. The name is hidden (the logo alone shows) only when this is false, so it hides only where it would
 * collide with the Menu button or overflow the bar, never because of a fixed width.
 *
 * @param {HeaderWidths} widths What the header measured, with the name's width included in titleWidth.
 * @returns {boolean} True when the name can stay; false when it must be hidden.
 */
export function nameFitsBesideMenu(widths: HeaderWidths): boolean;
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
export const SUBPIXEL_TOLERANCE_PX: 0.5;
/**
 * The widths of the parts of the header's bar that take room from the wide row, all in pixels and all independent of which
 * form (wide or phone) the header is showing, so the answer cannot change because of the answer.
 */
export type HeaderWidths = {
    /**
     * The bar's whole width, padding included.
     */
    barWidth: number;
    /**
     * The bar's left and right padding added together.
     */
    barPadding: number;
    /**
     * The space between the bar's title (logo and name) and the end, where the row is.
     */
    barGap: number;
    /**
     * The title's width with its name shown (logo, gap and name), whether or not the name is hidden now.
     */
    titleWidth: number;
    /**
     * The width of each thing the project put before the row (the `status` slot), in order.
     */
    statusWidths: number[];
    /**
     * The space between two neighbours in the end, which is also between the last status and the row.
     */
    endGap: number;
    /**
     * The Menu button's block (with the bell beside it, when there is one): what the phone form takes at the end.
     */
    menuWidth: number;
};
