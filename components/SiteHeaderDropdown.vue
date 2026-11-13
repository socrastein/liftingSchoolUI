<script lang="ts">
import type { HeaderMenuEntry } from "./SiteHeaderEntry.vue";

/** A drop-down of the header ("Tools", "Clients"): its label, its rows, and whether the person is somewhere inside it. */
export interface HeaderMenu {
  kind: "menu";
  /** Names the menu in the page (the list's id, and `data-menu` on the drop-down), so it must be unique in the header. */
  id: string;
  label: string;
  /** True on one of the menu's own pages: the label is then marked like the current page's link (aria-current="true"). */
  isCurrent: boolean;
  entries: HeaderMenuEntry[];
}
</script>

<script setup lang="ts">
import { onClickOutside } from "@vueuse/core";
import { ref, type Component } from "vue";
import chevronDownIcon from "../icons/chevron-down.svg";
import SiteHeaderEntry from "./SiteHeaderEntry.vue";

/**
 * A drop-down in the wide header: a button that reads as one of the header's links, with its list under it. It is a
 * disclosure (aria-expanded on the button), not an ARIA menu, so its rows are ordinary links reached with Tab. It closes when
 * a row is chosen, on a click anywhere else (which is also what closes it when another drop-down is opened), and on Escape,
 * which puts focus back on its button.
 */
defineProps<{
  /** The menu to draw. */
  menu: HeaderMenu;
  /** The project's router link component. */
  linkComponent: Component;
}>();

const isOpen = ref(false);
const dropdown = ref<HTMLElement | null>(null);
const toggle = ref<HTMLButtonElement | null>(null);

onClickOutside(dropdown, () => {
  isOpen.value = false;
});

/** Escape: close the list and hand focus back to the button, so the keyboard is not lost. */
function closeFromKeyboard(): void {
  isOpen.value = false;
  toggle.value?.focus();
}
</script>

<template>
  <div ref="dropdown" class="siteHeaderDropdown" :data-menu="menu.id" @keydown.esc="closeFromKeyboard">
    <button
      ref="toggle"
      type="button"
      class="menuItem siteHeaderLink siteHeaderToggle"
      :aria-expanded="isOpen"
      :aria-controls="`${menu.id}List`"
      :aria-current="menu.isCurrent ? 'true' : undefined"
      @click="isOpen = !isOpen"
    >
      {{ menu.label }}
      <img :src="chevronDownIcon" class="iconSmall siteHeaderArrow" alt="" />
    </button>
    <Transition name="siteHeaderList">
      <div v-if="isOpen" :id="`${menu.id}List`" class="menu siteHeaderList">
        <SiteHeaderEntry
          v-for="entry in menu.entries"
          :key="entry.key ?? entry.name"
          :entry="entry"
          :link-component="linkComponent"
          @chosen="isOpen = false"
        />
      </div>
    </Transition>
  </div>
</template>
