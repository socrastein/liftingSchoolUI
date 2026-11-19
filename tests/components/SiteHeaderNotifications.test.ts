// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import SiteHeader, { type HeaderItem, type HeaderNotification } from "../../components/SiteHeader.vue";
import SiteHeaderNotifications, {
  notificationBadgeText,
  notificationsAnnouncement,
  notificationsButtonName,
} from "../../components/SiteHeaderNotifications.vue";

/**
 * The header's notifications bell: absent, empty, one, many; its name in words; its panel of links; closing; the live region.
 * Both layouts are in the page (CSS shows one), so the wide bell is found in `.siteHeaderLinks` and the phone one in
 * `.siteHeaderPhone`.
 */

const FakeRouterLink = defineComponent({
  props: { to: { type: String, required: true } },
  setup(props, { slots }) {
    return () => h("a", { href: props.to }, slots.default?.());
  },
});

const PAGES: HeaderItem[] = [{ kind: "link", name: "Home", to: "/" }];

const FOOD_LOG: HeaderNotification = { id: "foodLog", text: "Your coach asked for a 3-day food log.", to: "/food-log" };
const CHECK_IN: HeaderNotification = { id: "checkIn", text: "Your weekly check-in is due.", to: "/check-in" };

/** Mounts a header in the page (outside clicks and focus need a real document) with the given notifications. */
function mountHeader(notifications?: HeaderNotification[]): VueWrapper {
  const mounted = mount(SiteHeader, {
    props: {
      name: "The Sample App",
      homeTo: "/",
      product: "app",
      pages: PAGES,
      isOnToolPage: false,
      linkComponent: FakeRouterLink,
      themeStorageKey: "testProject.colorScheme",
      notifications,
    },
    attachTo: document.body,
  });
  mountedHeaders.push(mounted);
  return mounted;
}

/** A list of this many notifications with distinct ids. */
function notificationsCounting(count: number): HeaderNotification[] {
  return Array.from({ length: count }, (_, index) => ({ id: `n${index}`, text: `Thing ${index}.`, to: `/thing-${index}` }));
}

let header: VueWrapper;
/** Every header mounted by the current test, unmounted after it (a failed test must not leave one in the page). */
const mountedHeaders: VueWrapper[] = [];

beforeEach(() => {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => void entries.set(key, String(value)),
    removeItem: (key: string) => void entries.delete(key),
  });
});

afterEach(() => {
  for (const mounted of mountedHeaders.splice(0)) mounted.unmount();
  vi.unstubAllGlobals();
});

describe("the bell's words", () => {
  it("names the count in words, with the singular and the none case", () => {
    expect(notificationsButtonName(2)).toBe("Notifications, 2 need you");
    expect(notificationsButtonName(1)).toBe("Notifications, 1 needs you");
    expect(notificationsButtonName(0)).toBe("Notifications, nothing needs you");
  });

  it("shows counts up to 9 as they are and anything above as 9+", () => {
    expect(notificationBadgeText(9)).toBe("9");
    expect(notificationBadgeText(10)).toBe("9+");
    expect(notificationBadgeText(12)).toBe("9+");
  });

  it("announces the new state as a sentence", () => {
    expect(notificationsAnnouncement(2)).toBe("2 things need you.");
    expect(notificationsAnnouncement(1)).toBe("1 thing needs you.");
    expect(notificationsAnnouncement(0)).toBe("Nothing needs you right now.");
  });
});

