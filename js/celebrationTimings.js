/**
 * When things happen in a celebration. The particles (celebrationParticles.js) and the sounds (celebrationSounds.js) both read
 * these, so a rocket's whistle or a confetti pop is heard at the moment it is seen. Times are seconds from the start of a
 * celebration that lasts `CELEBRATION_SECONDS`; a celebration asked to last longer or shorter spaces its bursts and rockets
 * further apart or closer together (`choreographyPace`), while each burst and rocket keeps its own speed.
 *
 * Plain JavaScript with no dependency on Vue or the browser, so it runs in Node tests.
 */

/** How long a celebration lasts unless the caller asks otherwise. */
export const CELEBRATION_SECONDS = 6;

/**
 * The shortest a caller can ask for: squeezed this far, the last confetti burst pops at 4.2 seconds and the last firework bursts
 * at 3.9 (its launch is squeezed, its flight is not), both before the fade begins, as they do in the default length.
 */
export const MIN_CELEBRATION_SECONDS = 5;

/** The longest a caller can ask for: a celebration is a moment, not a screensaver, and the page is under it the whole time. */
export const MAX_CELEBRATION_SECONDS = 10;

/** How long the calm version for people who ask for less motion stays: a still picture and the message, long enough to read. */
export const REDUCED_MOTION_SECONDS = 3;

/** How long the show fades out at its end. It is the library's `--durationSlow` (0.6s), which the overlay's fade uses in CSS. */
export const FADE_OUT_SECONDS = 0.6;

/**
 * How far into the show the calm version's still picture is taken, by celebration: late enough that several bursts or
 * rockets are on screen, early enough that none has faded.
 *
 * @type {Record<import("./celebrationNames.js").CelebrationName, number>}
 */
export const STILL_PICTURE_SECONDS = { confetti: 2, fireworks: 2.5 };

/**
 * Confetti goes off in bursts that work their way up the screen. `heightFraction` is how far down the screen a burst is (1 is the
 * bottom edge, 0 the top): the first burst is near the bottom, the last near the top. `widthFraction` is how far along the width.
 */
export const CONFETTI_BURSTS = /** @type {const} */ ([
  { atSeconds: 0.2, heightFraction: 0.88, widthFraction: 0.3 },
  { atSeconds: 1.4, heightFraction: 0.7, widthFraction: 0.7 },
  { atSeconds: 2.6, heightFraction: 0.52, widthFraction: 0.35 },
  { atSeconds: 3.8, heightFraction: 0.34, widthFraction: 0.65 },
  { atSeconds: 5.0, heightFraction: 0.16, widthFraction: 0.5 },
]);

/** How long a firework rocket takes to fly from the bottom edge up to where it bursts. */
export const FIREWORK_FLIGHT_SECONDS = 0.7;

/**
 * Each firework rocket: when it leaves the bottom edge, where along the width it flies (0 is the left edge, 1 the right), and how
 * far down the screen it bursts (0 is the top edge). Different heights and places, spread over the show.
 */
export const FIREWORK_ROCKETS = /** @type {const} */ ([
  { launchSeconds: 0.1, widthFraction: 0.25, burstHeightFraction: 0.3 },
  { launchSeconds: 0.85, widthFraction: 0.72, burstHeightFraction: 0.2 },
  { launchSeconds: 1.6, widthFraction: 0.5, burstHeightFraction: 0.42 },
  { launchSeconds: 2.35, widthFraction: 0.15, burstHeightFraction: 0.38 },
  { launchSeconds: 3.1, widthFraction: 0.85, burstHeightFraction: 0.25 },
  { launchSeconds: 3.85, widthFraction: 0.4, burstHeightFraction: 0.15 },
]);

/**
 * How long a celebration will last: the length the caller asked for, kept between the minimum and the maximum.
 *
 * @param {number | undefined} requestedSeconds What the caller asked for; undefined or not a finite number means the default.
 * @returns {number} Seconds, from `MIN_CELEBRATION_SECONDS` to `MAX_CELEBRATION_SECONDS`.
 */
export function clampCelebrationSeconds(requestedSeconds) {
  if (requestedSeconds === undefined || !Number.isFinite(requestedSeconds)) return CELEBRATION_SECONDS;
  return Math.min(MAX_CELEBRATION_SECONDS, Math.max(MIN_CELEBRATION_SECONDS, requestedSeconds));
}

/**
 * How much the bursts and rockets are spread out compared with the default length: 1 for a 6 second celebration, 1.5 for 9, so a
 * burst planned for 2 seconds in happens at 3.
 *
 * @param {number} celebrationSeconds How long the celebration lasts, already clamped.
 * @returns {number} The factor to multiply each planned time by.
 */
export function choreographyPace(celebrationSeconds) {
  return celebrationSeconds / CELEBRATION_SECONDS;
}
