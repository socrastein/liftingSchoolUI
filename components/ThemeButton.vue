<script setup lang="ts">
import { useColorScheme } from "../js/colorScheme.js";

/**
 * The light/dark switch: an emoji showing the current theme, on a button whose label says what pressing it does. The theme
 * itself is useColorScheme's (the `dark` class on <html>, saved on the device under `storageKey`).
 *
 * ThemeSlider is the same switch as a sliding sun and moon, for a menu panel; a project with a design of its own for the
 * control uses useColorScheme directly.
 * The button's padding is `--themeButtonPadding` (one step of space by default), for a header that wants it tighter.
 */

const props = defineProps<{
  /** Where the choice is saved on the device; see useColorScheme. */
  storageKey: string;
}>();

const { isDark, toggleDark } = useColorScheme({ storageKey: props.storageKey });
</script>

<template>
  <button
    type="button"
    class="themeButton"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    @click="toggleDark()"
  >
    <span aria-hidden="true">{{ isDark ? "🌙" : "☀️" }}</span>
  </button>
</template>

<style scoped>
.themeButton {
  padding: var(--themeButtonPadding, var(--space1));
}
</style>
