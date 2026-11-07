<script setup lang="ts" generic="T">
import { computed, ref, useId } from "vue";
import { onClickOutside, useTimeoutFn } from "@vueuse/core";
import FloatingPanel from "./FloatingPanel.vue";
import PopupTransition from "./PopupTransition.vue";
import { fixedHeaderBottom } from "../js/fixedHeader.js";
import type { DropdownOption } from "../js/dropdownOption.js";

/**
 * A drop-down list that picks one option: the replacement for a native
 * <select>, whose look the browser controls (Firefox on Linux draws its
 * list with the system's widget, ignoring the site's colours and fonts).
 * Moved here from the Lifting App (2026-11-07) so every project uses the
 * same one. Inside a FormField, give the field `is-combobox` and bind its
 * attributes (see FormField).
 *
 * It follows the ARIA "select-only combobox" pattern, so it behaves like
 * a select for keyboard and screen reader alike:
 * - focus stays on the combobox; the highlighted option is announced
 *   through aria-activedescendant;
 * - closed: ↓, ↑, Enter or Space opens the list (Home/End open it at the
 *   first/last option); typing picks the matching option at once, as a
 *   native select does;
 * - open: ↑/↓/Home/End move the highlight, typing highlights the
 *   matching option, Enter or Space picks the highlighted option, Tab
 *   picks it and moves on, Escape closes without a change; the mouse
 *   moves the highlight too, a click picks an option, a click elsewhere
 *   closes.
 *
 * Typing works as in a native select: characters typed within half a
 * second of each other build one search ("ba" finds "Back Squat" past
 * "Bench Press"), and the same character typed again cycles through
 * the options that start with it ("3", "3" goes from "3-4" on to "3").
 *
 * An option with a `note` is set apart by a dashed border, in the list
 * and on the closed box while it is current (see DropdownOption).
 *
 * Opening, the list fades in (PopupTransition) and its options follow
 * one after another, 30ms apart, starting next to the box; the arrow
 * turns over while the list is open. Only the first six options are
 * staggered, so a long list (the exercise catalog) is still all there
 * within a fraction of a second. Every option works from the first
 * frame, faded or not.
 *
 * The list may grow as tall as the room on the roomier side of the box
 * (FloatingPanel opens it on whichever side it fits; above, the room
 * ends at the page's fixed header), so it scrolls only when the window is
 * too short for it.
 *
 * When `value` is none of the options (nothing chosen yet), the closed
 * box shows `placeholder` in muted text ("Choose…"), or nothing.
 *
 * Each option shows its label, unless the parent draws it through the
 * `option` slot (the Group drop-down adds a colour bar); the closed box
 * draws the current option the same way. Attributes given to it (title,
 * aria-describedby, a class) land on the combobox. It is named by a
 * visible label's id (`labelledBy`) or, with no visible label, by
 * `label`.
 *
 * It only reports: `change` carries the chosen option's value, and only
 * when it differs from `value`.
 */

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  /** Every option, in order. When `value` is none of them, the closed box is empty, as a native select's is. */
  options: readonly DropdownOption<T>[];
  /** The current option's value. */
  value: T;
  /** The combobox's id. */
  comboId: string;
  /** The id of the visible label that names it; or give `label`. */
  labelledBy?: string;
  /** Its accessible name, when there is no visible label to point at. */
  label?: string;
  /** Muted text in the closed box while `value` is none of the options ("Choose…"). */
  placeholder?: string;
  /** 'compact' (the default) for the plan's cards; 'regular' to match a full-size form's fields. */
  size?: "compact" | "regular";
}>();

const emit = defineEmits<{ (event: "change", value: T): void }>();

defineSlots<{
  /** How to draw one option (in the list, and in the closed box); its label by default. */
  option?(props: { option: DropdownOption<T> }): unknown;
}>();

const listId = useId();
const combobox = ref<HTMLElement | null>(null);
const list = ref<HTMLElement | null>(null);
const isOpen = ref(false);
/** The highlighted option's index, while the list is open. */
const activeIndex = ref(0);
/** The list is at least as wide as the closed box, measured when it opens. */
const listMinWidth = ref("");
/** The list may be as tall as the room beside the box, measured when it opens. */
const listMaxHeight = ref("");

