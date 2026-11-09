// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ChoiceSwitch from "../../components/ChoiceSwitch.vue";

/**
 * A row of choices, one on: toggle buttons in a named group, the chosen one pressed, and a press reported by the rule every
 * switch follows (choiceAfterPress, tested on its own): the pressed choice, or the next one when it was already on.
 */

const UNITS = [
  { value: "lbs", label: "lbs" },
  { value: "kg", label: "kg" },
] as const;

/** A switch on `chosen`, reporting each new choice into `updates`. */
function mountSwitch(chosen: string) {
  const updates: string[] = [];
  const wrapper = mount(ChoiceSwitch<string>, {
    props: { label: "Units", choices: UNITS, modelValue: chosen, "onUpdate:modelValue": (value: string) => updates.push(value) },
  });
  return { wrapper, updates };
}

describe("ChoiceSwitch", () => {
  it("is a group named by its label, of buttons showing which choice is on", () => {
    const { wrapper } = mountSwitch("kg");
    expect(wrapper.get("[role=group]").attributes("aria-label")).toBe("Units");
    const pressed = wrapper.findAll("button").map((button) => [button.text(), button.attributes("aria-pressed")]);
    expect(pressed).toEqual([
      ["lbs", "false"],
      ["kg", "true"],
    ]);
  });

  it("turns on a choice that was off", async () => {
    const { wrapper, updates } = mountSwitch("lbs");
    await wrapper.findAll("button")[1]!.trigger("click");
    expect(updates).toEqual(["kg"]);
  });

  it("flips a two-way switch when the choice already on is pressed", async () => {
    const { wrapper, updates } = mountSwitch("lbs");
    await wrapper.findAll("button")[0]!.trigger("click");
    expect(updates).toEqual(["kg"]);
  });
});
