<script setup lang="ts">
import { nextTick, ref, useId } from "vue";
import { onClickOutside } from "@vueuse/core";
import FloatingPanel from "./FloatingPanel.vue";
import PopupTransition from "./PopupTransition.vue";

/**
 * A ⋮ button that opens a short list of actions: the usual "more actions" menu, for actions used too rarely to earn space of
 * their own (move, remove, edit, delete). The slot holds the actions as buttons (give each the shared `.menuItem` class);
 * clicking any of them closes the list, and the action itself is the parent's.
 *
 * It is a disclosure (a button that shows more buttons), not an ARIA menu: a few buttons need no arrow-key handling, and Tab
 * reaches them in order. On opening, focus goes to the first usable action. Escape closes it and puts focus back on ⋮; a click
 * elsewhere or Tab past its end closes it and leaves focus there. The list is a FloatingPanel, so a scrolling box around ⋮
 * never cuts it off.
 *
 * The ⋮ button is as small as the WCAG 2.2 AA target size allows (24 × 24 CSS px), to fit a crowded row. A project that wants
 * a bigger target sets `--actionsToggleWidth` and `--actionsToggleHeight` on the menu's parent.
 */

defineProps<{
  /** The ⋮ button's accessible name, naming what the actions act on: "Actions for Back Squat". */
  label: string;
  /** The ⋮ button's id, so a parent can put focus back on it after an action. */
  toggleId: string;
}>();

defineSlots<{
  /** The actions, as buttons with the `.menuItem` class. */
  default(): unknown;
}>();

const listId = useId();
const toggle = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);
const isOpen = ref(false);

/** A click on ⋮: open the list, or close it when it is already open. */
function toggleOpen(): void {
  if (isOpen.value) {
    close();
  } else {
    void open();
  }
}

/** Open the list and focus its first usable action. */
async function open(): Promise<void> {
  isOpen.value = true;
  await nextTick();
  const firstUsableButton = list.value?.querySelector<HTMLButtonElement>("button:not(:disabled)");
  firstUsableButton?.focus();
}

/** Hide the list, leaving focus where it is. */
function close(): void {
  isOpen.value = false;
}

/** Escape: close, and put focus back on ⋮. */
function closeToToggle(): void {
  close();
  toggle.value?.focus();
}

/** Any action clicked: close the list (the action's own click handler does the work). */
function closeAfterAction(event: MouseEvent): void {
  const clickedButton = (event.target as Element).closest("button");
  if (clickedButton !== null) {
    close();
  }
}

/** Focus moved somewhere outside the list (Tab past its end): close, leaving focus there. */
function closeIfFocusLeft(event: FocusEvent): void {
  const nextFocus = event.relatedTarget as Node | null;
  const isStillInList = nextFocus !== null && list.value?.contains(nextFocus) === true;
  const isOnToggle = nextFocus === toggle.value;
  const isMovingOutsideMenu = !isStillInList && !isOnToggle;
  // Focus going nowhere (null) is a click on something unfocusable; onClickOutside handles that case below
  const isGoingNowhere = nextFocus === null;
  if (isMovingOutsideMenu && !isGoingNowhere) {
    close();
  }
}

// A click on ⋮ itself is its own to handle (it toggles the list).
onClickOutside(list, close, { ignore: [toggle] });
</script>

<template>
  <button
    :id="toggleId"
    ref="toggle"
    type="button"
    class="btnGhost actionsToggle"
    :aria-label="label"
    :aria-expanded="isOpen"
    :aria-controls="listId"
    @click="toggleOpen"
  >
    <svg viewBox="0 0 4 16" width="4" height="16" aria-hidden="true" focusable="false">
      <circle cx="2" cy="2.5" r="1.75" />
      <circle cx="2" cy="8" r="1.75" />
      <circle cx="2" cy="13.5" r="1.75" />
    </svg>
  </button>
  <PopupTransition>
    <FloatingPanel v-if="isOpen && toggle" :anchor="toggle">
      <div
        :id="listId"
        ref="list"
        class="menu actionsList"
        @keydown.esc.stop="closeToToggle"
        @focusout="closeIfFocusLeft"
        @click="closeAfterAction"
      >
        <slot />
      </div>
    </FloatingPanel>
  </PopupTransition>
</template>

<style scoped>
.actionsToggle {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  /* 24 × 24 CSS px is the WCAG 2.2 AA minimum target size; a project can ask for more (see the component's comment). */
  min-width: var(--actionsToggleWidth, 1.5rem);
  min-height: var(--actionsToggleHeight, 1.5rem);
}

/* The three dots are drawn in whatever colour the button has */
.actionsToggle svg {
  fill: currentColor;
}

/* The list is the library's .menu and each action a .menuItem (given by the slot's buttons); an action's words stay on one
   line. :deep, because the actions are the slot's buttons. */
.actionsList :deep(.menuItem) {
  white-space: nowrap;
}
</style>
