// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ThemeSlider from "../../components/ThemeSlider.vue";

/**
 * The sliding light/dark switch: its label says what pressing it does, pressing it switches the theme (the `dark` class on
 * <html>), and the sun or moon moves to its end of the track. The theme logic itself is tested with useColorScheme.
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

describe("ThemeSlider", () => {
  it("its label says what pressing it does, and pressing it switches the theme", async () => {
    const wrapper = mount(ThemeSlider, { props: { storageKey: STORAGE_KEY } });
    const button = wrapper.get("button");
    expect(button.attributes("aria-label")).toBe("Switch to dark mode");

    await button.trigger("click");

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(button.attributes("aria-label")).toBe("Switch to light mode");
  });

  it("slides the sun to the moon's end of the track, as an emoji hidden from assistive technology", async () => {
    const wrapper = mount(ThemeSlider, { props: { storageKey: STORAGE_KEY } });
    const knob = wrapper.get(".knob");
    expect(knob.text()).toBe("☀️");
    expect(knob.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get("button").classes()).not.toContain("isDark");

    await wrapper.get("button").trigger("click");

    expect(wrapper.get(".knob").text()).toBe("🌙");
    expect(wrapper.get("button").classes()).toContain("isDark");
  });
});
