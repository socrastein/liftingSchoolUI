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
 * @typedef {{ kind: "link"; name: string; to: string }} ToolPageEntry A tool the product hosts: a row that
 * leads to `to`, drawn with the project's router link.
 */

/**
 * @typedef {{ kind: "external"; name: string; href: string }} ToolExternalEntry A tool of the other
 * product: a plain link to its full address `href`, in the same tab.
 */

/**
 * @typedef {object} ProductAddresses Where the two products are, when not at their live addresses: a project in development
 * passes its local dev servers so the header's links lead there. Each is optional, and one left out is the live address.
 * @property {string} [site] The website's address, such as "http://localhost:4000".
 * @property {string} [app] The app's address, such as "http://localhost:5173".
 */

/**
 * @typedef {ToolPageEntry | ToolExternalEntry} ToolMenuEntry One row of a Tools menu, in the shape SiteHeader's drop-downs take.
 */

export const SITE_ADDRESS = "https://theliftingschool.com";
export const APP_ADDRESS = "https://app.theliftingschool.com";

/**
 * The tools in menu order: the app's tools first, then the site's.
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
 * Where a product is: the address given for it, else its live address. A closing slash on a given address is dropped, so the
 * paths added to it never double it.
 * @param {Product} product The product.
 * @param {ProductAddresses} [addresses] Where the products are, when not live.
 * @returns {string} The address without a closing slash, such as "https://theliftingschool.com".
 */
function baseAddressOf(product, addresses) {
  const live = product === "app" ? APP_ADDRESS : SITE_ADDRESS;
  const given = addresses?.[product];
  return (given ?? live).replace(/\/+$/, "");
}

/**
 * The address of a page of a product, for a link from the other product. The app's screens are hash routes ("/#/weight-log"),
 * the site's pages are ordinary paths.
 * @param {Product} product The product the page is in.
 * @param {string} path The page's path inside its product ("/weight-log").
 * @param {ProductAddresses} [addresses] Where the products are, when not live (default: the live addresses).
 * @returns {string} The full address, such as "https://app.theliftingschool.com/#/weight-log".
 */
export function addressOfPage(product, path, addresses) {
  const base = baseAddressOf(product, addresses);
  if (product === "app") return `${base}/#${path}`;
  return `${base}${path}`;
}

/**
 * The address of a product's home, where the header's switch leads.
 * @param {Product} product The product to lead to.
 * @param {ProductAddresses} [addresses] Where the products are, when not live (default: the live addresses).
 * @returns {string} "https://theliftingschool.com/" or "https://app.theliftingschool.com/" by default.
 */
export function homeAddressOf(product, addresses) {
  return `${baseAddressOf(product, addresses)}/`;
}

/**
 * One tool as a row of a product's Tools menu: a router link when the product hosts it, an external link otherwise.
 * @param {BusinessTool} tool The tool to draw.
 * @param {Product} product The product drawing the menu.
 * @param {ProductAddresses} [addresses] Where the products are, when not live.
 * @returns {ToolMenuEntry} The row, without a group mark.
 */
function entryForTool(tool, product, addresses) {
  if (tool.product === product) return { kind: "link", name: tool.name, to: tool.path };
  return { kind: "external", name: tool.name, href: addressOfPage(tool.product, tool.path, addresses) };
}

/**
 * The rows of the Tools menu as one product shows it: always the same tools in the same order, a router link for a tool the
 * product hosts and an external link for the other's.
 * @param {Product} product The product drawing the menu.
 * @param {ProductAddresses} [addresses] Where the products are, when not live (default: the live addresses).
 * @returns {ToolMenuEntry[]} One row per tool, in BUSINESS_TOOLS order.
 */
export function toolMenuEntries(product, addresses) {
  return BUSINESS_TOOLS.map((tool) => entryForTool(tool, product, addresses));
}
