<script setup lang="ts">
/**
 * How every popup opens and closes: wrap the popup's v-if in it.
 *
 *   <PopupTransition>
 *     <FloatingPanel v-if="isOpen" :anchor="toggle">…</FloatingPanel>
 *   </PopupTransition>
 *
 * Opening, the popup fades in and slides 4px away from its anchor;
 * closing, it fades and slides back. Which way is "away" comes from
 * FloatingPanel's `data-side`: down for a popup below its anchor, up for
 * one above it. The look of both is the shared library's `popup`
 * transition (lifting-school-ui, components.css), which this names.
 *
 * Nothing waits for it: the popup works
 * from its first frame. While a closing popup fades out it is made
 * `inert`, so for those 150ms (`--durationFast`) it cannot be clicked, focused or read by a
 * screen reader, and the page behaves as if it were already gone.
 * Under reduced motion the library's global rule makes both near
 * instant.
 *
 * The wrapped element must be a single element or a component with one
 * root element (FloatingPanel, AnchoredCard, or a component of the
 * project's own).
 */

/** A closing popup is out of reach at once, even while it is still fading out. */
function makeInert(element: Element): void {
  element.setAttribute("inert", "");
}
</script>

<template>
  <Transition name="popup" @before-leave="makeInert">
    <slot />
  </Transition>
</template>
