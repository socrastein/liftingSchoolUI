import { describe, expect, it } from "vitest";
import { optionNamed, optionsMatching } from "../js/optionSearch.js";

/**
 * Options from labels, each its own value.
 *
 * @param {string[]} labels
 */
function optionsFrom(labels) {
  return labels.map((label) => ({ value: label, label }));
}

const COUNTRIES = optionsFrom([
  "United States",
  "Canada",
  "Côte d'Ivoire",
  "India",
  "Indonesia",
  "Saint Kitts and Nevis",
  "Guinea-Bissau",
]);

/**
 * The labels of what matched.
 *
 * @param {string} typed
 */
function labelsMatching(typed) {
  return optionsMatching(COUNTRIES, typed).map((option) => option.label);
}

describe("optionsMatching", () => {
  it("lists every option, in order, while nothing is typed", () => {
    expect(labelsMatching("")).toEqual(COUNTRIES.map((option) => option.label));
    expect(labelsMatching("   ")).toHaveLength(COUNTRIES.length);
  });

  it("matches the start of a label, ignoring case", () => {
    expect(labelsMatching("CAN")).toEqual(["Canada"]);
  });

  it("matches the start of any word, after the labels that start with the text", () => {
    expect(labelsMatching("states")).toEqual(["United States"]);
    expect(labelsMatching("in")).toEqual(["India", "Indonesia"]);
    expect(labelsMatching("bissau")).toEqual(["Guinea-Bissau"]);
    expect(labelsMatching("n")).toEqual(["Saint Kitts and Nevis"]);
  });

  it("puts labels that start with the text first, and keeps each group's order", () => {
    const options = optionsFrom(["Northern Mariana Islands", "Ireland", "Iceland"]);
    const labels = optionsMatching(options, "i").map((option) => option.label);
    expect(labels).toEqual(["Ireland", "Iceland", "Northern Mariana Islands"]);
  });

  it("ignores accents and extra spaces", () => {
    expect(labelsMatching("cote")).toEqual(["Côte d'Ivoire"]);
    expect(labelsMatching("  united   st ")).toEqual(["United States"]);
  });

  it("finds nothing for text no label has", () => {
    expect(labelsMatching("xyz")).toEqual([]);
  });
});

describe("optionNamed", () => {
  it("finds the option whose label is exactly the text, ignoring case, accents and spaces", () => {
    expect(optionNamed(COUNTRIES, " united states ")?.value).toBe("United States");
    expect(optionNamed(COUNTRIES, "Cote d'Ivoire")?.value).toBe("Côte d'Ivoire");
  });

  it("finds nothing for part of a label, or for nothing at all", () => {
    expect(optionNamed(COUNTRIES, "United")).toBeUndefined();
    expect(optionNamed(COUNTRIES, "")).toBeUndefined();
  });
});
