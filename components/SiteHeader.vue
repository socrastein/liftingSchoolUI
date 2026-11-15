<script lang="ts">
import type { HeaderMenu } from "./SiteHeaderDropdown.vue";

export type { HeaderMenu } from "./SiteHeaderDropdown.vue";
export type { HeaderMenuEntry } from "./SiteHeaderEntry.vue";
export type { HeaderNotification } from "./SiteHeaderNotifications.vue";

/** A page of this project, as a link in the header. */
export interface HeaderPageLink {
  kind: "link";
  name: string;
  /** The page's path, given to the project's router link. */
  to: string;
}

/** One thing in the header's row: a page, or a drop-down of pages. */
export type HeaderItem = HeaderPageLink | HeaderMenu;
</script>

<script setup lang="ts">
import { computed, ref, watch, type Component } from "vue";
import logoIcon from "../icons/logo.svg";
import { toolMenuEntries, type Product, type ProductAddresses } from "../js/businessTools.js";
import SiteHeaderDropdown from "./SiteHeaderDropdown.vue";
import SiteHeaderNotifications, { notificationsAnnouncement, type HeaderNotification } from "./SiteHeaderNotifications.vue";
import SiteHeaderPhoneMenu from "./SiteHeaderPhoneMenu.vue";
import SiteHeaderSwitch from "./SiteHeaderSwitch.vue";
import ThemeButton from "./ThemeButton.vue";

/**
 * The header of every site and app of the business: the logo and name on the left, then, always in this order, the product's
 * own pages and drop-downs, the Tools menu, the switch to the other product and the light/dark button; on a screen under 900px
 * wide, a Menu button whose panel holds the same things, with the switch first. One component, so the two products' headers
 * cannot drift apart and a fix reaches both. The Tools menu is the business's one list (js/businessTools.js): a project says
 * which product it is, and can neither add to the list nor put anything after it.
 *
 * Both layouts are always in the page and CSS shows the one that fits (see .siteHeaderLinks in components.css), never a
 * script: a prerendered page then shows a phone its menu from the first paint. The one hidden is display: none, so it is also
 * out of reach of the keyboard and screen readers.
 *
 * The bell is optional (`notifications`): a product's way to say "these things need you". Absent, nothing is drawn; an empty list
 * draws the bell without a count. It sits just before the theme button in the wide row and, under 900px, in the bar beside the
 * Menu button (never inside the menu), so the count is seen without opening anything. A notification is something that needs
 * doing and goes away when it is done: the product owns the list, the header stores nothing. When the count changes, a polite
 * live region says the new state once; nothing is said when the header first appears.
 *
 * The switch sits in the same spot in every product: the last thing before the theme button in the wide row, and the first row
 * of the phone menu. It is one segmented control, "Website | App", with the product you are in marked.
 *
 * It is fixed to the top of the window, `--headerHeight` tall, and marked `data-fixed-header` so popups open below it
 * (js/fixedHeader.js). The `status` slot is for something the project shows beside the navigation, before the links and
 * before the Menu button (the app's "Saved"); whatever goes there should keep its room while hidden, so nothing shifts.
 */
const props = defineProps<{
  /** The product's name, beside the logo ("The Lifting School"). */
  name: string;
  /** Where the name leads: the product's first page. */
  homeTo: string;
  /** Which product this header is in: it decides which tools are links inside the project and which lead across, and which side of the switch is current. */
  product: Product;
  /**
   * Where the two products are, for the switch and for the Tools menu's links to the other product. Each is optional and
   * defaults to the live address, so a project passes none in production; in development it passes its local servers, so the
   * links lead to the other dev server and not the live site.
   */
  addresses?: ProductAddresses;
  /** The product's own pages and drop-downs, in order; the Tools menu is drawn after them by the header itself. */
  pages: HeaderItem[];
  /** True on one of the tools' pages: the Tools menu is then marked like the current page's link. */
  isOnToolPage: boolean;
  /** The project's router link component (NuxtLink or RouterLink): it takes `to` and marks the current page itself. */
  linkComponent: Component;
  /** Where the light/dark choice is saved on the device; see useColorScheme. */
  themeStorageKey: string;
  /** The things that need the person, in order, for the bell. Left out: no bell. An empty list: the bell, with no count. */
  notifications?: HeaderNotification[];
}>();

/** The product's pages, then the business's Tools menu: everything the header lists, in the order it is drawn. */
const items = computed<HeaderItem[]>(() => [
  ...props.pages,
  {
    kind: "menu",
    id: "tools",
    label: "Tools",
    isCurrent: props.isOnToolPage,
    entries: toolMenuEntries(props.product, props.addresses),
  },
]);

/** How many things need the person, or undefined when the product draws no bell. */
const notificationCount = computed(() => props.notifications?.length);

/** What the live region says: empty on first render, then the new state each time the count changes. */
const announcement = ref("");

watch(notificationCount, (count) => {
  announcement.value = count === undefined ? "" : notificationsAnnouncement(count);
});
</script>

<template>
  <header class="siteHeader" :class="{ siteHeaderWithBell: notifications !== undefined }" data-fixed-header>
    <!-- Named, because a page can have navigation of its own: a screen reader lists this one as "Main navigation" -->
    <nav class="siteHeaderNav" aria-label="Main">
      <div class="siteHeaderTitle">
        <img :src="logoIcon" alt="" class="siteHeaderLogo" />
        <component :is="linkComponent" :to="homeTo" class="siteHeaderName">{{ name }}</component>
      </div>
      <div class="siteHeaderEnd">
        <slot name="status" />
        <div class="siteHeaderPhone" :class="{ siteHeaderPhoneWithBell: notifications !== undefined }">
          <SiteHeaderNotifications
            v-if="notifications"
            layout="phone"
            :notifications="notifications"
            :link-component="linkComponent"
          />
          <SiteHeaderPhoneMenu
            :items="items"
            :product="product"
            :addresses="addresses"
            :link-component="linkComponent"
            :theme-storage-key="themeStorageKey"
          />
        </div>
        <div class="siteHeaderLinks">
          <template v-for="item in items" :key="item.kind === 'menu' ? item.id : item.to">
            <component :is="linkComponent" v-if="item.kind === 'link'" :to="item.to" class="menuItem siteHeaderLink">
              {{ item.name }}
            </component>
            <SiteHeaderDropdown v-else :menu="item" :link-component="linkComponent" />
          </template>
          <SiteHeaderSwitch :product="product" :addresses="addresses" />
          <SiteHeaderNotifications
            v-if="notifications"
            layout="wide"
            :notifications="notifications"
            :link-component="linkComponent"
          />
          <ThemeButton :storage-key="themeStorageKey" />
        </div>
      </div>
    </nav>
    <p v-if="notifications" class="visuallyHidden" role="status" aria-live="polite">{{ announcement }}</p>
  </header>
</template>
