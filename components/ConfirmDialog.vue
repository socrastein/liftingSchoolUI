<script lang="ts">
/**
 * How a confirm button looks. "danger" (the default) is for something that deletes, removes or ends something; "primary" is
 * for something that sends, copies or applies something that can be redone. Cancel is always the quiet secondary button.
 */
export type ConfirmTone = "danger" | "primary";

/** One answer of a several-choice question: what its button says, and what `confirm` reports. */
export interface DialogChoice {
  value: string;
  label: string;
  /** How this button looks; "danger" when left out, so a caller that says nothing looks as it always did. */
  confirmTone?: ConfirmTone;
}

/** What every question has: its words, and what answering yes will do. */
interface QuestionProps {
  /** The question, e.g. "Delete Sam and all their history?" */
  question: string;
  /** What answering yes will do, shown under the question, e.g. "Their 40 workouts go too. This cannot be undone." */
  detail?: string;
}

/** A question with one button that goes ahead: its words are required, so no dialog can fall back to a vague "Confirm". */
interface OneConfirmProps extends QuestionProps {
  /** The words on the button that goes ahead, saying what it does ("Delete Client", "Replace Weigh-Ins"). */
  confirmLabel: string;
  /** How the button looks; "danger" when left out. Use "primary" for a harmless confirmation ("Send Food Log", "Paste"). */
  confirmTone?: ConfirmTone;
  choices?: undefined;
}

/** A question with several confirm buttons instead of one, each named by its own label. */
interface SeveralChoicesProps extends QuestionProps {
  /** The confirm buttons, in order. */
  choices: DialogChoice[];
  confirmLabel?: undefined;
  confirmTone?: undefined;
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
 * - the confirm button names the action ("Delete client"), never "OK" or "Confirm": a caller must pass `confirmLabel` or
 *   `choices`, and the type checker refuses a dialog with neither;
 * - Escape or a click on the dimmed page around the card answers "cancel";
 * - on closing, focus goes back to what had it before (the button that opened the question), if that still exists. After
 *   "confirm" the opener is often gone (a deleted row's button), so the parent moves focus on purpose.
 * It is also drawn in the top layer, so no z-index can put the header or a heading in front of it.
 *
 * When the question needs explaining (what exactly will be lost, or what will replace it), pass `detail`: a second paragraph
 * under the question ("The backup holds 12 studies. It will replace the current 3. This cannot be undone."). The question
 * stays short enough to read at a glance; the detail carries the facts.
 *
 * The confirm button is red (danger) unless the caller passes `confirm-tone="primary"` (or a choice's `confirmTone`): red says
 * "this deletes, removes or ends something", so a harmless confirmation (send, copy, apply) is primary instead. Cancel stays
 * secondary and first to take focus either way.
 *
 * When the action can reach more or less far ("this week only", "every week"), pass `choices` instead of `confirmLabel`: each
 * becomes its own button, stacked, and `confirm` reports which one was chosen.
 */

const props = defineProps<OneConfirmProps | SeveralChoicesProps>();

/** The button class that draws each tone: the library's own danger and primary buttons. */
const BUTTON_CLASS_BY_TONE: Record<ConfirmTone, string> = {
  danger: "btnDanger",
  primary: "btnPrimary",
};

/** The class for a confirm button of this tone; a missing tone is "danger", what every dialog was before tones existed. */
function confirmButtonClass(tone: ConfirmTone | undefined): string {
  return BUTTON_CLASS_BY_TONE[tone ?? "danger"];
}

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
          class="btn confirmButton"
          :class="confirmButtonClass(choice.confirmTone)"
          :data-choice="choice.value"
          @click="emit('confirm', choice.value)"
        >
          {{ choice.label }}
        </button>
        <button ref="cancelButton" type="button" class="btn btnSecondary cancelButton" @click="emit('cancel')">Cancel</button>
      </div>
      <div v-else class="buttons">
        <button ref="cancelButton" type="button" class="btn btnSecondary cancelButton" @click="emit('cancel')">Cancel</button>
        <button type="button" class="btn confirmButton" :class="confirmButtonClass(props.confirmTone)" @click="emit('confirm')">
          {{ props.confirmLabel }}
        </button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/*
 * Centring. A modal <dialog> is centred only by the browser's own `margin: auto`, which any ordinary rule of a consumer
 * overrides: a parent's scoped `.stack > * { margin: 0 }` has the specificity (0,2,0) (its class plus Vue's data-v
 * attribute) and an author rule beats the browser's, so the dialog was drawn pinned to the top left corner.
 * So the dialog does not depend on its margin to be centred. It is the whole window (fixed, every inset 0, transparent), and
 * the card inside is centred in it by the grid, where a consumer's `> *` rule cannot reach it (it is a grandchild). The
 * dialog's own box rules repeat the class so they out-rank such a rule without !important: (0,3,0) against (0,2,0). A rule
 * as strong as that deep selector could still win, but with no margin to lose, a stray margin only shrinks the window-sized
 * box evenly instead of moving the card.
 * Why not <Teleport to="body">: it would also keep a parent's rules away, but the Nuxt site renders pages on the server
 * and a body teleport has no target there (hydration mismatch), and it moves the markup out of the parent's wrapper, which
 * breaks consumers' tests that look inside it. Why not both: the teleport's cost buys nothing the grid does not.
 * Overflow: padding keeps the card off the window's edge, and `overflow: auto` plus the card's `margin: auto` (which, unlike
 * `align-items: center`, never pushes the overflow above the top) let a card taller than a short window scroll, whole.
 */
.confirmDialog.confirmDialog {
  position: fixed;
  inset: 0;
  width: auto;
  height: auto;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: var(--space2);
  border: none;
  background: transparent;
  color: inherit;
  overflow: auto;
}

/* Only while open: a display value set on the element itself would show it when closed */
.confirmDialog.confirmDialog[open] {
  display: grid;
}

.confirmDialog::backdrop {
  background-color: var(--scrim);
}

.confirmCard {
  /* Centred both ways by the auto margins in the dialog's grid; the card's own width, not the dialog's */
  width: min(90vw, 24rem);
  margin: auto;
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
.confirmDialog.confirmDialog[open] {
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
