// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import DisclosureSection from "../../components/DisclosureSection.vue";

/**
 * A folded-away section: a button naming it that says whether it is open (aria-expanded) and points at its content, which is
 * always drawn so it can ease open. A heading-level title wraps the button in a heading. Opening scrolls the section into view
 * ("nearest": as little as needed) and closing never does; the easing itself is CSS, checked in a real browser.
 */

const scrollIntoView = vi.fn();

/** The opening of the body itself, as the browser reports it. */
const OPENING = { propertyName: "grid-template-rows" };

afterEach(() => {
  scrollIntoView.mockReset();
  document.body.innerHTML = "";
});

/** A section on the page, with jsdom's missing scrollIntoView stubbed. */
function mountSection(props: Record<string, unknown> = {}) {
  Element.prototype.scrollIntoView = scrollIntoView;
  return mount(DisclosureSection, {
    props: { title: "Past clients (3)", ...props },
    slots: { default: "<p>The content</p>" },
    attachTo: document.body,
  });
}

describe("DisclosureSection", () => {
  it("is a button that starts shut, names the section and points at its content", () => {
    const wrapper = mountSection();
    const button = wrapper.get("button.disclosure");
    expect(button.text()).toBe("Past clients (3)");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(button.attributes("aria-controls")).toBe(wrapper.get(".disclosureBody").attributes("id"));
    expect(wrapper.get(".disclosureBody").classes()).not.toContain("disclosureBodyOpen");
    expect(wrapper.text()).toContain("The content");
  });

  it("opens and shuts when pressed", async () => {
    const wrapper = mountSection();
    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");
    expect(wrapper.get(".disclosureBody").classes()).toContain("disclosureBodyOpen");

    await wrapper.get("button").trigger("click");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    expect(wrapper.get(".disclosureBody").classes()).not.toContain("disclosureBodyOpen");
  });

  it("can start open, and follows the parent when its wish changes", async () => {
    const wrapper = mountSection({ open: true });
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("true");

    await wrapper.setProps({ open: false });
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
  });

  it("scrolls itself into view as little as possible when it opens, and never when it closes", async () => {
    const wrapper = mountSection();
    await wrapper.get("button").trigger("click");
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", behavior: "instant" });

    await wrapper.get(".disclosureBody").trigger("transitionend", OPENING);
    scrollIntoView.mockClear();
    await wrapper.get("button").trigger("click");
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("scrolls once more when the opening finishes, for the last of the growth", async () => {
    const wrapper = mountSection();
    await wrapper.get("button").trigger("click");
    scrollIntoView.mockClear();

    await wrapper.get(".disclosureBody").trigger("transitionend", OPENING);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it("keeps following when something inside the content finishes a transition of its own", async () => {
    const wrapper = mountSection();
    await wrapper.get("button").trigger("click");
    scrollIntoView.mockClear();

    await wrapper.get("p").trigger("transitionend", { propertyName: "color" });
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(scrollIntoView).toHaveBeenCalled();
    await wrapper.get(".disclosureBody").trigger("transitionend", OPENING);
  });

  it("lets the parent own whether it is open, with v-model:open, for a state kept between visits", async () => {
    const changes: boolean[] = [];
    const wrapper = mountSection({ open: false, "onUpdate:open": (isOpen: boolean) => changes.push(isOpen) });
    await wrapper.get("button").trigger("click");
    expect(changes).toEqual([true]);
  });

  it("stops following the growth once the opening has finished", async () => {
    const wrapper = mountSection();
    await wrapper.get("button").trigger("click");
    await wrapper.get(".disclosureBody").trigger("transitionend", OPENING);
    scrollIntoView.mockClear();

    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("is only a button without a level, and wraps the button in a heading with one", () => {
    expect(mountSection().find("h2, h3, h4").exists()).toBe(false);

    const wrapper = mountSection({ level: 3, look: "part" });
    const heading = wrapper.get("h3");
    expect(heading.classes()).toEqual(["partTitle"]);
    expect(heading.find("button.disclosure").exists()).toBe(true);
  });
});
