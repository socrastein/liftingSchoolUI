// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAudio } from "./celebrationFakes";

/**
 * The celebrations' synthesized sounds: unlocking audio inside a tap, each celebration's score, and silencing it. The module keeps
 * one audio context for the page, so each test loads a fresh copy of it.
 */

async function loadSounds() {
  vi.resetModules();
  return import("../../js/celebrationSounds.js");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("unlockCelebrationAudio", () => {
  it("resumes a suspended context", async () => {
    const audio = installFakeAudio();
    audio.state = "suspended";
    const { unlockCelebrationAudio } = await loadSounds();

    const context = unlockCelebrationAudio();

    expect(context).toBe(audio);
    expect(audio.resumeCalls).toBe(1);
  });

  it("is null, not an error, when the browser has no Web Audio", async () => {
    Object.defineProperty(window, "AudioContext", { configurable: true, writable: true, value: undefined });
    const { unlockCelebrationAudio } = await loadSounds();

    expect(unlockCelebrationAudio()).toBeNull();
  });

  it("is null, not an error, when the browser refuses to make a context", async () => {
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      writable: true,
      value: vi.fn(() => {
        throw new Error("not allowed");
      }),
    });
    const { unlockCelebrationAudio } = await loadSounds();

    expect(unlockCelebrationAudio()).toBeNull();
  });

  it("does not fail when a refused resume is rejected", async () => {
    const audio = installFakeAudio();
    audio.state = "suspended";
    audio.resumeOutcome = "refuses";
    const { unlockCelebrationAudio } = await loadSounds();

    expect(unlockCelebrationAudio()).toBe(audio);
    await vi.advanceTimersByTimeAsync(0);
  });
});

describe("startCelebrationSound", () => {
  it("plays a note and a pop for each of the five confetti bursts", async () => {
    const audio = installFakeAudio();
    const { startCelebrationSound } = await loadSounds();

    startCelebrationSound("confetti", audio as unknown as AudioContext, 1);

    // five pop thumps and five notes, all oscillators
    expect(audio.oscillators).toHaveLength(10);
  });

  it("whistles, booms and crackles for each of the six rockets", async () => {
    const audio = installFakeAudio();
    const { startCelebrationSound } = await loadSounds();

    startCelebrationSound("fireworks", audio as unknown as AudioContext, 1);

    // whistle and boom thump for each rocket
    expect(audio.oscillators).toHaveLength(12);
  });

  it("spaces the sounds with the pace, as the animation does", async () => {
    const audio = installFakeAudio();
    const { startCelebrationSound } = await loadSounds();

    startCelebrationSound("confetti", audio as unknown as AudioContext, 2);

    const firstStartTimes = audio.oscillators.map((oscillator) => oscillator.start.mock.calls[0]?.[0] as number);
    // the second burst is planned at 1.4 seconds: 2.8 when stretched to twice the length
    expect(firstStartTimes).toContain(2.8);
  });

  it("keeps the loudness at a modest level, in one gain that everything goes through", async () => {
    const audio = installFakeAudio();
    const { startCelebrationSound } = await loadSounds();

    startCelebrationSound("confetti", audio as unknown as AudioContext, 1);

    const master = audio.gains[0];
    expect(master?.gain.value).toBeLessThanOrEqual(0.5);
    expect(master?.connect).toHaveBeenCalledWith(audio.destination);
  });

  it("silences and disconnects everything when stopped", async () => {
    const audio = installFakeAudio();
    const { startCelebrationSound } = await loadSounds();
    const stop = startCelebrationSound("fireworks", audio as unknown as AudioContext, 1);
    const master = audio.gains[0];

    stop();

    expect(master?.gain.setValueAtTime).toHaveBeenCalledWith(0, audio.currentTime);
    expect(master?.disconnect).toHaveBeenCalled();
  });
});
