<script setup lang="ts">
/**
 * An on/off switch with its label beside it, for a setting that takes effect at once (not a form answer to submit later).
 *
 * Underneath it is a native checkbox with role="switch": screen readers announce it as a switch that is on or off, Space flips
 * it, and it keeps the browser's focus ring. The track and knob are the library's `.switch` classes. Use it with v-model:
 *
 *   <ToggleSwitch v-model="showsEffortTargets" label="Show RIR and RPE" />
 *
 * Give `hideLabel` when something beside the switch already says what it does (an ∞ next to a rounds slider): the label then
 * stays for assistive technology but is not drawn.
 *
 * Give `hint` for a short explanation of what the switch does: mouse users get it as a tooltip and screen readers read the
 * same words as the switch's description, after its name. The words are drawn nowhere else, so the label should still say
 * what the switch is without them.
 */

import { useId } from "vue";

const isOn = defineModel<boolean>({ required: true });

/** Unique per switch, even when the consumer passes no `id`, so each switch points at its own hint. */
const hintId = useId();

defineProps<{
  /** What the switch turns on, e.g. "Show RIR and RPE". It is the switch's accessible name even when hidden. */
  label: string;
  /** Hides the label from sight but keeps it for assistive technology. */
  hideLabel?: boolean;
  /** The checkbox's id, for tests and for anything that needs to point at it. */
  id?: string;
  /**
   * A sentence saying what the switch does, e.g. "Lift the concentric part of every rep as fast as possible.". Shown as the tooltip and
   * read by screen readers as the description; never part of the accessible name. Absent: no tooltip, no description.
   */
  hint?: string;
}>();
</script>

<template>
  <label class="switch" :title="hint">
    <input
      :id="id"
      v-model="isOn"
      type="checkbox"
      role="switch"
      class="switchInput"
      :aria-describedby="hint ? hintId : undefined"
    />
    <span class="switchTrack" aria-hidden="true"><span class="switchKnob"></span></span>
    <span :class="{ visuallyHidden: hideLabel }">{{ label }}</span>
    <!-- Inside the label so the component keeps one root, but aria-hidden so the label's name leaves it out; a description
         may still point at a hidden element. -->
    <span v-if="hint" :id="hintId" class="visuallyHidden" aria-hidden="true">{{ hint }}</span>
  </label>
</template>
