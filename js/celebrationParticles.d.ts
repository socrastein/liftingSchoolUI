/**
 * Starts a show with nothing on screen yet and its clock at zero.
 *
 * @param {CelebrationName} name Which celebration.
 * @param {ShowSetup} setup The screen, the colours and the pace.
 * @returns {Show} A show to move forward with `stepShow`.
 */
export function createShow(name: CelebrationName, setup: ShowSetup): Show;
/**
 * Moves a show forward in time: launches what is due, moves every piece, bursts the rockets that arrived and drops the pieces
 * that are done.
 *
 * @param {Show} show The show, changed in place.
 * @param {number} seconds How much time has passed since the last step.
 */
export function stepShow(show: Show, seconds: number): void;
/**
 * Runs a show forward at 60 steps per second to the moment its still picture is taken (for people who ask for less motion).
 *
 * @param {Show} show A show that has not started, changed in place.
 */
export function fastForwardToStillPicture(show: Show): void;
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
export const MAX_PARTICLES: 600;
export type CelebrationName = import("./celebrationNames.js").CelebrationName;
/**
 * The size of the screen a show plays on, in CSS pixels.
 */
export type CelebrationArea = {
    width: number;
    height: number;
};
/**
 * The colours of a show, read from the page's tokens (celebrationCanvas.js) because a canvas cannot use `var()`.
 */
export type CelebrationPalette = {
    /**
     * The colours confetti pieces and firework bursts take (the accent and the plate colours).
     */
    pieces: string[];
    /**
     * The bright head of a rocket (the theme's text colour, so it shows on both light and dark).
     */
    rocketHead: string;
};
/**
 * One piece of confetti, popped outward from a burst and fluttering down.
 */
export type ConfettiPiece = {
    kind: "confetti";
    /**
     * Pixels from the left of the screen.
     */
    x: number;
    /**
     * Pixels from the top.
     */
    y: number;
    /**
     * Pixels per second.
     */
    velocityX: number;
    /**
     * Pixels per second, positive is down.
     */
    velocityY: number;
    /**
     * Radians.
     */
    rotation: number;
    /**
     * Radians per second.
     */
    spin: number;
    /**
     * Pixels along its long side.
     */
    size: number;
    color: string;
    /**
     * Seconds alive.
     */
    age: number;
    /**
     * Seconds until it is gone.
     */
    lifetime: number;
    /**
     * Where its flutter starts, in radians, so the pieces do not flutter in step.
     */
    wobblePhase: number;
};
/**
 * One spark of a firework burst.
 */
export type Spark = {
    kind: "spark";
    x: number;
    y: number;
    /**
     * Pixels per second.
     */
    velocityX: number;
    /**
     * Pixels per second, positive is down.
     */
    velocityY: number;
    /**
     * Radius in pixels.
     */
    size: number;
    color: string;
    /**
     * Seconds alive.
     */
    age: number;
    /**
     * Seconds until it is gone.
     */
    lifetime: number;
};
/**
 * A rocket flying straight up from the bottom edge to where it will burst, leaving a trail.
 */
export type Rocket = {
    kind: "rocket";
    /**
     * Constant: a rocket flies straight up.
     */
    x: number;
    y: number;
    /**
     * Pixels per second, negative is up.
     */
    velocityY: number;
    /**
     * The colour of the burst it ends in, also the colour of its trail.
     */
    color: string;
    /**
     * Seconds alive.
     */
    age: number;
    /**
     * Seconds until it arrives and bursts.
     */
    lifetime: number;
    /**
     * Where it has been recently, newest last.
     */
    trail: {
        x: number;
        y: number;
    }[];
};
export type Particle = ConfettiPiece | Spark | Rocket;
/**
 * A show in progress.
 */
export type Show = {
    name: CelebrationName;
    /**
     * Everything on screen now.
     */
    particles: Particle[];
    /**
     * Seconds since the show began.
     */
    elapsedSeconds: number;
    /**
     * How many bursts (confetti) or rockets (fireworks) have been launched so far.
     */
    nextLaunchIndex: number;
    area: CelebrationArea;
    palette: CelebrationPalette;
    /**
     * How far the planned times are stretched (see `choreographyPace`).
     */
    pace: number;
    /**
     * Gives a number from 0 up to but not including 1, `Math.random` unless a test says otherwise.
     */
    random: () => number;
};
/**
 * What a caller gives to start a show.
 */
export type ShowSetup = {
    area: CelebrationArea;
    palette: CelebrationPalette;
    pace: number;
    /**
     * Defaults to `Math.random`.
     */
    random?: (() => number) | undefined;
};
