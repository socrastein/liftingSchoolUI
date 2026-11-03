// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { FIXED_HEADER_ATTRIBUTE, fixedHeaderBottom } from "../js/fixedHeader.js";

/**
 * Where a page's fixed header ends: popups measure it so they never open underneath the header. jsdom draws nothing, so the
 * header's box is given by hand.
 */

afterEach(() => {
  document.body.innerHTML = "";
});

describe("fixedHeaderBottom", () => {
  it("is the bottom edge of the element marked data-fixed-header", () => {
    const header = document.createElement("header");
    header.setAttribute(FIXED_HEADER_ATTRIBUTE, "");
    header.getBoundingClientRect = () => /** @type {DOMRect} */ ({ bottom: 56 });
    document.body.append(header);

    expect(fixedHeaderBottom()).toBe(56);
  });

  it("is 0 on a page with no fixed header, so a popup may use the whole window", () => {
    expect(fixedHeaderBottom()).toBe(0);
  });
});
