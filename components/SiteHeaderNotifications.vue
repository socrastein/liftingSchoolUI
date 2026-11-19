<script lang="ts">
/** One thing that needs the person, as a row in the header's notifications panel. */
export interface HeaderNotification {
  /** Stable for as long as the thing needs doing (the row's key), such as "foodLogRequest". */
  id: string;
  /** One sentence in sentence case: "Your coach asked for a 3-day food log." */
  text: string;
  /** Where dealing with it happens, given to the project's router link like a page's `to`. */
  to: string;
}

/** Counts above this show as "9+" on the bell, so the badge stays a small round number. */
const LARGEST_COUNT_SHOWN = 9;

/** The number on the bell's badge: the count itself, or "9+" above the largest the badge shows. */
export function notificationBadgeText(count: number): string {
  return count > LARGEST_COUNT_SHOWN ? `${LARGEST_COUNT_SHOWN}+` : String(count);
}

/** The bell button's accessible name, with the real count in words: "Notifications, 2 need you". */
export function notificationsButtonName(count: number): string {
  if (count === 0) return "Notifications, nothing needs you";
  if (count === 1) return "Notifications, 1 needs you";
  return `Notifications, ${count} need you`;
}

/** What the live region says when the count changes: "2 things need you." / "1 thing needs you." / "Nothing needs you right now." */
export function notificationsAnnouncement(count: number): string {
  if (count === 0) return "Nothing needs you right now.";
  if (count === 1) return "1 thing needs you.";
  return `${count} things need you.`;
}
</script>

<script setup lang="ts">
import { computed, watch, type Component } from "vue";
import bellIcon from "../icons/bell.svg";
import SiteHeaderEntry, { type HeaderMenuEntry } from "./SiteHeaderEntry.vue";
import { useHeaderPopup } from "./useHeaderPopup";

/**
 * The bell in the header: a button with the count of things that need the person, and under it a panel listing them, each a
 * link to where it is dealt with. It behaves like the Tools drop-down (useHeaderPopup): a disclosure with aria-expanded, closed
 * by choosing a row, a click elsewhere or Escape, which returns focus to the bell. With nothing to list, the panel says so.
 *
 * The header draws two of these (one in the wide row, one beside the Menu button), and CSS shows the one that fits; `layout`
 * keeps their panels' ids apart. The count is shown as a number, never by colour alone.
 */
const props = defineProps<{
  /** The things that need the person; an empty list draws the bell without a count. */
  notifications: HeaderNotification[];
  /** Which of the header's two layouts this bell belongs to; it only makes the panel's id unique. */
  layout: "wide" | "phone";
  /** The project's router link component. */
  linkComponent: Component;
}>();

const emit = defineEmits<{
  /** The panel went from closed to open, by any means (a click, the keyboard); not on close, not on first render. */
  opened: [];
}>();

const { isOpen, root, toggle, close, closeFromKeyboard } = useHeaderPopup();

const count = computed(() => props.notifications.length);
const panelId = computed(() => `notificationsPanel-${props.layout}`);

// Opening is only ever by the bell (a click, or the keyboard on it), so the panel's open state says when it opens; the
// watch means no other opening path can forget the event, and it starts closed, so first render emits nothing
watch(isOpen, (open) => {
  if (open) emit("opened");
});

/** The notifications as the header's menu rows, so a row looks and behaves like a Tools row (SiteHeaderEntry). */
const rows = computed<HeaderMenuEntry[]>(() =>
  props.notifications.map((notification) => ({
    kind: "link",
    name: notification.text,
    to: notification.to,
    key: notification.id,
  })),
);
</script>

<template>
  <div ref="root" class="siteHeaderNotifications" @keydown.esc="closeFromKeyboard">
    <button
      ref="toggle"
      type="button"
      class="siteHeaderBell"
      :aria-label="notificationsButtonName(count)"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="isOpen = !isOpen"
    >
      <img :src="bellIcon" class="iconSmall" alt="" />
      <!-- The accessible name above already holds the real count, so the badge is hidden from screen readers -->
      <span v-if="count > 0" class="siteHeaderBellBadge" aria-hidden="true">{{ notificationBadgeText(count) }}</span>
    </button>
    <Transition name="siteHeaderList">
      <div v-if="isOpen" :id="panelId" class="menu siteHeaderList siteHeaderNoticeList">
        <p v-if="count === 0" class="siteHeaderNoticeEmpty">Nothing needs you right now.</p>
        <SiteHeaderEntry v-for="row in rows" :key="row.key" :entry="row" :link-component="linkComponent" @chosen="close" />
      </div>
    </Transition>
  </div>
</template>
