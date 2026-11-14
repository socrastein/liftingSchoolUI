/**
 * The particle shows behind the celebrations: confetti bursts and firework rockets, as plain data that moves forward in time. This
 * file only decides where every piece is and when new ones appear; celebrationDrawing.js paints them and celebrationCanvas.js
 * runs them on a canvas. The choreography (when each burst or rocket happens) is in celebrationTimings.js.
 *
 * Plain JavaScript with no dependency on Vue or the browser, so it runs in Node tests. Nothing here or in the drawing flashes: every
 * effect is small shapes moving on a transparent canvas, with no full-screen change of colour, so it stays far under three flashes
 * a second.
 */

import { CONFETTI_BURSTS, FIREWORK_FLIGHT_SECONDS, FIREWORK_ROCKETS, STILL_PICTURE_SECONDS } from "./celebrationTimings.js";

/** @typedef {import("./celebrationNames.js").CelebrationName} CelebrationName */

/**
 * The size of the screen a show plays on, in CSS pixels.
 *
 * @typedef {object} CelebrationArea
 * @property {number} width
 * @property {number} height
 */

/**
 * The colours of a show, read from the page's tokens (celebrationCanvas.js) because a canvas cannot use `var()`.
 *
 * @typedef {object} CelebrationPalette
 * @property {string[]} pieces The colours confetti pieces and firework bursts take (the accent and the plate colours).
 * @property {string} rocketHead The bright head of a rocket (the theme's text colour, so it shows on both light and dark).
 */

/**
 * One piece of confetti, popped outward from a burst and fluttering down.
 *
 * @typedef {object} ConfettiPiece
 * @property {"confetti"} kind
 * @property {number} x Pixels from the left of the screen.
 * @property {number} y Pixels from the top.
 * @property {number} velocityX Pixels per second.
 * @property {number} velocityY Pixels per second, positive is down.
 * @property {number} rotation Radians.
 * @property {number} spin Radians per second.
 * @property {number} size Pixels along its long side.
 * @property {string} color
 * @property {number} age Seconds alive.
 * @property {number} lifetime Seconds until it is gone.
 * @property {number} wobblePhase Where its flutter starts, in radians, so the pieces do not flutter in step.
 */

/**
 * One spark of a firework burst.
 *
 * @typedef {object} Spark
 * @property {"spark"} kind
 * @property {number} x
 * @property {number} y
 * @property {number} velocityX Pixels per second.
 * @property {number} velocityY Pixels per second, positive is down.
 * @property {number} size Radius in pixels.
 * @property {string} color
 * @property {number} age Seconds alive.
 * @property {number} lifetime Seconds until it is gone.
 */

/**
 * A rocket flying straight up from the bottom edge to where it will burst, leaving a trail.
 *
 * @typedef {object} Rocket
 * @property {"rocket"} kind
 * @property {number} x Constant: a rocket flies straight up.
 * @property {number} y
 * @property {number} velocityY Pixels per second, negative is up.
 * @property {string} color The colour of the burst it ends in, also the colour of its trail.
 * @property {number} age Seconds alive.
 * @property {number} lifetime Seconds until it arrives and bursts.
 * @property {{ x: number, y: number }[]} trail Where it has been recently, newest last.
 */

/** @typedef {ConfettiPiece | Spark | Rocket} Particle */

/**
 * A show in progress.
 *
 * @typedef {object} Show
 * @property {CelebrationName} name
 * @property {Particle[]} particles Everything on screen now.
 * @property {number} elapsedSeconds Seconds since the show began.
 * @property {number} nextLaunchIndex How many bursts (confetti) or rockets (fireworks) have been launched so far.
 * @property {CelebrationArea} area
 * @property {CelebrationPalette} palette
 * @property {number} pace How far the planned times are stretched (see `choreographyPace`).
 * @property {() => number} random Gives a number from 0 up to but not including 1, `Math.random` unless a test says otherwise.
 */

/**
 * What a caller gives to start a show.
 *
 * @typedef {object} ShowSetup
 * @property {CelebrationArea} area
 * @property {CelebrationPalette} palette
 * @property {number} pace
 * @property {() => number} [random] Defaults to `Math.random`.
 */

/**
 * The most pieces on screen at once, so a slow phone never drowns. The shows peak far below it (about 300 for confetti, 150 for
 * fireworks); it is a guard, not a tuning knob.
 */
export const MAX_PARTICLES = 600;

