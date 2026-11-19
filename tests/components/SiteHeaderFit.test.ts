// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import SiteHeader, { type HeaderItem } from "../../components/SiteHeader.vue";

/**
 * How the header decides between its wide row and its phone menu beyond the 900px rule in CSS: once mounted, it measures whether
 * the row fits in the room the bar has and asks for the phone menu (the class siteHeaderCompact) when it does not.
 *
 * jsdom draws nothing, so the page is faked: a ResizeObserver the test fires by hand, the widths of the bar's parts (a `layout`
 * object the test changes), and which of the two forms is drawn (the Menu button's block takes room below 900px, as the fake
 * `belowBreakpoint` says, or when the header has the class). The fake layout deliberately does not let the row's width or the
 * room depend on which form is drawn, as in the real CSS, which is what keeps the answer from flipping back and forth.
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
];

/** The padding and gaps of the real bar (components.css): 16px each side, 8px between neighbours. */
const BAR_PADDING = 16;
const GAP = 8;

/** What the fake page measures; each test sets what it needs. */
const layout = {
  /** The window is under 900px: CSS shows the phone menu whatever the row's width. */
  belowBreakpoint: false,
  barWidth: 1200,
  logoWidth: 32,
  /** The name's text, which is what the header measures, whether the name is drawn or clipped */
  nameWidth: 150,
  /** True when the name's box is clipped to 1px, as a hidden name is (its text still takes nameWidth) */
  nameClipped: false,
  statusWidth: 55,
  rowWidth: 600,
  /** The Menu button's block (the phone form's end), with no bell */
  menuWidth: 90,
};

/** The title with its name shown: the logo, the gap between it and the name, and the name. */
function titleWidthInLayout(): number {
  return layout.logoWidth + GAP + layout.nameWidth;
}

/** The room the row has in the default layout: the bar inside its padding, less the title, the status and the gaps after them. */
function roomInLayout(): number {
  return layout.barWidth - BAR_PADDING * 2 - titleWidthInLayout() - GAP - (layout.statusWidth + GAP);
}

/** The classes of the elements whose width was read, in order, so a test can see what the header looked at. */
let widthsRead: string[] = [];

/** The row's inline style each time its width was read, so a test can see how it was laid out for the reading. */
let rowStylesWhenRead: string[] = [];

/** A ResizeObserver the test fires by hand. */
class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed = new Set<Element>();
  disconnectCount = 0;
  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(element: Element): void {
    this.observed.add(element);
  }
  unobserve(element: Element): void {
    this.observed.delete(element);
  }
  disconnect(): void {
    this.disconnectCount += 1;
    this.observed.clear();
  }
  /** The browser telling the header something it watches changed size. */
  notify(): void {
    this.callback([], this as unknown as ResizeObserver);
  }
}

/** The one observer the header makes. */
function theObserver(): FakeResizeObserver {
  const observer = FakeResizeObserver.instances[0];
  if (observer === undefined) throw new Error("the header made no ResizeObserver");
  return observer;
}

/** Pretends the browser has measured: fires the observer and lets the header's tick and its follow-up work finish. */
async function measureNow(): Promise<void> {
  theObserver().notify();
  await flushPromises();
}

/** The width the fake page gives an element: the bar's parts have the widths in `layout`, anything else none. */
function fakeWidthOf(element: Element): number {
  if (element.classList.contains("siteHeaderName") && layout.nameClipped) return 1;
  const widths: [string, number][] = [
    ["siteHeaderNav", layout.barWidth],
    ["siteHeaderLogo", layout.logoWidth],
    ["siteHeaderName", layout.nameWidth],
    ["siteHeaderPhone", layout.menuWidth],
    ["siteHeaderLinks", layout.rowWidth],
    ["sampleStatus", layout.statusWidth],
  ];
  const known = widths.find(([className]) => element.classList.contains(className));
  return known?.[1] ?? 0;
}

/** Whether the fake page draws the element: the phone block in the phone form, the row in the wide form, everything else always. */
function isDrawnInFakePage(element: Element): boolean {
  const header = element.closest(".siteHeader");
  const isPhoneShown = layout.belowBreakpoint || header?.classList.contains("siteHeaderCompact") === true;
  if (element.classList.contains("siteHeaderPhone")) return isPhoneShown;
  if (!element.classList.contains("siteHeaderLinks")) return true;
  // A row given inline styles (the header's probe) is laid out for as long as they are on it
  const isProbed = element instanceof HTMLElement && element.style.display === "flex";
  return !isPhoneShown || isProbed;
}

