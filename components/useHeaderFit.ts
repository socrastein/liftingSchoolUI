import { inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type InjectionKey, type Ref } from "vue";
import { nameFitsBesideMenu, roomLeftForRow, rowFits, type HeaderWidths } from "../js/headerFit.js";

/**
 * How SiteHeader decides between its wide row and its phone menu, beyond the 900px rule in CSS: it measures whether the row
 * fits and, when it does not, asks CSS for the phone menu at a window where the row would have been shown.
 *
 * The rule itself (js/headerFit.js) is plain arithmetic; this file is the part that needs a page: it reads the widths, watches
 * for anything that changes them and keeps the form that is shown in a ref the header's popups can follow. Nothing here
 * runs until the header is mounted in a browser, so a server-rendered header is exactly what CSS alone shows, and a browser
 * without ResizeObserver stays on that too.
 *
 * How the row is measured when it is not drawn: CSS hides it with `display: none`, as it always did, so it has no width to read. To
 * read it, the row is laid out out of sight for a moment (inline styles set, the width read, the styles put back, all in one
 * script task, so nothing is painted). That is safe for the keyboard because the row is not drawn then, so nothing in it can hold
 * focus, and the phone menu, where focus may be, is never touched. Measuring a copy of the row was rejected (it duplicates ids),
 * and so was keeping the row laid out but invisible (`visibility`), which holds "visible" through a transition and so showed
 * both forms for a frame under reduced motion.
 *
 * The room it has is worked out from parts whatever form is shown, so which form is shown cannot change what is measured and the
 * form cannot flip back and forth by itself. The title is worked out from its logo and its name's own widths, not the title's box,
 * since a row that is too wide squeezes that box, and a name that is hidden takes no room in it.
 *
 * The name hides (the logo alone shows) only when it would not fit beside the Menu button's block and the statuses (js/headerFit.js
 * nameFitsBesideMenu). The header is then in the phone form, whatever the window: a row that fits has room for the name too, so the
 * name is hidden only where even the phone form would collide.
 *
 * Re-measured when: the window or bar resizes, the title or status changes size, anything in the row changes (a page added at
 * sign-in, the bell's count: a MutationObserver, since a row that is not drawn has no size for a ResizeObserver to report) and
 * the fonts finish loading (widths change with them). Switching theme changes no width, so it is not watched.
 */

/** The two forms the header is drawn in: the row of links, or the Menu button and its panel. */
export type HeaderForm = "wide" | "compact";

/** What SiteHeader gives its popups, so they close when the form changes: the form the header is showing. */
const HEADER_FORM_KEY: InjectionKey<Ref<HeaderForm>> = Symbol("siteHeaderForm");

/** The bar's parts that are measured: bind each with `ref` in the template. */
export interface HeaderParts {
  /** The bar itself (.siteHeaderNav), whose inside width is the room. */
  nav: Ref<HTMLElement | null>;
  /** The title (.siteHeaderTitle): the home link, which holds the logo and the name. */
  title: Ref<HTMLElement | null>;
  /** The logo (.siteHeaderLogo), inside the home link. */
  logo: Ref<HTMLElement | null>;
  /** The name (.siteHeaderName), inside the home link; hidden visually, not from screen readers, when it does not fit. */
  name: Ref<HTMLElement | null>;
  /** Everything on the right (.siteHeaderEnd): the status, the phone menu and the row. */
  end: Ref<HTMLElement | null>;
  /** The wide row (.siteHeaderLinks). */
  row: Ref<HTMLElement | null>;
  /** The Menu button's block (.siteHeaderPhone). */
  phone: Ref<HTMLElement | null>;
}

/** What the header reads from useHeaderFit. */
export interface HeaderFit {
  /**
   * True when the row does not fit, or the name does not fit beside the Menu button: the header then asks CSS for the phone menu
   * even at a window of 900px or more. Set on every measurement, so it is never true for a row the name stays on (see the top).
   */
  isForcedCompact: Ref<boolean>;
  /** False when the name does not fit beside the Menu button: the name is then drawn out of sight (the logo alone shows). */
  isNameShown: Ref<boolean>;
  /** The form on screen now (forced or by the 900px rule), which the popups follow. */
  shownForm: Ref<HeaderForm>;
}