/** Pieces in one confetti burst. */
const CONFETTI_PER_BURST = 50;
/** Sparks in one firework burst. */
const FIREWORK_SPARKS = 70;
/** Positions kept for a rocket's trail. */
const TRAIL_LENGTH = 16;
/** How far below the screen a piece may fall before it is dropped, in pixels. */
const CULL_MARGIN_PIXELS = 120;
/** The step the fast-forward to a still picture takes: one frame at 60 per second. */
const STILL_STEP_SECONDS = 1 / 60;

/**
 * How the loose pieces of each show move: gravity in pixels per second squared, drag as the fraction of speed kept each second
 * (1 is none). Confetti is light and slows fast; fireworks sparks arc further.
 *
 * @type {Record<CelebrationName, { gravity: number, drag: number }>}
 */
const PHYSICS = {
  confetti: { gravity: 170, drag: 0.4 },
  fireworks: { gravity: 140, drag: 0.25 },
};

/**
 * Launches whatever of a show's plan is due by now: one handler for each celebration.
 *
 * @type {Record<CelebrationName, (show: Show) => void>}
 */
const LAUNCHERS = {
  confetti: launchDueConfettiBurst,
  fireworks: launchDueRocket,
};

/**
 * Starts a show with nothing on screen yet and its clock at zero.
 *
 * @param {CelebrationName} name Which celebration.
 * @param {ShowSetup} setup The screen, the colours and the pace.
 * @returns {Show} A show to move forward with `stepShow`.
 */
export function createShow(name, setup) {
  const { area, palette, pace, random = Math.random } = setup;
  return { name, particles: [], elapsedSeconds: 0, nextLaunchIndex: 0, area, palette, pace, random };
}

/**
 * Moves a show forward in time: launches what is due, moves every piece, bursts the rockets that arrived and drops the pieces
 * that are done.
 *
 * @param {Show} show The show, changed in place.
 * @param {number} seconds How much time has passed since the last step.
 */
export function stepShow(show, seconds) {
  show.elapsedSeconds += seconds;
  LAUNCHERS[show.name](show);
  for (const particle of show.particles) moveParticle(show, particle, seconds);
  burstArrivedRockets(show);
  show.particles = show.particles.filter((particle) => isStillVisible(show, particle));
}

/**
 * Runs a show forward at 60 steps per second to the moment its still picture is taken (for people who ask for less motion).
 *
 * @param {Show} show A show that has not started, changed in place.
 */
export function fastForwardToStillPicture(show) {
  const stillPictureSeconds = STILL_PICTURE_SECONDS[show.name];
  while (show.elapsedSeconds < stillPictureSeconds) stepShow(show, STILL_STEP_SECONDS);
}

/**
 * A random number in a range.
 *
 * @param {Show} show Supplies the random numbers.
 * @param {number} minimum Included.
 * @param {number} maximum Never reached.
 * @returns {number}
 */
function randomBetween(show, minimum, maximum) {
  return minimum + show.random() * (maximum - minimum);
}

/**
 * A random colour of the show's palette.
 *
 * @param {Show} show Supplies the random numbers and the palette.
 * @returns {string}
 */
function randomPieceColor(show) {
  const index = Math.floor(show.random() * show.palette.pieces.length);
  return show.palette.pieces[index] ?? show.palette.rocketHead;
}

/**
 * Puts a piece on screen unless the screen is already at `MAX_PARTICLES`.
 *
 * @param {Show} show The show the piece joins.
 * @param {Particle} particle The new piece.
 */
function addParticle(show, particle) {
  if (show.particles.length < MAX_PARTICLES) show.particles.push(particle);
}

/**
 * Pops the next confetti burst when its time has come (stretched by the show's pace): the first near the bottom, each next one
 * higher.
 *
 * @param {Show} show The show, changed in place.
 */
function launchDueConfettiBurst(show) {
  const burst = CONFETTI_BURSTS[show.nextLaunchIndex];
  if (burst === undefined || show.elapsedSeconds < burst.atSeconds * show.pace) return;
  show.nextLaunchIndex++;
  const centreX = show.area.width * burst.widthFraction;
  const centreY = show.area.height * burst.heightFraction;
  for (let count = 0; count < CONFETTI_PER_BURST; count++) {
    addParticle(show, createConfettiPiece(show, centreX, centreY));
  }
}

/**
 * One confetti piece popped outward from a burst's centre, in a fan that points upward.
 *
 * @param {Show} show Supplies the random numbers and the palette.
 * @param {number} x Where the burst is, pixels from the left.
 * @param {number} y Where the burst is, pixels from the top.
 * @returns {ConfettiPiece}
 */
