<script lang="ts">
import type { CelebrationName } from "../js/celebrationNames.js";

export type { CelebrationName };

/** What a caller can ask of one celebration; every field is optional. */
export interface CelebrationPlayOptions {
  /** A short line shown and announced once while it plays ("New Record: 225 lbs"). Nothing is shown when it is empty. */
  message?: string;
  /**
   * Whether to play its sounds. Off unless true, because the caller decides, usually from a setting the person chose. Needs an
   * earlier tap or key press (`play` called from the handler of one, or `unlockCelebrationAudio` from an earlier one); where the
   * browser refuses, the celebration plays without sound. Never played under reduced motion, since the sounds follow the animation.
   */
  sound?: boolean;
  /** How long it lasts, from 5 to 10 seconds (6 when left out); a value outside the range is moved to its nearest end. */
  seconds?: number;
}
</script>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import { drawStillShow, readCelebrationPalette, startShowOnCanvas } from "../js/celebrationCanvas.js";
import { unlockCelebrationAudio, startCelebrationSound } from "../js/celebrationSounds.js";
import { FADE_OUT_SECONDS, REDUCED_MOTION_SECONDS, choreographyPace, clampCelebrationSeconds } from "../js/celebrationTimings.js";

/**
 * A celebration over the whole window ("New Record!"): confetti climbing the screen in bursts, or fireworks rising from the bottom
 * edge. The owner calls `play(name, options)` through a template ref, from a natural pause (a set was just logged), never while
 * the person is mid-entry and never on page load: for its length the celebration owns the screen.
 *
 * - It catches taps, so nothing underneath is pressed by accident. A tap does not end it (too easy to do by accident): the first
 *   tap shows a round close button at the bottom centre, and only that button or Escape ends it early. The first Tab shows the
 *   button and moves focus to it. Otherwise it ends on its own, taking the button with it.
 * - One at a time: `play` while one is playing is ignored and returns false, since a celebration is tied to its moment and a late
 *   one would celebrate something that is no longer happening.
 * - It ends when the tab is hidden.
 * - The animation is decorative and hidden from assistive technology. The optional message is drawn in a card and announced once
 *   by the status region, which is always on the page.
 * - For people who ask for less motion nothing flies: one still picture of the celebration and the message, for 3 seconds, silent.
 * - It draws in a fixed layer above everything, even a fixed header (100). It never flashes: only small shapes move.
 */

const props = withDefaults(
  defineProps<{
    /** The accessible name of the close button, which has an icon and no visible text. */
    closeLabel?: string;
  }>(),
  { closeLabel: "Close celebration" },
);

const emit = defineEmits<{
  /** The celebration is over, whether it ran out or was closed. Not sent when the component is taken off the page. */
  (event: "ended"): void;
}>();

/** Everything that exists only while one celebration plays. */
interface Run {
  /** Stops the drawing and clears the canvas. */
  stopCanvas: () => void;
  /** Silences the sound; does nothing until the sound has started. */
  stopSound: () => void;
  timers: ReturnType<typeof setTimeout>[];
  /** When it began, in milliseconds, to tell if a late audio context started too late for the sound to match. */
  startedAtMilliseconds: number;
  /** What had keyboard focus before, to give focus back if the close button had it when it went. */
  focusBefore: Element | null;
}

/**
 * How late the sound may start, in milliseconds. A browser that has to resume its audio context after the celebration began may
 * take a moment; past this the sound would no longer match what is on screen, so it is left out.
 */
const MAX_SOUND_DELAY_MILLISECONDS = 500;

const canvas = ref<HTMLCanvasElement | null>(null);
const closeButton = ref<HTMLButtonElement | null>(null);
/** Whether a celebration is playing, and so whether its layer is on the page. */
const isPlaying = ref(false);
/** Shown by the first tap (or the first Tab) and never before. */
const isCloseButtonShown = ref(false);
/** Whether the last moments have begun, when the canvas fades out instead of ending sharply. */
const isFadingOut = ref(false);
/** The message in the status region, or "" while there is none. */
const visibleMessage = ref("");
/** The celebration playing, or null. */
let run: Run | null = null;

