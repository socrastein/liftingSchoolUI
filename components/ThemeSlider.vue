<script setup lang="ts">
import { useColorScheme } from "../js/colorScheme.js";

/**
 * The light/dark switch as a track the sun or moon slides along: the business site's control, for a menu panel where a
 * wider control fits (ThemeButton is the compact one, for a header row). Like ThemeButton, the emoji shows the current
 * theme and the label says what pressing it does; the theme itself is useColorScheme's (the `dark` class on <html>,
 * saved on the device under `storageKey`).
 *
 * The page's transitions are left on while the theme changes (`disableTransition: false`), or the slide would not
 * play. Under reduced motion the library's global rule makes the slide near instant.
 */

const props = defineProps<{
  /** Where the choice is saved on the device; see useColorScheme. */
  storageKey: string;
}>();

const { isDark, toggleDark } = useColorScheme({ storageKey: props.storageKey, disableTransition: false });
</script>

<template>
  <button
    type="button"
    class="themeSlider"
    :class="{ isDark }"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleDark()"
  >
    <span class="knob" aria-hidden="true">{{ isDark ? "🌙" : "☀️" }}</span>
  </button>
</template>

<style scoped>
/* A recessed track, like the segmented control's, that the sun or moon slides along */
.themeSlider {
  position: relative;
  display: flex;
  align-items: center;
  width: 6rem;
  height: 2rem;
  background-color: var(--bgBase);
  border: 1px solid var(--raisedBorder);
  border-radius: var(--radius);
}

/* Light: the sun at the start of the track. Dark: the moon at the end. */
.knob {
  position: absolute;
  left: var(--space1);
  transition: left var(--durationSlow) var(--easeOut);
}

.isDark .knob {
  left: 4rem;
}
</style>
