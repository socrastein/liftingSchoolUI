// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useColorScheme } from "../js/colorScheme.js";

/**
 * Light and dark mode: the `dark` class on <html> switches every token, the system preference decides until the person picks,
 * and the choice is saved on the device under the project's own key.
 */

const STORAGE_KEY = "testProject.colorScheme";

/** A minimal in-memory localStorage. */
function fakeStorage() {
  /** @type {Map<string, string>} */
  const entries = new Map();
  return {
    get length() {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (/** @type {string} */ key) => entries.get(key) ?? null,
    key: (/** @type {number} */ index) => [...entries.keys()][index] ?? null,
    removeItem: (/** @type {string} */ key) => void entries.delete(key),
    setItem: (/** @type {string} */ key, /** @type {string} */ value) => void entries.set(key, String(value)),
  };
}

/**
 * Runs the composable inside a throwaway component, as a project's own component would.
 * @param {import("../js/colorScheme.js").ColorSchemeOptions} options
 */
function mountWithColorScheme(options) {
  /** @type {ReturnType<typeof useColorScheme> | undefined} */
  let scheme;
  mount(
    defineComponent({
      setup() {
        scheme = useColorScheme(options);
        return () => h("div");
      },
    }),
  );
  return /** @type {ReturnType<typeof useColorScheme>} */ (scheme);
}

/** Whether the page is showing its dark colours. */
function pageIsDark() {
  return document.documentElement.classList.contains("dark");
}

let storage = fakeStorage();

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("localStorage", storage);
  document.documentElement.className = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

describe("useColorScheme", () => {
  it("switching to dark puts the `dark` class on <html> and saves the choice under the project's key", async () => {
    const scheme = mountWithColorScheme({ storageKey: STORAGE_KEY });

    scheme.toggleDark();
    await nextTick();

    expect(pageIsDark()).toBe(true);
    expect(storage.getItem(STORAGE_KEY)).toBe("dark");
  });

  it("switching back removes the class; matching the system (light here) means 'follow the system' again", async () => {
    const scheme = mountWithColorScheme({ storageKey: STORAGE_KEY });
    scheme.toggleDark();
    await nextTick();

    scheme.toggleDark();
    await nextTick();

    expect(pageIsDark()).toBe(false);
    // jsdom has no prefers-color-scheme, so the system counts as light; VueUse saves "auto" when the choice equals the system
    expect(storage.getItem(STORAGE_KEY)).toBe("auto");
  });

  it("a saved dark choice applies on the next visit", async () => {
    storage.setItem(STORAGE_KEY, "dark");

    const scheme = mountWithColorScheme({ storageKey: STORAGE_KEY });
    await nextTick();

    expect(scheme.isDark.value).toBe(true);
    expect(pageIsDark()).toBe(true);
  });

  it("two projects with different keys do not share a choice", async () => {
    storage.setItem("otherProject.colorScheme", "dark");

    const scheme = mountWithColorScheme({ storageKey: STORAGE_KEY });
    await nextTick();

    expect(scheme.isDark.value).toBe(false);
  });
});
