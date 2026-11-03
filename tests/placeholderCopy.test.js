import { describe, it, expect } from "vitest";
import { placeholderCopy } from "../js/placeholderCopy.js";

/** The wrapper marks drafted copy for the check; at runtime it must change nothing. */

describe("placeholderCopy", () => {
  it("returns the draft text unchanged (dev builds show it as written)", () => {
    expect(placeholderCopy("Muscle growth.")).toBe("Muscle growth.");
  });
});
