import { describe, expect, it } from "vitest";
import { APP_ADDRESS, BUSINESS_TOOLS, SITE_ADDRESS, addressOfPage, homeAddressOf, toolMenuEntries } from "../js/businessTools.js";

describe("BUSINESS_TOOLS", () => {
  it("lists the app's four tools, then the site's Protein & Fiber, in that order", () => {
    expect(BUSINESS_TOOLS.map((tool) => [tool.name, tool.product, tool.path])).toEqual([
      ["Weight Log", "app", "/weight-log"],
      ["Plate Counter", "app", "/weight-plate-counter"],
      ["Stopwatch", "app", "/stopwatch"],
      ["Intervals", "app", "/interval"],
      ["Protein & Fiber", "site", "/protein-fiber"],
    ]);
  });
});

describe("addressOfPage and homeAddressOf", () => {
  it("writes an app page as a hash route and a site page as an ordinary path", () => {
    expect(addressOfPage("app", "/weight-log")).toBe("https://app.theliftingschool.com/#/weight-log");
    expect(addressOfPage("site", "/protein-fiber")).toBe("https://theliftingschool.com/protein-fiber");
  });

  it("leads each product's home to its own address with a closing slash", () => {
    expect(homeAddressOf("site")).toBe(`${SITE_ADDRESS}/`);
    expect(homeAddressOf("app")).toBe(`${APP_ADDRESS}/`);
  });
});

describe("toolMenuEntries", () => {
  it("gives the same tools in the same order to both products", () => {
    /** @param {"app" | "site"} product */
    const namesOf = (product) => toolMenuEntries(product).map((entry) => entry.name);
    expect(namesOf("app")).toEqual(namesOf("site"));
  });

  it("makes a router link of each tool the product hosts and an external link of the rest", () => {
    const appKinds = toolMenuEntries("app").map((entry) => entry.kind);
    const siteKinds = toolMenuEntries("site").map((entry) => entry.kind);
    expect(appKinds).toEqual(["link", "link", "link", "link", "external"]);
    expect(siteKinds).toEqual(["external", "external", "external", "external", "link"]);
  });

  it("gives a router link its path and an external link its full address", () => {
    expect(toolMenuEntries("app")[0]).toEqual({ kind: "link", name: "Weight Log", to: "/weight-log" });
    expect(toolMenuEntries("site")[0]).toEqual({
      kind: "external",
      name: "Weight Log",
      href: "https://app.theliftingschool.com/#/weight-log",
    });
  });

  it("starts a new group at Protein & Fiber, the first tool of a different product, and nowhere else", () => {
    for (const product of /** @type {const} */ (["app", "site"])) {
      const startsOfGroups = toolMenuEntries(product)
        .filter((entry) => entry.startsGroup)
        .map((entry) => entry.name);
      expect(startsOfGroups).toEqual(["Protein & Fiber"]);
    }
  });
});
