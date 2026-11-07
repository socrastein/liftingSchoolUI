// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createSSRApp, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
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

  it("takes over a page built without knowing the theme with no hydration mismatch, then shows the visitor's dark mode", async () => {
    const makeApp = () => createSSRApp({ render: () => h(ThemeButton, { storageKey: STORAGE_KEY }) });
    // Built with no saved choice, as on a server, so the page shows light mode
    const builtPage = await renderToString(makeApp());
    // The visitor chose dark mode on an earlier visit
    localStorage.setItem(STORAGE_KEY, "dark");
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const container = document.createElement("div");
    container.innerHTML = builtPage;
    makeApp().mount(container);
    await nextTick();

    const messages = [...warnings.mock.calls, ...errors.mock.calls].map((call) => String(call[0]));
    expect(messages.filter((message) => message.includes("Hydration"))).toEqual([]);
    expect(container.querySelector("span")?.textContent).toBe("🌙");
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Switch to light mode");
  });
});
