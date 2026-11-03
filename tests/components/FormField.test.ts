// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { h } from "vue";
import { mount } from "@vue/test-utils";
import FormField from "../../components/FormField.vue";

/**
 * One labelled form field: the label tied to the control, and the hint, error or "Optional" note read with it. A custom
 * combobox is named by the label's id instead, since a <label for> cannot name it.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

/** The attributes FormField hands to the control in its slot. */
type ControlAttributes = { id: string; labelledBy?: string };

/** A FormField around a text input, spreading the slot's attributes onto it. */
function mountField(props: Record<string, unknown>) {
  return mount(FormField, {
    props: { id: "clientName", label: "Name", ...props },
    slots: {
      default: (attributes: object) => h("input", { ...attributes, type: "text" }),
    },
  });
}

/** A FormField around a stand-in combobox, on the page, recording the attributes its slot received. */
function mountComboboxField() {
  const received: { attributes?: ControlAttributes } = {};
  const wrapper = mount(FormField, {
    props: { id: "movement", label: "Movement", isCombobox: true },
    slots: {
      default: (attributes: ControlAttributes) => {
        received.attributes = attributes;
        return h("div", { id: attributes.id, "data-field": attributes.id, role: "combobox", tabindex: 0 });
      },
    },
    attachTo: document.body,
  });
  return { wrapper, received };
}

describe("FormField", () => {
  it("ties the label to the control", () => {
    const wrapper = mountField({});

    expect(wrapper.get("label").attributes("for")).toBe("clientName");
    expect(wrapper.get("input").attributes("id")).toBe("clientName");
  });

  it("gives the control its name in the form, for a form that focuses the first problem", () => {
    expect(mountField({}).get("input").attributes("data-field")).toBe("clientName");
  });

  it("with an error: marks the control invalid, shows the message, and points the control at it", () => {
    const wrapper = mountField({ error: "Enter a name." });

    const input = wrapper.get("input");
    expect(input.attributes("aria-invalid")).toBe("true");
    const errorId = input.attributes("aria-describedby")!;
    expect(wrapper.get(`#${errorId}`).text()).toBe("Enter a name.");
  });

  it("without an error: not invalid, no message", () => {
    const wrapper = mountField({ error: "" });

    expect(wrapper.get("input").attributes("aria-invalid")).toBeUndefined();
    expect(wrapper.find(".fieldError").exists()).toBe(false);
  });

  it("an optional field shows 'Optional' and is described by it", () => {
    const wrapper = mountField({ optional: true });

    const describedBy = wrapper.get("input").attributes("aria-describedby")!;
    expect(wrapper.get(`#${describedBy}`).text()).toBe("Optional");
  });

  it("an error takes the place of the 'Optional' note", () => {
    const wrapper = mountField({ optional: true, error: "Enter a name." });

    expect(wrapper.text()).not.toContain("Optional");
  });

  it("a hint is shown and read with the control, before an error", () => {
    const wrapper = mountField({ hint: "Pulling down from overhead.", error: "Pick one." });

    const describedBy = wrapper.get("input").attributes("aria-describedby")!.split(" ");
    const texts = describedBy.map((id) => wrapper.get(`#${id}`).text());
    expect(texts).toEqual(["Pulling down from overhead.", "Pick one."]);
  });

  it("a field with nothing to say describes its control with nothing", () => {
    expect(mountField({}).get("input").attributes("aria-describedby")).toBeUndefined();
  });

  it("hideLabel keeps the label for assistive technology but hides it from sight", () => {
    expect(mountField({ hideLabel: true }).get("label").classes()).toContain("visuallyHidden");
    expect(mountField({}).get("label").classes()).not.toContain("visuallyHidden");
  });
});

describe("FormField around a combobox", () => {
  it("names it by the label's id instead of <label for>, and passes that id as `labelledBy`", () => {
    const { wrapper, received } = mountComboboxField();

    expect(wrapper.find("label").exists()).toBe(false);
    expect(wrapper.get("#movement-label").text()).toBe("Movement");
    expect(received.attributes?.labelledBy).toBe("movement-label");
  });

  it("a click on the label focuses the combobox, as a click on a <label for> would", async () => {
    const { wrapper } = mountComboboxField();

    await wrapper.get("#movement-label").trigger("click");

    expect(document.activeElement).toBe(wrapper.get("#movement").element);
  });

  it("a plain field passes no `labelledBy`", () => {
    const received: { attributes?: ControlAttributes } = {};
    mount(FormField, {
      props: { id: "clientName", label: "Name" },
      slots: {
        default: (attributes: ControlAttributes) => {
          received.attributes = attributes;
          return h("input", attributes);
        },
      },
    });

    expect(received.attributes?.labelledBy).toBeUndefined();
  });
});
