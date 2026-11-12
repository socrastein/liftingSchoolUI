// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import LoadingScreen from "../../components/LoadingScreen.vue";
import { loadingScreenPlugin, startupLoadingScreenTag } from "../../js/loadingScreenPlugin.js";
import { STARTUP_LOADING_SCREEN_ID } from "../../js/loadingScreen.js";

/**
 * The startup loading screen a Vite app's page shows before its scripts arrive is written by the plugin as plain HTML, so it
 * must stay the same as the LoadingScreen component's markup, which the shared styles are written for.
 */

/** Builds the plugin's element as the browser would from the page. */
function startupScreenElement(): HTMLElement {
  const tag = startupLoadingScreenTag();
  const element = document.createElement(tag.tag);
  for (const [name, value] of Object.entries(tag.attrs)) element.setAttribute(name, value);
  element.innerHTML = tag.children;
  return element;
}

/** The element without what is allowed to differ: the id that lets the app find it, and where the logo comes from. */
function withoutIdAndLogoSource(element: Element): Element {
  const copy = element.cloneNode(true) as Element;
  copy.removeAttribute("id");
  copy.querySelector("img")?.removeAttribute("src");
  return copy;
}

describe("loadingScreenPlugin", () => {
  it("adds the startup screen first in the page's body", () => {
    const plugin = loadingScreenPlugin();

    expect(plugin.transformIndexHtml()).toEqual([startupLoadingScreenTag()]);
    expect(startupLoadingScreenTag().injectTo).toBe("body-prepend");
  });

  it("gives the screen the id the app takes it away by", () => {
    expect(startupScreenElement().id).toBe(STARTUP_LOADING_SCREEN_ID);
  });

  it("builds the logo into the page, so it draws without another download", () => {
    const logoSource = startupScreenElement().querySelector("img")?.getAttribute("src");

    expect(logoSource).toMatch(/^data:image\/svg\+xml,/);
  });

  it("writes the same markup as the LoadingScreen component", () => {
    // The real transition, not test-utils' stand-in, which would add an element of its own
    const component = mount(LoadingScreen, { props: { isLoading: true }, global: { stubs: { transition: false } } });

    const startupScreen = withoutIdAndLogoSource(startupScreenElement());
    const componentScreen = withoutIdAndLogoSource(component.element);

    expect(startupScreen.outerHTML).toBe(componentScreen.outerHTML);
  });
});
