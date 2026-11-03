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
export function useColorScheme({ storageKey, disableTransition }: ColorSchemeOptions): {
    isDark: import("vue").WritableComputedRef<boolean>;
    toggleDark: () => void;
};
export type ColorSchemeOptions = {
    /**
     * Where the choice is saved in localStorage: "light", "dark" or "auto" (follow the system). Every
     * socrastein.github.io project shares one browser origin, so a project prefixes its key ("liftingApp.colorScheme"); a project
     * that already had visitors keeps the key they saved under ("vueuse-color-scheme" is VueUse's own default).
     */
    storageKey: string;
    /**
     * Whether to switch off every CSS transition for the instant the class changes, so
     * the whole page does not animate from one theme to the other. True when left out; a control that animates its own switch
     * (a sliding sun and moon) passes false.
     */
    disableTransition?: boolean | undefined;
};
