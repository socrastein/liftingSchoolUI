/**
 * One option of a DropdownSelect: the value it reports, the label it shows (and that typing matches), and optionally a note
 * that sets it apart.
 */
export type DropdownOption<T> = {
    /**
     * The value `change` reports when this option is picked.
     */
    value: T;
    /**
     * What the option shows, and what typing matches.
     */
    label: string;
    /**
     * Sets this option apart from the rest, e.g. "row's target" for the target an exercise inherits.
     * Shown as a dashed border, on the option and on the closed box while it is the current one; screen readers hear it after
     * the label ("Limit Strength, row's target").
     */
    note?: string | undefined;
};
