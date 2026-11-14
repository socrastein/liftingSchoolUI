<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref } from "vue";
import { toastQueue, type ToastScreen } from "../js/toastQueue.js";

/**
 * A short confirmation pinned to the bottom of the window ("APA copied to clipboard.", "Added 180.0 lbs for Oct 25, 2026."), so
 * a press visibly did something even when what it changed is out of view, and the message goes away on its own instead of
 * going stale beside later changes. The owner calls `show(message)` through a template ref.
 *
 * Every instance on the page shares one queue (`js/toastQueue.js`): toasts never overlap, a message asked for while another
 * is up waits its turn, and each stays for its full time.
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
/** Whether the component has been taken off the page, after which nothing more may be drawn. */
let isUnmounted = false;

/** This instance as the queue sees it: the one thing it can ask of it is to draw a message. */
const screen: ToastScreen = { display };

/**
 * Asks for a turn to show a message. It appears at once when no toast is on screen anywhere on the page, otherwise it waits for
 * the ones before it (see `js/toastQueue.js`). Resolves when the message is on the page, or when it was merged into an
 * identical waiting one or dropped.
 */
function show(newMessage: string): Promise<void> {
  return toastQueue.request(screen, newMessage);
}

/**
 * Draws a message when the queue's turn comes, reports when it is on the page, and resolves once it has been taken down again,
 * which is the queue's cue for the next toast. The old text is cleared for one render first, so the same message twice in a
 * row is announced twice.
 */
async function display(newMessage: string, onDrawn: () => void): Promise<void> {
  message.value = "";
  await nextTick();
  if (isUnmounted) return;
  message.value = newMessage;
  onDrawn();
  await stayUp();
}

/**
 * Resolves after `seconds`, the time one message stays up, and the message has been taken down. The text is cleared in the
 * timer itself, then a render is waited for, so the next toast never starts while this one is still on the page.
 */
function stayUp(): Promise<void> {
  return new Promise((resolve) => {
    hideTimer = setTimeout(() => {
      message.value = "";
      nextTick().then(resolve);
    }, props.seconds * 1000);
  });
}

onBeforeUnmount(() => {
  isUnmounted = true;
  clearTimeout(hideTimer);
  toastQueue.leave(screen);
});

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