/** FloatingPanel's gap from the box (4px) plus its margin from the window's edge (8px). */
const LIST_MARGIN_PX = 12;

/** The index of the current option; -1 when `value` is none of them. */
const selectedIndex = computed(() => props.options.findIndex((option) => option.value === props.value));

const selectedOption = computed(() => props.options[selectedIndex.value]);

/** The highlighted option's element id, for aria-activedescendant; undefined while closed. */
const activeOptionId = computed(() => {
  if (!isOpen.value) return undefined;
  return optionId(activeIndex.value);
});

function optionId(index: number): string {
  return `${listId}-${index}`;
}

/**
 * An option's place in the opening stagger, for its CSS: counted from
 * the top (`--fromTop`, for a list below the box) and from the bottom
 * (`--fromBottom`, for a list above it), so the options always appear
 * starting next to the box.
 */
function staggerPosition(index: number): Record<string, number> {
  const fromBottom = props.options.length - 1 - index;
  return { "--fromTop": index, "--fromBottom": fromBottom };
}

// ---- opening, moving, choosing ----------------------------------------------------------

/** Open the list with the given option highlighted (by default the current one, or the first when there is none). */
function open(highlightIndex: number = Math.max(selectedIndex.value, 0)): void {
  listMinWidth.value = `${combobox.value?.offsetWidth ?? 0}px`;
  listMaxHeight.value = `${roomForList()}px`;
  activeIndex.value = highlightIndex;
  isOpen.value = true;
}

/**
 * The room beside the box on its roomier side, above or below, less
 * FloatingPanel's gap and margin. The room above ends at the page's
 * fixed header, which would otherwise cover the top of the list.
 */
function roomForList(): number {
  const box = combobox.value?.getBoundingClientRect();
  const roomBelow = window.innerHeight - (box?.bottom ?? 0);
  const roomAbove = (box?.top ?? 0) - fixedHeaderBottom();
  const roomierSide = Math.max(roomBelow, roomAbove);
  return roomierSide - LIST_MARGIN_PX;
}

function close(): void {
  isOpen.value = false;
}

function toggleOpen(): void {
  if (isOpen.value) close();
  else open();
}

/** Move the highlight by `step`, stopping at either end (a select does not wrap). */
function moveHighlight(step: -1 | 1): void {
  const lastIndex = props.options.length - 1;
  const movedIndex = activeIndex.value + step;
  activeIndex.value = Math.min(Math.max(movedIndex, 0), lastIndex);
}

/** Pick an option: close, and report it if it is a change. */
function choose(index: number): void {
  close();
  const option = props.options[index];
  if (option === undefined || index === selectedIndex.value) return;
  emit("change", option.value);
}

function chooseHighlighted(): void {
  choose(activeIndex.value);
}

// ---- typing to search ----------------------------------------------------------------------

/** How long a pause ends a search, so the next character starts a new one (as in a native select). */
const SEARCH_PAUSE_MS = 500;

/** The characters typed so far in this search, lower-cased; '' between searches. */
let searchText = "";

// Restarted by every typed character; when it runs out, the search is over. (It stops itself on unmount.)
const searchPause = useTimeoutFn(
  () => {
    searchText = "";
  },
  SEARCH_PAUSE_MS,
  { immediate: false },
);

/** The character a key types, lower-cased; undefined for a named key (Shift, F5) or a shortcut (Ctrl+A). */
function typedCharacter(event: KeyboardEvent): string | undefined {
  const isShortcut = event.ctrlKey || event.metaKey || event.altKey;
  const isCharacter = event.key.length === 1;
  if (isShortcut || !isCharacter) return undefined;
  return event.key.toLowerCase();
}

/** True when every character of the text is the same one ("3", "33", "bbb"). */
function isOneCharacterRepeated(text: string): boolean {
  const firstCharacter = text[0];
  return [...text].every((character) => character === firstCharacter);
}

/**
 * The first option whose label starts with `prefix`, looking from
 * `fromIndex` onwards and going round to the top; undefined when none
 * does.
 */
function firstOptionStartingWith(prefix: string, fromIndex: number): number | undefined {
  const count = props.options.length;
  for (let step = 0; step < count; step++) {
    const index = (fromIndex + step) % count;
    const label = props.options[index]!.label.toLowerCase();
    if (label.startsWith(prefix)) return index;
  }
  return undefined;
}

