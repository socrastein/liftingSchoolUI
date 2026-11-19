<script setup lang="ts">
import { computed, ref, useId } from "vue";
import searchIcon from "../icons/search.svg";
import clearIcon from "../icons/x.svg";

/**
 * A search bar on a card, the way every search in the business's sites and apps looks: on the card a "Showing 12 of 66 studies"
 * line (announced politely, so a screen reader hears the new count after each change), then the search box with a magnifying
 * glass at its start, an x at its end while there is text, and no visible label. A `hint` says what the search covers, under the box
 * where it is always fully visible and stays while typing (a placeholder is cut off on a phone and gone once typing starts),
 * and the box is described by it. The default slot is for what a page adds under the box (more options). `v-model` is the search text; the page does the filtering and passes the counts.
 */
const searchText = defineModel<string>({ required: true });

const props = withDefaults(
  defineProps<{
    /** How many results the search leaves. */
    shown: number;
    /** How many there are with nothing searched; equal to `shown` it still reads "Showing 66 of 66 studies". */
    total: number;
    /** What the results are, plural: "studies". */
    noun: string;
    /** The same, singular: "study". Used when `total` is 1. */
    nounOne: string;
    /** The input's accessible name, such as "Search studies"; the box has no visible label. */
    label: string;
    placeholder?: string;
    /** What the search covers, shown under the box, such as "Search by name, muscle group, or movement." Optional. */
    hint?: string;
  }>(),
  { placeholder: "Search" },
);

defineSlots<{
  /** Under the search box, inside the card; nothing is drawn when it is empty. */
  default?(): unknown;
}>();

const countLine = computed(() => {
  const noun = props.total === 1 ? props.nounOne : props.noun;
  return `Showing ${props.shown} of ${props.total} ${noun}`;
});

/** The icons as masks, in quotes: an icon's inlined address holds quote marks of its own, which would end an unquoted `url(...)`. */
const searchIconStyle = { maskImage: `url("${searchIcon}")` };
const clearIconStyle = { maskImage: `url("${clearIcon}")` };

const input = ref<HTMLInputElement>();
/** The hint's id, so the box can name it as its description. */
const hintId = useId();

/** Empties the box and keeps the person typing: focus goes back to the input, which the pressed button would otherwise keep. */
function clearSearch(): void {
  searchText.value = "";
  input.value?.focus();
}
</script>

<template>
  <div class="card searchCard">
    <!-- The one element that stays put as the results change, so its polite announcements keep working -->
    <p role="status" class="fieldNote searchCount">{{ countLine }}</p>
    <div class="searchBox">
      <!-- Decorative: the input's own label names it. A mask, so the icon takes the text colour in both themes. -->
      <span class="searchIcon" aria-hidden="true" :style="searchIconStyle" />
      <input
        ref="input"
        v-model="searchText"
        class="input searchInput"
        type="search"
        :aria-label="label"
        :placeholder="placeholder"
        :aria-describedby="hint ? hintId : undefined"
        autocomplete="off"
      />
      <button v-if="searchText !== ''" type="button" class="searchClear" aria-label="Clear search" @click="clearSearch">
        <span class="searchClearIcon" aria-hidden="true" :style="clearIconStyle" />
      </button>
    </div>
    <p v-if="hint" :id="hintId" class="fieldNote searchHint">{{ hint }}</p>
    <slot />
  </div>
</template>

<style scoped>
/* The notes' own top margins would double the card's gap */
.searchCount,
.searchHint {
  margin: 0;
}

.searchCard {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
  padding: var(--space2);
}

/* The magnifying glass sits inside the box's start edge; the text starts after it, so it never runs under the icon */
.searchBox {
  --searchIconSize: 1.25rem;
  position: relative;
}

.searchIcon {
  position: absolute;
  inset-inline-start: var(--space1);
  top: 50%;
  width: var(--searchIconSize);
  height: var(--searchIconSize);
  transform: translateY(-50%);
  background-color: var(--textMuted);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
  pointer-events: none;
}

.searchInput {
  padding-inline-start: calc(var(--space1) + var(--searchIconSize) + var(--space1));
  padding-inline-end: calc(var(--space1) + var(--searchIconSize) + var(--space1));
}

/* The input's own clear control (WebKit draws one for type="search"): ours is the only one */
.searchInput::-webkit-search-cancel-button {
  appearance: none;
  display: none;
}

/* A button the size of the icon plus its air, so the tap target is bigger than the x itself */
.searchClear {
  position: absolute;
  inset-inline-end: 0;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: calc(var(--searchIconSize) + var(--space2));
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: none;
  cursor: pointer;
}

.searchClearIcon {
  width: var(--searchIconSize);
  height: var(--searchIconSize);
  background-color: var(--textMuted);
  mask-repeat: no-repeat;
  mask-position: center;
  mask-size: contain;
}

.searchClear:hover .searchClearIcon {
  background-color: var(--textFull);
}
</style>