/**
 * Asks for a celebration. It starts at once unless one is already playing, in which case this request is ignored.
 *
 * @returns Whether it started.
 */
function play(name: CelebrationName, options: CelebrationPlayOptions = {}): boolean {
  if (run !== null) return false;
  const isCalm = prefersReducedMotion();
  const requestedSeconds = clampCelebrationSeconds(options.seconds);
  const seconds = isCalm ? Math.min(requestedSeconds, REDUCED_MOTION_SECONDS) : requestedSeconds;
  const pace = isCalm ? 1 : choreographyPace(seconds);
  // Audio is unlocked here, before anything is waited for, because a browser allows it only inside the handler of a tap or key
  const audioContext = options.sound === true && !isCalm ? unlockCelebrationAudio() : null;

  const thisRun = startRun(seconds);
  void showMessage(thisRun, options.message ?? "");
  void drawCelebration(thisRun, name, { pace, isCalm });
  if (audioContext !== null) void startSound(thisRun, name, { pace, audioContext });
  return true;
}

/** Ends the celebration playing now, if any, exactly as the close button does. */
function stop(): void {
  end();
}

/** Whether the person asked their system for less motion. */
function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

/**
 * Puts the celebration's layer on the page and sets everything that ends it: the timer that fades it, the timer that ends it, and
 * the keys and the tab going away.
 */
function startRun(seconds: number): Run {
  const newRun: Run = {
    stopCanvas: () => {},
    stopSound: () => {},
    timers: [],
    startedAtMilliseconds: Date.now(),
    focusBefore: document.activeElement,
  };
  newRun.timers.push(setTimeout(fadeOut, (seconds - FADE_OUT_SECONDS) * 1000));
  newRun.timers.push(setTimeout(end, seconds * 1000));
  window.addEventListener("keydown", onKeydown);
  document.addEventListener("visibilitychange", onVisibilityChange);
  run = newRun;
  isFadingOut.value = false;
  isCloseButtonShown.value = false;
  isPlaying.value = true;
  return newRun;
}

/** Starts the canvas fading out, a moment before the celebration ends, so the last pieces do not vanish at once. */
function fadeOut(): void {
  isFadingOut.value = true;
}

/**
 * Puts the message into the status region once the region has had a render without it, so that the change is announced (text
 * that is there from the start is not).
 */
async function showMessage(thisRun: Run, message: string): Promise<void> {
  await nextTick();
  if (run !== thisRun) return;
  visibleMessage.value = message.trim();
}

/**
 * Draws the celebration on the canvas, which exists once the layer has rendered: the full show, or one still picture for people
 * who ask for less motion. A failure only loses the picture; the message and the close button still work.
 */
async function drawCelebration(thisRun: Run, name: CelebrationName, how: { pace: number; isCalm: boolean }): Promise<void> {
  await nextTick();
  if (run !== thisRun || canvas.value === null) return;
  try {
    const setup = { palette: readCelebrationPalette(document.documentElement), pace: how.pace };
    if (how.isCalm) drawStillShow(canvas.value, name, setup);
    else thisRun.stopCanvas = startShowOnCanvas(canvas.value, name, setup);
  } catch (error) {
    console.warn("A celebration could not be drawn:", error);
  }
}

/**
 * Starts the sound once the audio context is running. It may be suspended still (the browser has not finished resuming it, or
 * refused): then the sound waits a moment for it, and is left out if it comes too late or never.
 */
async function startSound(thisRun: Run, name: CelebrationName, how: { pace: number; audioContext: AudioContext }): Promise<void> {
  const { pace, audioContext } = how;
  if (audioContext.state !== "running") await audioContext.resume().catch(() => {});
  const isTooLate = Date.now() - thisRun.startedAtMilliseconds > MAX_SOUND_DELAY_MILLISECONDS;
  if (run !== thisRun || isTooLate || audioContext.state !== "running") return;
  try {
    thisRun.stopSound = startCelebrationSound(name, audioContext, pace);
  } catch {
    // The visuals do not need the sound
  }
}