describe("SiteHeader: the bell's three states", () => {
  it("draws no bell at all when notifications are left out", () => {
    header = mountHeader();
    expect(header.find(".siteHeaderBell").exists()).toBe(false);
    expect(header.find('[role="status"]').exists()).toBe(false);
  });

  it("draws the bell without a count for an empty list, and the panel says nothing needs the person", async () => {
    header = mountHeader([]);
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");
    expect(bell.attributes("aria-label")).toBe("Notifications, nothing needs you");
    expect(bell.find(".siteHeaderBellBadge").exists()).toBe(false);

    await bell.trigger("click");
    expect(header.get(".siteHeaderLinks .siteHeaderNoticeList").text()).toBe("Nothing needs you right now.");
  });

  it("draws the count for one notification", () => {
    header = mountHeader([FOOD_LOG]);
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");
    expect(bell.attributes("aria-label")).toBe("Notifications, 1 needs you");
    expect(bell.get(".siteHeaderBellBadge").text()).toBe("1");
  });

  it("draws the count for several, and 9+ for more than 9 while the name keeps the real number", () => {
    header = mountHeader(notificationsCounting(12));
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");
    expect(bell.get(".siteHeaderBellBadge").text()).toBe("9+");
    expect(bell.attributes("aria-label")).toBe("Notifications, 12 need you");
    expect(bell.get(".siteHeaderBellBadge").attributes("aria-hidden")).toBe("true");
  });
});

describe("SiteHeader: where the bell sits", () => {
  it("is just before the theme button in the wide row", () => {
    header = mountHeader([FOOD_LOG]);
    const row = [...header.get(".siteHeaderLinks").element.children];
    const last = row[row.length - 1];
    const beforeLast = row[row.length - 2];
    expect(last?.className).toContain("themeButton");
    expect(beforeLast?.className).toBe("siteHeaderNotifications");
  });

  it("is beside the Menu button, outside the phone menu, under 900px", () => {
    header = mountHeader([FOOD_LOG]);
    const phone = header.get(".siteHeaderPhone");
    expect([...phone.element.children].map((child) => child.className)).toEqual([
      "siteHeaderNotifications",
      "siteHeaderPhoneMenu",
    ]);
    expect(header.find(".siteHeaderPhoneMenu .siteHeaderBell").exists()).toBe(false);
  });

  it("leaves the phone area exactly as it was when there is no bell", () => {
    header = mountHeader();
    const phone = header.get(".siteHeaderPhone");
    expect(phone.classes()).toEqual(["siteHeaderPhone"]);
    expect([...phone.element.children].map((child) => child.className)).toEqual(["siteHeaderPhoneMenu"]);
  });
});