/** The measured widths the decision needs, and the row's natural width to set against them. */
interface Measurements {
  widths: HeaderWidths;
  rowWidth: number;
}

/** The event `document.fonts` fires each time a batch of fonts has finished loading (CSS Font Loading API), after which text may be wider or narrower. */
const FONTS_LOADED_EVENT = "loadingdone";

/** The part of the bar that holds the focused control: the wide row, the Menu button's block, or neither. */
type FocusRegion = "row" | "phone" | undefined;

/**
 * Makes a popup under a header button (a drop-down, the bell) close when the header changes form, so a list opened in the
 * wide row is not left open under a row that is no longer shown. Does nothing outside a SiteHeader.
 *
 * @param close Closes the popup.
 */
export function closeWhenHeaderFormChanges(close: () => void): void {
  const shownForm = inject(HEADER_FORM_KEY, null);
  if (shownForm !== null) watch(shownForm, close);
}

/**
 * Starts measuring when the header is mounted and stops when it is unmounted, and provides the shown form to the header's popups.
 *
 * @param parts The bar's parts, as refs bound in the template.
 * @returns Whether the row is forced out, and the form shown.
 */
export function useHeaderFit(parts: HeaderParts): HeaderFit {
  const fit: HeaderFit = { isForcedCompact: ref(false), isNameShown: ref(true), shownForm: ref<HeaderForm>("wide") };
  provide(HEADER_FORM_KEY, fit.shownForm);

  /** Stops the observers; undefined until mounted, and for good in a browser that cannot observe (CSS then decides alone). */
  let stopWatching: (() => void) | undefined;

  onMounted(() => {
    stopWatching = watchParts(parts, () => void updateFit(parts, fit));
    fit.shownForm.value = formOnScreen(parts);
  });
  onBeforeUnmount(() => {
    stopWatching?.();
    stopWatching = undefined;
  });

  return fit;
}

/**
 * Measures, asks for the form that fits, and when the form on screen changed, keeps the keyboard where a person can see it.
 * A measurement still waiting for the next tick when the header is unmounted does nothing: Vue clears the template refs then.
 */
async function updateFit(parts: HeaderParts, fit: HeaderFit): Promise<void> {
  const measured = measure(parts);
  if (measured === undefined) return;

  const regionWithFocus = regionHoldingFocus(parts);
  fit.isNameShown.value = nameFitsBesideMenu(measured.widths);
  fit.isForcedCompact.value = !rowFits(measured.rowWidth, roomLeftForRow(measured.widths)) || !fit.isNameShown.value;
  // The class that forces the phone menu is applied by Vue on the next tick; the form on screen is read after it
  await nextTick();
  if (parts.nav.value === null) return;

  const form = formOnScreen(parts);
  if (form === fit.shownForm.value) return;
  fit.shownForm.value = form;
  moveFocusIfHidden(parts, regionWithFocus, form);
}

/**
 * Watches everything that can change the answer and calls `onChange` when any does, and once as soon as it starts (the first
 * measurement): the sizes of the bar, the title, the row, the Menu button's block and each thing in the status slot; the
 * contents of the title, the row, the Menu button's block and the list of things in the status slot; and the fonts finishing
 * loading.
 *
 * @returns A function that stops watching, or undefined when this browser cannot observe sizes.
 */
function watchParts(parts: HeaderParts, onChange: () => void): (() => void) | undefined {
  if (typeof ResizeObserver === "undefined") return undefined;

  const resizeObserver = new ResizeObserver(onChange);
  observeParts(parts, resizeObserver);
  const stopWatchingContent = watchContent(parts, () => {
    observeParts(parts, resizeObserver);
    onChange();
  });
  const stopWatchingFonts = watchFonts(onChange);

  return () => {
    resizeObserver.disconnect();
    stopWatchingContent();
    stopWatchingFonts();
  };
}

