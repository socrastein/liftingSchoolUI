<script setup lang="ts">
import { useMounted } from "@vueuse/core";
import { computed } from "vue";
import { useColorScheme } from "../js/colorScheme.js";

/**
 * The light/dark switch as a track the sun or moon slides along: the business site's control, for a menu panel where a
 * wider control fits (ThemeButton is the compact one, for a header row). Like ThemeButton, the emoji shows the current
 * theme and the label says what pressing it does; the theme itself is useColorScheme's (the `dark` class on <html>,
 * saved on the device under `storageKey`).
 *
 * The page's transitions are left on while the theme changes (`disableTransition: false`), or the slide would not
 * play. Under reduced motion the library's global rule makes the slide near instant.
 *
 * A prerendered page is built without knowing the visitor's theme, so the knob is only added once the slider is running in
 * the browser: the page as built and the browser's first render then agree (no hydration mismatch), and the knob appears
 * at its end of the track instead of sliding there.
 */

const props = defineProps<{
  /** Where the choice is saved on the device; see useColorScheme. */
  storageKey: string;
}>();

const { isDark, toggleDark } = useColorScheme({ storageKey: props.storageKey, disableTransition: false });
const isInBrowser = useMounted();

/** Dark mode, as far as the slider shows it: never before it runs in the browser, which is when the theme is known. */
const showsDark = computed(() => isInBrowser.value && isDark.value);
</script>

<template>
  <button
    type="button"
    class="themeSlider"
    :class="{ isDark: showsDark }"
    :aria-label="showsDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleDark()"
  >
    <span v-if="isInBrowser" class="knob" aria-hidden="true">{{ showsDark ? "🌙" : "☀️" }}</span>
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
