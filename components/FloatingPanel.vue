<script setup lang="ts">
import { computed, ref } from "vue";
import { useElementBounding, useElementSize, useWindowSize } from "@vueuse/core";
import { fixedHeaderBottom } from "../js/fixedHeader.js";
import { PANEL_EDGE_MARGIN_PX, placePanel } from "../js/panelPlacement.js";

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
 * element marked data-fixed-header: see js/fixedHeader.js). When it
 * fits on neither side, it opens on the roomier one, cut to that room,
 * and scrolls inside (js/panelPlacement.js). It moves left to stay
 * inside the window, and follows the anchor when the page scrolls or
 * the window resizes.
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
/** The slot's wrapper: its height is what the content needs, even while the panel is cut shorter and scrolls. */
const content = ref<HTMLElement | null>(null);

const anchorBox = useElementBounding(() => props.anchor);
/**
 * The sizes from layout (border boxes), which a CSS transform does not
 * change. Not getBoundingClientRect, which includes transforms:
 * PopupTransition slides the panel a few pixels in the direction of
 * `side`, which would wobble its measured height by a fraction of a
 * pixel, and for a list sized to fill the room exactly that was enough
 * to flip `side`, which flipped the slide, which flipped `side` again,
 * hanging the page. For the same reason the height is the content's,
 * not the panel's: cutting the panel to fit must not change which side
 * it fits on.
 */
const panelSize = useElementSize(panel, { width: 0, height: 0 }, { box: "border-box" });
const contentSize = useElementSize(content, { width: 0, height: 0 }, { box: "border-box" });
const windowSize = useWindowSize();

/** Its side, top edge and, when it fits on neither side, the height it is cut to. */
const placement = computed(() =>
  placePanel({
    anchorTop: anchorBox.top.value,
    anchorBottom: anchorBox.bottom.value,
    panelHeight: contentSize.height.value,
    windowHeight: windowSize.height.value,
    headerBottom: fixedHeaderBottom(),
  }),
);

/** Lined up with the anchor's left edge, moved left as needed to stay inside the window. */
const left = computed(() => {
  const rightmostLeft = windowSize.width.value - panelSize.width.value - PANEL_EDGE_MARGIN_PX;
  const alignedLeft = Math.min(anchorBox.left.value, rightmostLeft);
  return Math.max(alignedLeft, PANEL_EDGE_MARGIN_PX);
});

/** Where it is drawn; a cut panel also gets its height and scrolls inside, and only then, so a whole one is never clipped (its shadow included). */
const position = computed(() => {
  const { top, maxHeight } = placement.value;
  const drawnAt = { top: `${top}px`, left: `${left.value}px` };
  if (maxHeight === undefined) return drawnAt;
  return { ...drawnAt, maxHeight: `${maxHeight}px`, overflowY: "auto" as const };
});
</script>

<template>
  <div ref="panel" class="floatingPanel" :data-side="placement.side" :style="position">
    <div ref="content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.floatingPanel {
  position: fixed;
  /* Above the page's content, below a fixed header (100 in both projects) */
  z-index: 60;
}
</style>
