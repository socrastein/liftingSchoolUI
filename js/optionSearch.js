/**
 * How a searchable DropdownSelect (components/DropdownSelect.vue) matches what is typed against its options' labels. Plain
 * functions with no Vue, so they are tested in Node; the component is their only user.
 *
 * Matching ignores case and accents ("cote" finds "Côte d'Ivoire"), and a label matches when it starts with the typed text or
 * has a word that does ("states" finds "United States"). Labels that start with it come first, so "in" lists India before
 * Saint Kitts and Nevis; within each group the options keep their order.
 */

/** What separates the words of a label: spaces, hyphens, slashes, brackets and the like. */
const WORD_BREAK = /[\s\-/(),.&']+/;

/**
 * The options whose labels match the typed text, those starting with it first.
 *
 * @template {{ label: string }} Option A DropdownOption (lifting-school-ui/dropdownOption), or anything else with a label.
 * @param {readonly Option[]} options Every option, in order.
 * @param {string} typed What has been typed so far.
 * @returns {Option[]} The matching options; all of them when nothing (or only spaces) has been typed.
 */
export function optionsMatching(options, typed) {
  const wanted = comparable(typed);
  if (wanted === "") return [...options];

  /** @type {Option[]} */
  const startingWith = [];
  /** @type {Option[]} */
  const withAWordStartingWith = [];
  for (const option of options) {
    const label = comparable(option.label);
    if (label.startsWith(wanted)) startingWith.push(option);
    else if (hasWordStartingWith(label, wanted)) withAWordStartingWith.push(option);
  }
  return [...startingWith, ...withAWordStartingWith];
}

/**
 * The option whose label is exactly the typed text, ignoring case, accents and surrounding spaces: how text the browser
 * autofilled (or typed out in full) picks its option.
 *
 * @template {{ label: string }} Option A DropdownOption, or anything else with a label.
 * @param {readonly Option[]} options Every option.
 * @param {string} typed The text in the box.
 * @returns {Option | undefined} That option, or undefined when no label is exactly the text.
 */
export function optionNamed(options, typed) {
  const wanted = comparable(typed);
  if (wanted === "") return undefined;
  return options.find((option) => comparable(option.label) === wanted);
}

/**
 * True when one of the label's words starts with the wanted text.
 *
 * @param {string} label The label, already comparable.
 * @param {string} wanted The typed text, already comparable.
 * @returns {boolean}
 */
function hasWordStartingWith(label, wanted) {
  const words = label.split(WORD_BREAK);
  return words.some((word) => word.startsWith(wanted));
}

/**
 * Text as it is compared: lower-case, accents removed (decomposed, then the combining marks dropped), runs of spaces as one,
 * no spaces at either end.
 *
 * @param {string} text
 * @returns {string}
 */
function comparable(text) {
  const withoutAccents = text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return withoutAccents.toLowerCase().replace(/\s+/g, " ").trim();
}
