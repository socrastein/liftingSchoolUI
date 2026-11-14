/**
 * The names of the celebrations, the one list every part of a celebration reads: the particles, the sounds, the timings and the
 * CelebrationOverlay component. A new celebration is a new name here plus an entry in each table that is keyed by `CelebrationName`
 * (the type checker lists the ones that are missing).
 *
 * Plain JavaScript with no dependency on Vue or the browser, so it runs in Node tests.
 */

/** Every celebration there is, in the order the showcase lists them. */
export const CELEBRATION_NAMES = /** @type {const} */ (["confetti", "fireworks"]);

/**
 * One celebration: "confetti" is five bursts climbing the screen from bottom to top; "fireworks" is six rockets rising from the
 * bottom edge, each bursting where it arrives.
 *
 * @typedef {(typeof CELEBRATION_NAMES)[number]} CelebrationName
 */

/**
 * Whether a value is the name of a celebration.
 *
 * @param {unknown} value Anything, such as a string that came from a setting or a URL.
 * @returns {value is CelebrationName} True for a name in `CELEBRATION_NAMES`.
 */
export function isCelebrationName(value) {
  return CELEBRATION_NAMES.some((name) => name === value);
}
