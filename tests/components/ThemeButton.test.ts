// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ThemeButton from "../../components/ThemeButton.vue";

/**
 * The light/dark button: its label says what pressing it does, and pressing it switches the theme (the `dark` class on <html>).
 * The theme logic itself is tested with useColorScheme.
 */

const STORAGE_KEY = "testProject.colorScheme";

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
  });
  document.documentElement.className = "";
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.className = "";
});

describe("ThemeButton", () => {
  it("its label says what pressing it does, and pressing it switches the theme", async () => {
    const wrapper = mount(ThemeButton, { props: { storageKey: STORAGE_KEY } });
    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Switch to dark mode");

    await button.trigger("click");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(button.attributes("aria-label")).toBe("Switch to light mode");
  });

  it("shows the current theme as an emoji hidden from assistive technology", async () => {
    const wrapper = mount(ThemeButton, { props: { storageKey: STORAGE_KEY } });
    expect(wrapper.get("span").text()).toBe("☀️");
    expect(wrapper.get("span").attributes("aria-hidden")).toBe("true");

    await wrapper.get("button").trigger("click");

    expect(wrapper.get("span").text()).toBe("🌙");
  });
});
