// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { h } from "vue";
import { mount } from "@vue/test-utils";
import FormFieldGroup from "../../components/FormFieldGroup.vue";

/**
 * A group of related choices under one question: a fieldset whose legend is the question, described by its error or its
 * "Optional" note, and findable by a form (through its id) after a failed submit.
 */

/** A group of one checkbox, with whatever props the test is about. */
function mountGroup(props: Record<string, unknown>) {
  return mount(FormFieldGroup, {
    props: { legend: "Primary muscles", ...props },
    slots: { default: () => h("input", { type: "checkbox" }) },
  });
}

describe("FormFieldGroup", () => {
  it("is a fieldset whose legend is the question, around the options", () => {
    const wrapper = mountGroup({});

    expect(wrapper.get("fieldset legend").text()).toBe("Primary muscles");
    expect(wrapper.find('fieldset input[type="checkbox"]').exists()).toBe(true);
  });

  it("with an error: shows it, and describes the group with it", () => {
    const wrapper = mountGroup({ error: "Glutes is already a primary muscle." });

    const describedBy = wrapper.get("fieldset").attributes("aria-describedby")!;
    expect(wrapper.get(`#${describedBy}`).text()).toBe("Glutes is already a primary muscle.");
  });

  it("with an id: can be found and focused by a form, without becoming a Tab stop", () => {
    const wrapper = mountGroup({ id: "secondaryMuscles" });

    const fieldset = wrapper.get("fieldset");
    expect(fieldset.attributes("data-field")).toBe("secondaryMuscles");
    expect(fieldset.attributes("tabindex")).toBe("-1");
  });

  it("without an id: is not focusable at all", () => {
    const fieldset = mountGroup({}).get("fieldset");

    expect(fieldset.attributes("data-field")).toBeUndefined();
    expect(fieldset.attributes("tabindex")).toBeUndefined();
  });

  it("an optional group is described by its 'Optional' note", () => {
    const wrapper = mountGroup({ optional: true });

    const describedBy = wrapper.get("fieldset").attributes("aria-describedby")!;
    expect(wrapper.get(`#${describedBy}`).text()).toBe("Optional");
  });

  it("an error takes the place of the 'Optional' note", () => {
    const wrapper = mountGroup({ optional: true, error: "Pick at least one." });

    expect(wrapper.text()).toContain("Pick at least one.");
    expect(wrapper.text()).not.toContain("Optional");
  });

  it("boxed draws the group as a panel", () => {
    expect(mountGroup({ boxed: true }).get(".field").classes()).toContain("panel");
    expect(mountGroup({}).get(".field").classes()).not.toContain("panel");
  });
});
