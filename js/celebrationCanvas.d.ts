/**
 * Reads the show's colours from the page's tokens, so they follow the theme (light or dark) at the moment the celebration starts.
 *
 * @param {Element} element Any element on the page; the tokens are read as it sees them.
 * @returns {CelebrationPalette} The accent and the four plate colours for the pieces, the text colour for a rocket's head.
 */
export function readCelebrationPalette(element: Element): CelebrationPalette;
/**
 * How many canvas pixels to use per CSS pixel: the screen's own ratio, but never past `MAX_PIXEL_RATIO` and never so many that
 * the canvas holds more than `MAX_CANVAS_PIXELS`.
 *
 * @param {CelebrationArea} area The canvas's size in CSS pixels.
 * @param {number} devicePixelRatio The screen's ratio (1 on an ordinary screen, 2 or 3 on a sharp one); 0 or less means 1.
 * @returns {number} The ratio to draw at.
 */
export function canvasPixelRatio(area: CelebrationArea, devicePixelRatio: number): number;
/**
 * Runs a show on a canvas frame by frame, with requestAnimationFrame (which the browser pauses while the tab is hidden), until
 * the returned function is called.
 *
 * @param {HTMLCanvasElement} canvas The full-window canvas.
 * @param {CelebrationName} name Which celebration.
 * @param {CanvasShowSetup} setup The colours and the pace.
 * @returns {() => void} Stops the animation and clears the canvas; safe to call more than once.
 */
export function startShowOnCanvas(canvas: HTMLCanvasElement, name: CelebrationName, setup: CanvasShowSetup): () => void;
/**
 * Paints one still picture of a show, a few bursts or rockets in, with nothing moving afterward: the calm version for people who
 * ask for less motion.
 *
 * @param {HTMLCanvasElement} canvas The full-window canvas.
 * @param {CelebrationName} name Which celebration.
 * @param {CanvasShowSetup} setup The colours and the pace.
 */
export function drawStillShow(canvas: HTMLCanvasElement, name: CelebrationName, setup: CanvasShowSetup): void;
export type CelebrationName = import("./celebrationNames.js").CelebrationName;
export type CelebrationArea = import("./celebrationParticles.js").CelebrationArea;
export type CelebrationPalette = import("./celebrationParticles.js").CelebrationPalette;
/**
 * What the canvas needs besides the celebration's name.
 */
export type CanvasShowSetup = {
    palette: CelebrationPalette;
    /**
     * How far the planned times are stretched (see `choreographyPace`).
     */
    pace: number;
};