/** Fakes the bar's padding and gaps (which jsdom has no stylesheet to give) and leaves every other computed style as it is. */
function installFakeBarStyle(): void {
  const realComputedStyle = window.getComputedStyle.bind(window);
  const fakes: Record<string, string> = {
    paddingLeft: `${BAR_PADDING}px`,
    paddingRight: `${BAR_PADDING}px`,
    columnGap: `${GAP}px`,
  };
  vi.spyOn(window, "getComputedStyle").mockImplementation((element: Element, pseudo?: string | null) => {
    return new Proxy(realComputedStyle(element, pseudo), {
      get(target, property) {
        if (typeof property === "string" && property in fakes) return fakes[property];
        const value = Reflect.get(target, property);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  });
}

/** The text width the fake page gives a range: the name's text is its full width even when its box is clipped. */
function fakeTextWidthOf(element: Element): number {
  return element.classList.contains("siteHeaderName") ? layout.nameWidth : fakeWidthOf(element);
}

/** The range's own getBoundingClientRect as it was before the fake page was installed, put back after each test. */
let realRangeRect: typeof Range.prototype.getBoundingClientRect | undefined;

/** Installs the fake page: element widths, which form is drawn, the bar's padding and gaps, and the observer. */
function installFakePage(): void {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  realRangeRect = Range.prototype.getBoundingClientRect;
  Range.prototype.getBoundingClientRect = function (this: Range): DOMRect {
    const width = fakeTextWidthOf(this.startContainer as Element);
    return { width, height: 20, top: 0, left: 0, right: width, bottom: 20, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (this: Element) {
    widthsRead.push(this.className);
    if (this.classList.contains("siteHeaderLinks") && this instanceof HTMLElement) rowStylesWhenRead.push(this.style.cssText);
    const width = fakeWidthOf(this);
    return { width, height: 56, top: 0, left: 0, right: width, bottom: 56, x: 0, y: 0, toJSON: () => ({}) };
  });
  vi.spyOn(Element.prototype, "getClientRects").mockImplementation(function (this: Element) {
    return (isDrawnInFakePage(this) ? [{}] : []) as unknown as DOMRectList;
  });
  installFakeBarStyle();
}

/** Mounts the header in the page (focus needs a real document), with a "Saved" status in its slot. */
function mountHeader(): VueWrapper {
  return mount(SiteHeader, {
    props: {
      name: "The Sample App",
      homeTo: "/",
      product: "app",
      pages: PAGES,
      isOnToolPage: false,
      linkComponent: FakeRouterLink,
      themeStorageKey: "testProject.colorScheme",
    },
    slots: { status: '<span class="sampleStatus">Saved</span>' },
    attachTo: document.body,
  });
}

let header: VueWrapper;

/** Replaces localStorage with an in-memory one, so the theme button has somewhere to save its choice. */
function stubLocalStorage(): void {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
  });
}

beforeEach(() => {
  stubLocalStorage();
  Object.assign(layout, {
    belowBreakpoint: false,
    barWidth: 1200,
    logoWidth: 32,
    nameWidth: 150,
    statusWidth: 55,
    rowWidth: 600,
    menuWidth: 90,
  });
  FakeResizeObserver.instances = [];
  widthsRead = [];
  rowStylesWhenRead = [];
  installFakePage();
  header = mountHeader();
});

afterEach(() => {
  header.unmount();
  if (realRangeRect !== undefined) Range.prototype.getBoundingClientRect = realRangeRect;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Whether the header is asking for the phone menu at a wide window. */
function isForcedCompact(): boolean {
  return header.get("header").classes("siteHeaderCompact");
}

describe("SiteHeader fit: the row against the room", () => {
  it("keeps the wide row when it fits", async () => {
    layout.rowWidth = roomInLayout() - 100;
    await measureNow();
    expect(isForcedCompact()).toBe(false);
  });

  it("asks for the phone menu when the row does not fit, at a window of 900px or more", async () => {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  });

  it("asks for the wide row again when room returns (a wider window)", async () => {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(isForcedCompact()).toBe(true);

    layout.barWidth += 150;
    await measureNow();
    expect(isForcedCompact()).toBe(false);
  });

  it("measures again when the row's own content changes, with the window the same", async () => {
    await measureNow();
    expect(isForcedCompact()).toBe(false);

    // A page added at sign-in, the bell's count, the fonts arriving: the row's width changes, which the observer reports
    layout.rowWidth = roomInLayout() + 1;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  });

  it("measures again when the status slot's width changes, since it takes room from the row", async () => {
    layout.rowWidth = roomInLayout();
    await measureNow();
    expect(isForcedCompact()).toBe(false);

    layout.statusWidth += 20;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  });

  it("fits a row exactly as wide as the room, and a half pixel over (rounding), but not one pixel over", async () => {
    layout.rowWidth = roomInLayout();
    await measureNow();
    expect(isForcedCompact()).toBe(false);

    layout.rowWidth = roomInLayout() + 0.5;
    await measureNow();
    expect(isForcedCompact()).toBe(false);

    layout.rowWidth = roomInLayout() + 1;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  });

  it("takes the name's text width, even when the name's box is clipped to 1px (hidden for screen readers only)", async () => {
    layout.nameClipped = true;
    layout.rowWidth = roomInLayout() + 1;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  });

  it("reads the Menu button's block for the name's room, and never the button itself", async () => {
    await measureNow();
    expect(widthsRead.some((name) => name.includes("siteHeaderPhone"))).toBe(true);
    expect(widthsRead.filter((name) => name.includes("siteHeaderMenuButton"))).toEqual([]);
  });
});

describe("SiteHeader fit: never forcing the wide form", () => {
  it("adds nothing when the window is under 900px and the row fits, leaving the phone menu to CSS", async () => {
    layout.belowBreakpoint = true;
    layout.barWidth = 600;
    layout.rowWidth = 100;
    await measureNow();
    expect(header.get("header").classes()).toEqual(["siteHeader"]);
  });

  it("changes the header by one class only, siteHeaderCompact, which CSS reads as 'not the wide form'", async () => {
    const before = header.get("header").classes();
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(
      header
        .get("header")
        .classes()
        .filter((name) => !before.includes(name)),
    ).toEqual(["siteHeaderCompact"]);
  });
});

describe("SiteHeader fit: no flip-flop", () => {
  /** How many times the header's class attribute changes while `work` runs. */
  async function classChangesDuring(work: () => Promise<void>): Promise<number> {
    let changes = 0;
    const watcher = new MutationObserver((records) => (changes += records.length));
    watcher.observe(header.get("header").element, { attributes: true, attributeFilter: ["class"] });
    await work();
    await Promise.resolve();
    watcher.disconnect();
    return changes;
  }

  it("settles on the phone menu at a row one pixel over, however often the observer fires", async () => {
    layout.rowWidth = roomInLayout() + 1;
    const changes = await classChangesDuring(async () => {
      for (let call = 0; call < 10; call += 1) await measureNow();
    });
    expect(isForcedCompact()).toBe(true);
    expect(changes).toBe(1);
  });

  it("settles on the wide row at a row exactly as wide as the room, however often the observer fires", async () => {
    layout.rowWidth = roomInLayout();
    const changes = await classChangesDuring(async () => {
      for (let call = 0; call < 10; call += 1) await measureNow();
    });
    expect(isForcedCompact()).toBe(false);
    expect(changes).toBe(0);
  });

  it("does not flip back after the phone menu is shown: showing it changes none of the widths measured", async () => {
    layout.rowWidth = roomInLayout() + 1;
    await measureNow();
    expect(isForcedCompact()).toBe(true);

    // The phone menu is now drawn (the fake page draws the Menu button's block): the same numbers must give the same answer
    for (let call = 0; call < 5; call += 1) await measureNow();
    expect(isForcedCompact()).toBe(true);
  });
});

describe("SiteHeader fit: measuring a row that is not drawn", () => {
  /** Makes the row too wide, so the header is in the phone form and the row is not drawn. */
  async function showPhoneMenu(): Promise<void> {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(isForcedCompact()).toBe(true);
  }

  it("lays the row out out of sight at its natural width for the reading, then puts its styles back", async () => {
    await showPhoneMenu();
    rowStylesWhenRead = [];
    await measureNow();

    const styleWhenRead = rowStylesWhenRead.at(-1) ?? "";
    for (const declaration of [
      "display: flex",
      "position: absolute",
      "visibility: hidden",
      "max-width: none",
      "width: max-content",
    ]) {
      expect(styleWhenRead).toContain(declaration);
    }
    expect(header.get(".siteHeaderLinks").attributes("style")).toBeUndefined();
  });

  it("restores an inline style the row already had", async () => {
    await showPhoneMenu();
    header.get(".siteHeaderLinks").element.setAttribute("style", "color: red;");
    await measureNow();
    expect(header.get(".siteHeaderLinks").attributes("style")).toBe("color: red;");
  });

  it("does not lay the row out again to read it when it is drawn", async () => {
    await measureNow();
    expect(rowStylesWhenRead.every((style) => style === "")).toBe(true);
  });

  it("does not touch the phone block or the Menu button", async () => {
    await showPhoneMenu();
    const menuButton = header.get<HTMLElement>(".siteHeaderMenuButton").element;
    menuButton.focus();
    await measureNow();
    expect(document.activeElement).toBe(menuButton);
    expect(header.get(".siteHeaderPhone").attributes("style")).toBeUndefined();
  });
});

describe("SiteHeader fit: the name", () => {
  /**
   * The bar width at which the name just fits beside the Menu button with no bell: the bar's inside width less the title with its
   * gap, and the status with its gap, must leave room for the Menu button's block (90px in the layout).
   */
  const NAME_FITS_AT_BAR_WIDTH = 383;

  /** Whether the name is drawn out of sight (the class `visuallyHidden`) right now. */
  function isNameHidden(): boolean {
    return header.get(".siteHeaderName").classes("visuallyHidden");
  }

  it("keeps the name when it fits beside the Menu button, at the bound itself", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH;
    await measureNow();
    expect(isNameHidden()).toBe(false);
  });

  it("hides the name one pixel under the bound, and the header then asks for the phone menu", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH - 1;
    await measureNow();
    expect(isNameHidden()).toBe(true);
    expect(isForcedCompact()).toBe(true);
  });

  it("keeps the home link's name for screen readers while the name is hidden", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH - 1;
    await measureNow();
    expect(isNameHidden()).toBe(true);
    expect(header.get(".siteHeaderHome").text()).toBe("The Sample App");
  });

  it("shows the name again when the window is wider", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH - 1;
    await measureNow();
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH + 50;
    await measureNow();
    expect(isNameHidden()).toBe(false);
  });

  it("is in the phone form whenever the name is hidden", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH - 1;
    layout.rowWidth = 100;
    await measureNow();
    expect(isNameHidden()).toBe(true);
    expect(isForcedCompact()).toBe(true);
  });

  it("does not hide the name for a row that is wide, when the name still fits beside the Menu button", async () => {
    layout.barWidth = NAME_FITS_AT_BAR_WIDTH + 200;
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(isNameHidden()).toBe(false);
    expect(isForcedCompact()).toBe(true);
  });
});

