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
 */

const isOn = defineModel<boolean>({ required: true });

defineProps<{
  /** What the switch turns on, e.g. "Show RIR and RPE". It is the switch's accessible name even when hidden. */
  label: string;
  /** Hides the label from sight but keeps it for assistive technology. */
  hideLabel?: boolean;
  /** The checkbox's id, for tests and for anything that needs to point at it. */
  id?: string;
}>();
</script>

<template>
  <label class="switch">
    <input :id="id" v-model="isOn" type="checkbox" role="switch" class="switchInput" />
    <span class="switchTrack" aria-hidden="true"><span class="switchKnob"></span></span>
    <span :class="{ visuallyHidden: hideLabel }">{{ label }}</span>
  </label>
</template>
