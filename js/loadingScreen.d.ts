/**
 * Fades out the startup loading screen and removes it from the page. Does nothing when the page has none (already removed, or
 * a page built without the plugin).
 *
 * @returns {Promise<void>} Resolves once the screen is gone.
 */
export function hideStartupLoadingScreen(): Promise<void>;
/**
 * Takes away the startup loading screen: the one a Vite app's page shows from its first paint, before its scripts arrive,
 * written into the page by loadingScreenPlugin.js. The app calls hideStartupLoadingScreen once it has mounted, and the screen
 * fades out the way the LoadingScreen component does, with the same classes (components.css), then leaves the page.
 *
 * Plain JavaScript for the browser.
 */
/** The id of the startup screen's outer element, which the plugin writes and this module removes. */
export const STARTUP_LOADING_SCREEN_ID: "startupLoadingScreen";
