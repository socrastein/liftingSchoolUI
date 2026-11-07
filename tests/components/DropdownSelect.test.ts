// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import DropdownSelect from "../../components/DropdownSelect.vue";

/**
 * The drop-down list on its own: how it is named, where the attributes it is given land, opening, the arrows, Enter, Escape
 * and the mouse, and typing to find an option. Moved with the component from the Lifting App; axe on it, open and closed,
 * runs in each project's real-browser tests.
 */

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

const SET_OPTIONS = [
  { value: "2-3", label: "2-3" },
  { value: "3-4", label: "3-4" },
  { value: "4-5", label: "4-5" },
  { value: "3", label: "3" },
  { value: "custom", label: "Custom…" },
];

function mountSelect(value: string, extra: Record<string, unknown> = {}) {
  return mount(DropdownSelect, {
    props: { options: SET_OPTIONS, value, comboId: "sets-1", label: "Sets, Back Squat", ...extra },
    attachTo: document.body,
  });
}

async function press(wrapper: VueWrapper, key: string): Promise<void> {
  await wrapper.get('[role="combobox"]').trigger("keydown", { key });
}

function highlightedText(wrapper: VueWrapper): string | undefined {
  const activeId = wrapper.get('[role="combobox"]').attributes("aria-activedescendant");
  return activeId === undefined ? undefined : wrapper.get(`[id="${activeId}"]`).text();
}

describe("DropdownSelect", () => {
  it("with no visible label, is named by `label`, and shows the current option", () => {
    const wrapper = mountSelect("3-4");
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.attributes("aria-label")).toBe("Sets, Back Squat");
    expect(combobox.attributes("aria-labelledby")).toBeUndefined();
    expect(combobox.text()).toBe("3-4");
  });

  it("shows nothing when the value is none of the options, and opens at the first", async () => {
    const wrapper = mountSelect("7-9");

    expect(wrapper.get('[role="combobox"]').text()).toBe("");
    await press(wrapper, "ArrowDown");

    expect(highlightedText(wrapper)).toBe("2-3");
    expect(wrapper.find('[aria-selected="true"]').exists()).toBe(false);
  });

  it("with nothing chosen, shows the placeholder, which is no option", async () => {
    const wrapper = mountSelect("", { placeholder: "Choose…" });
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.text()).toBe("Choose…");
    await combobox.trigger("click");

    const optionTexts = wrapper.findAll('[role="option"]').map((option) => option.text());
    expect(optionTexts).not.toContain("Choose…");
  });

  it("once an option is chosen, the placeholder is gone", () => {
    const wrapper = mountSelect("3-4", { placeholder: "Choose…" });

    expect(wrapper.get('[role="combobox"]').text()).toBe("3-4");
  });

  it("puts the attributes it is given (a tooltip, a description) on the combobox", () => {
    const wrapper = mountSelect("3-4", { title: "A hint", "aria-describedby": "hint-1" });
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.attributes("title")).toBe("A hint");
    expect(combobox.attributes("aria-describedby")).toBe("hint-1");
  });

  it("the open list is named like the combobox and as wide as it at least", async () => {
    const wrapper = mountSelect("3-4");

    await wrapper.get('[role="combobox"]').trigger("click");

    const list = wrapper.get('[role="listbox"]');
    expect(list.attributes("aria-label")).toBe("Sets, Back Squat");
    expect(list.attributes("style")).toContain("min-width");
  });

  it("closed, a typed character picks the next option starting with it, going round", async () => {
    vi.useFakeTimers();
    const wrapper = mountSelect("4-5");

    await press(wrapper, "3");
    // A pause ends the search, so "c" starts a new one (typed at once, "3c" would match nothing).
    vi.advanceTimersByTime(500);
    await press(wrapper, "c");

    // From 4-5 the next "3" is the single 3; "c" finds Custom…, matching case-insensitively.
    expect(wrapper.emitted("change")).toEqual([["3"], ["custom"]]);
  });

  it("open, typing the same character again moves on to the next match", async () => {
    const wrapper = mountSelect("2-3");
    await press(wrapper, "ArrowDown");

    await press(wrapper, "3");
    expect(highlightedText(wrapper)).toBe("3-4");
    await press(wrapper, "3");
    expect(highlightedText(wrapper)).toBe("3");
    await press(wrapper, "9");

    expect(highlightedText(wrapper)).toBe("3");
    expect(wrapper.emitted("change")).toBeUndefined();
  });

  it("characters typed together build one search, from the highlighted option on", async () => {
    vi.useFakeTimers();
    const options = [
      { value: "bench", label: "Bench Press" },
      { value: "back", label: "Back Squat" },
      { value: "box", label: "Box Jump" },
    ];
    const wrapper = mountSelect("bench", { options });
    await press(wrapper, "ArrowDown");

    // "b" moves past the highlighted Bench Press to Back Squat; "ba" still matches it, so it stays.
    await press(wrapper, "b");
    await press(wrapper, "a");
    expect(highlightedText(wrapper)).toBe("Back Squat");
    // "bo" is a new search only after a pause; typed at once, "bao" matches nothing and nothing moves.
    await press(wrapper, "o");
    expect(highlightedText(wrapper)).toBe("Back Squat");
    vi.advanceTimersByTime(500);
    await press(wrapper, "b");
    await press(wrapper, "o");

    expect(highlightedText(wrapper)).toBe("Box Jump");
  });

  it("closed, a search picks its match at once", async () => {
    const options = [
      { value: "bench", label: "Bench Press" },
      { value: "back", label: "Back Squat" },
      { value: "box", label: "Box Jump" },
    ];
    const wrapper = mountSelect("back", { options });

    await press(wrapper, "b");
    await press(wrapper, "e");

    // "b" alone moves on from Back Squat to Box Jump; "be" then finds Bench Press.
    expect(wrapper.emitted("change")).toEqual([["box"], ["bench"]]);
  });

  it("an option with a note is marked, and so is the closed box while it is current", async () => {
    const options = [
      { value: "a", label: "Aerobic" },
      { value: "b", label: "Strength", note: "row's target" },
    ];
    const wrapper = mountSelect("b", { options });
    const combobox = wrapper.get('[role="combobox"]');

    expect(combobox.classes()).toContain("hasNote");
    expect(combobox.text()).toBe("Strength, row's target");
    await combobox.trigger("click");

    const marked = wrapper.findAll('[role="option"].hasNote').map((option) => option.text());
    expect(marked).toEqual(["Strength, row's target"]);
  });

  it("opening gives the list a height limit from the room beside the box", async () => {
    const wrapper = mountSelect("3-4");

    await wrapper.get('[role="combobox"]').trigger("click");

    // jsdom lays nothing out (the box is at 0), so the room is the window's height less the 12px margins.
    const expectedMaxHeight = `${window.innerHeight - 12}px`;
    expect(wrapper.get('[role="listbox"]').attributes("style")).toContain(`max-height: ${expectedMaxHeight}`);
  });
});

