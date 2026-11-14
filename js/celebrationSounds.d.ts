/**
 * Allows sound: resumes the audio context and plays one silent sample, which is what iOS Safari needs before it treats the context
 * as started by the person. Call it synchronously from a tap, click or key handler. A project whose celebration comes later (after
 * a save) calls it from an earlier tap, such as the one that turned sound on; `CelebrationOverlay.play` also calls it.
 *
 * @returns {AudioContext | null} The context, which may still be resuming; null when the browser has no Web Audio or refused to make one.
 */
export function unlockCelebrationAudio(): AudioContext | null;
/**
 * Starts a celebration's sound now.
 *
 * @param {CelebrationName} name Which celebration.
 * @param {AudioContext} context A running context (see `unlockCelebrationAudio`).
 * @param {number} pace How far the planned times are stretched (see `choreographyPace`).
 * @returns {() => void} Silences the sound and disconnects it at once, for a celebration that is closed early or taken off the page.
 *   Notes still scheduled finish playing into nothing and are then collected.
 */
export function startCelebrationSound(name: CelebrationName, context: AudioContext, pace: number): () => void;
export type CelebrationName = import("./celebrationNames.js").CelebrationName;
/**
 * Schedules a celebration's sounds on the context's clock.
 */
export type SoundScore = (context: AudioContext, startTime: number, output: AudioNode, pace: number) => void;
