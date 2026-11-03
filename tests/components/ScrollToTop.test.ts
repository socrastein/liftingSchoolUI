// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import ScrollToTop from "../../components/ScrollToTop.vue";

/**
 * The back-to-top button: nothing on the page until the visitor is two screens down (a window of 768px in jsdom, so 1536px),
 * then a named button that scrolls to the top (smoothly, or at once under reduced motion) and hands focus to the start of the
 * page. How it fades and sits in the corner is CSS, checked in the showcase.
 */

const WINDOW_HEIGHT = 768;

beforeEach(() => {
  window.innerHeight = WINDOW_HEIGHT;
  window.scrollTo = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  setScrollTop(0);
});

/**
 * Scrolls the page, as far as the component can tell.
 * @param distance Pixels from the top of the page.
 */
function setScrollTop(distance: number): void {
  Object.defineProperty(document.documentElement, "scrollTop", { value: distance, configurable: true });
  window.dispatchEvent(new Event("scroll"));
}

/** Pretends the visitor has asked their system for less motion. */
function preferReducedMotion(): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)",
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
}

/** The component on the page, with the props a layout would give it. */
function mountButton(props: { label?: string; showAfterScreens?: number } = {}) {
  return mount(ScrollToTop, { props, attachTo: document.body });
}

describe("ScrollToTop", () => {
  it("is not on the page at the top, so it is neither a Tab stop nor read by a screen reader", () => {
    const wrapper = mountButton();

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("appears once the visitor is more than two screens down, and not before", async () => {
    const wrapper = mountButton();

    setScrollTop(WINDOW_HEIGHT * 2);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(false);

    setScrollTop(WINDOW_HEIGHT * 2 + 1);
    await nextTick();
    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("goes away again when the visitor scrolls back up", async () => {
    const wrapper = mountButton();
    setScrollTop(5000);
    await nextTick();

    setScrollTop(100);
    await nextTick();

    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("has the accessible name 'Back to top', or the one it is given", async () => {
    const defaultNamed = mountButton();
    const named = mountButton({ label: "Retour en haut" });
    setScrollTop(5000);
    await nextTick();

    expect(defaultNamed.get("button").attributes("aria-label")).toBe("Back to top");
    expect(named.get("button").attributes("aria-label")).toBe("Retour en haut");
  });

  it("showAfterScreens changes how far down it appears", async () => {
    const wrapper = mountButton({ showAfterScreens: 1 });

    setScrollTop(WINDOW_HEIGHT + 1);
    await nextTick();

    expect(wrapper.find("button").exists()).toBe(true);
  });

  it("scrolls to the top smoothly", async () => {
    const wrapper = mountButton();
    setScrollTop(5000);
    await nextTick();

    await wrapper.get("button").trigger("click");

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("scrolls to the top all at once for a visitor who asked for less motion", async () => {
    preferReducedMotion();
    const wrapper = mountButton();
    setScrollTop(5000);
    await nextTick();

    await wrapper.get("button").trigger("click");

    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("hands focus to the start of the page, and leaves the body out of the Tab order", async () => {
    const wrapper = mountButton();
    setScrollTop(5000);
    await nextTick();
    wrapper.get("button").element.focus();

    await wrapper.get("button").trigger("click");

    expect(document.activeElement).toBe(document.body);
    expect(document.body.hasAttribute("tabindex")).toBe(false);
  });
});
