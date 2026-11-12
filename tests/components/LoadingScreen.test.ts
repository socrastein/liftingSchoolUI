// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingScreen from "../../components/LoadingScreen.vue";

/**
 * A screen over the whole window while something loads, inside a status region that is always on the page (so a screen reader
 * hears it appear), saying its label with three dots that only the eye gets. The fade out is CSS (checked by eye).
 */

describe("LoadingScreen", () => {
  it("covers the window while loading", () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: true } });

    expect(wrapper.find(".loadingScreen").exists()).toBe(true);
  });

  it("goes away once loading is done", async () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: true } });

    await wrapper.setProps({ isLoading: false });

    expect(wrapper.find(".loadingScreen").exists()).toBe(false);
  });

  it("keeps an empty status region on the page while nothing loads", () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: false } });

    expect(wrapper.get('[role="status"]').text()).toBe("");
  });

  it('says "Loading" to a screen reader, without the dots', () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: true } });

    const dots = wrapper.get(".loadingDots");
    expect(dots.attributes("aria-hidden")).toBe("true");
    expect(dots.text()).toBe("...");
    expect(wrapper.get(".loadingText").text()).toBe("Loading...");
  });

  it("says the label it is given", () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: true, label: "Saving" } });

    expect(wrapper.get(".loadingText").text()).toBe("Saving...");
  });

  it("leaves the logo out of what a screen reader reads, since the label already says what is happening", () => {
    const wrapper = mount(LoadingScreen, { props: { isLoading: true } });

    expect(wrapper.get(".loadingLogo").attributes("alt")).toBe("");
  });
});
