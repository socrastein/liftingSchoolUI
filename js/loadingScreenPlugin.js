/**
 * A Vite plugin that writes the loading screen into an app's page, so it shows from the first paint: before the scripts arrive,
 * while the app starts, until the app calls hideStartupLoadingScreen (loadingScreen.js). The markup is the LoadingScreen
 * component's (a test checks they match), and the look comes from the library's stylesheet, which a built app links in the
 * page's head. On the dev server the stylesheet arrives with the scripts, so there the screen is briefly unstyled.
 *
 *   // vite.config.ts
 *   import { loadingScreenPlugin } from "lifting-school-ui/loadingScreenPlugin";
 *   export default defineConfig({ plugins: [vue(), loadingScreenPlugin()] });
 *
 * Plain JavaScript for Node (it reads the logo file); only a Vite config imports it.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { STARTUP_LOADING_SCREEN_ID } from "./loadingScreen.js";

/**
 * An element Vite adds to the page. The plugin's own type is written out rather than imported from Vite, so the library needs
 * no Vite of its own; it matches Vite's HtmlTagDescriptor.
 * @typedef {object} HtmlTag
 * @property {string} tag The element's name.
 * @property {Record<string, string>} attrs Its attributes.
 * @property {string} children Its contents, as HTML.
 * @property {"body-prepend"} injectTo Where in the page it goes: first in the body, before the app's own element.
 */

/**
 * The part of a Vite plugin this one uses, matching Vite's Plugin type.
 * @typedef {object} LoadingScreenPlugin
 * @property {string} name The plugin's name, shown in Vite's errors.
 * @property {() => HtmlTag[]} transformIndexHtml Adds the screen to the page.
 */

/**
 * The plugin that writes the startup loading screen into the app's page.
 *
 * @returns {LoadingScreenPlugin} The plugin, for the `plugins` list of a Vite config.
 */
export function loadingScreenPlugin() {
  const startupScreen = startupLoadingScreenTag();
  return {
    name: "lifting-school-ui:loading-screen",
    transformIndexHtml: () => [startupScreen],
  };
}

/**
 * The startup screen as an element for Vite to add: the LoadingScreen component's markup, with the logo built into the page.
 *
 * @returns {HtmlTag} The screen's outer element, the status region the component also has.
 */
export function startupLoadingScreenTag() {
  const logo = `<img class="loadingLogo" src="${logoDataUrl()}" alt="">`;
  const dots = `<span class="loadingDots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>`;
  const label = `<p class="loadingText">Loading${dots}</p>`;
  return {
    tag: "div",
    attrs: { id: STARTUP_LOADING_SCREEN_ID, role: "status" },
    children: `<div class="loadingScreen">${logo}${label}</div>`,
    injectTo: "body-prepend",
  };
}

/**
 * The logo as a data: URL, so the page draws it without waiting for another download. encodeURIComponent escapes more than an
 * SVG data URL needs (only `#`, quotes, `<` and `%` must be), which costs a little size and nothing else.
 *
 * @returns {string} The URL, about 5 KB.
 */
function logoDataUrl() {
  const logoSvg = readFileSync(join(import.meta.dirname, "../icons/logo.svg"), "utf8");
  return `data:image/svg+xml,${encodeURIComponent(logoSvg)}`;
}
