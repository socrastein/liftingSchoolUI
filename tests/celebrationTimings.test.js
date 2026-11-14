import { describe, expect, it } from "vitest";
import {
  CELEBRATION_SECONDS,
  CONFETTI_BURSTS,
  FADE_OUT_SECONDS,
  FIREWORK_FLIGHT_SECONDS,
  FIREWORK_ROCKETS,
  MAX_CELEBRATION_SECONDS,
  MIN_CELEBRATION_SECONDS,
  choreographyPace,
  clampCelebrationSeconds,
} from "../js/celebrationTimings.js";
import { CELEBRATION_NAMES, isCelebrationName } from "../js/celebrationNames.js";

/**
 * When the bursts and rockets happen, how long a celebration may be asked to last, and the list of celebration names.
 */

describe("clampCelebrationSeconds", () => {
  it("is six seconds when the caller says nothing", () => {
    expect(clampCelebrationSeconds(undefined)).toBe(CELEBRATION_SECONDS);
    expect(CELEBRATION_SECONDS).toBe(6);
  });

  it("is six seconds for something that is not a number", () => {
    expect(clampCelebrationSeconds(Number.NaN)).toBe(6);
    expect(clampCelebrationSeconds(Number.POSITIVE_INFINITY)).toBe(6);
  });

  it("keeps a length inside the bounds as asked", () => {
    expect(clampCelebrationSeconds(8)).toBe(8);
  });

  it("allows the bounds themselves", () => {
    expect(clampCelebrationSeconds(MIN_CELEBRATION_SECONDS)).toBe(MIN_CELEBRATION_SECONDS);
    expect(clampCelebrationSeconds(MAX_CELEBRATION_SECONDS)).toBe(MAX_CELEBRATION_SECONDS);
  });

  it("moves a length outside the bounds to the nearest bound", () => {
    expect(clampCelebrationSeconds(MIN_CELEBRATION_SECONDS - 0.01)).toBe(MIN_CELEBRATION_SECONDS);
    expect(clampCelebrationSeconds(MAX_CELEBRATION_SECONDS + 0.01)).toBe(MAX_CELEBRATION_SECONDS);
    expect(clampCelebrationSeconds(-3)).toBe(MIN_CELEBRATION_SECONDS);
  });
});

describe("choreographyPace", () => {
  it("is 1 for the default length, so the planned times hold", () => {
    expect(choreographyPace(6)).toBe(1);
  });

  it("stretches the plan for a longer celebration and squeezes it for a shorter one", () => {
    expect(choreographyPace(9)).toBe(1.5);
    expect(choreographyPace(4.5)).toBe(0.75);
  });
});

describe("the choreography", () => {
  it("climbs the screen with each confetti burst, the first near the bottom and the last near the top", () => {
    const heights = CONFETTI_BURSTS.map((burst) => burst.heightFraction);
    expect(heights).toEqual([...heights].sort((a, b) => b - a));
    expect(CONFETTI_BURSTS).toHaveLength(5);
  });

  it("launches six firework rockets, one after the other", () => {
    const launches = FIREWORK_ROCKETS.map((rocket) => rocket.launchSeconds);
    expect(launches).toEqual([...launches].sort((a, b) => a - b));
    expect(FIREWORK_ROCKETS).toHaveLength(6);
  });

  it("starts the last burst and bursts the last rocket before the fade begins, even in the shortest celebration", () => {
    const lastBurst = CONFETTI_BURSTS[CONFETTI_BURSTS.length - 1]?.atSeconds ?? Infinity;
    const lastRocket = FIREWORK_ROCKETS[FIREWORK_ROCKETS.length - 1]?.launchSeconds ?? Infinity;
    const shortestPace = choreographyPace(MIN_CELEBRATION_SECONDS);
    const fadeBegins = MIN_CELEBRATION_SECONDS - FADE_OUT_SECONDS;
    expect(lastBurst * shortestPace).toBeLessThan(fadeBegins);
    expect(lastRocket * shortestPace + FIREWORK_FLIGHT_SECONDS).toBeLessThan(fadeBegins);
  });
});

describe("celebration names", () => {
  it("lists confetti and fireworks", () => {
    expect([...CELEBRATION_NAMES]).toEqual(["confetti", "fireworks"]);
  });

  it("recognises a name and nothing else", () => {
    expect(isCelebrationName("fireworks")).toBe(true);
    expect(isCelebrationName("jackpot")).toBe(false);
    expect(isCelebrationName(undefined)).toBe(false);
  });
});