/**
 * Calls `onChange` when what is in the row, the title or the Menu button's block changes (a page added at sign-in, the bell's count,
 * a product name that is changed: a part that is not drawn has no size for a ResizeObserver to report, so its content is watched
 * directly) or when the project replaces what is in the status slot (a badge that appears).
 *
 * @returns A function that stops watching; one that does nothing when this browser has no MutationObserver.
 */
function watchContent(parts: HeaderParts, onChange: () => void): () => void {
  const { end, row, title, phone } = parts;
  if (typeof MutationObserver === "undefined" || end.value === null) return () => {};

  const contentChanges = new MutationObserver(onChange);
  contentChanges.observe(end.value, { childList: true });
  for (const part of [row.value, title.value, phone.value]) {
    if (part !== null) contentChanges.observe(part, { childList: true, subtree: true, characterData: true });
  }
  return () => contentChanges.disconnect();
}

/**
 * Calls `onChange` each time fonts finish loading, since text then takes a different width.
 *
 * @returns A function that stops listening; one that does nothing when the browser has no `document.fonts`.
 */
function watchFonts(onChange: () => void): () => void {
  const fonts = typeof document === "undefined" ? undefined : document.fonts;
  fonts?.addEventListener(FONTS_LOADED_EVENT, onChange);
  return () => fonts?.removeEventListener(FONTS_LOADED_EVENT, onChange);
}

/** Points the observer at the parts that exist now, dropping what it watched before. */
function observeParts(parts: HeaderParts, resizeObserver: ResizeObserver): void {
  resizeObserver.disconnect();
  for (const element of partsToObserve(parts)) resizeObserver.observe(element);
}

/** Whether the element takes room in the page (false for one that is not drawn, as CSS `display: none` leaves it). */
function isDrawn(element: Element): boolean {
  return element.getClientRects().length > 0;
}

/** An element's width in pixels, fractions included. */
function widthOf(element: Element): number {
  return element.getBoundingClientRect().width;
}

/**
 * The width of an element's text, read from the text itself rather than the element's box. A range over the contents is not cut to
 * the box, so it is the same whether the name is drawn or clipped to 1px for screen readers (.visuallyHidden). It is exact to a
 * fraction of a pixel, unlike `scrollWidth`, which is a whole number and would tip a row that fits exactly at a window width.
 */
function textWidthOf(element: HTMLElement): number {
  const range = document.createRange();
  range.selectNodeContents(element);
  return range.getBoundingClientRect().width;
}

/**
 * Inline styles that lay a part out as it is in the page, out of sight and out of the flow: its natural width (max-content,
 * not cut to the bar's width by the global max-width: 100%), wherever it is placed.
 */
const PART_PROBE_STYLE = {
  display: "flex",
  maxWidth: "none",
  position: "absolute",
  visibility: "hidden",
  width: "max-content",
} as const;

/**
 * The width a part of the bar needs: its own width when it is drawn, and otherwise the width it takes when laid out for a moment
 * out of sight. The styles are put back exactly as they were before anything is painted. In the wide form the row never shrinks,
 * so its own width is its natural one.
 */
function widthOfWhenLaidOut(element: HTMLElement): number {
  if (isDrawn(element)) return widthOf(element);

  const inlineStyleBefore = element.getAttribute("style");
  Object.assign(element.style, PART_PROBE_STYLE);
  const width = widthOf(element);
  if (inlineStyleBefore === null) element.removeAttribute("style");
  else element.setAttribute("style", inlineStyleBefore);
  return width;
}

/** A computed length such as "16px" as a number; "normal" (a gap never set) and "" are 0. */
function pixelsOf(computedLength: string): number {
  return Number.parseFloat(computedLength) || 0;
}

/**
 * The things in the end that the project put there (the status slot): everything but the phone menu's block and the row, and
 * only those drawn now (a status element CSS hides takes no room, so it is not measured).
 */
function statusElements(parts: HeaderParts): Element[] {
  const children = [...(parts.end.value?.children ?? [])];
  return children.filter((child) => child !== parts.phone.value && child !== parts.row.value && isDrawn(child));
}

