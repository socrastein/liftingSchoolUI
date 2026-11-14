import { describe, expect, it } from "vitest";
import { MAX_PARTICLES, createShow, fastForwardToStillPicture, stepShow } from "../js/celebrationParticles.js";
import { CONFETTI_BURSTS, FIREWORK_FLIGHT_SECONDS, FIREWORK_ROCKETS } from "../js/celebrationTimings.js";

/**
 * The particle shows as data: when bursts and rockets launch, what they turn into, and that the number of pieces stays bounded.
 * Random numbers come from a counter, so every run is the same.
 */

const AREA = { width: 400, height: 800 };
const PALETTE = { pieces: ["#111111", "#222222"], rocketHead: "#ffffff" };

/** A "random" source that cycles through fixed values, so a show is repeatable. */
function steadyRandom() {
  let index = 0;
  const values = [0.1, 0.5, 0.9, 0.3, 0.7];
  return () => values[index++ % values.length] ?? 0;
}

/**
 * @param {"confetti" | "fireworks"} name Which show.
 * @param {number} [pace] How far the plan is stretched.
 */
function newShow(name, pace = 1) {
  return createShow(name, { area: AREA, palette: PALETTE, pace, random: steadyRandom() });
}

/**
 * Steps a show forward in 1/60 second steps, as a screen does.
 *
 * @param {ReturnType<typeof newShow>} show The show.
 * @param {number} seconds How far to go.
 */
function run(show, seconds) {
  const steps = Math.round(seconds * 60);
  for (let step = 0; step < steps; step++) stepShow(show, 1 / 60);
}

describe("confetti", () => {
  it("starts with nothing on screen", () => {
    expect(newShow("confetti").particles).toEqual([]);
  });

  it("pops the first burst of 50 pieces at its planned time and not before", () => {
    const show = newShow("confetti");
    run(show, CONFETTI_BURSTS[0].atSeconds - 0.05);
    expect(show.particles).toHaveLength(0);

    run(show, 0.1);
    expect(show.particles.length).toBe(50);
    expect(new Set(show.particles.map((particle) => particle.kind))).toEqual(new Set(["confetti"]));
  });

  it("pops each burst where the plan puts it, higher up each time", () => {
    const show = newShow("confetti");
    /** @type {number[]} */
    const centres = [];
    for (const burst of CONFETTI_BURSTS) {
      run(show, burst.atSeconds - show.elapsedSeconds + 0.02);
      const newest = show.particles[show.particles.length - 1];
      centres.push(newest?.y ?? NaN);
    }
    // each burst's newest piece has flown only a moment from its centre, so heights still fall as the bursts climb
    expect(centres.every((y, index) => index === 0 || y < (centres[index - 1] ?? 0))).toBe(true);
    expect(show.nextLaunchIndex).toBe(CONFETTI_BURSTS.length);
  });

  it("spaces the bursts further apart when the pace is stretched", () => {
    const show = newShow("confetti", 2);
    run(show, CONFETTI_BURSTS[0].atSeconds * 2 - 0.05);
    expect(show.particles).toHaveLength(0);
    run(show, 0.1);
    expect(show.particles.length).toBe(50);
  });

  it("pops the pieces upward, so that they drift down afterward", () => {
    const show = newShow("confetti");
    run(show, 0.25);
    expect(show.particles.every((piece) => "velocityY" in piece && piece.velocityY < 0)).toBe(true);
  });

  it("takes its colours from the palette it was given", () => {
    const show = newShow("confetti");
    run(show, 0.25);
    const colors = new Set(show.particles.map((piece) => ("color" in piece ? piece.color : "")));
    expect([...colors].every((color) => PALETTE.pieces.includes(color))).toBe(true);
  });

  it("clears the screen by the time the last pieces have lived their time", () => {
    const show = newShow("confetti");
    run(show, 5.0 + 4.6);
    expect(show.particles).toHaveLength(0);
  });
});

describe("fireworks", () => {
  it("launches the first rocket from the bottom edge at its planned time", () => {
    const show = newShow("fireworks");
    run(show, FIREWORK_ROCKETS[0].launchSeconds + 0.02);
    const [rocket] = show.particles;
    expect(rocket?.kind).toBe("rocket");
    expect(rocket?.x).toBeCloseTo(AREA.width * FIREWORK_ROCKETS[0].widthFraction);
    expect(rocket?.y).toBeLessThanOrEqual(AREA.height);
  });

  it("flies the rocket to where it bursts in its flight time, then bursts it into 70 sparks of its colour", () => {
    const show = newShow("fireworks");
    run(show, FIREWORK_ROCKETS[0].launchSeconds + FIREWORK_FLIGHT_SECONDS + 0.02);
    const sparks = show.particles.filter((particle) => particle.kind === "spark");
    const rockets = show.particles.filter((particle) => particle.kind === "rocket");
    expect(sparks).toHaveLength(70);
    expect(rockets).toHaveLength(0);
    expect(new Set(sparks.map((spark) => spark.color)).size).toBe(1);
  });

  it("bursts at the height the plan gives", () => {
    const show = newShow("fireworks");
    run(show, FIREWORK_ROCKETS[0].launchSeconds + FIREWORK_FLIGHT_SECONDS + 0.02);
    const [spark] = show.particles;
    const expectedY = AREA.height * FIREWORK_ROCKETS[0].burstHeightFraction;
    // a spark has had only a step or two to move from the burst's centre
    expect(Math.abs((spark?.y ?? 0) - expectedY)).toBeLessThan(15);
  });

  it("keeps a trail behind a rocket, of at most 16 points", () => {
    const show = newShow("fireworks");
    run(show, FIREWORK_ROCKETS[0].launchSeconds + 0.6);
    const rocket = show.particles.find((particle) => particle.kind === "rocket");
    expect(rocket?.kind === "rocket" && rocket.trail.length).toBe(16);
  });

  it("launches all six rockets over the show", () => {
    const show = newShow("fireworks");
    run(show, 4.2);
    expect(show.nextLaunchIndex).toBe(FIREWORK_ROCKETS.length);
  });
});

describe("the limit on pieces", () => {
  it("never holds more than MAX_PARTICLES, even when the screen is flooded", () => {
    const show = newShow("confetti");
    for (let burst = 0; burst < 20; burst++) {
      show.nextLaunchIndex = 0;
      show.elapsedSeconds = 6;
      stepShow(show, 0.001);
    }
    expect(show.particles.length).toBe(MAX_PARTICLES);
  });

  it("stays well under the limit through a whole default celebration", () => {
    for (const name of /** @type {const} */ (["confetti", "fireworks"])) {
      const show = newShow(name);
      let most = 0;
      for (let step = 0; step < 6 * 60; step++) {
        stepShow(show, 1 / 60);
        most = Math.max(most, show.particles.length);
      }
      expect(most).toBeLessThan(MAX_PARTICLES);
    }
  });
});

describe("the still picture, for people who ask for less motion", () => {
  it("has pieces on screen for each celebration", () => {
    for (const name of /** @type {const} */ (["confetti", "fireworks"])) {
      const show = newShow(name);
      fastForwardToStillPicture(show);
      expect(show.particles.length).toBeGreaterThan(0);
    }
  });
});
