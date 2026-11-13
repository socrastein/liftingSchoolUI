<script setup lang="ts">
import { homeAddressOf, type Product } from "../js/businessTools.js";

/**
 * The header's switch between the business's two products, "Website | App", drawn as a segmented control. It is the same in
 * both products, in the same order, so nothing moves when a person crosses over: the side you are on is the filled one and
 * carries aria-current (so it is not marked by colour alone, and a screen reader says which it is), and the other side is a
 * plain link to that product's home, in the same tab.
 */
defineProps<{
  /** The product the header is in: its side is marked as current. */
  product: Product;
}>();

/** The two sides, in the order drawn. */
const SIDES: { product: Product; label: string }[] = [
  { product: "site", label: "Website" },
  { product: "app", label: "App" },
];
</script>

<template>
  <!-- The group's name tells a screen reader what the two choices are; the current side says it is the one you are on -->
  <div class="segmented siteHeaderSwitch" role="group" aria-label="Product">
    <template v-for="side in SIDES" :key="side.product">
      <span v-if="side.product === product" class="segmentedItem" aria-current="true">{{ side.label }}</span>
      <a v-else :href="homeAddressOf(side.product)" class="segmentedItem">{{ side.label }}</a>
    </template>
  </div>
</template>
