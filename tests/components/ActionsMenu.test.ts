// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { h } from "vue";
import { flushPromises, mount } from "@vue/test-utils";
import ActionsMenu from "../../components/ActionsMenu.vue";

/**
 * The ⋮ "more actions" menu: a named button that shows or hides its actions, focus going to the first usable one; an action
 * closes it, and so do Escape (focus back on ⋮), a click elsewhere and Tab past its end. Where it is drawn is FloatingPanel's
 * (checked through AnchoredCard here, and in a real browser in each project's browser tests).
 */

afterEach(() => {
  document.body.innerHTML = "";
});

/** A menu with a disabled first action and two usable ones, on the page. */
function mountMenu() {
  const clicked: string[] = [];
  const wrapper = mount(ActionsMenu, {
    props: { label: "Actions for Back Squat", toggleId: "actions-1" },
    slots: {
      default: () => [
        h("button", { class: "up", disabled: true }, "Move up"),
        h("button", { class: "down", onClick: () => clicked.push("down") }, "Move down"),
        h("button", { class: "remove" }, "Remove"),
      ],
    },
    attachTo: document.body,
  });
  return { wrapper, clicked };
}

describe("ActionsMenu", () => {
  it("is a named button that opens its actions and focuses the first usable one", async () => {
    const { wrapper } = mountMenu();
    const toggle = wrapper.get("#actions-1");
    expect(toggle.attributes("aria-label")).toBe("Actions for Back Squat");
    expect(toggle.attributes("aria-expanded")).toBe("false");

    await toggle.trigger("click");
    await flushPromises();

    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(toggle.attributes("aria-controls")).toBe(wrapper.get(".actionsList").attributes("id"));
    expect(document.activeElement).toBe(wrapper.get("button.down").element);
  });

  it("an action does its work and closes the menu", async () => {
    const { wrapper, clicked } = mountMenu();
    await wrapper.get("#actions-1").trigger("click");

    await wrapper.get("button.down").trigger("click");

    expect(clicked).toEqual(["down"]);
    expect(wrapper.find(".actionsList").exists()).toBe(false);
  });

  it("Escape closes it and puts focus back on ⋮", async () => {
    const { wrapper } = mountMenu();
    await wrapper.get("#actions-1").trigger("click");

    await wrapper.get(".actionsList").trigger("keydown", { key: "Escape" });

    expect(wrapper.find(".actionsList").exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.get("#actions-1").element);
  });

  it("Tab past its end closes it; focus moving within it, or back to ⋮, keeps it open", async () => {
    const { wrapper } = mountMenu();
    const outside = document.createElement("button");
    document.body.append(outside);
    await wrapper.get("#actions-1").trigger("click");
    const list = wrapper.get(".actionsList");

    await list.trigger("focusout", { relatedTarget: wrapper.get("button.remove").element });
    await list.trigger("focusout", { relatedTarget: wrapper.get("#actions-1").element });
    expect(wrapper.find(".actionsList").exists()).toBe(true);

    await list.trigger("focusout", { relatedTarget: outside });
    expect(wrapper.find(".actionsList").exists()).toBe(false);
  });

  it("a second click on ⋮ closes it", async () => {
    const { wrapper } = mountMenu();
    const toggle = wrapper.get("#actions-1");

    await toggle.trigger("click");
    await toggle.trigger("click");

    expect(wrapper.find(".actionsList").exists()).toBe(false);
  });
});