describe("SiteHeader fit: what is watched", () => {
  it("measures again when a page is added to the row, even while the row is not drawn", async () => {
    await measureNow();
    layout.rowWidth = roomInLayout() + 100;
    await header.setProps({ pages: [...PAGES, { kind: "link", name: "Blog", to: "/blog" }] });
    await flushPromises();
    expect(isForcedCompact()).toBe(true);

    layout.rowWidth = roomInLayout() - 100;
    await header.setProps({ pages: PAGES });
    await flushPromises();
    expect(isForcedCompact()).toBe(false);
  });

  it("measures again when the fonts finish loading, and stops listening when unmounted", async () => {
    header.unmount();
    const fonts = new EventTarget();
    Object.defineProperty(document, "fonts", { value: fonts, configurable: true });
    const removeListener = vi.spyOn(fonts, "removeEventListener");
    FakeResizeObserver.instances = [];
    header = mountHeader();
    await flushPromises();
    expect(isForcedCompact()).toBe(false);

    layout.rowWidth = roomInLayout() + 100;
    fonts.dispatchEvent(new Event("loadingdone"));
    await flushPromises();
    expect(isForcedCompact()).toBe(true);

    header.unmount();
    expect(removeListener).toHaveBeenCalledWith("loadingdone", expect.any(Function));
    Reflect.deleteProperty(document, "fonts");
    header = mountHeader();
  });

  it("watches the bar, the title, the row, the Menu button's block and the status", () => {
    const watched = [...theObserver().observed].map((element) => element.className);
    expect(watched).toEqual(
      expect.arrayContaining([
        "siteHeaderNav",
        "siteHeaderTitle",
        expect.stringContaining("siteHeaderLinks"),
        expect.stringContaining("siteHeaderPhone"),
        "sampleStatus",
      ]),
    );
  });

  it("watches a status element that replaces the old one", async () => {
    const end = header.get(".siteHeaderEnd").element;
    const replacement = document.createElement("span");
    replacement.className = "sampleStatus";
    end.querySelector(".sampleStatus")?.remove();
    end.prepend(replacement);
    await flushPromises();
    expect(theObserver().observed.has(replacement)).toBe(true);
  });
});

