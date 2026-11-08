// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { mount } from "@vue/test-utils";
import StatusToast from "../../components/StatusToast.vue";

/**
 * A confirmation that shows when its owner calls `show`, inside a status region that is always on the page (so screen readers
 * announce it), and leaves on its own after its time, which a newer message starts over.
 */

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Calls `show` on a mounted toast and waits for the message to be drawn. */
async function showMessage(wrapper: ReturnType<typeof mount<typeof StatusToast>>, message: string): Promise<void> {
  await wrapper.vm.show(message);
  await nextTick();
}

describe("StatusToast", () => {
  it("keeps an empty status region on the page while there is nothing to say", () => {
    const wrapper = mount(StatusToast);

    expect(wrapper.get('[role="status"]').text()).toBe("");
    expect(wrapper.find(".toast").exists()).toBe(false);
  });

  it("shows a message inside the status region", async () => {
    const wrapper = mount(StatusToast);

    await showMessage(wrapper, "Added 180.0 lbs for Oct 25, 2026.");

    expect(wrapper.get('[role="status"] .toast').text()).toBe("Added 180.0 lbs for Oct 25, 2026.");
  });

  it("hides the message after four seconds by default", async () => {
    const wrapper = mount(StatusToast);
    await showMessage(wrapper, "Copied.");

    vi.advanceTimersByTime(3999);
    await nextTick();
    expect(wrapper.find(".toast").exists()).toBe(true);

    vi.advanceTimersByTime(1);
    await nextTick();
    expect(wrapper.find(".toast").exists()).toBe(false);
  });

  it("stays up for the number of seconds it is given", async () => {
    const wrapper = mount(StatusToast, { props: { seconds: 1 } });
    await showMessage(wrapper, "Copied.");

    vi.advanceTimersByTime(1000);
    await nextTick();

    expect(wrapper.find(".toast").exists()).toBe(false);
  });

  it("replaces an earlier message and starts its time over", async () => {
    const wrapper = mount(StatusToast);
    await showMessage(wrapper, "First.");
    vi.advanceTimersByTime(3000);

    await showMessage(wrapper, "Second.");
    vi.advanceTimersByTime(3000);
    await nextTick();

    expect(wrapper.get(".toast").text()).toBe("Second.");
  });

  it("clears the text for a moment when the same message comes again, so it is announced again", async () => {
    const wrapper = mount(StatusToast);
    await showMessage(wrapper, "Copied.");

    const showing = wrapper.vm.show("Copied.");
    await nextTick();
    expect(wrapper.find(".toast").exists()).toBe(false);

    await showing;
    await nextTick();
    expect(wrapper.get(".toast").text()).toBe("Copied.");
  });
});
