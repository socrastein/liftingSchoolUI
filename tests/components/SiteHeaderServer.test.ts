// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import SiteHeader, { type HeaderItem } from "../../components/SiteHeader.vue";

/**
 * The header drawn on a server, as the static site's build does it: no window, no document and no ResizeObserver. Nothing may
 * be measured or forced there, so the HTML is exactly what CSS alone then shows (the 900px rule), and the page's first paint
 * is the same as before the header learned to measure.
 */

/** A stand-in for a project's router link. */
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

/** The header's HTML as the server draws it. */
async function renderOnServer(): Promise<string> {
  const app = createSSRApp(() =>
    h(
      SiteHeader,
      {
        name: "The Sample Site",
        homeTo: "/",
        product: "site",
        pages: PAGES,
        isOnToolPage: false,
        linkComponent: FakeRouterLink,
        themeStorageKey: "testProject.colorScheme",
        notifications: [],
      },
      { status: () => h("span", { class: "sampleStatus" }, "Saved") },
    ),
  );
  return renderToString(app);
}

describe("SiteHeader on a server", () => {
  it("has neither a window, nor a document, nor a ResizeObserver there, which is what is being tested", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    expect(typeof ResizeObserver).toBe("undefined");
  });

  it("renders without measuring anything, and without forcing the phone menu", async () => {
    const html = await renderOnServer();
    expect(html).toContain('class="siteHeader siteHeaderWithBell"');
    expect(html).not.toContain("siteHeaderCompact");
  });

  it("draws both forms, for CSS to choose between", async () => {
    const html = await renderOnServer();
    expect(html).toContain("siteHeaderPhone");
    expect(html).toContain("siteHeaderLinks");
  });
});
