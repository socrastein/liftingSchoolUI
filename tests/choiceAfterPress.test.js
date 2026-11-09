import { describe, expect, it } from "vitest";
import { choiceAfterPress } from "../js/choiceAfterPress.js";

describe("choiceAfterPress", () => {
  const PERIODS = ["7D", "30D", "90D", "All"];

  it("turns on a choice that was off", () => {
    expect(choiceAfterPress(PERIODS, "All", "30D")).toBe("30D");
  });

  it("moves to the next choice to the right when the one already on is pressed", () => {
    expect(choiceAfterPress(PERIODS, "30D", "30D")).toBe("90D");
  });

  it("wraps round to the first after the last", () => {
    expect(choiceAfterPress(PERIODS, "All", "All")).toBe("7D");
  });

  it("flips a two-choice switch whichever side is pressed", () => {
    const UNITS = ["lbs", "kg"];
    expect(choiceAfterPress(UNITS, "lbs", "lbs")).toBe("kg");
    expect(choiceAfterPress(UNITS, "lbs", "kg")).toBe("kg");
    expect(choiceAfterPress(UNITS, "kg", "kg")).toBe("lbs");
  });

  it("works with any kind of value, such as true and false", () => {
    expect(choiceAfterPress([true, false], true, true)).toBe(false);
  });
});
