/**
 * The sounds of the celebrations, all synthesized with the Web Audio API (oscillators and filtered noise): nothing is downloaded
 * or sampled. Confetti pops once for each burst, each pop a little higher; the fireworks whistle up with every rocket, then boom and
 * crackle where it bursts. Each is timed from celebrationTimings.js, the same constants the particles read, so a sound is heard at
 * the moment it is seen.
 *
 * Browsers let a page make sound only after the person has tapped or pressed a key. `unlockCelebrationAudio` must therefore run
 * synchronously inside such a handler; once it has, sound can start at any later moment. Sound is the caller's choice (the
 * CelebrationOverlay plays it only when asked), and a caller whose browser refuses simply gets a celebration without it.
 *
 * Plain JavaScript for the browser.
 */

import { CONFETTI_BURSTS, FIREWORK_FLIGHT_SECONDS, FIREWORK_ROCKETS } from "./celebrationTimings.js";

/** @typedef {import("./celebrationNames.js").CelebrationName} CelebrationName */

/**
 * Schedules a celebration's sounds on the context's clock.
 *
 * @typedef {(context: AudioContext, startTime: number, output: AudioNode, pace: number) => void} SoundScore
 */

/** The loudness of everything together, as a fraction of full: headroom so layered tones never clip, and quiet enough for a public site. */
const MASTER_VOLUME = 0.4;
/** The lowest gain an exponential ramp can reach (it cannot reach 0). */
const SILENCE = 0.0001;
/** The pitch of the first confetti pop's note: C5 in equal temperament, A4 = 440 Hz. */
const NOTE_C5_HERTZ = 523.25;
/** A music note rises by a twelfth root of 2 in pitch per semitone; each confetti pop's note is this many semitones above the last. */
const POP_NOTE_STEP_SEMITONES = 3;
const SEMITONES_PER_OCTAVE = 12;

/** @type {AudioContext | null} The page's one audio context, made on first use. */
let sharedContext = null;

/**
 * The page's audio context, made on first use (the standard constructor or the older webkit-prefixed one).
 *
 * @returns {AudioContext | null} Null when the browser has no Web Audio.
 */
function getAudioContext() {
  if (sharedContext !== null) return sharedContext;
  const Constructor =
    window.AudioContext ?? /** @type {{ webkitAudioContext?: typeof AudioContext }} */ (window).webkitAudioContext;
  if (Constructor === undefined) return null;
  sharedContext = new Constructor();
  return sharedContext;
}

/**
 * Allows sound: resumes the audio context and plays one silent sample, which is what iOS Safari needs before it treats the context
 * as started by the person. Call it synchronously from a tap, click or key handler. A project whose celebration comes later (after
 * a save) calls it from an earlier tap, such as the one that turned sound on; `CelebrationOverlay.play` also calls it.
 *
 * @returns {AudioContext | null} The context, which may still be resuming; null when the browser has no Web Audio or refused to make one.
 */
export function unlockCelebrationAudio() {
  try {
    const context = getAudioContext();
    if (context === null) return null;
    if (context.state === "suspended") context.resume().catch(() => {});
    const silentSource = context.createBufferSource();
    silentSource.buffer = context.createBuffer(1, 1, context.sampleRate);
    silentSource.connect(context.destination);
    silentSource.start(0);
    return context;
  } catch {
    return null;
  }
}

/**
 * Starts a celebration's sound now.
 *
 * @param {CelebrationName} name Which celebration.
 * @param {AudioContext} context A running context (see `unlockCelebrationAudio`).
 * @param {number} pace How far the planned times are stretched (see `choreographyPace`).
 * @returns {() => void} Silences the sound and disconnects it at once, for a celebration that is closed early or taken off the page.
 *   Notes still scheduled finish playing into nothing and are then collected.
 */
export function startCelebrationSound(name, context, pace) {
  const master = context.createGain();
  master.gain.value = MASTER_VOLUME;
  master.connect(context.destination);
  SCORES[name](context, context.currentTime, master, pace);
  return () => {
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
    master.disconnect();
  };
}

/**
 * One oscillator note with a quick attack and an exponential fade-out.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the note goes.
 * @param {{ frequency: number, startTime: number, duration: number, volume: number, type?: OscillatorType }} note The note.
 */
function playTone(context, output, note) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = note.type ?? "sine";
  oscillator.frequency.value = note.frequency;
  envelope.gain.setValueAtTime(SILENCE, note.startTime);
  envelope.gain.exponentialRampToValueAtTime(note.volume, note.startTime + 0.01);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, note.startTime + note.duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(note.startTime);
  oscillator.stop(note.startTime + note.duration + 0.05);
}

