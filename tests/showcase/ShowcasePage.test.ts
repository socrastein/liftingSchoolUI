// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import ShowcasePage from "../../showcase/ShowcasePage.vue";
import LoadingScreen from "../../components/LoadingScreen.vue";

/**
 * The showcase's timed samples: the loading screen and the cue flash each hide again after a set time. A press while one is
 * still up restarts its count, so the newer press gets its full time rather than being cut short by the older timer.
 */

/** Mounts the whole showcase on the page, so its samples can be pressed as a reader would press them. */
function mountShowcase(): VueWrapper {
  return mount(ShowcasePage, { attachTo: document.body });
}

/** The showcase button with this visible text. */
function buttonNamed(wrapper: VueWrapper, label: string) {
  const button = wrapper.findAll("button").find((candidate) => candidate.text() === label);
  if (button === undefined) throw new Error(`No button labelled "${label}" in the showcase`);
  return button;
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("ShowcasePage loading sample", () => {
  it("shows the loading screen, then hides it after four seconds", async () => {
    vi.useFakeTimers();
    const wrapper = mountShowcase();
    await buttonNamed(wrapper, "Load for 4 Seconds").trigger("click");
    expect(wrapper.findComponent(LoadingScreen).props("isLoading")).toBe(true);

    vi.advanceTimersByTime(4000);
    await nextTick();
    expect(wrapper.findComponent(LoadingScreen).props("isLoading")).toBe(false);
  });

  it("restarts the four seconds when pressed again while it is up", async () => {
    vi.useFakeTimers();
    const wrapper = mountShowcase();
    const button = buttonNamed(wrapper, "Load for 4 Seconds");
    await button.trigger("click");

    // Pressed again 3 seconds in: the screen must stay up for its full 4 seconds from this press
    vi.advanceTimersByTime(3000);
    await button.trigger("click");
    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.findComponent(LoadingScreen).props("isLoading")).toBe(true);

    vi.advanceTimersByTime(2000);
    await nextTick();
    expect(wrapper.findComponent(LoadingScreen).props("isLoading")).toBe(false);
  });
});

describe("ShowcasePage cue flash", () => {
  it("restarts the highlight when pressed again while it is on", async () => {
    vi.useFakeTimers();
    const wrapper = mountShowcase();
    const button = buttonNamed(wrapper, "Flash the Cue");
    await button.trigger("click");

    // Pressed again 1 second in: the highlight must stay on for the full 1.2 seconds from this press
    vi.advanceTimersByTime(1000);
    await button.trigger("click");
    vi.advanceTimersByTime(1000);
    await nextTick();
    expect(wrapper.get(".cue").classes()).toContain("cueActive");

    vi.advanceTimersByTime(200);
    await nextTick();
    expect(wrapper.get(".cue").classes()).not.toContain("cueActive");
  });
});
