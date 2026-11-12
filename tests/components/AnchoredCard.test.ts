// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h, ref } from "vue";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import AnchoredCard from "../../components/AnchoredCard.vue";

/**
 * A small non-modal card beside the button that opened it: named by its heading, focus goes in on opening, and it closes on
 * Escape or its close button (focus back on the button), a click elsewhere, or Tab past its end. Where it is drawn (beside the
 * button, flipping above near the bottom of the window) is checked in a real browser, in each project's browser tests.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

/** A plain button on the page, outside any component: the card's opener, or somewhere else to click. */
function addPageButton(text: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = text;
  document.body.append(button);
  return button;
}

/** A button and the card it opened (with a field inside), mounted on the page; `closeLabel` as the parent would pass it. */
async function mountOpenCard(closeLabel?: string, hidesHeader?: boolean, focusOnOpen?: "firstField" | "card") {
  const anchor = addPageButton("Opener");
  const outside = addPageButton("Somewhere else");

  const isOpen = ref(true);
  const Host = defineComponent({
    setup() {
      return () =>
        isOpen.value
          ? h(
              AnchoredCard,
              { anchor, heading: "Set 2 note", closeLabel, hidesHeader, focusOnOpen, onClose: () => (isOpen.value = false) },
              { default: () => h("textarea", { class: "field" }) },
            )
          : null;
    },
  });
  const wrapper = mount(Host, { attachTo: document.body });
  await flushPromises();
  return { wrapper, anchor, outside, isOpen };
}

/** The card's close button, found by its words. */
function closeButton(wrapper: VueWrapper, label = "Done") {
  return wrapper.findAll("button").find((button) => button.text() === label)!;
}

describe("AnchoredCard", () => {
  it("with hidesHeader, keeps the heading row out of sight, still naming the dialog and still closing on its button", async () => {
    const { wrapper, isOpen } = await mountOpenCard(undefined, true);

    const header = wrapper.get(".anchoredHeader");
    expect(header.classes()).toContain("hiddenUntilFocused");
    const headingId = wrapper.get('[role="dialog"]').attributes("aria-labelledby")!;
    expect(document.getElementById(headingId)?.textContent).toBe("Set 2 note");
    await closeButton(wrapper).trigger("click");
    expect(isOpen.value).toBe(false);
  });

  it("with focusOnOpen card, focuses the card itself, not its field (no phone keyboard comes up)", async () => {
    const { wrapper } = await mountOpenCard(undefined, undefined, "card");

    expect(document.activeElement).toBe(wrapper.get('[role="dialog"]').element);
  });

  it("shows its heading row by default", async () => {
    const { wrapper } = await mountOpenCard();

    expect(wrapper.get(".anchoredHeader").classes()).not.toContain("hiddenUntilFocused");
  });

  it("is a dialog named by its heading, and focus goes to its first field", async () => {
    const { wrapper } = await mountOpenCard();

    const card = wrapper.get('[role="dialog"]');
    const headingId = card.attributes("aria-labelledby")!;
    expect(document.getElementById(headingId)?.textContent).toBe("Set 2 note");
    expect(document.activeElement).toBe(wrapper.get("textarea.field").element);
  });

  it("Escape closes it and puts focus back on its button", async () => {
    const { wrapper, anchor, isOpen } = await mountOpenCard();

    await wrapper.get('[role="dialog"]').trigger("keydown", { key: "Escape" });

    expect(isOpen.value).toBe(false);
    expect(document.activeElement).toBe(anchor);
  });

  it("Done closes it and puts focus back on its button", async () => {
    const { wrapper, anchor, isOpen } = await mountOpenCard();

    await closeButton(wrapper).trigger("click");

    expect(isOpen.value).toBe(false);
    expect(document.activeElement).toBe(anchor);
  });

  it("its close button says what closing means: Done by default, or the label the parent gives", async () => {
    const { wrapper } = await mountOpenCard("Cancel");

    expect(closeButton(wrapper, "Cancel").exists()).toBe(true);
    expect(closeButton(wrapper)).toBeUndefined();
  });

  it("Tab past its end closes it, leaving focus where it went", async () => {
    const { wrapper, outside, isOpen } = await mountOpenCard();

    await wrapper.get('[role="dialog"]').trigger("focusout", { relatedTarget: outside });

    expect(isOpen.value).toBe(false);
  });

  it("focus moving within the card, or back to its button, keeps it open", async () => {
    const { wrapper, anchor, isOpen } = await mountOpenCard();
    const card = wrapper.get('[role="dialog"]');

    await card.trigger("focusout", { relatedTarget: closeButton(wrapper).element });
    await card.trigger("focusout", { relatedTarget: anchor });

    expect(isOpen.value).toBe(true);
  });

  it("takes focus itself, without being a Tab stop, so a click on its blank space keeps it open", async () => {
    const { wrapper, isOpen } = await mountOpenCard();
    const card = wrapper.get('[role="dialog"]');

    // A browser moves focus to the nearest focusable ancestor of a click; the card being one keeps that focus inside.
    expect(card.attributes("tabindex")).toBe("-1");
    await card.trigger("focusout", { relatedTarget: card.element });

    expect(isOpen.value).toBe(true);
  });

  it("a click elsewhere closes it; a click on its own button is left to the button", async () => {
    const { anchor, outside, isOpen } = await mountOpenCard();

    anchor.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    anchor.click();
    expect(isOpen.value).toBe(true);
    // The watcher takes one click per tick (it guards against a click counted twice).
    await new Promise((resolve) => setTimeout(resolve, 0));

    outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    outside.click();
    expect(isOpen.value).toBe(false);
  });
});
