import { describe, expect, it } from "vitest";
import {
  estimateDailyIntake,
  FIBER_GRAMS_PER_POUND,
  PROTEIN_MAX_GRAMS_PER_POUND,
  PROTEIN_MIN_GRAMS_PER_POUND,
} from "../js/proteinFiber.js";

describe("the coaching rules", () => {
  it("are 0.4 and 0.8 g of protein and 0.2 g of fiber per pound; changing one is a deliberate edit of this test", () => {
    expect(PROTEIN_MIN_GRAMS_PER_POUND).toBe(0.4);
    expect(PROTEIN_MAX_GRAMS_PER_POUND).toBe(0.8);
    expect(FIBER_GRAMS_PER_POUND).toBe(0.2);
  });
});

describe("estimateDailyIntake", () => {
  it("gives 0.4-0.8 g of protein per pound as whole grams", () => {
    const intake = estimateDailyIntake(180);
    expect(intake.proteinMinGrams).toBe(72);
    expect(intake.proteinMaxGrams).toBe(144);
  });

  it("gives 0.2 g of fiber per pound as whole grams", () => {
    // 180 x 0.2 = 36
    expect(estimateDailyIntake(180).fiberGrams).toBe(36);
  });

  it("rounds halves of a gram as Math.round does", () => {
    // 101.25 lb: protein 40.5 and 81, fiber 20.25
    const intake = estimateDailyIntake(101.25);
    expect(intake.proteinMinGrams).toBe(41);
    expect(intake.proteinMaxGrams).toBe(81);
    expect(intake.fiberGrams).toBe(20);
  });
});
