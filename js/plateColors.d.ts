/**
 * The colour of a plate. A custom plate gets the colour of the standard plate of the same weight, since it would be that
 * plate; any other weight is grey.
 *
 * @param {number} weight The plate's weight, in the unit given by `lbs`.
 * @param {boolean} lbs True for pounds, false for kilograms.
 * @returns {PlateColor} The plate's colour.
 */
export function plateColor(weight: number, lbs: boolean): PlateColor;
/**
 * The colours a plate can have.
 */
export type PlateColor = "red" | "blue" | "yellow" | "green" | "grey";
