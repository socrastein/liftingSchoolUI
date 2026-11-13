<script lang="ts">
import type { HeaderMenu } from "./SiteHeaderDropdown.vue";

export type { HeaderMenu } from "./SiteHeaderDropdown.vue";
export type { HeaderMenuEntry } from "./SiteHeaderEntry.vue";

/** A page of this project, as a link in the header. */
export interface HeaderPageLink {
  kind: "link";
  name: string;
  /** The page's path, given to the project's router link. */
  to: string;
}

/** One thing in the header's row: a page, or a drop-down of pages. */
export type HeaderItem = HeaderPageLink | HeaderMenu;

/** The way across to the business's other product (the site's "Lifting App", the app's "School Website"). */
export interface HeaderSwitchLink {
  name: string;
  /** Its full address: it is another site, so a plain link in the same tab. */
  href: string;
}
</script>

<script setup lang="ts">
import type { Component } from "vue";
import logoIcon from "../icons/logo.svg";
import SiteHeaderDropdown from "./SiteHeaderDropdown.vue";
import SiteHeaderPhoneMenu from "./SiteHeaderPhoneMenu.vue";
import ThemeButton from "./ThemeButton.vue";

/**
 * The header of every site and app of the business: the logo and name on the left, then the pages, the drop-downs, the switch
 * to the other product and the light/dark button; on a screen under 900px wide, a Menu button whose panel holds the same
 * things. One component, so the two products' headers cannot drift apart and a fix reaches both.
 *
 * Both layouts are always in the page and CSS shows the one that fits (see .siteHeaderLinks in components.css), never a
 * script: a prerendered page then shows a phone its menu from the first paint. The one hidden is display: none, so it is also
 * out of reach of the keyboard and screen readers.
 *
 * The switch sits in the same spot in every product: the last thing before the theme button in the wide row, drawn as the
 * header's one outlined button, and the first row of the phone menu.
 *
 * It is fixed to the top of the window, `--headerHeight` tall, and marked `data-fixed-header` so popups open below it
 * (js/fixedHeader.js). The `status` slot is for something the project shows beside the navigation, before the links and
 * before the Menu button (the app's "Saved"); whatever goes there should keep its room while hidden, so nothing shifts.
 */
defineProps<{
  /** The product's name, beside the logo ("The Lifting School"). */
  name: string;
  /** Where the name leads: the product's first page. */
  homeTo: string;
  /** The pages and drop-downs, in order. A drop-down left out of the list is not drawn. */
  items: HeaderItem[];
  /** The way across to the other product. */
  switchLink: HeaderSwitchLink;
  /** The project's router link component (NuxtLink or RouterLink): it takes `to` and marks the current page itself. */
  linkComponent: Component;
  /** Where the light/dark choice is saved on the device; see useColorScheme. */
  themeStorageKey: string;
}>();
</script>

<template>
  <header class="siteHeader" data-fixed-header>
    <!-- Named, because a page can have navigation of its own: a screen reader lists this one as "Main navigation" -->
    <nav class="siteHeaderNav" aria-label="Main">
      <div class="siteHeaderTitle">
        <img :src="logoIcon" alt="" class="siteHeaderLogo" />
        <component :is="linkComponent" :to="homeTo" class="siteHeaderName">{{ name }}</component>
      </div>
      <div class="siteHeaderEnd">
        <slot name="status" />
        <div class="siteHeaderPhone">
          <SiteHeaderPhoneMenu
            :items="items"
            :switch-link="switchLink"
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
          <a :href="switchLink.href" class="btn btnSecondary btnSm siteHeaderSwitch">{{ switchLink.name }}</a>
          <ThemeButton :storage-key="themeStorageKey" />
        </div>
      </div>
    </nav>
  </header>
</template>
