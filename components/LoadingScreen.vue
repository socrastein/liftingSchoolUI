<script setup lang="ts">
import logoUrl from "../icons/logo.svg";

/**
 * A screen that covers the whole window while something loads (the app starting, the next page's data): the page's
 * background at once, so nothing half-drawn shows through, then, if the wait goes on, the logo turning slowly with "Loading"
 * under it and its dots counting. It fades out quickly once `isLoading` turns false. Its look and layout are the shared library's `.loadingScreen` (components.css).
 *
 *   <LoadingScreen :is-loading="!isReady" />
 *
 * The status region is always on the page, so a screen reader hears "Loading" when the screen appears after the page has
 * started. The three dots are hidden from it, since read aloud they are only noise.
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
