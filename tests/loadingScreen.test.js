// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { hideStartupLoadingScreen, STARTUP_LOADING_SCREEN_ID } from "../js/loadingScreen.js";

/**
 * The startup loading screen leaves the page once the app has started: it fades out with the LoadingScreen component's leave
 * classes, and is removed when the fade ends, or after a second if the fade never says so (a hidden tab), so a started app is
 * never left covered.
 */

/** Puts a startup screen on the page, as the plugin writes it (logo and label left out), and returns its covering layer. */
function addStartupScreen() {
  document.body.innerHTML = `<div id="${STARTUP_LOADING_SCREEN_ID}" role="status"><div class="loadingScreen"><p>Inside</p></div></div>`;
  return /** @type {HTMLElement} */ (document.querySelector(".loadingScreen"));
}

/** Whether the startup screen is still on the page. */
function isScreenOnPage() {
  return document.getElementById(STARTUP_LOADING_SCREEN_ID) !== null;
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("hideStartupLoadingScreen", () => {
  it("does nothing on a page without a startup screen", async () => {
    await expect(hideStartupLoadingScreen()).resolves.toBeUndefined();
  });

  it("starts the same fade as the LoadingScreen component", () => {
    const coveringLayer = addStartupScreen();

    void hideStartupLoadingScreen();

    expect(coveringLayer.classList.contains("loadingScreen-leave-active")).toBe(true);
    expect(coveringLayer.classList.contains("loadingScreen-leave-to")).toBe(true);
    expect(isScreenOnPage()).toBe(true);
  });

  it("removes the screen when its fade ends", async () => {
    const coveringLayer = addStartupScreen();

    const hidden = hideStartupLoadingScreen();
    coveringLayer.dispatchEvent(new Event("transitionend", { bubbles: true }));
    await hidden;

    expect(isScreenOnPage()).toBe(false);
  });

  it("waits for the screen's own fade, not a transition inside it", () => {
    const coveringLayer = addStartupScreen();

    void hideStartupLoadingScreen();
    coveringLayer.querySelector("p")?.dispatchEvent(new Event("transitionend", { bubbles: true }));

    expect(isScreenOnPage()).toBe(true);
  });

  it("removes the screen after a second when the fade never says it has ended", async () => {
    addStartupScreen();

    const hidden = hideStartupLoadingScreen();
    vi.advanceTimersByTime(999);
    expect(isScreenOnPage()).toBe(true);

    vi.advanceTimersByTime(1);
    await hidden;
    expect(isScreenOnPage()).toBe(false);
  });
});
