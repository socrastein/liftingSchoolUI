<script setup lang="ts">
import { useMounted } from "@vueuse/core";
import { computed } from "vue";
import { useColorScheme } from "../js/colorScheme.js";

/**
 * The light/dark switch: an emoji showing the current theme, on a button whose label says what pressing it does. The theme
 * itself is useColorScheme's (the `dark` class on <html>, saved on the device under `storageKey`).
 *
 * ThemeSlider is the same switch as a sliding sun and moon, for a menu panel; a project with a design of its own for the
 * control uses useColorScheme directly.
 * The button's padding is `--themeButtonPadding` (one step of space by default), for a header that wants it tighter.
 *
 * A prerendered page is built without knowing the visitor's theme, so the emoji stays invisible until the button is running in
 * the browser: the page as built and the browser's first render then agree (no hydration mismatch), and its space is kept so
 * nothing moves when it appears.
 */

const props = defineProps<{
  /** Where the choice is saved on the device; see useColorScheme. */
  storageKey: string;
}>();

const { isDark, toggleDark } = useColorScheme({ storageKey: props.storageKey });
const isInBrowser = useMounted();

/** Dark mode, as far as the button shows it: never before it runs in the browser, which is when the theme is known. */
const showsDark = computed(() => isInBrowser.value && isDark.value);
</script>

<template>
  <button
    type="button"
    class="themeButton"
    :aria-label="showsDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleDark()"
  >
    <span aria-hidden="true" :class="{ isWaiting: !isInBrowser }">{{ showsDark ? "🌙" : "☀️" }}</span>
  </button>
</template>

<style scoped>
.themeButton {
  padding: var(--themeButtonPadding, var(--space1));
}

/* Until the theme is known: the space is kept, the emoji is not shown */
.isWaiting {
  visibility: hidden;
}
</style>
