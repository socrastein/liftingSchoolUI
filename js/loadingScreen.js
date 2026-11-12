/**
 * Takes away the startup loading screen: the one a Vite app's page shows from its first paint, before its scripts arrive,
 * written into the page by loadingScreenPlugin.js. The app calls hideStartupLoadingScreen once it has mounted, and the screen
 * fades out the way the LoadingScreen component does, with the same classes (components.css), then leaves the page.
 *
 * Plain JavaScript for the browser.
 */

/** The id of the startup screen's outer element, which the plugin writes and this module removes. */
export const STARTUP_LOADING_SCREEN_ID = "startupLoadingScreen";

/**
 * How long to wait for the fade to say it has ended before removing the screen anyway. The fade itself takes --durationFast
 * (0.15s); a hidden tab may never run it, and nothing should keep a finished app covered.
 */
const REMOVAL_FALLBACK_MS = 1000;

/**
 * Fades out the startup loading screen and removes it from the page. Does nothing when the page has none (already removed, or
 * a page built without the plugin).
 *
 * @returns {Promise<void>} Resolves once the screen is gone.
 */
export function hideStartupLoadingScreen() {
  const startupScreen = document.getElementById(STARTUP_LOADING_SCREEN_ID);
  if (startupScreen === null) return Promise.resolve();

  return new Promise((resolve) => {
    let fallbackTimer = 0;
    const remove = () => {
      clearTimeout(fallbackTimer);
      startupScreen.remove();
      resolve();
    };
    fallbackTimer = window.setTimeout(remove, REMOVAL_FALLBACK_MS);
    fadeOut(startupScreen, remove);
  });
}

/**
 * Starts the screen's fade, calling `onFaded` when it ends. Unlike Vue's transition, both classes can be added at once: the
 * screen has been drawn at full opacity, so the change to the leave-to opacity runs as a transition from there.
 *
 * @param {HTMLElement} startupScreen The startup screen's outer element.
 * @param {() => void} onFaded Called once the fade has ended.
 */
function fadeOut(startupScreen, onFaded) {
  const coveringLayer = startupScreen.querySelector(".loadingScreen");
  if (coveringLayer === null) {
    onFaded();
    return;
  }
  // Only the layer's own fade counts, not a transition of something inside it, whose event would bubble up here too
  coveringLayer.addEventListener("transitionend", (event) => {
    if (event.target === coveringLayer) onFaded();
  });
  coveringLayer.classList.add("loadingScreen-leave-active", "loadingScreen-leave-to");
}
