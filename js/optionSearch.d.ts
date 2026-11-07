/**
 * The options whose labels match the typed text, those starting with it first.
 *
 * @template {{ label: string }} Option A DropdownOption (lifting-school-ui/dropdownOption), or anything else with a label.
 * @param {readonly Option[]} options Every option, in order.
 * @param {string} typed What has been typed so far.
 * @returns {Option[]} The matching options; all of them when nothing (or only spaces) has been typed.
 */
export function optionsMatching<Option extends {
    label: string;
}>(options: readonly Option[], typed: string): Option[];
/**
 * The option whose label is exactly the typed text, ignoring case, accents and surrounding spaces: how text the browser
 * autofilled (or typed out in full) picks its option.
 *
 * @template {{ label: string }} Option A DropdownOption, or anything else with a label.
 * @param {readonly Option[]} options Every option.
 * @param {string} typed The text in the box.
 * @returns {Option | undefined} That option, or undefined when no label is exactly the text.
 */
export function optionNamed<Option extends {
    label: string;
}>(options: readonly Option[], typed: string): Option | undefined;