describe("SiteHeader: the notifications panel", () => {
  beforeEach(() => {
    header = mountHeader([FOOD_LOG, CHECK_IN]);
  });

  /** Opens the wide row's panel and returns the bell. */
  async function openPanel() {
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");
    await bell.trigger("click");
    return bell;
  }

  it("opens from the bell as a disclosure tied to its panel", async () => {
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");
    expect(bell.attributes("aria-expanded")).toBe("false");
    expect(header.find(".siteHeaderLinks .siteHeaderNoticeList").exists()).toBe(false);

    await bell.trigger("click");
    expect(bell.attributes("aria-expanded")).toBe("true");
    expect(bell.attributes("aria-controls")).toBe("notificationsPanel-wide");
    expect(header.find("#notificationsPanel-wide").exists()).toBe(true);
  });

  it("lists one link per notification, each whole row going to its own address", async () => {
    await openPanel();
    const links = header.findAll("#notificationsPanel-wide a");
    expect(links.map((link) => [link.text(), link.attributes("href")])).toEqual([
      ["Your coach asked for a 3-day food log.", "/food-log"],
      ["Your weekly check-in is due.", "/check-in"],
    ]);
  });

  it("closes when a notification is chosen", async () => {
    const bell = await openPanel();
    await header.get("#notificationsPanel-wide a").trigger("click");
    expect(bell.attributes("aria-expanded")).toBe("false");
  });

  it("closes on Escape and hands focus back to the bell", async () => {
    const bell = await openPanel();
    await header.get(".siteHeaderLinks .siteHeaderNotifications").trigger("keydown", { key: "Escape" });
    expect(bell.attributes("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(bell.element);
  });

  it("closes on a click anywhere else", async () => {
    const bell = await openPanel();
    // The outside-click watcher takes one click per tick (it guards against a click counted twice)
    await new Promise((resolve) => setTimeout(resolve, 0));
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    document.body.click();
    await nextTick();
    expect(bell.attributes("aria-expanded")).toBe("false");
  });

  it("gives the phone bell a panel of its own id, with the same links", async () => {
    await header.get(".siteHeaderPhone .siteHeaderBell").trigger("click");
    expect(header.findAll("#notificationsPanel-phone a").map((link) => link.attributes("href"))).toEqual([
      "/food-log",
      "/check-in",
    ]);
  });
});

describe("SiteHeaderNotifications: the opened event", () => {
  /** Mounts the bell alone (outside clicks need a real document). */
  function mountBell(notifications: HeaderNotification[] = [FOOD_LOG]): VueWrapper {
    const bell = mount(SiteHeaderNotifications, {
      props: { notifications, layout: "wide", linkComponent: FakeRouterLink },
      attachTo: document.body,
    });
    mountedHeaders.push(bell);
    return bell;
  }

  it("emits opened once when the panel goes from closed to open, and not on first render", async () => {
    const bell = mountBell();
    const button = bell.get("button.siteHeaderBell");

    expect(bell.emitted("opened")).toBeUndefined();

    await button.trigger("click");
    expect(bell.emitted("opened")).toHaveLength(1);
  });

  it("emits nothing when the panel closes, and once more when it opens again", async () => {
    const bell = mountBell();
    const button = bell.get("button.siteHeaderBell");

    await button.trigger("click");
    await button.trigger("click");
    expect(bell.emitted("opened")).toHaveLength(1);

    await button.trigger("click");
    expect(bell.emitted("opened")).toHaveLength(2);
  });
});

describe("SiteHeader: the noticesOpened event", () => {
  it("re-emits the bell's opened as noticesOpened, once per opening and not on close", async () => {
    header = mountHeader([FOOD_LOG]);
    const bell = header.get(".siteHeaderLinks .siteHeaderBell");

    await bell.trigger("click");
    expect(header.emitted("noticesOpened")).toHaveLength(1);

    await bell.trigger("click");
    expect(header.emitted("noticesOpened")).toHaveLength(1);
  });

  it("also comes from the phone bell, which is its own bell component", async () => {
    header = mountHeader([FOOD_LOG]);
    const phoneBell = header.get(".siteHeaderPhone .siteHeaderBell");

    await phoneBell.trigger("click");
    expect(header.emitted("noticesOpened")).toHaveLength(1);
  });
});

describe("SiteHeader: the live region", () => {
  /** What the live region says now. */
  function spoken(): string {
    return header.get('[role="status"]').text();
  }

  it("is polite and says nothing on first render", () => {
    header = mountHeader([FOOD_LOG]);
    expect(header.get('[role="status"]').attributes("aria-live")).toBe("polite");
    expect(spoken()).toBe("");
  });

  it("says the new state once each time the count changes", async () => {
    header = mountHeader([FOOD_LOG]);

    await header.setProps({ notifications: [FOOD_LOG, CHECK_IN] });
    expect(spoken()).toBe("2 things need you.");

    await header.setProps({ notifications: [CHECK_IN] });
    expect(spoken()).toBe("1 thing needs you.");

    await header.setProps({ notifications: [] });
    expect(spoken()).toBe("Nothing needs you right now.");
  });

  it("says nothing again when the list changes but the count does not", async () => {
    header = mountHeader([FOOD_LOG]);
    await header.setProps({ notifications: [FOOD_LOG, CHECK_IN] });
    const text = header.get('[role="status"]').element;
    text.textContent = "";

    await header.setProps({ notifications: [CHECK_IN, FOOD_LOG] });
    expect(spoken()).toBe("");
  });
});
