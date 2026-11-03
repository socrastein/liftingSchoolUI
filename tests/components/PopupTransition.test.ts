// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import { mount } from "@vue/test-utils";
import PopupTransition from "../../components/PopupTransition.vue";

/**
 * components/PopupTransition.spec.ts
 * ----------------------------------
 * How popups open and close. The fades themselves are CSS (checked by
 * eye); what is locked down here is that a closing popup is out of
 * reach at once: `inert` from the moment it starts to fade out.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

/** A popup toggled by `isOpen`, inside a real (not stubbed) PopupTransition. */
function mountPopup() {
  const isOpen = ref(true);
  const Host = defineComponent({
    setup: () => () =>
      h(PopupTransition, null, {
        default: () => (isOpen.value ? h("div", { class: "popup" }, "Menu") : null),
      }),
  });
  const wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { transition: false } },
  });
  return { wrapper, isOpen };
}

describe("PopupTransition", () => {
  it("an open popup is reachable", () => {
    const { wrapper } = mountPopup();

    expect(wrapper.get(".popup").attributes("inert")).toBeUndefined();
  });

  it("a closing popup is inert while it fades out", async () => {
    const { wrapper, isOpen } = mountPopup();
    // Held on to: jsdom has no CSS timing, so the fade ends at once and the element leaves the page.
    const popup = wrapper.get(".popup").element;

    isOpen.value = false;
    await nextTick();

    expect(popup.hasAttribute("inert")).toBe(true);
  });
});
