<script setup lang="ts">
/**
 * Something folded away behind a title: a list of past clients, a card's detailed facts, an FAQ answer. The title is the
 * `.disclosure` button with its chevron, which turns as the content opens; the content eases open and shut, and while it is
 * shut it is hidden from sight, the Tab key and screen readers. Always use this, never the browser's own <details> triangle,
 * which can be neither animated nor styled to match.
 *
 * Opening also keeps the section on screen: a section near the bottom of a page would otherwise grow off the bottom of the
 * window, so the page scrolls just far enough, in step with the growing, to keep the title and content in view. Closing
 * never scrolls.
 *
 *   <DisclosureSection title="Past clients (3)"> ...the content... </DisclosureSection>
 *
 * Give it a `level` when the title is a heading of the page (the button then sits inside an h2 to h4, and `look` says which
 * heading class it takes its size and weight from); without one the title is only a button, for a part of a card that is not a
 * section of the page. A class given to it lands on its outer element.
 */
import { onBeforeUnmount, ref, useId, useTemplateRef, watch } from "vue";

/** How a heading-level title looks: the shared heading class each look uses (see base.css and components.css). */
export type DisclosureLook = "area" | "section" | "part";

const LOOK_CLASSES: Record<DisclosureLook, string> = { area: "h5", section: "sectionTitle", part: "h6" };

/** The longest the section keeps itself in view while opening: the opening takes `--duration` (0.3s), so this is a safety net. */
const KEEP_IN_VIEW_MS = 1000;

/**
 * Scrolls the page just far enough ("nearest") to show the whole `section`, once for every frame while its `body` grows.
 * Tracking the growth frame by frame makes one smooth motion; scrolling once at the start would see a closed section and do
 * nothing, and once at the end would be a second, separate movement. Stops when the body's opening transition ends (or after
 * KEEP_IN_VIEW_MS), or when the returned function is called.
 */
function followGrowth(section: HTMLElement, body: HTMLElement): () => void {
  const startedAt = performance.now();
  let isFollowing = true;
  let frame = 0;
  const stop = (): void => {
    isFollowing = false;
    cancelAnimationFrame(frame);
    body.removeEventListener("transitionend", stop);
  };
  const follow = (): void => {
    if (!isFollowing) return;
    section.scrollIntoView({ block: "nearest", behavior: "instant" });
    if (performance.now() - startedAt > KEEP_IN_VIEW_MS) stop();
    else frame = requestAnimationFrame(follow);
  };
  body.addEventListener("transitionend", stop);
  follow();
  return stop;
}

const props = defineProps<{
  /** The text on the button: "Past clients (3)". */
  title: string;
  /** Whether it is open to begin with, and again whenever this changes (a card that opens itself when something is wrong). */
  defaultOpen?: boolean;
  /** The title's heading level in the page outline, 2 to 4. Leave out for a title that is only a button. */
  level?: 2 | 3 | 4;
  /** How a heading-level title looks. Defaults to a section title. */
  look?: DisclosureLook;
}>();

const isOpen = ref(props.defaultOpen === true);
const bodyId = useId();
const section = useTemplateRef<HTMLElement>("section");
const body = useTemplateRef<HTMLElement>("body");

let stopKeepingInView: (() => void) | undefined;

// Follow the parent's wish when it changes, but leave a person's own choice alone while it stays the same
watch(
  () => props.defaultOpen,
  (wantsOpen) => {
    isOpen.value = wantsOpen === true;
  },
);

/** Opens or closes it; opening also scrolls it into view as it grows, and shutting it part way stops that. */
function toggle(): void {
  isOpen.value = !isOpen.value;
  if (isOpen.value) keepGrowingSectionInView();
  else stopKeepingInView?.();
}

/** Starts keeping the section in view as it opens (see `followGrowth`); a section already being followed is let go first. */
function keepGrowingSectionInView(): void {
  stopKeepingInView?.();
  if (section.value && body.value) stopKeepingInView = followGrowth(section.value, body.value);
}

onBeforeUnmount(() => stopKeepingInView?.());
</script>

<template>
  <div ref="section">
    <component :is="level ? `h${level}` : 'div'" :class="level ? LOOK_CLASSES[look ?? 'section'] : undefined">
      <button type="button" class="disclosure" :aria-expanded="isOpen" :aria-controls="bodyId" @click="toggle">
        {{ title }}
        <svg
          class="disclosureChevron"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
    </component>
    <!-- Always drawn, so it can ease open and shut; while shut it is hidden from sight, tabbing and screen readers -->
    <div :id="bodyId" ref="body" class="disclosureBody" :class="{ disclosureBodyOpen: isOpen }">
      <div class="disclosureBodyInner">
        <slot />
      </div>
    </div>
  </div>
</template>