describe("SiteHeader fit: leaving the page", () => {
  it("stops every observer when unmounted", () => {
    const observer = theObserver();
    const disconnectsBefore = observer.disconnectCount;
    const mutationDisconnect = vi.spyOn(MutationObserver.prototype, "disconnect");
    header.unmount();
    expect(observer.disconnectCount).toBeGreaterThan(disconnectsBefore);
    expect(observer.observed.size).toBe(0);
    expect(mutationDisconnect).toHaveBeenCalled();
    // The afterEach unmounts again: mount a fresh one for it to unmount
    header = mountHeader();
  });

  it("does nothing when the observer fires after unmount", async () => {
    const observer = theObserver();
    header.unmount();
    layout.rowWidth = roomInLayout() + 100;
    observer.notify();
    await flushPromises();
    header = mountHeader();
    expect(isForcedCompact()).toBe(false);
  });
});

describe("SiteHeader fit: without a ResizeObserver", () => {
  it("stays on what CSS shows, and breaks nothing", async () => {
    header.unmount();
    vi.stubGlobal("ResizeObserver", undefined);
    layout.rowWidth = roomInLayout() + 100;
    header = mountHeader();
    await flushPromises();
    expect(isForcedCompact()).toBe(false);
    expect(header.find("#phoneMenuButton").exists()).toBe(true);
    expect(header.find(".siteHeaderLinks").exists()).toBe(true);
  });
});

