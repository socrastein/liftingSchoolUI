/**
 * The protein and fiber estimator's arithmetic: from a body weight to a daily protein range and a daily fiber target. Matt's
 * coaching rules, each a named constant below. The business site's estimator and the Lifting App's client profile both read
 * this file, so they always show the same estimates. Plain JavaScript with no Vue or Nuxt imports, so it runs anywhere (the
 * browser, Vitest in Node).
 *
 * The weight comes in pounds (a project converts from kilograms itself); every result is whole grams, since an
 * estimate shown to a decimal would claim a precision it does not have.
 */

/**
 * The low end of the protein range, in grams per pound of body weight. About 0.8 g per kg, the RDA for adults (Institute of
 * Medicine, Dietary Reference Intakes, 2005).
 */
export const PROTEIN_MIN_GRAMS_PER_POUND = 0.4;

/**
 * The high end of the protein range, in grams per pound of body weight. About 1.6 g per kg, around where Morton et al. (2018,
 * British Journal of Sports Medicine) found extra protein stopped adding to
 * the muscle gained from strength training.
 */
export const PROTEIN_MAX_GRAMS_PER_POUND = 0.8;

/**
 * The daily fiber target, in grams per pound of body weight. Where it comes from: 14 g of fiber per 1,000 calories eaten
 * (Institute of Medicine, 2005; the US Dietary Guidelines use the same figure), applied to Matt's rough calorie estimate of 15
 * per pound, gives 0.21, rounded to 0.2 (Matt's call, 2026-11-11).
 */
export const FIBER_GRAMS_PER_POUND = 0.2;

/**
 * @typedef {object} DailyIntake The daily targets for one body weight.
 * @property {number} proteinMinGrams The least protein to eat in a day, in whole grams.
 * @property {number} proteinMaxGrams The most protein worth eating in a day, in whole grams.
 * @property {number} fiberGrams The daily fiber target, in whole grams.
 */

/**
 * The daily protein range and fiber target for a body weight.
 *
 * @param {number} pounds Body weight in pounds; the caller has already checked it is a sensible weight.
 * @returns {DailyIntake} The targets, e.g. 180 lb gives protein 72-144 g and fiber 36 g.
 */
export function estimateDailyIntake(pounds) {
  return {
    proteinMinGrams: Math.round(pounds * PROTEIN_MIN_GRAMS_PER_POUND),
    proteinMaxGrams: Math.round(pounds * PROTEIN_MAX_GRAMS_PER_POUND),
    fiberGrams: Math.round(pounds * FIBER_GRAMS_PER_POUND),
  };
}
