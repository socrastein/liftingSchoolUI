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
 * @property {boolean} [disableTransition] Whether a change this control makes switches off every CSS transition for the
 *   instant the class changes, so the whole page does not animate from one theme to the other. True when left out; a control
 *   that animates its own switch (a sliding sun and moon) passes false. It applies to the changes this control makes, however
 *   many other controls are on the page (see applyChange).
 */

/**
 * Whether the change being made now may animate. Every control on a page applies every change (each has its own VueUse
 * instance watching the saved choice), so the control that makes a change sets this, and all of them apply the change the
 * same way. Before, a hidden ThemeButton in the header switched off transitions for the phone menu's slider, and the slide
 * never played.
 */
let changeAnimates = false;

/** The style VueUse adds to switch off every transition for an instant; the same rule, so nothing changes for one control. */
const NO_TRANSITIONS_CSS =
  "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";

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
    selector: "html",
    attribute: "class",
    valueDark: "dark",
    valueLight: "",
    // Never VueUse's own switch-off, which each control would do by its own setting; applyChange decides for all of them
    disableTransition: false,
    onChanged: (_isDark, applyMode, mode) => applyChange(() => applyMode(mode)),
  });
  const toggle = useToggle(isDark);
  const toggleDark = () => {
    changeAnimates = !disableTransition;
    toggle();
    // Every control applies the change in the update right after this. Once they have, a change from elsewhere (the system
    // setting, another tab) is instant again.
    setTimeout(() => {
      changeAnimates = false;
    }, 0);
  };
  return { isDark, toggleDark };
}

/**
 * Applies a theme change, with the page's transitions switched off for that instant unless the control that made the change
 * animates its own switch.
 *
 * @param {() => void} apply Puts the change on the page.
 */
function applyChange(apply) {
  // While a page is built on a server there is no document and nothing to animate; VueUse's own handler copes with that
  const isOnServer = typeof document === "undefined";
  if (changeAnimates || isOnServer) {
    apply();
    return;
  }
  withoutTransitions(apply);
}

/**
 * Runs a change to the page with every transition switched off, so nothing animates from the old look to the new.
 *
 * @param {() => void} change What to change.
 */
function withoutTransitions(change) {
  const style = document.createElement("style");
  style.appendChild(document.createTextNode(NO_TRANSITIONS_CSS));
  document.head.appendChild(style);
  change();
  // Reading a style makes the browser apply the change now, while transitions are still off
  void window.getComputedStyle(style).opacity;
  document.head.removeChild(style);
}
