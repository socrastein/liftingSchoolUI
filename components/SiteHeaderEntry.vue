<script lang="ts">
import type { Component } from "vue";

/**
 * One row of a header menu: a page of this project (drawn with the project's router link), or a link to somewhere else.
 * A page marked `isAction` starts something ("Add Client") instead of naming a place: it is set apart below the others, with
 * a plus sign.
 */
export type HeaderMenuEntry =
  { kind: "link"; name: string; to: string; isAction?: boolean } | { kind: "external"; name: string; href: string };
</script>

<script setup lang="ts">
/**
 * A row of a header menu, in the wide header's drop-down and in the phone menu alike, so a row looks and behaves the same in
 * both. It says when it was chosen, so the menu around it can close.
 */
defineProps<{
  /** The row to draw. */
  entry: HeaderMenuEntry;
  /** The project's router link component (NuxtLink or RouterLink), which marks the current page itself. */
  linkComponent: Component;
}>();

const emit = defineEmits<{
  /** The row was pressed, and the page is about to change. */
  (event: "chosen"): void;
}>();
</script>

<template>
  <a v-if="entry.kind === 'external'" :href="entry.href" class="menuItem" @click="emit('chosen')">{{ entry.name }}</a>
  <component
    :is="linkComponent"
    v-else
    :to="entry.to"
    class="menuItem"
    :class="{ siteHeaderAction: entry.isAction }"
    @click="emit('chosen')"
  >
    <span v-if="entry.isAction" class="siteHeaderPlus" aria-hidden="true">+</span>{{ entry.name }}
  </component>
</template>
