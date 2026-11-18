// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import CelebrationOverlay from "../../components/CelebrationOverlay.vue";
import {
  installFakeAudio,
  installFakeCanvas,
  setReducedMotion,
  type FakeAudioContext,
  type FakeCanvasContext,
} from "./celebrationFakes";

/**
 * A celebration over the whole window, played by `play(name, options)`: it ends on its own, cleans up after itself, plays one at a
 * time, asks for sound only when told, honours reduced motion, hides the animation from assistive technology while announcing its
 * message once, and is closed early only by its close button (shown by a tap or the first Tab) or Escape. How it covers the page
 * and swallows taps is CSS, checked in a real browser with the showcase.
 */

enableAutoUnmount(afterEach);

let canvasContext: FakeCanvasContext;
let audio: FakeAudioContext;

beforeEach(() => {
  vi.useFakeTimers();
  canvasContext = installFakeCanvas();
  audio = installFakeAudio();
  setReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Object.defineProperty(document, "hidden", { configurable: true, value: false });
});

/** Plays a celebration and waits for the layer and the canvas to be on the page. */
async function playAndSettle(
  wrapper: ReturnType<typeof mount<typeof CelebrationOverlay>>,
  options?: Parameters<InstanceType<typeof CelebrationOverlay>["play"]>[1],
  name: "confetti" | "fireworks" = "confetti",
): Promise<boolean> {
  const started = wrapper.vm.play(name, options);
  await nextTick();
  await nextTick();
  return started;
}

/** Moves the fake clock on and lets the page render what that changed. */
async function advance(milliseconds: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(milliseconds);
  await nextTick();
}

describe("playing", () => {
  it("keeps nothing but an empty status region on the page until a celebration is played", () => {
    const wrapper = mount(CelebrationOverlay);

    expect(wrapper.get('[role="status"]').text()).toBe("");
    expect(wrapper.find(".celebration").exists()).toBe(false);
  });

  it("says it started, and puts a canvas over the window that assistive technology skips", async () => {
    const wrapper = mount(CelebrationOverlay);

    expect(await playAndSettle(wrapper)).toBe(true);

    const canvas = wrapper.get(".celebration canvas");
    expect(canvas.attributes("aria-hidden")).toBe("true");
    await advance(20);
    expect(canvasContext.clearRect).toHaveBeenCalled();
  });

  it("animates frame by frame while it plays", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    await advance(500);

    expect(canvasContext.clearRect.mock.calls.length).toBeGreaterThan(20);
  });

  it("plays fireworks as well as confetti", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, {}, "fireworks");
    await advance(1500);

    expect(canvasContext.arc).toHaveBeenCalled();
  });
});

describe("ending on its own", () => {
  it("ends after six seconds by default and tells its owner, once", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    await advance(5999);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    await advance(1);

    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(wrapper.emitted("ended")).toHaveLength(1);
  });

  it("fades the canvas out for the last moments before it ends", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    await advance(5300);
    expect(wrapper.get("canvas").classes()).not.toContain("celebrationCanvasFading");
    await advance(200);

    expect(wrapper.get("canvas").classes()).toContain("celebrationCanvasFading");
  });

  it("lasts as long as the caller asks, within bounds", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { seconds: 8 });
    await advance(7999);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    await advance(1);
    expect(wrapper.find(".celebration").exists()).toBe(false);
  });

  it("is never shorter than five seconds", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { seconds: 1 });

    await advance(4999);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    await advance(1);
    expect(wrapper.find(".celebration").exists()).toBe(false);
  });

  it("is never longer than ten seconds", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { seconds: 600 });

    await advance(10_000);

    expect(wrapper.find(".celebration").exists()).toBe(false);
  });

  it("leaves no timer and no animation frame running once it has ended", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    await advance(6000);
    const clearsAtEnd = canvasContext.clearRect.mock.calls.length;
    await advance(1000);

    expect(vi.getTimerCount()).toBe(0);
    expect(canvasContext.clearRect.mock.calls.length).toBe(clearsAtEnd);
  });
});

