<script setup lang="ts">
import { computed } from "vue";
import { usePreferredReducedMotion, useWindowScroll, useWindowSize } from "@vueuse/core";
import PopupTransition from "./PopupTransition.vue";

/**
 * A button in the corner of the window that jumps back to the top of the page, for a long page such as a blog post. Put one in
 * the layout, once: it draws itself only after the visitor has scrolled a good way down (two screens by default), fades in
 * and out, and is not on the page at all while hidden, so it is never a Tab stop or read by a screen reader when there is
 * nothing to go back from.
 *
 * It scrolls smoothly, or all at once when the visitor has asked their system for less motion. The button vanishes the moment
 * the page is back at the top, so focus is handed to the start of the page: the next Tab reaches the first link, rather than
 * carrying on from where the button was at the bottom.
 *
 * It is the library's secondary icon button, fixed to the bottom right, under popups (60) and a fixed header (100).
 */

const props = withDefaults(
  defineProps<{
    /** The button's accessible name, since it holds only an arrow. */
    label?: string;
    /** How many window heights down the page the visitor must have scrolled before the button appears. */
    showAfterScreens?: number;
  }>(),
  { label: "Back to top", showAfterScreens: 2 },
);

const { y: distanceScrolled } = useWindowScroll();
const { height: windowHeight } = useWindowSize();
const motionPreference = usePreferredReducedMotion();

const isShowing = computed(() => distanceScrolled.value > windowHeight.value * props.showAfterScreens);

/** Scrolls to the top of the page, and starts keyboard navigation over from there. */
function goToTop(): void {
  const behavior = motionPreference.value === "reduce" ? "auto" : "smooth";
  window.scrollTo({ top: 0, behavior });
  moveFocusToStartOfPage();
}

/**
 * Puts keyboard focus at the start of the page. The button is about to disappear, and a browser carries on from where a removed
 * element was, so without this the next Tab would continue from the bottom of the page. The body can only take focus while it
 * has a tabindex, so it is given one for the moment it takes to focus it.
 */
function moveFocusToStartOfPage(): void {
  document.body.setAttribute("tabindex", "-1");
  document.body.focus({ preventScroll: true });
  document.body.removeAttribute("tabindex");
}
</script>

<template>
  <PopupTransition>
    <button v-if="isShowing" type="button" class="btn btnSecondary btnIcon scrollToTop" :aria-label="label" @click="goToTop">
      <!-- Lucide's arrow-up (ISC licence, icons/licences/lucide.txt), drawn inline so it takes the button's text colour -->
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
        <path d="m5 12 7-7 7 7" />
        <path d="M12 19V5" />
      </svg>
    </button>
  </PopupTransition>
</template>

<style scoped>
.scrollToTop {
  position: fixed;
  bottom: var(--space2);
  right: var(--space2);
  z-index: 50;
}
</style>
