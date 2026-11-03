<script setup lang="ts">
import { computed, ref } from "vue";
import { useElementBounding, useElementSize, useWindowSize } from "@vueuse/core";
import { fixedHeaderBottom } from "../js/fixedHeader.js";

/**
 * A box drawn beside the element that opened it (its anchor), floating
 * over the page: the positioning shared by every project's popups (a
 * note card, a ⋮ menu, a drop-down list, an edit card). It holds whatever the slot gives it
 * and adds no meaning of its own; the slot's root carries the role,
 * label and keyboard handling.
 *
 * It sits in the page right after its anchor, so Tab order stays
 * natural, but is drawn with `position: fixed`: that keeps it from
 * being cut off by a scrolling box around the anchor (a wide table, the
 * week's sideways-scrolling columns). It opens below the anchor, lined
 * up with its left edge; it opens above instead when there is no room
 * below (and there is room above, under the page's fixed header, the
 * element marked data-fixed-header: see js/fixedHeader.js), moves
 * left to stay inside the window, and follows the anchor when the page
 * scrolls or the window resizes.
 *
 * Its root says which side it opened on (`data-side`: "below" or
 * "above"), so PopupTransition can slide it the right way.
 *
 * Mount it only while open (v-if, wrapped in PopupTransition so it eases
 * in and out): it watches scrolling while mounted.
 */

const props = defineProps<{
  /** The element that opened the panel; the panel is drawn beside it. */
  anchor: HTMLElement;
}>();

const panel = ref<HTMLElement | null>(null);

/** The gap between the anchor and the panel, and between the panel and the window's edge. */
const GAP_PX = 4;
const EDGE_MARGIN_PX = 8;

const anchorBox = useElementBounding(() => props.anchor);
/**
 * The panel's size from layout (its border box), which a CSS transform
 * does not change. Not getBoundingClientRect, which includes transforms:
 * PopupTransition slides the panel a few pixels in the direction of
 * `side`, which would wobble its measured height by a fraction of a
 * pixel, and for a list sized to fill the room exactly that was enough
 * to flip `side`, which flipped the slide, which flipped `side` again,
 * hanging the page.
 */
const panelSize = useElementSize(panel, { width: 0, height: 0 }, { box: "border-box" });
const windowSize = useWindowSize();

/** The panel's top edge when it opens below the anchor. */
const topWhenBelow = computed(() => anchorBox.bottom.value + GAP_PX);

/** The panel's top edge when it opens above the anchor. */
const topWhenAbove = computed(() => anchorBox.top.value - GAP_PX - panelSize.height.value);

/**
 * Below the anchor, unless the panel would run off the bottom and fits
 * above instead. "Above" ends at the fixed header, not the window's top:
 * the header is drawn over everything, so a panel reaching into it would
 * be partly hidden.
 */
const side = computed((): "below" | "above" => {
  const bottomWhenBelow = topWhenBelow.value + panelSize.height.value;
  const fitsBelow = bottomWhenBelow <= windowSize.height.value - EDGE_MARGIN_PX;
  const highestTop = fixedHeaderBottom() + EDGE_MARGIN_PX;
  const fitsAbove = topWhenAbove.value >= highestTop;
  return !fitsBelow && fitsAbove ? "above" : "below";
});

const top = computed(() => (side.value === "above" ? topWhenAbove.value : topWhenBelow.value));

/** Lined up with the anchor's left edge, moved left as needed to stay inside the window. */
const left = computed(() => {
  const rightmostLeft = windowSize.width.value - panelSize.width.value - EDGE_MARGIN_PX;
  const alignedLeft = Math.min(anchorBox.left.value, rightmostLeft);
  return Math.max(alignedLeft, EDGE_MARGIN_PX);
});

const position = computed(() => ({ top: `${top.value}px`, left: `${left.value}px` }));
</script>

<template>
  <div ref="panel" class="floatingPanel" :data-side="side" :style="position">
    <slot />
  </div>
</template>

<style scoped>
.floatingPanel {
  position: fixed;
  /* Above the page's content, below a fixed header (100 in both projects) */
  z-index: 60;
}
</style>
