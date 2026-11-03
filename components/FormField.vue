<script setup lang="ts">
import { computed } from "vue";

/**
 * One labelled form field: the label, the control, and its hint, error or "Optional" note, wired together so assistive
 * technology reads them as one thing.
 *
 * The control itself (an <input>, <select>, <textarea> or DropdownSelect) is passed in as the slot, so the parent keeps
 * v-model, the control type and its own attributes. The slot receives the attributes that connect the control to this
 * component; spread them onto the control with v-bind:
 *
 *   <FormField id="city" label="City" :error="visibleError('city')" v-slot="field">
 *     <input v-bind="field" v-model="values.city" type="text" class="input" />
 *   </FormField>
 *
 * What the attributes do:
 *   - `id` matches the label's `for`, so the label names the control (and clicking it focuses the control);
 *   - `aria-invalid` is "true" while an error is showing, which also draws the red outline (the library's .input reads it);
 *   - `aria-describedby` points at the hint and the error (or the "Optional" note), so they are read after the label;
 *   - `data-field` lets a form find the control to focus it (the first invalid field after "continue").
 *
 * A custom drop-down (DropdownSelect) is a combobox, not a form control, so a <label for> cannot name it. Give `isCombobox`
 * and the label becomes a plain element with an id, the attributes gain `labelledBy` (pointing at it, and filling
 * DropdownSelect's prop of that name), and a click on the label focuses the drop-down, as it would a <select>:
 *
 *   <FormField id="movement" label="Movement" is-combobox v-slot="field">
 *     <DropdownSelect v-bind="field" :combo-id="field.id" :options="…" … />
 *   </FormField>
 */

/** The attributes the control inside a FormField must receive; spread them with v-bind. */
interface FieldControlAttributes {
  id: string;
  "data-field": string;
  "aria-invalid"?: "true";
  "aria-describedby"?: string;
  /** With `isCombobox`: the label's id, which names the combobox. */
  labelledBy?: string;
}

const props = defineProps<{
  /** The control's id. It is also the field's name in the form (for example "firstName"). */
  id: string;
  /** The visible label text. */
  label: string;
  /** The error message to show, or "" (or nothing) when there is none. */
  error?: string;
  /** Shows a small "Optional" note under the control while there is no error. */
  optional?: boolean;
  /** Explanatory text under the control, read with it (e.g. what the chosen option means). */
  hint?: string;
  /**
   * Hides the label from sight but keeps it for assistive technology, for a control whose purpose is already clear from its
   * placeholder and the heading above it (a free-text box).
   */
  hideLabel?: boolean;
  /** The control is a custom combobox (DropdownSelect): it is named by the label's id instead of <label for>. */
  isCombobox?: boolean;
}>();

defineSlots<{
  /** The control (<input>, <select>, <textarea> or a DropdownSelect); bind the received attributes onto it. */
  default(attributes: FieldControlAttributes): unknown;
}>();

/** The ids of the elements that name and describe the control, derived from the control's own id. */
const labelId = computed(() => `${props.id}-label`);
const hintId = computed(() => `${props.id}-hint`);
const errorId = computed(() => `${props.id}-error`);
const optionalNoteId = computed(() => `${props.id}-optional`);

const hasHint = computed(() => Boolean(props.hint));
const hasError = computed(() => Boolean(props.error));
const showsOptionalNote = computed(() => props.optional === true && !hasError.value);

/** Everything describing the control, in reading order: the hint, then the error or "Optional". */
const describedBy = computed<string | undefined>(() => {
  const ids: string[] = [];
  if (hasHint.value) ids.push(hintId.value);
  if (hasError.value) ids.push(errorId.value);
  else if (showsOptionalNote.value) ids.push(optionalNoteId.value);
  return ids.length > 0 ? ids.join(" ") : undefined;
});

const controlAttributes = computed<FieldControlAttributes>(() => ({
  id: props.id,
  "data-field": props.id,
  "aria-invalid": hasError.value ? "true" : undefined,
  "aria-describedby": describedBy.value,
  labelledBy: props.isCombobox ? labelId.value : undefined,
}));

/** A click on a combobox's label: focus the combobox, as a click on a <label for> focuses its control. */
function focusControl(): void {
  document.querySelector<HTMLElement>(`[data-field="${props.id}"]`)?.focus();
}
</script>

<template>
  <div class="field">
    <!-- A combobox is named by the label's id; a click on the label still focuses it, as on a native control. -->
    <span v-if="isCombobox" :id="labelId" class="fieldLabel" :class="{ visuallyHidden: hideLabel }" @click="focusControl">{{
      label
    }}</span>
    <label v-else class="fieldLabel" :class="{ visuallyHidden: hideLabel }" :for="id">{{ label }}</label>
    <slot v-bind="controlAttributes" />
    <span v-if="hasHint" :id="hintId" class="fieldNote fieldHint">{{ hint }}</span>
    <span v-if="hasError" :id="errorId" class="fieldError">{{ error }}</span>
    <span v-else-if="showsOptionalNote" :id="optionalNoteId" class="fieldNote">Optional</span>
  </div>
</template>

<style scoped>
/* A hint is explanation, not a side note: upright, like body text. */
.fieldHint {
  font-style: normal;
}
</style>
