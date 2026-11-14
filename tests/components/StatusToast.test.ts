// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { enableAutoUnmount, mount } from "@vue/test-utils";
import StatusToast from "../../components/StatusToast.vue";

/**
 * A confirmation that shows when its owner calls `show`, inside a status region that is always on the page (so screen readers
 * announce it), and leaves on its own after its time, which a newer message starts over.
 */

// Every instance shares one queue for the whole file, so a toast left up by one test would hold back the next test's
enableAutoUnmount(afterEach);

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

  it("holds a newer message until the earlier one has left, then shows it for its full time", async () => {
    const wrapper = mount(StatusToast);
    await showMessage(wrapper, "First.");
    vi.advanceTimersByTime(3000);

    wrapper.vm.show("Second.");
    await vi.advanceTimersByTimeAsync(0);
    expect(wrapper.get(".toast").text()).toBe("First.");

    await vi.advanceTimersByTimeAsync(1000);
    expect(wrapper.get(".toast").text()).toBe("Second.");

    await vi.advanceTimersByTimeAsync(3999);
    expect(wrapper.get(".toast").text()).toBe("Second.");
  });

  it("shows the same message again after it has left, for its full time", async () => {
    const wrapper = mount(StatusToast);
    await showMessage(wrapper, "Copied.");

    wrapper.vm.show("Copied.");
    await vi.advanceTimersByTimeAsync(3999);
    expect(wrapper.get(".toast").text()).toBe("Copied.");

    await vi.advanceTimersByTimeAsync(1);
    await nextTick();
    expect(wrapper.get(".toast").text()).toBe("Copied.");

    await vi.advanceTimersByTimeAsync(4000);
    await nextTick();
    expect(wrapper.find(".toast").exists()).toBe(false);
  });

  describe("with several instances on the page", () => {
    /** The text of the toast drawn by a mounted instance, or undefined when it shows none. */
    function textOf(wrapper: ReturnType<typeof mount<typeof StatusToast>>): string | undefined {
      return wrapper.find(".toast").exists() ? wrapper.get(".toast").text() : undefined;
    }

    it("shows toasts fired together one after the other, in order, each for its full time", async () => {
      const first = mount(StatusToast);
      const second = mount(StatusToast);

      first.vm.show("One.");
      second.vm.show("Two.");
      await vi.advanceTimersByTimeAsync(0);
      expect([textOf(first), textOf(second)]).toEqual(["One.", undefined]);

      await vi.advanceTimersByTimeAsync(3999);
      expect([textOf(first), textOf(second)]).toEqual(["One.", undefined]);

      await vi.advanceTimersByTimeAsync(1);
      expect([textOf(first), textOf(second)]).toEqual([undefined, "Two."]);

      await vi.advanceTimersByTimeAsync(4000);
      expect([textOf(first), textOf(second)]).toEqual([undefined, undefined]);
    });

    it("keeps at most three waiting behind the one showing", async () => {
      const first = mount(StatusToast);
      const second = mount(StatusToast);
      const shown: string[] = [];

      for (const message of ["A", "B", "C", "D", "E"]) {
        (message < "C" ? first : second).vm.show(message);
      }
      for (let turn = 0; turn < 5; turn++) {
        await vi.advanceTimersByTimeAsync(0);
        shown.push(textOf(first) ?? textOf(second) ?? "");
        await vi.advanceTimersByTimeAsync(4000);
      }

      expect(shown).toEqual(["A", "C", "D", "E", ""]);
    });

    it("merges a message identical to a waiting one", async () => {
      const first = mount(StatusToast);
      const second = mount(StatusToast);
      const shown: string[] = [];

      first.vm.show("Busy.");
      second.vm.show("Copied.");
      first.vm.show("Copied.");
      for (let turn = 0; turn < 3; turn++) {
        await vi.advanceTimersByTimeAsync(0);
        shown.push(textOf(first) ?? textOf(second) ?? "");
        await vi.advanceTimersByTimeAsync(4000);
      }

      expect(shown).toEqual(["Busy.", "Copied.", ""]);
    });

    it("shows the next toast at once when the instance showing is unmounted", async () => {
      const first = mount(StatusToast);
      const second = mount(StatusToast);
      first.vm.show("Leaving.");
      second.vm.show("Next.");
      await vi.advanceTimersByTimeAsync(1000);

      first.unmount();
      await vi.advanceTimersByTimeAsync(0);
      await nextTick();

      expect(textOf(second)).toBe("Next.");
    });

    it("never shows what an unmounted instance left waiting", async () => {
      const first = mount(StatusToast);
      const second = mount(StatusToast);
      const third = mount(StatusToast);
      first.vm.show("On screen.");
      second.vm.show("Abandoned.");
      third.vm.show("Kept.");

      second.unmount();
      await vi.advanceTimersByTimeAsync(4000);
      await nextTick();

      expect(textOf(third)).toBe("Kept.");
    });
  });
});