describe("DropdownSelect, inside a card or dialog that closes on Escape", () => {
  /** Count the Escapes that get past the drop-down, as the card around it would see them. */
  function countEscapesReaching(wrapper: VueWrapper): () => number {
    let escapes = 0;
    wrapper.element.parentElement!.addEventListener("keydown", (event: Event) => {
      if ((event as KeyboardEvent).key === "Escape") escapes++;
    });
    return () => escapes;
  }

  it("keeps the Escape that closes its open list: the card around it stays open", async () => {
    const wrapper = mountSelect("3-4");
    const escapesReachingCard = countEscapesReaching(wrapper);
    await wrapper.get('[role="combobox"]').trigger("click");

    await press(wrapper, "Escape");

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(escapesReachingCard()).toBe(0);
  });

  it("lets an Escape through when its list is closed: that one closes the card", async () => {
    const wrapper = mountSelect("3-4");
    const escapesReachingCard = countEscapesReaching(wrapper);

    await press(wrapper, "Escape");

    expect(escapesReachingCard()).toBe(1);
  });
});

describe("DropdownSelect: opening, moving and choosing", () => {
  it("opens on a click at the current option, which is marked selected", async () => {
    const wrapper = mountSelect("3-4");
    const combobox = wrapper.get('[role="combobox"]');

    await combobox.trigger("click");

    expect(combobox.attributes("aria-expanded")).toBe("true");
    expect(highlightedText(wrapper)).toBe("3-4");
    expect(wrapper.get('[aria-selected="true"]').text()).toBe("3-4");
  });

  it("a click on an option picks it and closes the list", async () => {
    const wrapper = mountSelect("3-4");
    await wrapper.get('[role="combobox"]').trigger("click");

    await wrapper.findAll('[role="option"]')[0]!.trigger("click");

    expect(wrapper.emitted("change")).toEqual([["2-3"]]);
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
  });

  it("the arrows move the highlight, stopping at the ends, and Enter picks it", async () => {
    const wrapper = mountSelect("4-5");
    await press(wrapper, "ArrowDown");

    await press(wrapper, "ArrowDown");
    await press(wrapper, "ArrowDown");
    await press(wrapper, "ArrowDown");
    expect(highlightedText(wrapper)).toBe("Custom…");
    await press(wrapper, "Home");
    await press(wrapper, "ArrowUp");
    expect(highlightedText(wrapper)).toBe("2-3");
    await press(wrapper, "Enter");

    expect(wrapper.emitted("change")).toEqual([["2-3"]]);
  });

  it("hovering an option moves the highlight to it, so there is only ever one", async () => {
    const wrapper = mountSelect("3-4");
    await wrapper.get('[role="combobox"]').trigger("click");

    await wrapper.findAll('[role="option"]')[3]!.trigger("mouseenter");

    expect(highlightedText(wrapper)).toBe("3");
    expect(wrapper.findAll(".isActive")).toHaveLength(1);
  });

  it("Escape closes the list without a change, and picking the current option reports nothing", async () => {
    const wrapper = mountSelect("3-4");
    await press(wrapper, "ArrowDown");
    await press(wrapper, "ArrowDown");
    await press(wrapper, "Escape");
    await press(wrapper, "Enter");
    await press(wrapper, "Enter");

    expect(wrapper.find('[role="listbox"]').exists()).toBe(false);
    expect(wrapper.emitted("change")).toBeUndefined();
  });
});
