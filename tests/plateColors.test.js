import { describe, expect, it } from "vitest";
import { plateColor } from "../js/plateColors.js";

describe("plateColor", () => {
  it("colours the pound plates 55 red, 45 blue, 35 yellow and 25 green", () => {
    expect(plateColor(55, true)).toBe("red");
    expect(plateColor(45, true)).toBe("blue");
    expect(plateColor(35, true)).toBe("yellow");
    expect(plateColor(25, true)).toBe("green");
  });

  it("colours the kilogram plates 25 red, 20 blue, 15 yellow and 10 green", () => {
    expect(plateColor(25, false)).toBe("red");
    expect(plateColor(20, false)).toBe("blue");
    expect(plateColor(15, false)).toBe("yellow");
    expect(plateColor(10, false)).toBe("green");
  });

  it("makes every lighter plate grey", () => {
    for (const weight of [10, 5, 2.5, 1.25]) {
      expect(plateColor(weight, true)).toBe("grey");
    }
    for (const weight of [5, 2.5, 1.25, 0.5]) {
      expect(plateColor(weight, false)).toBe("grey");
    }
  });

  it("does not mix the units up: 20 lb is grey but 20 kg is blue", () => {
    expect(plateColor(20, true)).toBe("grey");
    expect(plateColor(20, false)).toBe("blue");
  });

  it("makes weights that are not standard plates grey, as a custom plate would be", () => {
    expect(plateColor(7, true)).toBe("grey");
    expect(plateColor(60, true)).toBe("grey");
    expect(plateColor(50, true)).toBe("grey");
  });
});
