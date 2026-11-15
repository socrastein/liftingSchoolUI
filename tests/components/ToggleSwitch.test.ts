// @vitest-environment jsdom
import { defineComponent } from "vue";
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ToggleSwitch from "../../components/ToggleSwitch.vue";

/**
 * An on/off switch: a native checkbox that screen readers announce as a switch, named by its label, whose state is the
 * v-model and which only reports (the parent decides what on means).
 */

/** A switch with the given props, reporting its changes into `updates`. */
function mountSwitch(props: { modelValue: boolean; label?: string; hideLabel?: boolean; hint?: string }) {
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

  describe("hint", () => {
    const hint = "Concentric of every rep as fast as possible.";

    /** The text of the element the checkbox's aria-describedby points at, or undefined without one. */
    function describedText(wrapper: ReturnType<typeof mount>): string | undefined {
      const describedBy = wrapper.get("input").attributes("aria-describedby");
      if (describedBy === undefined) return undefined;
      return wrapper.get(`[id="${describedBy}"]`).text();
    }

    it("is the label's tooltip and the checkbox's description, in a visually hidden element", () => {
      const { wrapper } = mountSwitch({ modelValue: false, hint });

      expect(wrapper.get("label").attributes("title")).toBe(hint);
      expect(describedText(wrapper)).toBe(hint);
      const describedBy = wrapper.get("input").attributes("aria-describedby");
      expect(wrapper.get(`[id="${describedBy}"]`).classes()).toContain("visuallyHidden");
    });

    it("is not part of the accessible name: the hidden element is aria-hidden", () => {
      const { wrapper } = mountSwitch({ modelValue: false, hint });
      const describedBy = wrapper.get("input").attributes("aria-describedby");

      expect(wrapper.get(`[id="${describedBy}"]`).attributes("aria-hidden")).toBe("true");
    });

    it("gives every switch on one page its own description id, with or without an id of its own", () => {
      // Separate mount() calls are separate apps, whose generated ids restart; one page is one app, so mount all three at once.
      const page = defineComponent({
        components: { ToggleSwitch },
        data: () => ({ isOn: false }),
        template: `<div>
          <ToggleSwitch v-model="isOn" label="A" hint="First." />
          <ToggleSwitch v-model="isOn" label="B" hint="Second." id="bSwitch" />
          <ToggleSwitch v-model="isOn" label="C" hint="Third." />
        </div>`,
      });
      const wrapper = mount(page);

      const ids = wrapper.findAll("input").map((input) => input.attributes("aria-describedby"));
      expect(new Set(ids).size).toBe(3);
      expect(ids).not.toContain(undefined);
      const texts = ids.map((id) => wrapper.get(`[id="${id}"]`).text());
      expect(texts).toEqual(["First.", "Second.", "Third."]);
    });

    it("without one adds no tooltip, no description and no extra element", () => {
      const { wrapper } = mountSwitch({ modelValue: false });

      expect(wrapper.get("label").attributes("title")).toBeUndefined();
      expect(wrapper.get("input").attributes("aria-describedby")).toBeUndefined();
      expect(wrapper.findAll("label > *")).toHaveLength(3);
      expect(wrapper.html()).not.toContain('aria-hidden="true">Concentric');
    });

    it("follows the prop when it changes, and goes away when removed", async () => {
      const { wrapper } = mountSwitch({ modelValue: false, hint });

      await wrapper.setProps({ hint: "Something else." });
      expect(wrapper.get("label").attributes("title")).toBe("Something else.");
      expect(describedText(wrapper)).toBe("Something else.");

      await wrapper.setProps({ hint: undefined });
      expect(wrapper.get("label").attributes("title")).toBeUndefined();
      expect(wrapper.get("input").attributes("aria-describedby")).toBeUndefined();
    });
  });
});
