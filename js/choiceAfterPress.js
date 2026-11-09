/**
 * What a segmented switch (a row of choices, one of them on) does when a choice is pressed. Every switch follows this rule,
 * so controls that look alike act alike (Matt's call, 2026-11-07): `ChoiceSwitch` uses it, and a project's own switch that
 * cannot be a ChoiceSwitch (one made of links, say) imports it from `lifting-school-ui/choiceAfterPress`.
 */

/**
 * The choice that is on after one is pressed: the pressed one, or, when it was already on, the next one to its right,
 * wrapping round to the first after the last. With two choices, pressing either one flips the switch.
 * @template Choice
 * @param {readonly Choice[]} choices The choices, in the order shown.
 * @param {Choice} chosen The choice on before the press.
 * @param {Choice} pressed The choice pressed.
 * @returns {Choice} The choice on after the press.
 */
export function choiceAfterPress(choices, chosen, pressed) {
  if (pressed !== chosen) return pressed;

  const nextIndex = (choices.indexOf(pressed) + 1) % choices.length;
  return choices[nextIndex] ?? pressed;
}
