/**
 * Puts a show on a canvas: sizes the canvas for the screen, reads the colours from the page's tokens, and either runs the show
 * frame by frame (`startShowOnCanvas`) or paints one still picture of it (`drawStillShow`, for people who ask for less motion).
 * The pieces come from celebrationParticles.js and are painted by celebrationDrawing.js.
 *
 * Plain JavaScript for the browser.
 */

import { drawShow } from "./celebrationDrawing.js";
import { createShow, fastForwardToStillPicture, stepShow } from "./celebrationParticles.js";

/** @typedef {import("./celebrationNames.js").CelebrationName} CelebrationName */
/** @typedef {import("./celebrationParticles.js").CelebrationArea} CelebrationArea */
/** @typedef {import("./celebrationParticles.js").CelebrationPalette} CelebrationPalette */

/**
 * What the canvas needs besides the celebration's name.
 *
 * @typedef {object} CanvasShowSetup
 * @property {CelebrationPalette} palette The colours, from `readCelebrationPalette`.
 * @property {number} pace How far the planned times are stretched (see `choreographyPace`).
 */

/** The sharpest the canvas is drawn: past 2 device pixels per CSS pixel the extra sharpness is invisible on moving particles. */
const MAX_PIXEL_RATIO = 2;
/**
 * The most pixels the canvas may hold: a 1920 by 1080 screen at ratio 1.2 is about 3 million, so the cap starts to bite there,
 * and a big screen at ratio 2 would be 4x the work of ratio 1.
 */
const MAX_CANVAS_PIXELS = 3_000_000;
/** The longest step of the show, in seconds: after a stall (a busy phone) the show carries on from where it was instead of jumping. */
const MAX_FRAME_SECONDS = 0.05;
/** requestAnimationFrame timestamps are in milliseconds; the show's steps are in seconds. */
const MILLISECONDS_PER_SECOND = 1000;
/** What the palette falls back to when a token is not defined (the library's CSS was not loaded): the canvas's own text colour. */
const MISSING_TOKEN_COLOR = "currentColor";

/**
 * Reads the show's colours from the page's tokens, so they follow the theme (light or dark) at the moment the celebration starts.
 *
 * @param {Element} element Any element on the page; the tokens are read as it sees them.
 * @returns {CelebrationPalette} The accent and the four plate colours for the pieces, the text colour for a rocket's head.
 */
export function readCelebrationPalette(element) {
  const styles = getComputedStyle(element);
  const token = (/** @type {string} */ name) => styles.getPropertyValue(name).trim() || MISSING_TOKEN_COLOR;
  return {
    pieces: ["--accentFull", "--plateRed", "--plateYellow", "--plateGreen", "--plateBlue"].map(token),
    rocketHead: token("--textFull"),
  };
}

/**
 * How many canvas pixels to use per CSS pixel: the screen's own ratio, but never past `MAX_PIXEL_RATIO` and never so many that
 * the canvas holds more than `MAX_CANVAS_PIXELS`.
 *
 * @param {CelebrationArea} area The canvas's size in CSS pixels.
 * @param {number} devicePixelRatio The screen's ratio (1 on an ordinary screen, 2 or 3 on a sharp one); 0 or less means 1.
 * @returns {number} The ratio to draw at.
 */
export function canvasPixelRatio(area, devicePixelRatio) {
  const screenRatio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  const wantedRatio = Math.min(screenRatio, MAX_PIXEL_RATIO);
  const ratioAtPixelLimit = Math.sqrt(MAX_CANVAS_PIXELS / (area.width * area.height));
  return Math.min(wantedRatio, ratioAtPixelLimit);
}

/**
 * Sizes the canvas's drawing surface for the screen and returns the size it covers. A canvas with no layout size (tests) falls
 * back to the window.
 *
 * @param {HTMLCanvasElement} canvas The full-window canvas.
 * @param {CanvasRenderingContext2D} context Its 2D context, scaled here so the show is drawn in CSS pixels.
 * @returns {CelebrationArea} The size in CSS pixels.
 */
function fitCanvas(canvas, context) {
  const box = canvas.getBoundingClientRect();
  const area = {
    width: box.width > 0 ? box.width : window.innerWidth,
    height: box.height > 0 ? box.height : window.innerHeight,
  };
  const ratio = canvasPixelRatio(area, window.devicePixelRatio);
  canvas.width = Math.round(area.width * ratio);
  canvas.height = Math.round(area.height * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return area;
}

/**
 * The time between two animation frames, in seconds. The first frame has no earlier one, so it counts as no time passing.
 *
 * @param {number | null} previousTimestamp The previous frame's timestamp in milliseconds, or null before the first frame.
 * @param {number} timestamp This frame's timestamp in milliseconds.
 * @returns {number} Seconds since the previous frame; 0 on the first frame.
 */
function secondsBetween(previousTimestamp, timestamp) {
  if (previousTimestamp === null) return 0;
  return (timestamp - previousTimestamp) / MILLISECONDS_PER_SECOND;
}

/**
 * Runs a show on a canvas frame by frame, with requestAnimationFrame (which the browser pauses while the tab is hidden), until
 * the returned function is called.
 *
 * @param {HTMLCanvasElement} canvas The full-window canvas.
 * @param {CelebrationName} name Which celebration.
 * @param {CanvasShowSetup} setup The colours and the pace.
 * @returns {() => void} Stops the animation and clears the canvas; safe to call more than once.
 */
export function startShowOnCanvas(canvas, name, setup) {
  const context = canvas.getContext("2d");
  if (context === null) return () => {};
  const area = fitCanvas(canvas, context);
  const show = createShow(name, { ...setup, area });
  /** @type {number | null} */
  let lastTimestamp = null;
  let frameHandle = 0;

  /** Moves the show on by the time since the previous frame and paints it. */
  const drawFrame = (/** @type {number} */ timestamp) => {
    const secondsSinceLastFrame = secondsBetween(lastTimestamp, timestamp);
    lastTimestamp = timestamp;
    stepShow(show, Math.min(secondsSinceLastFrame, MAX_FRAME_SECONDS));
    drawShow(context, show);
    frameHandle = requestAnimationFrame(drawFrame);
  };
  frameHandle = requestAnimationFrame(drawFrame);

  return () => {
    cancelAnimationFrame(frameHandle);
    context.clearRect(0, 0, area.width, area.height);
  };
}

/**
 * Paints one still picture of a show, a few bursts or rockets in, with nothing moving afterward: the calm version for people who
 * ask for less motion.
 *
 * @param {HTMLCanvasElement} canvas The full-window canvas.
 * @param {CelebrationName} name Which celebration.
 * @param {CanvasShowSetup} setup The colours and the pace.
 */
export function drawStillShow(canvas, name, setup) {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const area = fitCanvas(canvas, context);
  const show = createShow(name, { ...setup, area });
  fastForwardToStillPicture(show);
  drawShow(context, show);
}
