<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { ref, watch, type Component } from "vue";
import chevronDownIcon from "../icons/chevron-down.svg";
import menuIcon from "../icons/menu.svg";
import xIcon from "../icons/x.svg";
import type { HeaderItem, HeaderSwitchLink } from "./SiteHeader.vue";
import SiteHeaderEntry from "./SiteHeaderEntry.vue";
import ThemeSlider from "./ThemeSlider.vue";

/**
 * The header's menu on a phone-width screen: a button that opens a panel holding the switch to the other product, the pages,
 * each drop-down as a section that folds open, and the light/dark switch.
 *
 * The button shows a word beside its icon ("Menu", then "Close"), since three lines alone are not recognised by everyone
 * (Nielsen Norman Group's finding on hamburger menus). It works from the keyboard and with a screen reader: the button reports
 * whether the panel is open, the rows are real links, each section is a disclosure button, Tab moves through the panel in
 * order, and Escape closes it and puts focus back on the button.
 */
defineProps<{
  /** The pages and drop-downs, in order. */
  items: HeaderItem[];
  /** The way across to the other product, drawn as the panel's first row. */
  switchLink: HeaderSwitchLink;
  /** The project's router link component. */
  linkComponent: Component;
  /** Where the light/dark choice is saved on the device; see useColorScheme. */
  themeStorageKey: string;
}>();

const isOpen = ref(false);
/** The id of the section that is folded open, or "" when none is: one at a time, so the panel stays short. */
const openSectionId = ref("");
const panel = ref<HTMLElement | null>(null);
const toggle = ref<HTMLButtonElement | null>(null);

// Every section starts folded each time the menu opens again, however it was closed (a link, the button, Escape, a click elsewhere)
watch(isOpen, (open) => {
  if (!open) openSectionId.value = "";
});

/** Folds a section open, or shut again when it is the open one. */
function toggleSection(id: string): void {
  openSectionId.value = openSectionId.value === id ? "" : id;
}

/** Escape: close the panel and hand focus back to the button that opened it, so the keyboard is not lost. */
function closeFromKeyboard(): void {
  isOpen.value = false;
  toggle.value?.focus();
}

// A click anywhere else closes the panel. The button is exempt: it opens and closes the panel itself.
onClickOutside(panel, () => (isOpen.value = false), { ignore: [toggle] });
</script>

<template>
  <div class="siteHeaderPhoneMenu" @keydown.esc="closeFromKeyboard">
    <!-- The accessible name stays "Open menu" / "Close menu", which holds the word shown, as voice control needs -->
    <button
      id="phoneMenuButton"
      ref="toggle"
      type="button"
      class="siteHeaderMenuButton"
      :aria-label="isOpen ? 'Close menu' : 'Open menu'"
      :aria-expanded="isOpen"
      aria-controls="phoneMenuPanel"
      @click="isOpen = !isOpen"
    >
      <span class="siteHeaderMenuWord">{{ isOpen ? "Close" : "Menu" }}</span>
      <img :src="isOpen ? xIcon : menuIcon" class="iconSmall" alt="" />
    </button>
    <Transition name="siteHeaderPanel">
      <div v-if="isOpen" id="phoneMenuPanel" ref="panel" class="menu siteHeaderPanel">
        <a :href="switchLink.href" class="menuItem siteHeaderSwitchRow" @click="isOpen = false">{{ switchLink.name }}</a>
        <template v-for="item in items" :key="item.kind === 'menu' ? item.id : item.to">
          <component :is="linkComponent" v-if="item.kind === 'link'" :to="item.to" class="menuItem" @click="isOpen = false">
            {{ item.name }}
          </component>
          <template v-else>
            <button
              type="button"
              class="menuItem siteHeaderToggle"
              :data-menu="item.id"
              :aria-expanded="openSectionId === item.id"
              :aria-current="item.isCurrent ? 'true' : undefined"
              :aria-controls="`${item.id}Section`"
              @click="toggleSection(item.id)"
            >
              {{ item.label }}
              <img :src="chevronDownIcon" class="iconSmall siteHeaderArrow" alt="" />
            </button>
            <div v-if="openSectionId === item.id" :id="`${item.id}Section`" class="siteHeaderSection">
              <SiteHeaderEntry
                v-for="entry in item.entries"
                :key="entry.name"
                :entry="entry"
                :link-component="linkComponent"
                @chosen="isOpen = false"
              />
            </div>
          </template>
        </template>
        <div class="siteHeaderTheme">
          <ThemeSlider :storage-key="themeStorageKey" />
        </div>
      </div>
    </Transition>
  </div>
</template>
