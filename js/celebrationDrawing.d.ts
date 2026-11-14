/**
 * Clears the canvas and paints every piece of the show, each fading out over the end of its life.
 *
 * @param {CanvasRenderingContext2D} context The canvas's 2D context, already scaled to CSS pixels.
 * @param {Show} show The show to paint.
 */
export function drawShow(context: CanvasRenderingContext2D, show: Show): void;
export type Show = import("./celebrationParticles.js").Show;
export type Particle = import("./celebrationParticles.js").Particle;
export type CelebrationPalette = import("./celebrationParticles.js").CelebrationPalette;
