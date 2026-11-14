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

describe("addresses given for the products (development)", () => {
  const LOCAL = { site: "http://localhost:4000", app: "http://localhost:5173" };

  it("writes pages and homes at the given addresses", () => {
    expect(addressOfPage("app", "/weight-log", LOCAL)).toBe("http://localhost:5173/#/weight-log");
    expect(addressOfPage("site", "/protein-fiber", LOCAL)).toBe("http://localhost:4000/protein-fiber");
    expect(homeAddressOf("site", LOCAL)).toBe("http://localhost:4000/");
    expect(homeAddressOf("app", LOCAL)).toBe("http://localhost:5173/");
  });

  it("drops a closing slash on a given address, so a path never doubles it", () => {
    expect(homeAddressOf("app", { app: "http://localhost:5173/" })).toBe("http://localhost:5173/");
    expect(addressOfPage("site", "/protein-fiber", { site: "http://localhost:4000//" })).toBe(
      "http://localhost:4000/protein-fiber",
    );
  });

  it("keeps the live address of a product that is not given, and when none are given", () => {
    expect(homeAddressOf("site", { app: "http://localhost:5173" })).toBe(`${SITE_ADDRESS}/`);
    expect(homeAddressOf("app", {})).toBe(`${APP_ADDRESS}/`);
    expect(homeAddressOf("app", undefined)).toBe(`${APP_ADDRESS}/`);
  });

  it("points a Tools menu's external rows at the given address, and leaves its router links alone", () => {
    expect(toolMenuEntries("site", LOCAL)).toEqual([
      { kind: "external", name: "Weight Log", href: "http://localhost:5173/#/weight-log" },
      { kind: "external", name: "Plate Counter", href: "http://localhost:5173/#/weight-plate-counter" },
      { kind: "external", name: "Stopwatch", href: "http://localhost:5173/#/stopwatch" },
      { kind: "external", name: "Intervals", href: "http://localhost:5173/#/interval" },
      { kind: "link", name: "Protein & Fiber", to: "/protein-fiber" },
    ]);
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
});
