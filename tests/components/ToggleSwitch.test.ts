// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ToggleSwitch from "../../components/ToggleSwitch.vue";

/**
 * An on/off switch: a native checkbox that screen readers announce as a switch, named by its label, whose state is the
 * v-model and which only reports (the parent decides what on means).
 */

/** A switch with the given props, reporting its changes into `updates`. */
function mountSwitch(props: { modelValue: boolean; label?: string; hideLabel?: boolean }) {
  const updates: boolean[] = [];
  const wrapper = mount(ToggleSwitch, {
    props: {
      label: "Show RIR and RPE",
      ...props,
      "onUpdate:modelValue": (isOn: boolean) => updates.push(isOn),
    },
  });
  return { wrapper, updates };
}

describe("ToggleSwitch", () => {
  it("is a checkbox announced as a switch, named by its label", () => {
    const { wrapper } = mountSwitch({ modelValue: false });

    const input = wrapper.get("input");
    expect(input.attributes("type")).toBe("checkbox");
    expect(input.attributes("role")).toBe("switch");
    expect(wrapper.get("label").text()).toBe("Show RIR and RPE");
  });

  it("shows the model's state", () => {
    expect(mountSwitch({ modelValue: true }).wrapper.get("input").element.checked).toBe(true);
    expect(mountSwitch({ modelValue: false }).wrapper.get("input").element.checked).toBe(false);
  });

  it("reports the new state when it is flipped, and changes nothing itself", async () => {
    const { wrapper, updates } = mountSwitch({ modelValue: false });

    await wrapper.get("input").setValue(true);

    expect(updates).toEqual([true]);
  });

  it("hideLabel keeps the label for assistive technology but hides it from sight", () => {
    const hidden = mountSwitch({ modelValue: false, hideLabel: true }).wrapper;
    const shown = mountSwitch({ modelValue: false }).wrapper;

    expect(hidden.get("label").text()).toBe("Show RIR and RPE");
    expect(hidden.get("label > span:last-child").classes()).toContain("visuallyHidden");
    expect(shown.get("label > span:last-child").classes()).not.toContain("visuallyHidden");
  });

  it("puts the given id on the checkbox", () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: "Deload week", id: "weekDeload" } });

    expect(wrapper.get("input").attributes("id")).toBe("weekDeload");
  });
});
