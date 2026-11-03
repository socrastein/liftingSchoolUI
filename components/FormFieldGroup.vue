<script setup lang="ts">
import { computed, useId } from "vue";

/**
 * A group of related choices (a set of radio buttons or checkboxes) under one question.
 *
 * It is a <fieldset> with a <legend>, which is how assistive technology learns that the controls belong together: a screen
 * reader announces the legend as well as each option's label ("Primary muscles, Quads, checkbox"), where a plain <label>
 * above the options would be read once or not at all.
 *
 * Put the options in the slot. Like FormField, it can show an "Optional" note or an error, which the group is described by.
 * Give it an `id` and a form can move focus to the group after a failed submit (it becomes focusable from code, but is not a
 * Tab stop).
 */

const props = defineProps<{
  /** The group's name in the form; makes it focusable by a form's "focus the first problem" step (`data-field`). */
  id?: string;
  /** The question, shown above the options and announced with each of them. */
  legend: string;
  /** The error message to show, or "" (or nothing) when there is none. */
  error?: string;
  /** Shows a small "Optional" note under the options. */
  optional?: boolean;
  /** Draws the group as a padded box, for long lists of checkboxes. */
  boxed?: boolean;
}>();

defineSlots<{
  /** The options: the group's radio buttons or checkboxes. */
  default(): unknown;
}>();

/** Unique ids for the "Optional" note and the error, so the fieldset can point at them. */
const optionalNoteId = useId();
const errorId = useId();

/** What describes the group: its error, or else its "Optional" note. */
const describedBy = computed<string | undefined>(() => {
  if (props.error) return errorId;
  if (props.optional) return optionalNoteId;
  return undefined;
});
</script>

<template>
  <div class="field" :class="{ panel: boxed, fieldBoxed: boxed }">
    <fieldset :aria-describedby="describedBy" :data-field="id" :tabindex="id ? -1 : undefined">
      <legend class="fieldLabel">{{ legend }}</legend>
      <slot />
      <span v-if="error" :id="errorId" class="fieldError">{{ error }}</span>
      <span v-else-if="optional" :id="optionalNoteId" class="fieldNote">Optional</span>
    </fieldset>
  </div>
</template>

<style scoped>
/* A fieldset has a border, padding and a minimum width by default; here it is only a wrapper for its legend. */
fieldset {
  border: none;
  margin: 0;
  padding: 0;
  min-width: 0;
}

/* The browser indents a legend by a couple of pixels; the label look has none. */
legend {
  padding: 0;
}

/* A boxed group is the library's .panel (the look); this is only its room. The room below it is .field's. */
.fieldBoxed {
  padding: var(--space2);
}
</style>