describe("SiteHeader fit: what is open when the form changes", () => {
  it("closes the phone menu when the row fits again", async () => {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    await header.get("#phoneMenuButton").trigger("click");
    expect(header.find("#phoneMenuPanel").exists()).toBe(true);

    layout.barWidth += 200;
    await measureNow();
    expect(header.find("#phoneMenuPanel").exists()).toBe(false);
    expect(header.get("#phoneMenuButton").attributes("aria-expanded")).toBe("false");
  });

  it("closes an open drop-down of the row when the phone menu takes over", async () => {
    await header.get('.siteHeaderLinks [data-menu="tools"] button').trigger("click");
    expect(header.find("#toolsList").exists()).toBe(true);

    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(header.find("#toolsList").exists()).toBe(false);
  });

  it("leaves a drop-down alone when the form does not change", async () => {
    await header.get('.siteHeaderLinks [data-menu="tools"] button').trigger("click");
    await measureNow();
    expect(header.find("#toolsList").exists()).toBe(true);
  });
});

describe("SiteHeader fit: where focus goes when its control is hidden", () => {
  it("moves focus from the row to the Menu button when the phone menu takes over", async () => {
    const toolsButton = header.get<HTMLElement>('.siteHeaderLinks [data-menu="tools"] button').element;
    toolsButton.focus();
    expect(document.activeElement).toBe(toolsButton);

    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(document.activeElement).toBe(header.get(".siteHeaderMenuButton").element);
  });

  it("moves focus from the Menu button to the name when the row returns", async () => {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    header.get<HTMLElement>(".siteHeaderMenuButton").element.focus();

    layout.barWidth += 200;
    await measureNow();
    expect(document.activeElement).toBe(header.get(".siteHeaderHome").element);
  });

  it("moves focus from a row inside the open phone menu to the name too", async () => {
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    await header.get("#phoneMenuButton").trigger("click");
    header.get<HTMLElement>("#phoneMenuPanel a").element.focus();

    layout.barWidth += 200;
    await measureNow();
    expect(document.activeElement).toBe(header.get(".siteHeaderHome").element);
  });

  it("leaves focus alone when it is somewhere that stays on screen", async () => {
    const home = header.get<HTMLElement>(".siteHeaderHome").element;
    home.focus();
    layout.rowWidth = roomInLayout() + 100;
    await measureNow();
    expect(document.activeElement).toBe(home);

    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    layout.barWidth += 200;
    await measureNow();
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });
});
