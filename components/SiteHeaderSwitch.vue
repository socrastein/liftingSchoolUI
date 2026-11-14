<script setup lang="ts">
import { computed } from "vue";
import { homeAddressOf, type Product, type ProductAddresses } from "../js/businessTools.js";

/**
 * The header's switch between the business's two products, "Website | App", drawn as a segmented control. It is the same in
 * both products, in the same order, so nothing moves when a person crosses over. Like every other switch of the business (the
 * ChoiceSwitch rule), pressing the side that is already on moves to the other: both sides are links to the other product's
 * home, in the same tab, the one for the product you are in included.
 *
 * The side you are on is the filled one and carries aria-current, so it is not marked by colour alone. A link that said only
 * "Website" would mislead a screen reader (it sounds like a link to where you already are), so the current side adds hidden
 * text after its visible label, which stays first so the name still begins with what is shown: "Website, current. Switch to
 * the App".
 */
const props = defineProps<{
  /** The product the header is in: its side is marked as current. */
  product: Product;
  /** Where the products are, when not at their live addresses (a project in development passes its local servers). */
  addresses?: ProductAddresses;
}>();

/** What each product is called on the switch. */
const LABELS: Record<Product, string> = { site: "Website", app: "App" };

/** The two sides, in the order drawn. */
const SIDES: Product[] = ["site", "app"];

/** The product both sides lead to: the one the header is not in. */
const otherProduct = computed<Product>(() => (props.product === "site" ? "app" : "site"));
</script>

<template>
  <!-- The group's name tells a screen reader what the two choices are -->
  <div class="segmented siteHeaderSwitch" role="group" aria-label="Product">
    <a
      v-for="side in SIDES"
      :key="side"
      :href="homeAddressOf(otherProduct, addresses)"
      class="segmentedItem"
      :aria-current="side === product ? 'true' : undefined"
    >
      {{ LABELS[side]
      }}<span v-if="side === product" class="visuallyHidden">, current. Switch to the {{ LABELS[otherProduct] }}</span>
    </a>
  </div>
</template>
