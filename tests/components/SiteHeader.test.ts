// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import SiteHeader, { type HeaderItem } from "../../components/SiteHeader.vue";
import type { Product } from "../../js/businessTools.js";

/**
 * The shared header: the same pages, Tools menu and switch in the wide row and in the phone menu, in the same places in every
 * product. Which of the two layouts shows is CSS (a media query), so both are in the page here and each is checked in its
 * own container: `.siteHeaderLinks` (wide) and `#phoneMenuPanel` (phone).
 */

/** A stand-in for a project's router link: an anchor whose href is its `to`. */
const FakeRouterLink = defineComponent({
  props: { to: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h("a", { href: props.to }, slots.default?.());
  },
});

const PAGES: HeaderItem[] = [
  { kind: "link", name: "Home", to: "/" },
  { kind: "link", name: "Exercises", to: "/exercises" },
  {
    kind: "menu",
    id: "clients",
    label: "Clients",
    isCurrent: false,
    entries: [
      { kind: "link", name: "Sam Sample", to: "/clients/1", key: "client-1" },
      { kind: "link", name: "Sam Sample", to: "/clients/2", key: "client-2" },
      { kind: "link", name: "Add Client", to: "/clients", isAction: true },
    ],
  },
];

/** The Tools menu's rows, in the one order both products show them. */
const TOOL_NAMES = ["Weight Log", "Plate Counter", "Stopwatch", "Intervals", "Protein & Fiber"];

/** Mounts the header in the page (focus and outside clicks need a real document), with a "Saved" status in its slot. */
function mountHeader(product: Product = "app"): VueWrapper {
  return mount(SiteHeader, {
    props: {
      name: "The Sample App",
      homeTo: "/",
      product,
      pages: PAGES,
      isOnToolPage: true,
      linkComponent: FakeRouterLink,
      themeStorageKey: "testProject.colorScheme",
    },
    slots: { status: '<span class="sampleStatus">Saved</span>' },
    attachTo: document.body,
  });
}

/** The texts of the elements the selector finds, trimmed, in page order. */
function textsOf(wrapper: VueWrapper, selector: string): string[] {
  return wrapper.findAll(selector).map((element) => element.text());
}

let header: VueWrapper;

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
  });
  header = mountHeader();
});

afterEach(() => {
  header.unmount();
  vi.unstubAllGlobals();
});

describe("SiteHeader: the bar", () => {
  it("is the page's fixed header and its main navigation", () => {
    expect(header.get("header").attributes("data-fixed-header")).toBeDefined();
    expect(header.get("nav").attributes("aria-label")).toBe("Main");
  });

  it("names the product beside the logo, as a link to its first page", () => {
    const name = header.get(".siteHeaderName");
    expect(name.text()).toBe("The Sample App");
    expect(name.attributes("href")).toBe("/");
    expect(header.get(".siteHeaderLogo").attributes("alt")).toBe("");
  });

  it("puts the project's status before the Menu button and before the links", () => {
    const end = header.get(".siteHeaderEnd").element;
    const classesInOrder = [...end.children].map((child) => child.className);
    expect(classesInOrder).toEqual(["sampleStatus", "siteHeaderPhone", "siteHeaderLinks"]);
  });
});

