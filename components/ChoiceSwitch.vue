<script setup lang="ts" generic="Value">
/**
 * A row of choices shown side by side (the `.segmented` look), one of them on: Add / Remove, lbs / kg, Open / All,
 * 7D / 30D / 90D / All. Each choice is a toggle button whose pressed state (aria-pressed) says whether it is the one on, and
 * the group's label names what is being chosen. Pressing a choice turns it on; pressing the one already on moves to the next
 * one to its right (`choiceAfterPress`), so two choices flip from either side. Use it with v-model, the value being the
 * chosen choice's:
 *
 *   <ChoiceSwitch v-model="unitsInPounds" label="Units" :choices="[{ value: true, label: 'lbs' }, { value: false, label: 'kg' }]" />
 *
 * A class given to it (for its size or place) lands on the group.
 */
import { choiceAfterPress } from "../js/choiceAfterPress.js";

const chosen = defineModel<Value>({ required: true });

const props = defineProps<{
  /** What is being chosen, e.g. "Units": the group's name for screen readers. */
  label: string;
  /** The choices, in the order shown: each its value and the word on its button. */
  choices: readonly { value: Value; label: string }[];
}>();

/** Turns on the choice the press leads to (see choiceAfterPress). */
function press(pressed: Value): void {
  const values = props.choices.map((choice) => choice.value);
  chosen.value = choiceAfterPress(values, chosen.value, pressed);
}
</script>

<template>
  <div class="segmented" role="group" :aria-label="label">
    <button
      v-for="choice in choices"
      :key="choice.label"
      type="button"
      class="segmentedItem"
      :aria-pressed="chosen === choice.value"
      @click="press(choice.value)"
    >
      {{ choice.label }}
    </button>
  </div>
</template>