/**
 * The option the search text finds, from the option that is current
 * (highlighted while open, chosen while closed):
 * - one character, or the same one repeated: the next option after the
 *   current one that starts with it, so repeating it cycles;
 * - anything longer: the first option from the current one on (itself
 *   included, so "b" then "ba" stays on "Back Squat") that starts with
 *   the whole text.
 */
function searchMatch(fromIndex: number): number | undefined {
  if (isOneCharacterRepeated(searchText)) {
    const character = searchText[0]!;
    return firstOptionStartingWith(character, fromIndex + 1);
  }
  const startIndex = Math.max(fromIndex, 0);
  return firstOptionStartingWith(searchText, startIndex);
}

/** A typed character joins the search; closed, the match is picked at once (as a native select does); open, it is highlighted. */
function typeCharacter(character: string): void {
  searchText += character;
  searchPause.start();
  const fromIndex = isOpen.value ? activeIndex.value : selectedIndex.value;
  const matchIndex = searchMatch(fromIndex);
  if (matchIndex === undefined) return;
  if (isOpen.value) activeIndex.value = matchIndex;
  else choose(matchIndex);
}

// ---- the keyboard -----------------------------------------------------------------------

/** What each key does while the list is closed. */
const KEYS_WHILE_CLOSED: Record<string, () => void> = {
  ArrowDown: () => open(),
  ArrowUp: () => open(),
  Enter: () => open(),
  " ": () => open(),
  Home: () => open(0),
  End: () => open(props.options.length - 1),
};

/** What each key does while the list is open. */
const KEYS_WHILE_OPEN: Record<string, () => void> = {
  ArrowDown: () => moveHighlight(1),
  ArrowUp: () => moveHighlight(-1),
  Home: () => (activeIndex.value = 0),
  End: () => (activeIndex.value = props.options.length - 1),
  Enter: chooseHighlighted,
  " ": chooseHighlighted,
  Tab: chooseHighlighted,
  Escape: close,
};

/** A key on the combobox: a named key from the table for its state, else a typed character. */
function onKeydown(event: KeyboardEvent): void {
  const keyTable = isOpen.value ? KEYS_WHILE_OPEN : KEYS_WHILE_CLOSED;
  const keyAction = keyTable[event.key];
  if (keyAction !== undefined) {
    const wasOpen = isOpen.value;
    keyAction();
    // Tab picks and moves on, so it keeps its default; every other key in the tables is ours alone.
    if (event.key !== "Tab") event.preventDefault();
    // Escape that closed the list is spent: a card or dialog around the drop-down must not also close.
    if (event.key === "Escape" && wasOpen) event.stopPropagation();
    return;
  }
  const character = typedCharacter(event);
  if (character === undefined) return;
  event.preventDefault();
  typeCharacter(character);
}

// A click on the combobox itself is its own to handle (it toggles the list).
onClickOutside(list, close, { ignore: [combobox] });
</script>

<template>
  <div
    v-bind="$attrs"
    :id="comboId"
    ref="combobox"
    class="dropdownSelect input"
    :class="{ compact: size !== 'regular', hasNote: selectedOption?.note !== undefined }"
    role="combobox"
    tabindex="0"
    aria-haspopup="listbox"
    :aria-labelledby="labelledBy"
    :aria-label="label"
    :aria-controls="listId"
    :aria-expanded="isOpen"
    :aria-activedescendant="activeOptionId"
    @click="toggleOpen"
    @keydown="onKeydown"
  >
    <span v-if="selectedOption" class="current">
      <slot name="option" :option="selectedOption">
        <span class="label">{{ selectedOption.label }}</span>
      </slot>
      <span v-if="selectedOption.note" class="visuallyHidden">, {{ selectedOption.note }}</span>
    </span>
    <span v-else-if="placeholder" class="placeholder label">{{ placeholder }}</span>
    <!-- The arrow a native select draws for itself, so it looks like a drop-down at a glance. -->
    <svg class="chevron" viewBox="0 0 10 6" width="10" height="6" aria-hidden="true" focusable="false">
      <path d="M1 1l4 4 4-4" />
    </svg>
  </div>
  <PopupTransition>
    <FloatingPanel v-if="isOpen && combobox" :anchor="combobox">
      <!-- mousedown.prevent: a click on an option must not take focus from the combobox. -->
      <ul
        :id="listId"
        ref="list"
        class="dropdownList"
        role="listbox"
        :aria-labelledby="labelledBy"
        :aria-label="label"
        :style="{ minWidth: listMinWidth, maxHeight: listMaxHeight }"
        @mousedown.prevent
      >
        <li
          v-for="(option, index) in options"
          :id="optionId(index)"
          :key="index"
          role="option"
          class="dropdownOption"
          :class="{ isActive: index === activeIndex, hasNote: option.note !== undefined }"
          :aria-selected="index === selectedIndex"
          :style="staggerPosition(index)"
          @mouseenter="activeIndex = index"
          @click="choose(index)"
        >
          <slot name="option" :option="option">{{ option.label }}</slot>
          <span v-if="option.note" class="visuallyHidden">, {{ option.note }}</span>
        </li>
      </ul>
    </FloatingPanel>
  </PopupTransition>