describe("SiteHeader: the wide row", () => {
  it("shows the pages in the order given, then Tools, then the switch, then the theme button", () => {
    const row = header.get(".siteHeaderLinks");
    const labels = row
      .findAll(":scope > a, :scope > .siteHeaderDropdown > button, :scope > .siteHeaderSwitch")
      .map((element) => (element.classes("siteHeaderSwitch") ? "switch" : element.text()));
    expect(labels).toEqual(["Home", "Exercises", "Clients", "Tools", "switch"]);

    const lastChild = row.element.lastElementChild;
    expect(lastChild?.className).toContain("themeButton");
  });

  it("marks the drop-down the person is inside like the current page's link", () => {
    expect(header.get('.siteHeaderLinks [data-menu="tools"] button').attributes("aria-current")).toBe("true");
    expect(header.get('.siteHeaderLinks [data-menu="clients"] button').attributes("aria-current")).toBeUndefined();
  });

  it("opens a drop-down from its button and closes it when a row is chosen", async () => {
    const tools = header.get('.siteHeaderLinks [data-menu="tools"]');
    const button = tools.get("button");
    expect(button.attributes("aria-expanded")).toBe("false");

    await button.trigger("click");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(button.attributes("aria-controls")).toBe("toolsList");
    expect(textsOf(header, "#toolsList .menuItem")).toEqual(TOOL_NAMES);

    await header.get("#toolsList a").trigger("click");
    expect(button.attributes("aria-expanded")).toBe("false");
  });

  it("closes a drop-down on Escape and hands focus back to its button", async () => {
    const tools = header.get('.siteHeaderLinks [data-menu="tools"]');
    await tools.get("button").trigger("click");

    await tools.trigger("keydown", { key: "Escape" });
    expect(tools.get("button").attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(tools.get("button").element);
  });

  it("keeps two rows with the same name apart by their keys, each leading to its own page", async () => {
    await header.get('.siteHeaderLinks [data-menu="clients"] button').trigger("click");

    const sams = header.findAll("#clientsList a").filter((row) => row.text() === "Sam Sample");
    expect(sams.map((row) => row.attributes("href"))).toEqual(["/clients/1", "/clients/2"]);
  });

  it("sets a row that starts something apart, with a plus sign a screen reader skips", async () => {
    await header.get('.siteHeaderLinks [data-menu="clients"] button').trigger("click");

    const action = header.get("#clientsList .siteHeaderAction");
    expect(action.text()).toBe("+Add Client");
    expect(action.get(".siteHeaderPlus").attributes("aria-hidden")).toBe("true");
  });
});

describe("SiteHeader: the phone menu", () => {
  /** Opens the phone menu and returns its button. */
  async function openPhoneMenu() {
    const button = header.get("#phoneMenuButton");
    await button.trigger("click");
    return button;
  }

  it("shows the word Menu beside the icon, under a name that holds the word and says what pressing does", () => {
    const button = header.get("#phoneMenuButton");
    expect(button.text()).toBe("Menu");
    expect(button.attributes("aria-label")).toBe("Open menu");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(header.find("#phoneMenuPanel").exists()).toBe(false);
  });

  it("opens the panel, and then says Close", async () => {
    const button = await openPhoneMenu();
    expect(button.text()).toBe("Close");
    expect(button.attributes("aria-label")).toBe("Close menu");
    expect(button.attributes("aria-expanded")).toBe("true");
    expect(button.attributes("aria-controls")).toBe("phoneMenuPanel");
  });

  it("is the switch, the pages, Tools and the theme switch, in that order", async () => {
    await openPhoneMenu();
    const rows = textsOf(header, "#phoneMenuPanel > .menuItem");
    expect(rows).toEqual(["Home", "Exercises", "Clients", "Tools"]);
    const panelParts = [...header.get("#phoneMenuPanel").element.children].map((part) =>
      part.classList.contains("siteHeaderSwitch") ? "switch" : part.classList.contains("siteHeaderTheme") ? "theme" : "row",
    );
    expect(panelParts).toEqual(["switch", "row", "row", "row", "row", "theme"]);
  });

  it("folds one section open at a time, with the drop-down's own rows", async () => {
    await openPhoneMenu();
    const toolsButton = header.get('#phoneMenuPanel [data-menu="tools"]');
    const clientsButton = header.get('#phoneMenuPanel [data-menu="clients"]');

    await toolsButton.trigger("click");
    expect(toolsButton.attributes("aria-expanded")).toBe("true");
    expect(textsOf(header, "#toolsSection .menuItem")).toEqual(TOOL_NAMES);

    await clientsButton.trigger("click");
    expect(toolsButton.attributes("aria-expanded")).toBe("false");
    expect(header.find("#toolsSection").exists()).toBe(false);
    expect(textsOf(header, "#clientsSection .menuItem")).toEqual(["Sam Sample", "Sam Sample", "+Add Client"]);
  });

  it("closes when a row is chosen, and has every section folded when it opens again", async () => {
    await openPhoneMenu();
    await header.get('#phoneMenuPanel [data-menu="tools"]').trigger("click");
    await header.get("#toolsSection a").trigger("click");
    await nextTick();
    expect(header.get("#phoneMenuButton").attributes("aria-expanded")).toBe("false");

    await openPhoneMenu();
    expect(header.get('#phoneMenuPanel [data-menu="tools"]').attributes("aria-expanded")).toBe("false");
  });

  it("closes on Escape and hands focus back to the Menu button", async () => {
    const button = await openPhoneMenu();
    await header.get(".siteHeaderPhoneMenu").trigger("keydown", { key: "Escape" });

    expect(button.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button.element);
  });

  it("holds the light and dark switch", async () => {
    await openPhoneMenu();
    expect(header.find("#phoneMenuPanel .siteHeaderTheme button, #phoneMenuPanel .siteHeaderTheme input").exists()).toBe(true);
  });
});

describe("SiteHeader: the Tools menu", () => {
  /** The rows of a header's Tools list as [name, link kind, address], opening the list first. */
  async function toolRows(product: Product): Promise<[string, "router" | "external", string][]> {
    const productHeader = mountHeader(product);
    await productHeader.get('.siteHeaderLinks [data-menu="tools"] button').trigger("click");
    const rows = productHeader.findAll("#toolsList a").map((row): [string, "router" | "external", string] => {
      const address = row.attributes("href") ?? "";
      return [row.text(), address.startsWith("https://") ? "external" : "router", address];
    });
    productHeader.unmount();
    return rows;
  }

  it("holds the same five tools in the same order in both products", async () => {
    const appNames = (await toolRows("app")).map(([name]) => name);
    const siteNames = (await toolRows("site")).map(([name]) => name);
    expect(appNames).toEqual(TOOL_NAMES);
    expect(siteNames).toEqual(TOOL_NAMES);
  });

  it("links to the app's tools inside the app, and out to the site's Protein & Fiber", async () => {
    expect(await toolRows("app")).toEqual([
      ["Weight Log", "router", "/weight-log"],
      ["Plate Counter", "router", "/weight-plate-counter"],
      ["Stopwatch", "router", "/stopwatch"],
      ["Intervals", "router", "/interval"],
      ["Protein & Fiber", "external", "https://theliftingschool.com/protein-fiber"],
    ]);
  });

  it("links to Protein & Fiber inside the site, and out to the app's tools (hash routes)", async () => {
    expect(await toolRows("site")).toEqual([
      ["Weight Log", "external", "https://app.theliftingschool.com/#/weight-log"],
      ["Plate Counter", "external", "https://app.theliftingschool.com/#/weight-plate-counter"],
      ["Stopwatch", "external", "https://app.theliftingschool.com/#/stopwatch"],
      ["Intervals", "external", "https://app.theliftingschool.com/#/interval"],
      ["Protein & Fiber", "router", "/protein-fiber"],
    ]);
  });

  it("is marked as the current menu only when the person is on a tool's page", () => {
    expect(header.get('.siteHeaderLinks [data-menu="tools"] button').attributes("aria-current")).toBe("true");

    const elsewhere = mount(SiteHeader, {
      props: {
        name: "The Sample App",
        homeTo: "/",
        product: "app",
        pages: PAGES,
        isOnToolPage: false,
        linkComponent: FakeRouterLink,
        themeStorageKey: "testProject.colorScheme",
      },
    });
    expect(elsewhere.get('.siteHeaderLinks [data-menu="tools"] button').attributes("aria-current")).toBeUndefined();
    elsewhere.unmount();
  });
});

describe("SiteHeader: the switch between the products", () => {
  /** What the wide row's switch shows: each side's word, whether it is the current one, and where it leads. */
  function switchSides(productHeader: VueWrapper): { word: string; isCurrent: boolean; href: string | undefined }[] {
    return productHeader.findAll(".siteHeaderLinks .siteHeaderSwitch .segmentedItem").map((side) => ({
      word: side.text(),
      isCurrent: side.attributes("aria-current") === "true",
      href: side.attributes("href"),
    }));
  }

  it("is a group named Product, reading Website then App in both products", () => {
    const group = header.get(".siteHeaderLinks .siteHeaderSwitch");
    expect(group.attributes("role")).toBe("group");
    expect(group.attributes("aria-label")).toBe("Product");
    expect(switchSides(header).map((side) => side.word)).toEqual(["Website", "App"]);
  });

  it("marks the App side as current in the app, and leads the Website side to the site's home", () => {
    expect(switchSides(header)).toEqual([
      { word: "Website", isCurrent: false, href: "https://theliftingschool.com/" },
      { word: "App", isCurrent: true, href: undefined },
    ]);
  });

  it("marks the Website side as current in the site, and leads the App side to the app's home", () => {
    const siteHeader = mountHeader("site");
    expect(switchSides(siteHeader)).toEqual([
      { word: "Website", isCurrent: true, href: undefined },
      { word: "App", isCurrent: false, href: "https://app.theliftingschool.com/" },
    ]);
    siteHeader.unmount();
  });

  it("is also the first row of the phone menu, the same control", async () => {
    await header.get("#phoneMenuButton").trigger("click");
    expect(header.get("#phoneMenuPanel").element.firstElementChild?.className).toContain("siteHeaderSwitch");
    expect(header.findAll("#phoneMenuPanel .siteHeaderSwitch .segmentedItem")).toHaveLength(2);
  });
});
