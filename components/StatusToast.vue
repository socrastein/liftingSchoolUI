<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";

/**
 * A short confirmation pinned to the bottom of the window ("APA copied to clipboard.", "Added 180.0 lbs for Oct 25, 2026."), so
 * a press visibly did something even when what it changed is out of view, and the message goes away on its own instead of
 * going stale beside later changes. The owner calls `show(message)` through a template ref.
 *
 * The region is always on the page, so a screen reader announces each message as it appears. It is for news the person can
 * also see elsewhere; an error, or anything they must act on, belongs in an alert beside its cause, since this one leaves.
 *
 * Fixed above `ScrollToTop` (50) and popups (60), below a fixed header (100).
 */

const props = withDefaults(
  defineProps<{
    /** How long a message stays up: long enough to read, short enough not to linger. */
    seconds?: number;
  }>(),
  { seconds: 4 },
);

/** What the toast says, or "" while it is hidden. */
const message = ref("");
let hideTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Shows a message, replacing any earlier one, and hides it after `seconds`. The old text is cleared for one render first, so
 * the same message twice in a row is announced twice and its time starts over.
 */
async function show(newMessage: string): Promise<void> {
  clearTimeout(hideTimer);
  message.value = "";
  await nextTick();
  message.value = newMessage;
  hideTimer = setTimeout(hide, props.seconds * 1000);
}

/** Takes the message down. */
function hide(): void {
  message.value = "";
}

onBeforeUnmount(() => clearTimeout(hideTimer));

defineExpose({ show });
</script>

<template>
  <div class="toastRegion" role="status">
    <p v-if="message !== ''" class="toast card">{{ message }}</p>
  </div>
</template>

<style scoped>
.toastRegion {
  position: fixed;
  inset-inline: var(--space2);
  bottom: var(--space2);
  z-index: 70;
  display: flex;
  justify-content: center;
  /* Lets clicks through the empty strip beside and around the toast */
  pointer-events: none;
}

.toast {
  /* As wide as its text: a project's .card may set a full width, which would stretch it across the window */
  width: fit-content;
  margin: 0;
  padding: var(--space1) var(--space3);
  /* The subtle accent is a see-through wash, so it is laid over the card's solid face to keep the page from showing through */
  background: linear-gradient(var(--accentSubtle), var(--accentSubtle)), var(--bgTop);
  box-shadow: var(--shadowRaised);
}
</style>
