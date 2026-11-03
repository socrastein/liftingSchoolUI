/**
 * Moving keyboard focus around a form, so keyboard and screen-reader users land on whatever needs attention: the first field
 * with a problem after a failed submit (where its error is read with it, since FormField ties the two together), an error
 * message, a new step's heading.
 *
 * A browser-only module: call it from an event handler or a lifecycle hook, never while rendering on a server.
 */

/**
 * Moves keyboard focus to the form control with `data-field="<field>"` (FormField and FormFieldGroup put that attribute on
 * their control). Does nothing when there is no such control.
 *
 * @param {string} field The field's name, which is its id in the form.
 * @returns {void}
 */
export function focusField(field) {
  const control = /** @type {HTMLElement | null} */ (document.querySelector(`[data-field="${field}"]`));
  control?.focus();
}

/**
 * Moves keyboard focus to an element and scrolls it to the top of the screen (clear of a fixed header, which base.css allows
 * for with `scroll-padding-top`). The element needs `tabindex="-1"` unless it is already focusable.
 *
 * @param {HTMLElement | null} element The element to bring forward; nothing happens for null (an element not on the page yet).
 * @returns {void}
 */
export function bringIntoView(element) {
  element?.focus();
  element?.scrollIntoView({ block: "start" });
}
