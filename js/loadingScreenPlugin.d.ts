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
export function loadingScreenPlugin(): LoadingScreenPlugin;
/**
 * The startup screen as an element for Vite to add: the LoadingScreen component's markup, with the logo built into the page.
 *
 * @returns {HtmlTag} The screen's outer element, the status region the component also has.
 */
export function startupLoadingScreenTag(): HtmlTag;
/**
 * An element Vite adds to the page. The plugin's own type is written out rather than imported from Vite, so the library needs
 * no Vite of its own; it matches Vite's HtmlTagDescriptor.
 */
export type HtmlTag = {
    /**
     * The element's name.
     */
    tag: string;
    /**
     * Its attributes.
     */
    attrs: Record<string, string>;
    /**
     * Its contents, as HTML.
     */
    children: string;
    /**
     * Where in the page it goes: first in the body, before the app's own element.
     */
    injectTo: "body-prepend";
};
/**
 * The part of a Vite plugin this one uses, matching Vite's Plugin type.
 */
export type LoadingScreenPlugin = {
    /**
     * The plugin's name, shown in Vite's errors.
     */
    name: string;
    /**
     * Adds the screen to the page.
     */
    transformIndexHtml: () => HtmlTag[];
};
