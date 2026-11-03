// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { bringIntoView, focusField } from "../js/formFocus.js";

/** Focus goes where a form needs the person's attention: a field by its name, or any element brought to the top of the screen. */

afterEach(() => {
  document.body.innerHTML = "";
});

/**
 * Puts an element on the page and returns it.
 * @param {string} html
 * @returns {HTMLElement}
 */
function addToPage(html) {
  document.body.insertAdjacentHTML("beforeend", html);
  return /** @type {HTMLElement} */ (document.body.lastElementChild);
}

describe("focusField", () => {
  it("focuses the control whose data-field is the given name", () => {
    addToPage('<input data-field="firstName" />');
    const city = addToPage('<input data-field="city" />');

    focusField("city");

    expect(document.activeElement).toBe(city);
  });

  it("does nothing when no control has that name", () => {
    const other = addToPage('<input data-field="city" />');
    other.focus();

    focusField("unknownField");

    expect(document.activeElement).toBe(other);
  });
});

describe("bringIntoView", () => {
  it("focuses the element and scrolls it to the top of the screen", () => {
    const heading = addToPage('<h2 tabindex="-1">Thank you</h2>');
    heading.scrollIntoView = vi.fn();

    bringIntoView(heading);

    expect(document.activeElement).toBe(heading);
    expect(heading.scrollIntoView).toHaveBeenCalledWith({ block: "start" });
  });

  it("does nothing for an element that is not on the page yet", () => {
    expect(() => bringIntoView(null)).not.toThrow();
  });
});
