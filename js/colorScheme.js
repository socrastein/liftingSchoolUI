/**
 * Light and dark mode, the same way in every site and app of the business: the `dark` class on <html> switches every colour
 * token (css/tokens.css), the system preference decides until the person picks, and the choice is saved on their device.
 *
 * This is the one place that knows how. A project's theme control (the shared ThemeButton, or its own design such as the
 * business site's sun-and-moon slider) calls useColorScheme and shows or flips the result.
 *
 * Uses the browser's `document` and `localStorage`, through VueUse; call it from a component's setup.
 */

import { useDark, useToggle } from "@vueuse/core";

/**
 * @typedef {object} ColorSchemeOptions
 * @property {string} storageKey Where the choice is saved in localStorage: "light", "dark" or "auto" (follow the system). Every
 *   socrastein.github.io project shares one browser origin, so a project prefixes its key ("liftingApp.colorScheme"); a project
 *   that already had visitors keeps the key they saved under ("vueuse-color-scheme" is VueUse's own default).
 * @property {boolean} [disableTransition] Whether to switch off every CSS transition for the instant the class changes, so
 *   the whole page does not animate from one theme to the other. True when left out; a control that animates its own switch
 *   (a sliding sun and moon) passes false.
 */

/**
 * The current mode and a switch.
 *
 * @param {ColorSchemeOptions} options Where to save the choice, and whether the change is instant.
 * @returns {{ isDark: import("vue").WritableComputedRef<boolean>, toggleDark: () => void }} `isDark` is true while dark mode
 *   shows (and can be set); `toggleDark` flips it and saves the choice.
 */
export function useColorScheme({ storageKey, disableTransition = true }) {
  const isDark = useDark({
    storageKey,
    disableTransition,
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "",
  });
  const toggle = useToggle(isDark);
  const toggleDark = () => {
    toggle();
  };
  return { isDark, toggleDark };
}
