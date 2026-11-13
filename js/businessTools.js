/**
 * The one list of the business's tools, and what each product's Tools menu shows, so the site's menu and the app's can never
 * differ. Plain JavaScript with no Vue or Nuxt imports. SiteHeader draws the menu from here; a project passes only which product
 * it is, and cannot add to the list or change its order.
 *
 * A tool lives in one product: the app hosts the weight log, the plate counter and the two timers; the Protein & Fiber
 * calculator is a standalone tool of the site. In a product's own menu a tool it hosts is a link inside the project (drawn with
 * its router link), and the other product's tools are external links to the address where they live, opened in the same tab.
 */

/** @typedef {"site" | "app"} Product The business's two products: the website and the Lifting App. */

/**
 * @typedef {object} BusinessTool
 * @property {string} name What the menu calls the tool.
 * @property {Product} product The product that hosts the tool.
 * @property {string} path Where the tool is inside its product, as that product's router writes it ("/weight-log").
 */

/**
 * @typedef {{ kind: "link"; name: string; to: string; startsGroup?: boolean }} ToolPageEntry A tool the product hosts: a row that
 * leads to `to`, drawn with the project's router link.
 */

/**
 * @typedef {{ kind: "external"; name: string; href: string; startsGroup?: boolean }} ToolExternalEntry A tool of the other
 * product: a plain link to its full address `href`, in the same tab.
 */

/**
 * @typedef {ToolPageEntry | ToolExternalEntry} ToolMenuEntry One row of a Tools menu, in the shape SiteHeader's drop-downs take.
 * A row with `startsGroup` is the first of a group: the menu draws a divider above it.
 */

export const SITE_ADDRESS = "https://theliftingschool.com";
export const APP_ADDRESS = "https://app.theliftingschool.com";

/**
 * The tools in menu order. The app's tools come first and the standalone ones after, so the two groups stay apart in the menu
 * (the app incorporates its tools; the site's stands alone).
 * @type {readonly BusinessTool[]}
 */
export const BUSINESS_TOOLS = [
  { name: "Weight Log", product: "app", path: "/weight-log" },
  { name: "Plate Counter", product: "app", path: "/weight-plate-counter" },
  { name: "Stopwatch", product: "app", path: "/stopwatch" },
  { name: "Intervals", product: "app", path: "/interval" },
  { name: "Protein & Fiber", product: "site", path: "/protein-fiber" },
];

/**
 * The address of a page of a product, for a link from the other product. The app's screens are hash routes ("/#/weight-log"),
 * the site's pages are ordinary paths.
 * @param {Product} product The product the page is in.
 * @param {string} path The page's path inside its product ("/weight-log").
 * @returns {string} The full address, such as "https://app.theliftingschool.com/#/weight-log".
 */
export function addressOfPage(product, path) {
  if (product === "app") return `${APP_ADDRESS}/#${path}`;
  return `${SITE_ADDRESS}${path}`;
}

/**
 * The address of a product's home, where the header's switch leads.
 * @param {Product} product The product to lead to.
 * @returns {string} "https://theliftingschool.com/" or "https://app.theliftingschool.com/".
 */
export function homeAddressOf(product) {
  return product === "app" ? `${APP_ADDRESS}/` : `${SITE_ADDRESS}/`;
}

/**
 * One tool as a row of a product's Tools menu: a router link when the product hosts it, an external link otherwise.
 * @param {BusinessTool} tool The tool to draw.
 * @param {Product} product The product drawing the menu.
 * @returns {ToolMenuEntry} The row, without a group mark.
 */
function entryForTool(tool, product) {
  if (tool.product === product) return { kind: "link", name: tool.name, to: tool.path };
  return { kind: "external", name: tool.name, href: addressOfPage(tool.product, tool.path) };
}

/**
 * Whether a tool begins a new group: it is hosted by a different product than the tool before it (the standalone tools
 * follow the app's).
 * @param {number} index The tool's place in BUSINESS_TOOLS.
 * @returns {boolean} False for the first tool, which has nothing above it to be divided from.
 */
function beginsNewGroup(index) {
  const previousTool = BUSINESS_TOOLS[index - 1];
  const tool = BUSINESS_TOOLS[index];
  return previousTool !== undefined && tool !== undefined && previousTool.product !== tool.product;
}

/**
 * The rows of the Tools menu as one product shows it: always the same tools in the same order, a router link for a tool the
 * product hosts and an external link for the other's. The first row of the standalone tools starts a group (the menu draws a
 * divider there).
 * @param {Product} product The product drawing the menu.
 * @returns {ToolMenuEntry[]} One row per tool, in BUSINESS_TOOLS order.
 */
export function toolMenuEntries(product) {
  return BUSINESS_TOOLS.map((tool, index) => {
    const entry = entryForTool(tool, product);
    return beginsNewGroup(index) ? { ...entry, startsGroup: true } : entry;
  });
}