describe("cleaning up", () => {
  it("stops its timers, frames and sound when taken off the page while playing", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { sound: true });
    const master = audio.gains[0];

    wrapper.unmount();

    expect(vi.getTimerCount()).toBe(0);
    expect(master?.disconnect).toHaveBeenCalled();
  });

  it("stops listening for keys after it is taken off the page", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);
    wrapper.unmount();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

    expect(wrapper.emitted("ended")).toBeUndefined();
  });

  it("does not say it ended when it was taken away", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    wrapper.unmount();

    expect(wrapper.emitted("ended")).toBeUndefined();
  });

  it("ends when the tab is hidden, so no sound plays unseen", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { sound: true });
    const master = audio.gains[0];

    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
    await nextTick();

    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(master?.disconnect).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("one at a time", () => {
  it("ignores a second request while one is playing, and keeps the first one's time", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);
    await advance(3000);

    const second = wrapper.vm.play("fireworks", { message: "Second" });
    await advance(3000);

    expect(second).toBe(false);
    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(wrapper.find(".celebrationMessage").exists()).toBe(false);
  });

  it("plays again once the first has ended", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);
    await advance(6000);

    const again = await playAndSettle(wrapper);

    expect(again).toBe(true);
    expect(wrapper.find(".celebration").exists()).toBe(true);
  });

  it("can be stopped by its owner", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper);

    wrapper.vm.stop();
    await nextTick();

    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(wrapper.emitted("ended")).toHaveLength(1);
  });

  it("does nothing when stopped with nothing playing", () => {
    const wrapper = mount(CelebrationOverlay);

    wrapper.vm.stop();

    expect(wrapper.emitted("ended")).toBeUndefined();
  });
});

describe("sound", () => {
  it("makes none unless asked, and does not even touch the audio context", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper);
    await advance(1000);

    expect(audio.resumeCalls).toBe(0);
    expect(audio.gains).toHaveLength(0);
    expect(audio.oscillators).toHaveLength(0);
  });

  it("plays the celebration's sound when asked", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: true });

    expect(audio.oscillators.length).toBeGreaterThan(0);
  });

  it("plays no sound for sound: false", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: false });

    expect(audio.oscillators).toHaveLength(0);
  });

  it("still plays the visuals when the browser refuses audio", async () => {
    audio.state = "suspended";
    audio.resumeOutcome = "refuses";
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: true });
    await advance(500);

    expect(audio.oscillators).toHaveLength(0);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    expect(canvasContext.clearRect.mock.calls.length).toBeGreaterThan(20);
  });

  it("says in the console why the sound was left out when the browser refuses audio", async () => {
    audio.state = "suspended";
    audio.resumeOutcome = "refuses";
    const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: true });

    expect(warnings).toHaveBeenCalledWith(expect.stringContaining("sound was left out"), expect.any(Error));
  });

  it("starts the sound after a context that was suspended has resumed", async () => {
    audio.state = "suspended";
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: true });

    expect(audio.resumeCalls).toBeGreaterThan(0);
    expect(audio.oscillators.length).toBeGreaterThan(0);
  });
});

describe("reduced motion", () => {
  beforeEach(() => {
    setReducedMotion(true);
  });

  it("draws one still picture and never an animation frame", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper);
    const clearsAfterDrawing = canvasContext.clearRect.mock.calls.length;
    await advance(1000);

    expect(canvasContext.fillRect).toHaveBeenCalled();
    expect(canvasContext.clearRect.mock.calls.length).toBe(clearsAfterDrawing);
  });

  it("stays three seconds, however long it was asked to stay", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { seconds: 10 });

    await advance(2999);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    await advance(1);

    expect(wrapper.find(".celebration").exists()).toBe(false);
  });

  it("is silent even when sound was asked for, since the sounds follow an animation that is not playing", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { sound: true });

    expect(audio.oscillators).toHaveLength(0);
  });

  it("still shows and announces the message", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { message: "New Record: 225 lbs" });

    expect(wrapper.get('[role="status"]').text()).toBe("New Record: 225 lbs");
  });
});