/** The first tap anywhere on the celebration shows the close button; it never ends the celebration. */
function showCloseButton(): void {
  isCloseButtonShown.value = true;
}

/** Escape closes the celebration; the first Tab shows the close button and moves focus to it. */
async function onKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key === "Escape") {
    end();
    return;
  }
  if (event.key !== "Tab" || isCloseButtonShown.value) return;
  event.preventDefault();
  isCloseButtonShown.value = true;
  await nextTick();
  closeButton.value?.focus();
}

/** A hidden tab ends the celebration: its moment has passed by the time the person is back, and sound should not play unseen. */
function onVisibilityChange(): void {
  if (document.hidden) end();
}

/** Ends the celebration and says so. Does nothing when none is playing. */
function end(): void {
  if (cleanUp()) emit("ended");
}

/**
 * Stops everything the celebration started: timers, drawing, sound, listeners, and the layer itself. Focus goes back to where it
 * was if the close button had it, since the button is about to leave the page.
 *
 * @returns Whether a celebration was playing.
 */
function cleanUp(): boolean {
  const finished = run;
  if (finished === null) return false;
  run = null;
  finished.timers.forEach(clearTimeout);
  finished.stopCanvas();
  finished.stopSound();
  window.removeEventListener("keydown", onKeydown);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if (closeButton.value !== null && document.activeElement === closeButton.value) {
    (finished.focusBefore as HTMLElement | null)?.focus?.();
  }
  isPlaying.value = false;
  visibleMessage.value = "";
  return true;
}

onBeforeUnmount(cleanUp);

defineExpose({ play, stop });
</script>

<template>
  <div>
    <div class="celebrationMessageRegion" role="status">
      <p v-if="visibleMessage !== ''" class="celebrationMessage card h4">{{ visibleMessage }}</p>
    </div>
    <div v-if="isPlaying" class="celebration" @click="showCloseButton">
      <canvas
        ref="canvas"
        class="celebrationCanvas"
        :class="{ celebrationCanvasFading: isFadingOut }"
        aria-hidden="true"
      ></canvas>
      <button
        v-if="isCloseButtonShown"
        ref="closeButton"
        type="button"
        class="btn btnSecondary btnIcon celebrationClose"
        :aria-label="props.closeLabel"
        @click.stop="end"
      >
        <!-- Lucide's x (ISC licence, icons/licences/lucide.txt), drawn inline so it takes the button's text colour -->
        <svg
          viewBox="0 0 24 24"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Above a fixed header (100), which a celebration covers like the rest of the page */
.celebration {
  position: fixed;
  inset: 0;
  z-index: 110;
  /* The layer owns the screen: it takes the taps, and a drag on it does not scroll the page behind */
  touch-action: none;
}

.celebrationCanvas {
  display: block;
  width: 100%;
  height: 100%;
  opacity: 1;
  transition: opacity var(--durationSlow) var(--easeIn);
}

.celebrationCanvasFading {
  opacity: 0;
}

/* Round, at the bottom centre above the phone's home bar, 3rem (48px) square, over the 44px minimum */
.celebrationClose {
  position: absolute;
  bottom: calc(var(--space3) + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  border-radius: var(--radiusFull);
}

.celebrationMessageRegion {
  position: fixed;
  inset-inline: var(--space2);
  top: calc(var(--headerHeight) + var(--space4));
  z-index: 111;
  display: flex;
  justify-content: center;
  /* Lets taps through to the layer under the empty strip */
  pointer-events: none;
}

.celebrationMessage {
  width: fit-content;
  margin: 0;
  padding: var(--space1) var(--space3);
  text-align: center;
}
</style>
