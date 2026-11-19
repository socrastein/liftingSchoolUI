// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SearchCard from "../../components/SearchCard.vue";

/**
 * The search card: the count line at the top of the card, the unlabelled search box under it (named by `label`) with an x that
 * clears it, and a slot under the box for whatever a page adds.
 */

/** A card with studies as its noun; the numbers and anything else are the test's. */
function mountCard(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(SearchCard, {
    props: {
      modelValue: "",
      shown: 12,
      total: 66,
      noun: "studies",
      nounOne: "study",
      label: "Search studies",
      ...props,
    },
    slots,
  });
}

describe("SearchCard count line", () => {
  it("says how many of the total are shown, with the plural noun", () => {
    expect(mountCard().get("[role=status]").text()).toBe("Showing 12 of 66 studies");
  });

  it("still says it when nothing is filtered", () => {
    const line = mountCard({ shown: 66 }).get("[role=status]");
    expect(line.text()).toBe("Showing 66 of 66 studies");
  });

  it("uses the singular noun when the total is 1", () => {
    const line = mountCard({ shown: 1, total: 1 }).get("[role=status]");
    expect(line.text()).toBe("Showing 1 of 1 study");
  });

  it("uses the plural noun for none shown of many", () => {
    const line = mountCard({ shown: 0, total: 5 }).get("[role=status]");
    expect(line.text()).toBe("Showing 0 of 5 studies");
  });

  it("sits inside the card, above the search box", () => {
    const card = mountCard().get(".card");
    expect(card.element.firstElementChild?.getAttribute("role")).toBe("status");
    expect(card.find("input").exists()).toBe(true);
  });
});

describe("SearchCard search box", () => {
  it("is named by the label prop and has no visible label", () => {
    const wrapper = mountCard();
    expect(wrapper.find("label").exists()).toBe(false);
    expect(wrapper.get("input").attributes("aria-label")).toBe("Search studies");
  });

  it("says Search as its placeholder unless given another", () => {
    expect(mountCard().get("input").attributes("placeholder")).toBe("Search");
    expect(mountCard({ placeholder: "Find a lift" }).get("input").attributes("placeholder")).toBe("Find a lift");
  });

  it("edits the text through v-model", async () => {
    const wrapper = mountCard({ modelValue: "squat" });
    expect((wrapper.get("input").element as HTMLInputElement).value).toBe("squat");
    await wrapper.get("input").setValue("bench");
    expect(wrapper.emitted("update:modelValue")).toEqual([["bench"]]);
  });
});

describe("SearchCard clear button", () => {
  it("is not there while the box is empty", () => {
    expect(mountCard().find("button").exists()).toBe(false);
  });

  it("appears with text, named Clear search", () => {
    const button = mountCard({ modelValue: "squat" }).get("button");
    expect(button.attributes("aria-label")).toBe("Clear search");
    expect(button.attributes("type")).toBe("button");
  });

  it("empties the text and puts focus back in the input", async () => {
    const wrapper = mount(SearchCard, {
      props: { modelValue: "squat", shown: 1, total: 66, noun: "studies", nounOne: "study", label: "Search studies" },
      attachTo: document.body,
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[""]]);
    expect(document.activeElement).toBe(wrapper.get("input").element);
    wrapper.unmount();
  });
});

describe("SearchCard slot", () => {
  it("draws what the page puts under the box inside the card", () => {
    const wrapper = mountCard({}, { default: '<button type="button">Clear Filters</button>' });
    expect(wrapper.get(".card button").text()).toBe("Clear Filters");
  });

  it("draws nothing extra when empty", () => {
    expect(mountCard().findAll(".card > *")).toHaveLength(2);
  });
});
