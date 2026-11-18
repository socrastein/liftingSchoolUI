import { onClickOutside } from "@vueuse/core";
import { ref, type Ref } from "vue";
import { closeWhenHeaderFormChanges } from "./useHeaderFit";

/** What a header popup's template needs: whether it is open, the two elements to bind with `ref`, and how to close it. */
export interface HeaderPopup {
  /** Whether the popup is showing. */
  isOpen: Ref<boolean>;
  /** Bind to the element holding both the button and the popup: a click outside it closes the popup. */
  root: Ref<HTMLElement | null>;
  /** Bind to the button that opens the popup: Escape hands focus back to it. */
  toggle: Ref<HTMLButtonElement | null>;
  /** Closes the popup without touching focus (a row was chosen, or a click landed elsewhere). */
  close: () => void;
  /** Escape: closes the popup and hands focus back to the button, so the keyboard is not lost. */
  closeFromKeyboard: () => void;
}

/**
 * How a popup under a header button opens and closes, shared by the header's drop-downs (Tools, Clients) and the
 * notifications bell so they behave alike: it closes when a row is chosen (the caller calls `close`), on a click anywhere
 * else (which is also what closes it when another popup is opened), on Escape (which puts focus back on the button) and when
 * the header switches between its wide row and its phone menu.
 */
export function useHeaderPopup(): HeaderPopup {
  const isOpen = ref(false);
  const root = ref<HTMLElement | null>(null);
  const toggle = ref<HTMLButtonElement | null>(null);

  function close(): void {
    isOpen.value = false;
  }

  function closeFromKeyboard(): void {
    close();
    toggle.value?.focus();
  }

  onClickOutside(root, close);
  // When the header switches between its wide row and its phone menu, a popup left open would hang under a form that is gone
  closeWhenHeaderFormChanges(close);

  return { isOpen, root, toggle, close, closeFromKeyboard };
}
