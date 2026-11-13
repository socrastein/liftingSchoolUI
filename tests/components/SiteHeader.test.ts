// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import SiteHeader, { type HeaderItem } from "../../components/SiteHeader.vue";

/**
 * The shared header: the same pages, drop-downs and switch in the wide row and in the phone menu, in the same places in every
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

const ITEMS: HeaderItem[] = [
  { kind: "link", name: "Home", to: "/" },
  { kind: "link", name: "Exercises", to: "/exercises" },
  {
    kind: "menu",
    id: "clients",
    label: "Clients",
    isCurrent: false,
    entries: [
      { kind: "link", name: "Sam Sample", to: "/clients/1" },
      { kind: "link", name: "Add Client", to: "/clients", isAction: true },
    ],
  },
  {
    kind: "menu",
    id: "tools",
    label: "Tools",
    isCurrent: true,
    entries: [
      { kind: "link", name: "Weight Log", to: "/weight-log" },
      { kind: "external", name: "Protein & Fiber", href: "https://example.test/protein-fiber" },
    ],
  },
];

const SWITCH_LINK = { name: "School Website", href: "https://example.test/" };

/** Mounts the header in the page (focus and outside clicks need a real document), with a "Saved" status in its slot. */
function mountHeader(): VueWrapper {
  return mount(SiteHeader, {
    props: {
      name: "The Sample App",
      homeTo: "/",
      items: ITEMS,
      switchLink: SWITCH_LINK,
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
  it("shows the pages and drop-downs in the order given, then the switch as the one outlined button", () => {
    const row = header.get(".siteHeaderLinks");
    const labels = row.findAll(":scope > a, :scope > .siteHeaderDropdown > button").map((element) => element.text());
    expect(labels).toEqual(["Home", "Exercises", "Clients", "Tools", "School Website"]);

    const switchLink = row.get(".siteHeaderSwitch");
    expect(switchLink.attributes("href")).toBe("https://example.test/");
    expect(switchLink.classes()).toEqual(expect.arrayContaining(["btn", "btnSecondary", "btnSm"]));
    expect(row.findAll(".btn")).toHaveLength(1);
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
    expect(textsOf(header, "#toolsList .menuItem")).toEqual(["Weight Log", "Protein & Fiber"]);
    expect(header.get("#toolsList a:last-child").attributes("href")).toBe("https://example.test/protein-fiber");

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

  it("starts with the switch, then the same pages and drop-downs as the wide row, in the same order", async () => {
    await openPhoneMenu();
    const rows = textsOf(header, "#phoneMenuPanel > .menuItem");
    expect(rows).toEqual(["School Website", "Home", "Exercises", "Clients", "Tools"]);
    expect(header.get("#phoneMenuPanel > .menuItem").attributes("href")).toBe("https://example.test/");
  });

  it("folds one section open at a time, with the drop-down's own rows", async () => {
    await openPhoneMenu();
    const toolsButton = header.get('#phoneMenuPanel [data-menu="tools"]');
    const clientsButton = header.get('#phoneMenuPanel [data-menu="clients"]');

    await toolsButton.trigger("click");
    expect(toolsButton.attributes("aria-expanded")).toBe("true");
    expect(textsOf(header, "#toolsSection .menuItem")).toEqual(["Weight Log", "Protein & Fiber"]);

    await clientsButton.trigger("click");
    expect(toolsButton.attributes("aria-expanded")).toBe("false");
    expect(header.find("#toolsSection").exists()).toBe(false);
    expect(textsOf(header, "#clientsSection .menuItem")).toEqual(["Sam Sample", "+Add Client"]);
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