/**
 * A burst of filtered noise: clicks, booms and crackle.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the noise goes.
 * @param {{ startTime: number, duration: number, volume: number, filterFrequency: number, filterType?: BiquadFilterType }} burst
 *   The noise; the filter is a band-pass unless it says otherwise.
 */
function playNoise(context, output, burst) {
  const sampleCount = Math.ceil(context.sampleRate * burst.duration);
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < sampleCount; index++) samples[index] = Math.random() * 2 - 1;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const envelope = context.createGain();
  source.buffer = buffer;
  filter.type = burst.filterType ?? "bandpass";
  filter.frequency.value = burst.filterFrequency;
  envelope.gain.setValueAtTime(burst.volume, burst.startTime);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, burst.startTime + burst.duration);
  source.connect(filter).connect(envelope).connect(output);
  source.start(burst.startTime);
}

/**
 * A sine that glides from one pitch to another: whistles and boom thumps.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the sound goes.
 * @param {{ fromFrequency: number, toFrequency: number, startTime: number, duration: number, volume: number }} glide The glide.
 */
function playGlide(context, output, glide) {
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.frequency.setValueAtTime(glide.fromFrequency, glide.startTime);
  oscillator.frequency.exponentialRampToValueAtTime(glide.toFrequency, glide.startTime + glide.duration);
  envelope.gain.setValueAtTime(glide.volume, glide.startTime);
  envelope.gain.exponentialRampToValueAtTime(SILENCE, glide.startTime + glide.duration);
  oscillator.connect(envelope).connect(output);
  oscillator.start(glide.startTime);
  oscillator.stop(glide.startTime + glide.duration + 0.05);
}

/**
 * One party-popper bang: a click of noise over a falling thump.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the pop goes.
 * @param {number} startTime When it happens, on the context's clock.
 */
function playPop(context, output, startTime) {
  playNoise(context, output, { startTime, duration: 0.18, volume: 0.9, filterFrequency: 1200 });
  playGlide(context, output, { fromFrequency: 220, toFrequency: 60, startTime, duration: 0.2, volume: 0.6 });
}

/** @type {SoundScore} Confetti: a pop for each burst as it works up the screen, each with a note a little higher than the last. */
function confettiScore(context, startTime, output, pace) {
  CONFETTI_BURSTS.forEach((burst, index) => {
    const burstTime = startTime + burst.atSeconds * pace;
    playPop(context, output, burstTime);
    const semitonesUp = index * POP_NOTE_STEP_SEMITONES;
    const frequency = NOTE_C5_HERTZ * 2 ** (semitonesUp / SEMITONES_PER_OCTAVE);
    playTone(context, output, { frequency, startTime: burstTime + 0.05, duration: 0.5, volume: 0.15, type: "triangle" });
  });
}

/**
 * One firework: a whistle rising for the whole flight, then a boom and crackling sparks where it bursts.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the sound goes.
 * @param {number} launchTime When the rocket leaves, on the context's clock.
 */
function playFirework(context, output, launchTime) {
  playGlide(context, output, {
    fromFrequency: 500,
    toFrequency: 1800,
    startTime: launchTime,
    duration: FIREWORK_FLIGHT_SECONDS,
    volume: 0.12,
  });
  const boomTime = launchTime + FIREWORK_FLIGHT_SECONDS;
  playNoise(context, output, { startTime: boomTime, duration: 0.7, volume: 0.9, filterFrequency: 300, filterType: "lowpass" });
  playGlide(context, output, { fromFrequency: 160, toFrequency: 35, startTime: boomTime, duration: 0.5, volume: 0.8 });
  playCrackle(context, output, boomTime + 0.15);
}

/**
 * The crackle of a burst's sparks: a dozen tiny high clicks scattered over the next 0.8 seconds.
 *
 * @param {AudioContext} context The context.
 * @param {AudioNode} output Where the crackle goes.
 * @param {number} startTime When the crackle begins, on the context's clock.
 */
function playCrackle(context, output, startTime) {
  const clickCount = 12;
  for (let index = 0; index < clickCount; index++) {
    const clickTime = startTime + Math.random() * 0.8;
    playNoise(context, output, {
      startTime: clickTime,
      duration: 0.03,
      volume: 0.3,
      filterFrequency: 5000,
      filterType: "highpass",
    });
  }
}

/** @type {SoundScore} Fireworks: a whistle and boom for every rocket the animation launches, at the same moments. */
function fireworksScore(context, startTime, output, pace) {
  for (const rocket of FIREWORK_ROCKETS) playFirework(context, output, startTime + rocket.launchSeconds * pace);
}

/** @type {Record<CelebrationName, SoundScore>} The score of each celebration. */
const SCORES = {
  confetti: confettiScore,
  fireworks: fireworksScore,
};