</template>

<style scoped>
/* The closed drop-down: the library's control look (.input), with its own arrow. */
.dropdownSelect {
  display: flex;
  align-items: center;
  gap: var(--spaceHalf);
  min-width: 0;
  cursor: pointer;
  user-select: none;
}

/* The current option, beside the arrow; it may shrink below its text. */
.current {
  display: flex;
  align-items: center;
  gap: var(--spaceHalf);
  min-width: 0;
}

/* A long label ("Strength Endurance" in a narrow box) is cut short with an ellipsis rather than pushing the arrow out. */
.label {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Nothing chosen yet: the hint reads as a hint, not a value. */
.placeholder {
  color: var(--textMuted);
}

.chevron {
  flex: none;
  margin-left: auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
  /* Turning back as the list closes: eases in, like everything leaving. */
  transition: transform var(--durationFast) var(--easeIn);
}

/* Open: the arrow turns over, easing out. */
.dropdownSelect[aria-expanded="true"] .chevron {
  transform: rotate(180deg);
  transition-timing-function: var(--easeOut);
}

/* Its max-height is set when it opens (roomForList). */
.dropdownList {
  margin: 0;
  padding: var(--spaceHalf);
  overflow-y: auto;
  list-style: none;
  background-color: var(--bgTop);
  border: solid 1px var(--borderMuted);
  border-radius: var(--radius);
}

/*
 * Opening, each option fades in and slides down 4px, 30ms after the one above it (--fromTop, set per option). The
 * delay stops growing after six options, so the whole list is there within about a third of a second. `both` keeps
 * an option hidden until its turn. Under reduced motion the global rule in base.css zeroes durations and delays.
 */
@keyframes optionIn {
  from {
    opacity: 0;
    transform: translateY(var(--optionShift));
  }
}

.dropdownOption {
  --optionShift: -4px;
  --staggerStep: 30ms;
  animation: optionIn var(--durationFast) var(--easeOut) both;
  animation-delay: calc(min(var(--fromTop), 6) * var(--staggerStep));
  display: flex;
  align-items: center;
  gap: var(--space1);
  /* 24px tall at least: the WCAG 2.2 AA minimum target size. */
  min-height: 1.5rem;
  padding: 0.1rem var(--space1);
  border-radius: var(--radius);
  font-size: var(--fontSizeSm);
  white-space: nowrap;
  cursor: pointer;
}

/* A list above the box staggers from the bottom up, rising into place, so it still starts next to the box. */
[data-side="above"] .dropdownOption {
  --optionShift: 4px;
  animation-delay: calc(min(var(--fromBottom), 6) * var(--staggerStep));
}

/* The highlighted option (keyboard or mouse: hovering moves the highlight, as in a native list): a soft wash of
   the accent, faint enough that anything drawn in an option (a group's colour bar) keeps its contrast. */
.dropdownOption.isActive {
  background-color: var(--accentSubtle);
}

/* An option with a note (the row's target), and the closed box while it is current: a dashed border, the one
   place the card uses one, so the two read as a pair. */
.dropdownOption.hasNote {
  outline: dashed 1px var(--borderFull);
  outline-offset: -1px;
}

.dropdownSelect.hasNote {
  border-style: dashed;
}

.dropdownOption[aria-selected="true"] {
  font-weight: 600;
}
</style>
