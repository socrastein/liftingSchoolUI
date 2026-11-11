<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId } from "vue";
import { onClickOutside } from "@vueuse/core";
import FloatingPanel from "./FloatingPanel.vue";

/**
 * A small card that opens next to the button that opened it, like a comment in a spreadsheet: a heading, a button that closes
 * it, and whatever the slot holds (a set's note, the weight log's edit form).
 *
 * It is a non-modal dialog (role="dialog", named by its heading), drawn beside the button by FloatingPanel: right after the
 * button in Tab order, never cut off by a scrolling box, above the button when there is no room below.
 *
 * On opening, focus goes to the first field inside (or, with none, to the close button). It closes (emitting `close`) on
 * Escape or the close button, which put focus back on the button; and on a click elsewhere or Tab past its end, which leave
 * focus where the person put it. The card itself takes focus (tabindex -1, never a Tab stop), so a click on its blank space
 * stays inside: otherwise focus would go to the nearest focusable thing around it (a scrolling box it opened in, say), and
 * the card would close as if Tabbed out of. What closing means (saving, or throwing the changes away) is the parent's: the parent that
 * saves on `close` gives the close button the label "Done", one that has a Save button of its own labels it "Cancel".
 */

const props = withDefaults(
  defineProps<{
    /** The button that opened the card; the card is drawn beside it. */
    anchor: HTMLElement;
    /** The card's heading, which also names the dialog, e.g. "Edit the weigh-in from Oct 25, 2026". */
    heading: string;
    /** The words on the button that closes the card. */
    closeLabel?: string;
  }>(),
  { closeLabel: "Done" },
);

const emit = defineEmits<{ (event: "close"): void }>();

const headingId = useId();
const card = ref<HTMLElement | null>(null);

// ---- focus and closing ------------------------------------------------------------------

/** On opening, focus the first field in the card; a card with no field focuses its first button (the close button). */
onMounted(async () => {
  await nextTick();
  const firstField = card.value?.querySelector<HTMLElement>("textarea, input, select");
  const firstButton = card.value?.querySelector<HTMLElement>("button");
  const focusTarget = firstField ?? firstButton;
  focusTarget?.focus();
});

/** Escape or the close button: close, and put focus back on the button that opened the card. */
function closeToAnchor(): void {
  emit("close");
  props.anchor.focus();
}

/** Focus moved somewhere outside the card (Tab past its end): close, leaving focus there. */
function closeIfFocusLeft(event: FocusEvent): void {
  const nextFocus = event.relatedTarget as Node | null;
  const isStillInCard = nextFocus !== null && card.value?.contains(nextFocus) === true;
  const isOnAnchor = nextFocus === props.anchor;
  if (!isStillInCard && !isOnAnchor && nextFocus !== null) {
    emit("close");
  }
}

/** A click elsewhere: close, leaving focus where the click put it. */
function closeFromOutside(): void {
  emit("close");
}

/** The card's button, as a ref: a click on it is the button's to handle (it toggles the card). */
const anchorElement = computed(() => props.anchor);
onClickOutside(card, closeFromOutside, { ignore: [anchorElement] });
</script>

<template>
  <FloatingPanel :anchor="anchor">
    <div
      ref="card"
      class="card anchoredCard"
      role="dialog"
      tabindex="-1"
      :aria-labelledby="headingId"
      @keydown.esc.stop="closeToAnchor"
      @focusout="closeIfFocusLeft"
    >
      <div class="anchoredHeader">
        <!-- Not an <h2>…<h6>: the card opens anywhere, so it must not break the page's heading outline. -->
        <p :id="headingId" class="anchoredHeading">{{ heading }}</p>
        <button type="button" class="btn btnSecondary btnSm" @click="closeToAnchor">{{ closeLabel }}</button>
      </div>
      <slot :heading-id="headingId" />
    </div>
  </FloatingPanel>
</template>

<style scoped>
.anchoredCard {
  display: flex;
  flex-direction: column;
  gap: var(--space1);
  width: min(20rem, calc(100vw - 2rem));
  padding: var(--space1);
  text-align: left;
  white-space: normal;
}

.anchoredHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space1);
}

.anchoredHeading {
  margin: 0;
  font-size: var(--fontSizeSm);
  font-weight: 600;
}
</style>