describe("the message", () => {
  it("is announced by the status region, which is on the page before it", async () => {
    const wrapper = mount(CelebrationOverlay);
    const region = wrapper.get('[role="status"]').element;

    await playAndSettle(wrapper, { message: "New Record: 225 lbs" });

    expect(wrapper.get('[role="status"]').element).toBe(region);
    expect(wrapper.get('[role="status"]').text()).toBe("New Record: 225 lbs");
  });

  it("is drawn once, as one card, not once more for assistive technology", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { message: "New Record: 225 lbs" });

    expect(wrapper.findAll(".celebrationMessage")).toHaveLength(1);
    expect(wrapper.text().split("New Record: 225 lbs")).toHaveLength(2);
  });

  it("is not in the canvas's hidden branch", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { message: "New Record: 225 lbs" });

    expect(wrapper.get(".celebrationMessage").element.closest('[aria-hidden="true"]')).toBeNull();
  });

  it("leaves with the celebration", async () => {
    const wrapper = mount(CelebrationOverlay);
    await playAndSettle(wrapper, { message: "New Record: 225 lbs" });

    await advance(6000);

    expect(wrapper.get('[role="status"]').text()).toBe("");
  });

  it("shows no card when there is no message, or only blanks", async () => {
    const wrapper = mount(CelebrationOverlay);

    await playAndSettle(wrapper, { message: "   " });

    expect(wrapper.find(".celebrationMessage").exists()).toBe(false);
  });
});

describe("closing early", () => {
  /** Mounts attached to the page, so focus works. */
  function mountAttached() {
    return mount(CelebrationOverlay, { attachTo: document.body });
  }

  it("shows no close button until the screen is tapped", async () => {
    const wrapper = mountAttached();

    await playAndSettle(wrapper);

    expect(wrapper.find(".celebrationClose").exists()).toBe(false);
  });

  it("shows the close button on the first tap, which does not end the celebration", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);

    await wrapper.get(".celebration").trigger("click");

    expect(wrapper.find(".celebrationClose").exists()).toBe(true);
    expect(wrapper.find(".celebration").exists()).toBe(true);
    expect(wrapper.emitted("ended")).toBeUndefined();
  });

  it("is a real button with an accessible name and an icon the name does not repeat", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    await wrapper.get(".celebration").trigger("click");

    const button = wrapper.get(".celebrationClose");
    expect(button.element.tagName).toBe("BUTTON");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-label")).toBe("Close celebration");
    expect(button.get("svg").attributes("aria-hidden")).toBe("true");
  });

  it("takes the name the project gives it", async () => {
    const wrapper = mount(CelebrationOverlay, { props: { closeLabel: "Fermer" }, attachTo: document.body });
    await playAndSettle(wrapper);
    await wrapper.get(".celebration").trigger("click");

    expect(wrapper.get(".celebrationClose").attributes("aria-label")).toBe("Fermer");
  });

  it("ends only when the close button is pressed, not by more taps on the screen", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    await wrapper.get(".celebration").trigger("click");
    await wrapper.get(".celebration").trigger("click");
    expect(wrapper.find(".celebration").exists()).toBe(true);

    await wrapper.get(".celebrationClose").trigger("click");

    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(wrapper.emitted("ended")).toHaveLength(1);
  });

  it("ends on Escape, even before the close button has been shown", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.find(".celebration").exists()).toBe(false);
    expect(wrapper.emitted("ended")).toHaveLength(1);
  });

  it("shows the close button and focuses it on the first Tab", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    const tab = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

    window.dispatchEvent(tab);
    await nextTick();
    await nextTick();

    expect(tab.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(wrapper.get(".celebrationClose").element);
  });

  it("lets later Tabs move on as usual, so focus is never trapped", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    await nextTick();
    await nextTick();
    const secondTab = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

    window.dispatchEvent(secondTab);

    expect(secondTab.defaultPrevented).toBe(false);
  });

  it("gives focus back to where it was when the close button, which had it, goes", async () => {
    const before = document.createElement("button");
    document.body.append(before);
    before.focus();
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", cancelable: true }));
    await nextTick();
    await nextTick();

    await wrapper.get(".celebrationClose").trigger("click");

    expect(document.activeElement).toBe(before);
    before.remove();
  });

  it("hides the close button again for the next celebration", async () => {
    const wrapper = mountAttached();
    await playAndSettle(wrapper);
    await wrapper.get(".celebration").trigger("click");
    await advance(6000);

    await playAndSettle(wrapper);

    expect(wrapper.find(".celebrationClose").exists()).toBe(false);
  });
});