function createConfettiPiece(show, x, y) {
  const angle = randomBetween(show, -Math.PI * 0.95, -Math.PI * 0.05);
  const speed = randomBetween(show, 220, 620);
  return {
    kind: "confetti",
    x,
    y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    rotation: randomBetween(show, 0, Math.PI * 2),
    spin: randomBetween(show, -9, 9),
    size: randomBetween(show, 7, 13),
    color: randomPieceColor(show),
    age: 0,
    // Long enough to drift down until the next burst
    lifetime: randomBetween(show, 3, 4.5),
    wobblePhase: randomBetween(show, 0, Math.PI * 2),
  };
}

/**
 * Launches the next firework rocket when its time has come (stretched by the show's pace). It bursts where it arrives (see
 * `burstArrivedRockets`).
 *
 * @param {Show} show The show, changed in place.
 */
function launchDueRocket(show) {
  const plan = FIREWORK_ROCKETS[show.nextLaunchIndex];
  if (plan === undefined || show.elapsedSeconds < plan.launchSeconds * show.pace) return;
  show.nextLaunchIndex++;
  const targetY = show.area.height * plan.burstHeightFraction;
  addParticle(show, createRocket(show, show.area.width * plan.widthFraction, targetY));
}

/**
 * A rocket at the bottom edge, flying straight up to `targetY` in `FIREWORK_FLIGHT_SECONDS`.
 *
 * @param {Show} show Supplies the screen, the random numbers and the palette.
 * @param {number} x Where it flies, pixels from the left.
 * @param {number} targetY Where it bursts, pixels from the top.
 * @returns {Rocket}
 */
function createRocket(show, x, targetY) {
  return {
    kind: "rocket",
    x,
    y: show.area.height,
    velocityY: -(show.area.height - targetY) / FIREWORK_FLIGHT_SECONDS,
    color: randomPieceColor(show),
    age: 0,
    lifetime: FIREWORK_FLIGHT_SECONDS,
    trail: [],
  };
}

/**
 * Bursts every rocket that has arrived: a ball of sparks where the rocket was, in its colour.
 *
 * @param {Show} show The show, changed in place.
 */
function burstArrivedRockets(show) {
  for (const particle of show.particles) {
    if (particle.kind !== "rocket" || particle.age < particle.lifetime) continue;
    for (let count = 0; count < FIREWORK_SPARKS; count++) {
      addParticle(show, createSpark(show, particle));
    }
  }
}

/**
 * One spark flying out of a rocket's burst in a random direction.
 *
 * @param {Show} show Supplies the random numbers.
 * @param {Rocket} rocket The rocket that burst, which gives the place and the colour.
 * @returns {Spark}
 */
function createSpark(show, rocket) {
  const angle = randomBetween(show, 0, Math.PI * 2);
  const speed = randomBetween(show, 60, 340);
  return {
    kind: "spark",
    x: rocket.x,
    y: rocket.y,
    velocityX: Math.cos(angle) * speed,
    velocityY: Math.sin(angle) * speed,
    size: randomBetween(show, 2, 3.5),
    color: rocket.color,
    age: 0,
    lifetime: randomBetween(show, 1, 1.6),
  };
}

/**
 * Moves one piece forward in time.
 *
 * @param {Show} show Gives the physics of this show.
 * @param {Particle} particle The piece, changed in place.
 * @param {number} seconds How much time has passed.
 */
function moveParticle(show, particle, seconds) {
  particle.age += seconds;
  if (particle.kind === "rocket") {
    moveRocket(particle, seconds);
    return;
  }
  const { gravity, drag } = PHYSICS[show.name];
  const speedKept = Math.pow(drag, seconds);
  particle.velocityY += gravity * seconds;
  particle.velocityX *= speedKept;
  particle.velocityY *= speedKept;
  particle.x += particle.velocityX * seconds;
  particle.y += particle.velocityY * seconds;
  if (particle.kind === "confetti") particle.rotation += particle.spin * seconds;
}

/**
 * Moves a rocket straight up (no gravity or drag) and adds its old place to its trail.
 *
 * @param {Rocket} rocket The rocket, changed in place.
 * @param {number} seconds How much time has passed.
 */
function moveRocket(rocket, seconds) {
  rocket.trail.push({ x: rocket.x, y: rocket.y });
  if (rocket.trail.length > TRAIL_LENGTH) rocket.trail.shift();
  rocket.y += rocket.velocityY * seconds;
}

/**
 * Whether a piece should stay: it has not lived out its time and has not fallen well below the screen.
 *
 * @param {Show} show Gives the screen.
 * @param {Particle} particle The piece.
 * @returns {boolean}
 */
function isStillVisible(show, particle) {
  const hasTimeLeft = particle.age < particle.lifetime;
  const isOnOrAboveScreen = particle.y < show.area.height + CULL_MARGIN_PIXELS;
  return hasTimeLeft && isOnOrAboveScreen;
}