/** What the observers watch: the bar, the title, the row, the Menu button's block and the status elements. */
function partsToObserve(parts: HeaderParts): Element[] {
  const watched = [parts.nav.value, parts.title.value, parts.row.value, parts.phone.value, ...statusElements(parts)];
  return watched.filter((element): element is Element => element !== null);
}

/**
 * The title's width with its name shown: the logo, the gap between it and the name, and the name's text. Read from the parts, not
 * from the title's box, so it is the same whether the name is hidden now or not (a hidden name is clipped to 1px; its text is not).
 */
function titleWidthWithName(parts: HeaderParts): number | undefined {
  const { logo, name } = parts;
  if (logo.value === null || name.value === null) return undefined;

  // The logo and the name share the home link, whose gap sits between them (.siteHeaderHome)
  const gapBetweenLogoAndName = pixelsOf(getComputedStyle(name.value.parentElement ?? name.value).columnGap);
  return widthOf(logo.value) + gapBetweenLogoAndName + textWidthOf(name.value);
}

/**
 * Reads every width the decision needs, or undefined when a part is not there (the header is not on the page).
 *
 * The row and the Menu button's block are read as they lay out, or, when they are not drawn in this form, as they would lay out
 * for a moment out of sight, so the widths do not depend on the form shown.
 */
function measure(parts: HeaderParts): Measurements | undefined {
  const { row, phone } = parts;
  const bar = barWidths(parts);
  const titleWidth = titleWidthWithName(parts);
  if (bar === undefined || titleWidth === undefined || row.value === null || phone.value === null) return undefined;

  return {
    widths: { ...bar, titleWidth, menuWidth: widthOfWhenLaidOut(phone.value) },
    rowWidth: widthOfWhenLaidOut(row.value),
  };
}

/**
 * The bar's widths other than the title's and the Menu button's: the bar, its padding and gaps, and the statuses. Undefined when
 * the bar is not on the page.
 */
function barWidths(parts: HeaderParts): Omit<HeaderWidths, "titleWidth" | "menuWidth"> | undefined {
  const { nav, end } = parts;
  if (nav.value === null || end.value === null) return undefined;

  const barStyle = getComputedStyle(nav.value);
  const endStyle = getComputedStyle(end.value);
  return {
    barWidth: widthOf(nav.value),
    barPadding: pixelsOf(barStyle.paddingLeft) + pixelsOf(barStyle.paddingRight),
    barGap: pixelsOf(barStyle.columnGap),
    statusWidths: statusElements(parts).map(widthOf),
    endGap: pixelsOf(endStyle.columnGap),
  };
}

/** The form CSS is drawing now: the phone menu's block takes room only in the compact form. */
function formOnScreen(parts: HeaderParts): HeaderForm {
  const isPhoneShown = parts.phone.value !== null && isDrawn(parts.phone.value);
  return isPhoneShown ? "compact" : "wide";
}

/** Which part of the bar holds the focused control right now. */
function regionHoldingFocus(parts: HeaderParts): FocusRegion {
  if (parts.row.value?.contains(document.activeElement)) return "row";
  if (parts.phone.value?.contains(document.activeElement)) return "phone";
  return undefined;
}

/**
 * When the control that had focus belongs to the form that is no longer shown, moves focus to the nearest control that is:
 * from the row to the Menu button (where the navigation went), from the Menu button or its panel to the home link (the logo and
 * name, which are drawn in both forms and are the bar's first stop in the tab order). Otherwise focus is left where it is.
 */
function moveFocusIfHidden(parts: HeaderParts, regionWithFocus: FocusRegion, form: HeaderForm): void {
  if (regionWithFocus === "row" && form === "compact") {
    parts.phone.value?.querySelector<HTMLElement>(".siteHeaderMenuButton")?.focus();
  }
  if (regionWithFocus === "phone" && form === "wide") {
    parts.title.value?.querySelector<HTMLElement>(".siteHeaderHome")?.focus();
  }
}
