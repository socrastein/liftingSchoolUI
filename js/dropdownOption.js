/**
 * The shape of one option of a DropdownSelect (components/DropdownSelect.vue). A module of its own because a generic Vue
 * component's script cannot export a type; it holds only the type, so a project imports it with `import type`.
 */

/**
 * One option of a DropdownSelect: the value it reports, the label it shows (and that typing matches), and optionally a note
 * that sets it apart.
 *
 * @template T
 * @typedef {object} DropdownOption
 * @property {T} value The value `change` reports when this option is picked.
 * @property {string} label What the option shows, and what typing matches.
 * @property {string} [note] Sets this option apart from the rest, e.g. "row's target" for the target an exercise inherits.
 *   Shown as a dashed border, on the option and on the closed box while it is the current one; screen readers hear it after
 *   the label ("Limit Strength, row's target").
 */

export {};
