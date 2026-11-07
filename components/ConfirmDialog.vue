<script lang="ts">
/** One answer of a several-choice question: what its button says, and what `confirm` reports. */
export interface DialogChoice {
  value: string;
  label: string;
}
</script>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from "vue";

/**
 * A question that has to be answered before anything else on the page can be used: "Delete Sam and all their history?
 * Cancel / Delete client". Used before something that cannot be taken back. The parent shows it with v-if (it opens at once)
 * and removes it on either answer; this component never closes itself in response to a button.
 *
 * It is the browser's own modal <dialog> (opened with showModal), which does the focus work for free: the rest of the page
 * cannot be reached with Tab or a screen reader while it is open, and Escape fires the dialog's "cancel" event. On top of that:
 * - it is named by its question (aria-labelledby), as an alertdialog, and described by its `detail` when there is one
 *   (aria-describedby), so a screen reader reads the question, then what answering yes will do;
 * - focus starts on Cancel, the safe answer, so Enter on a reflex does no harm (with several choices, Cancel is the last
 *   button, and focus still starts there);
 * - the confirm button names the action ("Delete client"), never "OK";
 * - Escape or a click on the dimmed page around the card answers "cancel";
 * - on closing, focus goes back to what had it before (the button that opened the question), if that still exists. After
 *   "confirm" the opener is often gone (a deleted row's button), so the parent moves focus on purpose.
 * It is also drawn in the top layer, so no z-index can put the header or a heading in front of it.
 *
 * When the question needs explaining (what exactly will be lost, or what will replace it), pass `detail`: a second paragraph
 * under the question ("The backup holds 12 studies. It will replace the current 3. This cannot be undone."). The question
 * stays short enough to read at a glance; the detail carries the facts.
 *
 * When the action can reach more or less far ("this week only", "every week"), pass `choices` instead of `confirmLabel`: each
 * becomes its own button, stacked, and `confirm` reports which one was chosen.
 */

const props = withDefaults(
  defineProps<{
    /** The question, e.g. "Delete Sam and all their history?" */
    question: string;
    /** What answering yes will do, shown under the question, e.g. "Their 40 workouts go too. This cannot be undone." */
    detail?: string;
    /** The words on the single button that goes ahead, which should say what it does ("Replace"). Ignored with `choices`. */
    confirmLabel?: string;
    /** Several confirm buttons instead of one, in order. */
    choices?: DialogChoice[];
  }>(),
  { detail: undefined, confirmLabel: "Confirm", choices: undefined },
);

const emit = defineEmits<{
  /** `value` is the chosen choice's value; undefined for the single confirm button. */
  (event: "confirm", value?: string): void;
  (event: "cancel"): void;
}>();

const dialog = ref<HTMLDialogElement | null>(null);
const cancelButton = ref<HTMLButtonElement | null>(null);

/** Names the dialog by its question, so a screen reader reads the question when focus arrives. */
const questionId = useId();

/** Describes the dialog by its detail, read after the question. */
const detailId = useId();

/** Where focus was before the dialog opened, to give it back afterwards. */
let previouslyFocused: HTMLElement | null = null;

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.value?.showModal();
  cancelButton.value?.focus();
});

// Closing it before it is removed is what hands focus back to the opener; a dialog that is just removed does not
onBeforeUnmount(() => {
  dialog.value?.close();
  previouslyFocused?.focus();
});

/** Escape: the browser fires "cancel"; stop it closing the dialog itself and let the parent decide. */
function onCancelEvent(event: Event): void {
  event.preventDefault();
  emit("cancel");
}

/** A click on the dim area around the card answers "cancel". The card fills the dialog, so only the backdrop is the dialog itself. */
function onDialogClick(event: MouseEvent): void {
  const clickedBackdrop = event.target === dialog.value;
  if (clickedBackdrop) {
    emit("cancel");
  }
}
</script>

<template>
  <dialog
    ref="dialog"
    class="confirmDialog"
    role="alertdialog"
    :aria-labelledby="questionId"
    :aria-describedby="props.detail ? detailId : undefined"
    @cancel="onCancelEvent"
    @click="onDialogClick"
  >
    <div class="card confirmCard">
      <p :id="questionId" class="question">{{ props.question }}</p>
      <p v-if="props.detail" :id="detailId" class="detail">{{ props.detail }}</p>
      <div v-if="props.choices" class="buttons stacked">
        <button
          v-for="choice in props.choices"
          :key="choice.value"
          type="button"
          class="btn btnDanger confirmButton"
          :data-choice="choice.value"
          @click="emit('confirm', choice.value)"
        >
          {{ choice.label }}
        </button>
        <button ref="cancelButton" type="button" class="btn btnSecondary cancelButton" @click="emit('cancel')">Cancel</button>
      </div>
      <div v-else class="buttons">
        <button ref="cancelButton" type="button" class="btn btnSecondary cancelButton" @click="emit('cancel')">Cancel</button>
        <button type="button" class="btn btnDanger confirmButton" @click="emit('confirm')">{{ props.confirmLabel }}</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/* The browser draws a dialog with its own border, padding and background; here the card inside it is the visible part */
.confirmDialog {
  width: min(90vw, 24rem);
  max-width: none;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  overflow: visible;
}

.confirmDialog::backdrop {
  background-color: var(--scrim);
}

.confirmCard {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
  padding: var(--space2);
}

/*
 * Opening: the card fades in and slides down 4px (like a popup), while the dimming fades in beside it. Only opening is
 * animated. The parent unmounts the dialog the moment it is answered, so there is no closing to animate (and Firefox cannot
 * animate a <dialog> closing anyway). Plain keyframes work here because showModal() makes the dialog render, which starts
 * them. Under reduced motion the library's global rule makes both near instant.
 */
.confirmDialog[open] {
  animation: dialogIn var(--duration) var(--easeOut);
}

.confirmDialog[open]::backdrop {
  animation: backdropIn var(--duration) var(--easeOut);
}

@keyframes dialogIn {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@keyframes backdropIn {
  from {
    opacity: 0;
  }
}

.question {
  margin: 0;
  color: var(--textFull);
  text-align: center;
}

/* The facts under the question: the ordinary text size, so the question above stays the first thing read */
.detail {
  margin: 0;
  color: var(--textFull);
  font-size: var(--fontSizeMd);
  text-align: center;
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--space2);
}

/* Several choices: one per line, full width, Cancel last (in the markup too, so focus order matches). */
.buttons.stacked {
  flex-direction: column;
  align-items: stretch;
}
</style>
