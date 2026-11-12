<script setup lang="ts">
import logoUrl from "../icons/logo.svg";

/**
 * A screen that covers the whole window while something loads (the app starting, the next page's data): the logo turning
 * slowly, with "Loading" under it and its dots counting up and down. It appears at once, so nothing half-drawn shows through,
 * and fades out quickly once `isLoading` turns false. Its look is the shared library's `.loadingScreen` (components.css).
 *
 *   <LoadingScreen :is-loading="!isReady" />
 *
 * The status region is always on the page, so a screen reader hears "Loading" when the screen appears after the page has
 * started. The three dots are hidden from it, since read aloud they are only noise.
 *
 * Fixed above everything, a fixed header (100) included.
 */

withDefaults(
  defineProps<{
    /** Whether the screen is up; turning false fades it out. */
    isLoading: boolean;
    /** The word under the logo, before the dots. */
    label?: string;
  }>(),
  { label: "Loading" },
);
</script>

<template>
  <div role="status">
    <Transition name="loadingScreen">
      <div v-if="isLoading" class="loadingScreen">
        <img class="loadingLogo" :src="logoUrl" alt="" />
        <p class="loadingText">
          {{ label }}<span class="loadingDots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.loadingScreen {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space2);
  /* Centred in the top two thirds of the window, which puts the logo and label a third of the way down: where the eye rests,
     rather than the exact middle, which reads as low */
  padding-bottom: calc(100dvh / 3);
}

.loadingLogo {
  /* The logo itself is 6rem, big enough to read as the logo and small enough to sit calmly on a phone screen; the padding
     around it is where its glow (components.css) fades out */
  box-sizing: content-box;
  width: calc(var(--space4) * 1.5);
  height: auto;
  padding: var(--space3);
}

/* As wide as its words, so it is centred under the logo: the base style stretches a paragraph across its container */
.loadingText {
  width: auto;
}
</style>
