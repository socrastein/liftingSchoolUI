/**
 * Which colour a plate is, following the colour coding of Rogue's competition plates, so a plate on the screen looks like
 * the plate in the gym. Plain JavaScript with no Vue or Nuxt imports, so it runs anywhere (the browser, Vitest in Node).
 *
 * Pounds: 55 red, 45 blue, 35 yellow, 25 green. Kilograms: 25 red, 20 blue, 15 yellow, 10 green. Every lighter plate is grey.
 * The colours themselves are the --plate… tokens in css/tokens.css (--plateRed for an edge or badge, --plateFaceRed for the
 * plate's own face), and each is also a variant of the badge (badgeRed and so on).
 */

/** @typedef {"red" | "blue" | "yellow" | "green" | "grey"} PlateColor The colours a plate can have. */

/**
 * Plate weight to colour, for plates of pounds.
 * @type {Record<number, PlateColor>}
 */
const POUND_COLORS = {
  55: "red",
  45: "blue",
  35: "yellow",
  25: "green",
};

/**
 * Plate weight to colour, for plates of kilograms.
 * @type {Record<number, PlateColor>}
 */
const KILO_COLORS = {
  25: "red",
  20: "blue",
  15: "yellow",
  10: "green",
};

/**
 * The colour of a plate. A custom plate gets the colour of the standard plate of the same weight, since it would be that
 * plate; any other weight is grey.
 *
 * @param {number} weight The plate's weight, in the unit given by `lbs`.
 * @param {boolean} lbs True for pounds, false for kilograms.
 * @returns {PlateColor} The plate's colour.
 */
export function plateColor(weight, lbs) {
  const colors = lbs ? POUND_COLORS : KILO_COLORS;
  return colors[weight] ?? "grey";
}
