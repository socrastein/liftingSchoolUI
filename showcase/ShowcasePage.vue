<script setup lang="ts">
import { computed, defineComponent, h, ref } from "vue";
import { plateColor, type PlateColor } from "../js/plateColors.js";
import { useColorScheme } from "../js/colorScheme.js";
import ActionsMenu from "../components/ActionsMenu.vue";
import AnchoredCard from "../components/AnchoredCard.vue";
import DropdownSelect from "../components/DropdownSelect.vue";
import ConfirmDialog from "../components/ConfirmDialog.vue";
import DisclosureSection from "../components/DisclosureSection.vue";
import FormField from "../components/FormField.vue";
import FormFieldGroup from "../components/FormFieldGroup.vue";
import PopupTransition from "../components/PopupTransition.vue";
import ToggleSwitch from "../components/ToggleSwitch.vue";
import ChoiceSwitch from "../components/ChoiceSwitch.vue";
import LoadingScreen from "../components/LoadingScreen.vue";
import ScrollToTop from "../components/ScrollToTop.vue";
import SiteHeader, { type HeaderItem } from "../components/SiteHeader.vue";
import type { Product } from "../js/businessTools.js";
import StatusToast from "../components/StatusToast.vue";
import ThemeButton from "../components/ThemeButton.vue";
import ThemeSlider from "../components/ThemeSlider.vue";

/** The sample header's link component: the showcase has no router, so a link is a plain anchor to this section. */
const SampleLink = defineComponent({
  setup(_props, { slots }) {
    return () => h("a", { href: "#header" }, slots.default?.());
  },
});

/** The sample header's own pages and drop-down; the header adds the Tools menu itself. */
const SAMPLE_HEADER_PAGES: HeaderItem[] = [
  { kind: "link", name: "Home", to: "#header" },
  { kind: "link", name: "Services", to: "#header" },
  {
    kind: "menu",
    id: "sampleClients",
    label: "Clients",
    isCurrent: false,
    entries: [
      { kind: "link", name: "Sam Sample", to: "#header" },
      { kind: "link", name: "Add Client", to: "#header", isAction: true },
    ],
  },
];

/** The product the sample header is in; the control above it flips it, to see both products' headers (ids in a header are unique, so one is drawn at a time). */
const headerProduct = ref<Product>("site");
const HEADER_PRODUCT_CHOICES: { value: Product; label: string }[] = [
  { value: "site", label: "Website" },
  { value: "app", label: "App" },
];

/**
 * The showcase: every design token, standard class and icon of the library, in use, so something new can be built from what
 * already exists and a change can be checked in both themes before it is released. Ported from the business site's style
 * guide. Its own scoped styles below only lay the samples out; everything they show is the library's.
 */

/** The two themes the showcase can show, in the order of its Light / Dark control. */
const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

/** Where the chosen theme is saved; index.html reads the same key before the first paint. */
const THEME_KEY = "theme";

const { isDark } = useColorScheme({ storageKey: THEME_KEY });

/** The theme showing; setting it shows that theme and saves the choice. */
const theme = computed<Theme>({
  get: () => (isDark.value ? "dark" : "light"),
  set: (chosen) => (isDark.value = chosen === "dark"),
});
const THEME_CHOICES = THEMES.map((option) => ({ value: option, label: option === "light" ? "Light" : "Dark" }));

/** The colour tokens, grouped as tokens.css defines them. */
const COLOUR_GROUPS: { name: string; tokens: string[] }[] = [
  { name: "Surfaces", tokens: ["--bgBase", "--bgMid", "--bgTop"] },
  { name: "Text", tokens: ["--textFull", "--textMuted", "--textHero"] },
  { name: "Borders", tokens: ["--borderFull", "--borderMuted", "--borderSubtle", "--raisedBorder"] },
  { name: "Accent", tokens: ["--accentFull", "--accentMuted", "--accentSubtle", "--onAccent"] },
  {
    name: "Status",
    tokens: ["--danger", "--dangerSubtle", "--success", "--successSubtle", "--infoSubtle"],
  },
  { name: "Plate Edges", tokens: ["--plateRed", "--plateBlue", "--plateYellow", "--plateGreen", "--plateGrey"] },
  {
    name: "Plate Faces",
    tokens: ["--plateFaceRed", "--plateFaceBlue", "--plateFaceYellow", "--plateFaceGreen", "--plateFaceGrey"],
  },
  { name: "Other", tokens: ["--scrim", "--heroGlow"] },
];

/** The body text sizes (--fontSizeXs is only for tags that must fit a narrow row on a phone). */
const TEXT_SIZES = ["--fontSizeXs", "--fontSizeSm", "--fontSizeMd", "--fontSizeLg", "--fontSizeXl"];

/** The four spacing steps; each doubles the last. */
const SPACING_STEPS = ["--spaceHalf", "--space1", "--space2", "--space3", "--space4"];

/** The radius tokens. */
const RADII = ["--radius", "--radiusLg", "--radiusFull"];

/** The standard plates of each unit, heaviest first, to show plateColor's answer for each. */
const POUND_PLATES = [55, 45, 35, 25, 10, 5, 2.5];
const KILO_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

/** The badge class for a plate's colour, such as "badgeRed". */
function plateBadgeClass(color: PlateColor): string {
  const capitalized = color.charAt(0).toUpperCase() + color.slice(1);
  return `badge${capitalized}`;
}

/** The plate's weight and unit as its badge text, such as "45 lb". */
function plateLabel(weight: number, lbs: boolean): string {
  const unit = lbs ? "lb" : "kg";
  return `${weight} ${unit}`;
}

/**
 * Every icon in icons/, by file name. Vite finds them at build time; only the showcase loads them all, while a project
 * bundles just the ones it imports.
 */
const iconModules = import.meta.glob<string>("../icons/*.svg", { eager: true, query: "?url", import: "default" });
const ICONS = Object.entries(iconModules)
  .map(([path, url]) => ({ name: path.replace("../icons/", "").replace(".svg", ""), url }))
  .sort((first, second) => first.name.localeCompare(second.name));

/** Which option the segmented control sample has selected. */
const period = ref("30D");
const PERIODS = ["7D", "30D", "90D", "All"].map((option) => ({ value: option, label: option }));

/** The field samples: one filled in, one showing an error. */
const sampleName = ref("Test Person");
const sampleEmail = ref("not-an-email");
const sampleGoal = ref("");
const sampleCountry = ref("United States");
/** The searchable sample's options: enough countries to filter. */
const SAMPLE_COUNTRIES = [
  "United States",
  "Canada",
  "Côte d'Ivoire",
  "India",
  "Indonesia",
  "Ireland",
  "Mexico",
  "United Kingdom",
].map((name) => ({ value: name, label: name }));
/** The sample drop-down's options. */
const SAMPLE_GOALS = [
  { value: "strength", label: "Strength" },
  { value: "endurance", label: "Endurance" },
  { value: "mobility", label: "Mobility" },
];
const sampleNote = ref("");
const sampleChoice = ref("yes");
const sampleTicks = ref<string[]>(["Barbell"]);
const sampleVolume = ref(60);
const sampleSwitch = ref(true);

/** Whether the disclosure sample is open. */
const isDisclosureOpen = ref(false);

/** The anchored card sample: the button that opens it, and what was typed in it. */
const cardOpener = ref<HTMLButtonElement | null>(null);
const isCardOpen = ref(false);
const cardNote = ref("");
const bareCardOpener = ref<HTMLButtonElement | null>(null);
const isBareCardOpen = ref(false);
const bareCardText = ref("");
const isDialogOpen = ref(false);

/** The toast sample, shown by its button. */
const toast = ref<InstanceType<typeof StatusToast> | null>(null);
/** A second toast instance, as another page of an app would have, to show that the two queue instead of overlapping. */
const otherToast = ref<InstanceType<typeof StatusToast> | null>(null);

/** Fires four toasts at once, alternating between the two instances: they appear one after the other, never on top of each other. */
function fireSeveralToasts(): void {
  toast.value?.show("First, from the first instance.");
  otherToast.value?.show("Second, from the other instance.");
  toast.value?.show("Third, from the first instance.");
  otherToast.value?.show("Fourth, from the other instance.");
}

/** Whether the loading screen sample is up. */
const isSampleLoading = ref(false);

/** Shows the loading screen for a few seconds, as if the next page were loading, then lets it fade out. */
function showLoadingScreen(): void {
  isSampleLoading.value = true;
  window.setTimeout(() => {
    isSampleLoading.value = false;
  }, 4000);
}

/** Whether the cue sample is showing its highlight. */
const isCueActive = ref(false);

/** Flashes the cue sample's highlight for a moment, the way the interval timer does at an alert. */
function flashCue(): void {
  isCueActive.value = true;
  window.setTimeout(() => {
    isCueActive.value = false;
  }, 1200);
}

const chevronIcon = iconModules["../icons/chevron-down.svg"];
const arrowRightIcon = iconModules["../icons/arrow-right.svg"];
</script>

<template>
  <header class="showcaseHeader">
    <p class="showcaseName">liftingSchoolUI</p>
    <div class="row">
      <ChoiceSwitch v-model="theme" label="Theme" :choices="THEME_CHOICES" />
      <!-- The shared ThemeButton on the same key: it and the control beside it always agree -->
      <ThemeButton :storage-key="THEME_KEY" />
    </div>
  </header>

  <main class="readingColumn showcase">
    <h1 class="pageTitle">Showcase</h1>

    <nav class="card contents" aria-label="Sections">
      <a href="#colours">Colours</a>
      <a href="#type">Type</a>
      <a href="#spacing">Spacing and corners</a>
      <a href="#buttons">Buttons</a>
      <a href="#segmented">Segmented control</a>
      <a href="#surfaces">Surfaces</a>
      <a href="#fields">Fields</a>
      <a href="#tables">Table</a>
      <a href="#messages">Badges and alerts</a>
      <a href="#plates">Plates</a>
      <a href="#header">Header</a>
      <a href="#menus">Menu</a>
      <a href="#disclosure">Disclosure</a>
      <a href="#highlights">Highlights</a>
      <a href="#icons">Icons</a>
    </nav>

    <section class="showcaseSection" aria-labelledby="colours">
      <h2 id="colours" class="h3">Colours</h2>
      <div v-for="group in COLOUR_GROUPS" :key="group.name" class="colourGroup">
        <h3 class="sectionTitle">{{ group.name }}</h3>
        <div class="swatches">
          <div v-for="token in group.tokens" :key="token" class="swatch">
            <div class="swatchChip" :style="{ backgroundColor: `var(${token})` }"></div>
            <code>{{ token }}</code>
          </div>
        </div>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="type">
      <h2 id="type" class="h3">Type</h2>
      <p>Headings are Montserrat; their tag is the outline and their class is the look (<code>.h1</code> to <code>.h6</code>).</p>
      <p class="h1">Heading one</p>
      <p class="h2">Heading two</p>
      <p class="h3">Heading three</p>
      <p class="h4">Heading four</p>
      <p class="h5">Heading five</p>
      <p class="h6">Heading six</p>
      <p>Body text is Ubuntu Sans:</p>
      <p v-for="size in TEXT_SIZES" :key="size" :style="{ fontSize: `var(${size})` }">
        <code>{{ size }}</code> The quick brown fox lifts the lazy dog.
      </p>
      <p class="textMuted"><code>.textMuted</code> for supporting text.</p>
      <p class="textAccent"><code>.textAccent</code> for a word that needs the accent.</p>
      <p>A <a href="#type">link in text</a>.</p>
      <p>
        <a class="linkSteady" href="#type"><code>.linkSteady</code></a> keeps its colour once visited, for links used again and
        again.
      </p>
      <p class="textHero">.textHero</p>
      <p class="timeDisplay">01:23.4</p>
      <ul>
        <li>A list item</li>
        <li>Another list item</li>
      </ul>
    </section>

    <section class="showcaseSection" aria-labelledby="spacing">
      <h2 id="spacing" class="h3">Spacing and corners</h2>
      <div v-for="step in SPACING_STEPS" :key="step" class="spacingRow">
        <code>{{ step }}</code>
        <div class="spacingBar" :style="{ width: `var(${step})` }"></div>
      </div>
      <div class="row">
        <div v-for="radius in RADII" :key="radius" class="radiusSample" :style="{ borderRadius: `var(${radius})` }">
          <code>{{ radius }}</code>
        </div>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="buttons">
      <h2 id="buttons" class="h3">Buttons</h2>
      <div class="row">
        <button type="button" class="btn btnPrimary">.btnPrimary</button>
        <button type="button" class="btn btnSecondary">.btnSecondary</button>
        <button type="button" class="btn btnSubtle">.btnSubtle</button>
        <button type="button" class="btn btnDanger">.btnDanger</button>
        <button type="button" class="btn btnDangerSubtle">.btnDangerSubtle</button>
        <button type="button" class="btn btnPrimary" disabled>Disabled</button>
      </div>
      <div class="row">
        <button type="button" class="btn btnSecondary btnSm">.btnSm</button>
        <button type="button" class="btn btnSecondary btnIcon" aria-label="An icon button (.btnIcon)">
          <img :src="arrowRightIcon" class="iconSmall" alt="" />
        </button>
        <button type="button" class="btn btnSecondary btnEdged" style="--edgeColor: var(--plateBlue)">.btnEdged</button>
        <a href="#buttons" class="btn btnPrimary">A link as .btnPrimary</a>
      </div>
      <button type="button" class="btn btnPrimary btnBlock">.btnBlock</button>
    </section>

    <section class="showcaseSection" aria-labelledby="segmented">
      <h2 id="segmented" class="h3">Segmented control</h2>
      <!-- ChoiceSwitch: pressing the choice already on moves to the next one -->
      <ChoiceSwitch v-model="period" label="Time period" :choices="PERIODS" />
    </section>

    <section class="showcaseSection" aria-labelledby="surfaces">
      <h2 id="surfaces" class="h3">Surfaces</h2>
      <div class="card sampleCard">
        <div class="cardHeader">
          <h3 class="h3 cardTitle">.card</h3>
          <button type="button" class="btn btnSecondary btnSm">Action</button>
        </div>
        <p>A card holds content. Its title row is <code>.cardHeader</code> with a <code>.cardTitle</code>.</p>
        <h4 class="sectionTitle">.sectionTitle</h4>
        <div class="panel samplePanel">
          <p>A <code>.panel</code> groups things inside a card.</p>
        </div>
        <p class="listItemTitle">.listItemTitle</p>
        <p class="textMuted">The detail line under it.</p>
        <ul class="plainList samplePlainList">
          <li><span class="badge">.plainList</span></li>
          <li><span class="badge">no bullets</span></li>
          <li><span class="badge">no reading spacing</span></li>
        </ul>
      </div>
      <a href="#surfaces" class="card cardLink sampleCard">
        <p>A <code>.card.cardLink</code> is a card that is a link: point at it.</p>
      </a>
      <div class="card cardLink stretchedLinkCard sampleCard">
        <p><a href="#surfaces" class="stretchedLink">A stretched link</a></p>
        <p>
          A <code>.cardLink.stretchedLinkCard</code> holds more than its link; the link is <code>.stretchedLink</code>, so a tap
          anywhere on the card follows it.
        </p>
      </div>
      <div class="card toolCard">
        <h3 class="h5">.card.toolCard</h3>
        <p>A tool's card: a padded column of its parts, one step apart.</p>
      </div>
      <div class="raisedPanel samplePanel sampleRaisedPanel">
        <p>A <code>.raisedPanel</code> is lifted off the page and holds cards of its own.</p>
        <div class="card samplePanel">
          <p>A <code>.card</code> on it</p>
        </div>
        <div class="card samplePanel"><p>Another</p></div>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="fields">
      <h2 id="fields" class="h3">Fields</h2>
      <div class="card sampleCard">
        <FormField id="sampleName" label="Name (FormField, with a hint)" hint="As it should appear on the plan." v-slot="field">
          <input v-bind="field" v-model="sampleName" type="text" autocomplete="off" class="input" />
        </FormField>
        <FormField
          id="sampleEmail"
          label="Email (FormField, with an error)"
          error="Please enter a valid email address."
          v-slot="field"
        >
          <input v-bind="field" v-model="sampleEmail" type="email" autocomplete="off" class="input" />
        </FormField>
        <FormField id="sampleOptional" label="Nickname (FormField, optional)" optional v-slot="field">
          <input v-bind="field" type="text" autocomplete="off" class="input" />
        </FormField>
        <FormField id="sampleGoal" label="Goal (DropdownSelect, in place of a select)" optional is-combobox v-slot="field">
          <DropdownSelect
            v-bind="field"
            :combo-id="field.id"
            :options="SAMPLE_GOALS"
            :value="sampleGoal"
            placeholder="Select…"
            size="regular"
            @change="sampleGoal = $event"
          />
        </FormField>
        <FormField id="sampleCountry" label="Country (DropdownSelect, searchable)" is-combobox v-slot="field">
          <DropdownSelect
            v-bind="field"
            :combo-id="field.id"
            :options="SAMPLE_COUNTRIES"
            :value="sampleCountry"
            placeholder="Type to search…"
            size="regular"
            searchable
            @change="sampleCountry = $event"
          />
        </FormField>
        <div class="field">
          <label class="fieldLabel" for="sampleNote">Note</label>
          <textarea id="sampleNote" v-model="sampleNote" class="input" placeholder="A text area"></textarea>
        </div>
        <div class="field">
          <label class="fieldLabel" for="sampleVolume">Volume (<code>.range</code>)</label>
          <div class="row">
            <input id="sampleVolume" v-model.number="sampleVolume" type="range" min="0" max="100" class="range" />
            <span>{{ sampleVolume }}%</span>
          </div>
        </div>
        <div class="field">
          <ToggleSwitch v-model="sampleSwitch" label="A switch (ToggleSwitch)" />
        </div>
        <FormFieldGroup legend="A radio group (FormFieldGroup)" optional>
          <div class="row">
            <label class="choice"><input v-model="sampleChoice" type="radio" value="yes" class="radio" /> Yes</label>
            <label class="choice"><input v-model="sampleChoice" type="radio" value="no" class="radio" /> No</label>
          </div>
        </FormFieldGroup>
        <FormFieldGroup legend="A boxed checkbox group" boxed>
          <label class="choice"><input v-model="sampleTicks" type="checkbox" value="Barbell" class="checkbox" /> Barbell</label>
          <label class="choice"><input v-model="sampleTicks" type="checkbox" value="Bands" class="checkbox" /> Bands</label>
        </FormFieldGroup>
        <FormFieldGroup legend="A group with an error" error="Pick at least one.">
          <label class="choice"><input type="checkbox" class="checkbox" /> Anything</label>
        </FormFieldGroup>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="tables">
      <h2 id="tables" class="h3">Table</h2>
      <table class="table">
        <caption>
          .table
        </caption>
        <thead>
          <tr>
            <th scope="col">Package</th>
            <th scope="col" class="tableNumber">Price</th>
            <th scope="col" class="tableNumber">.tableNumber</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">12 sessions</th>
            <td class="tableNumber">$855</td>
            <td class="tableNumber">$71.25</td>
          </tr>
          <tr>
            <th scope="row">48 sessions</th>
            <td class="tableNumber">$2,880</td>
            <td class="tableNumber">$60.00</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="showcaseSection" aria-labelledby="messages">
      <h2 id="messages" class="h3">Badges and alerts</h2>
      <div class="row">
        <span class="badge">.badge</span>
        <span class="badge">Strength</span>
        <span class="badge badgeInfo">.badgeInfo</span>
      </div>
      <div class="alert alertDanger">.alert.alertDanger: something went wrong.</div>
    </section>

    <section class="showcaseSection" aria-labelledby="plates">
      <h2 id="plates" class="h3">Plates</h2>
      <p>Each standard plate as a badge in its colour, as <code>plateColor(weight, lbs)</code> gives it.</p>
      <div class="row">
        <span v-for="weight in POUND_PLATES" :key="weight" class="badge" :class="plateBadgeClass(plateColor(weight, true))">
          {{ plateLabel(weight, true) }}
        </span>
      </div>
      <div class="row">
        <span v-for="weight in KILO_PLATES" :key="weight" class="badge" :class="plateBadgeClass(plateColor(weight, false))">
          {{ plateLabel(weight, false) }}
        </span>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="header">
      <h2 id="header" class="h3">Header</h2>
      <p>
        <code>SiteHeader</code> is the header of every site and app: the name, the product's own pages and drop-downs, the Tools
        menu (the business's one list, <code>lifting-school-ui/businessTools</code>), the Website | App switch (pressing the side
        you are on moves to the other) and the theme button, or a Menu button under 900px wide. It is fixed to the top of the
        window; this sample is held in a frame. Flip the product to see that both draw the same Tools menu and switch, with only
        the link kinds differing. In development a project passes <code>addresses</code> ({ site, app }, each optional) so the
        switch and the Tools menu's links lead to the other product's local dev server; left out, they lead to the live sites.
      </p>
      <ChoiceSwitch v-model="headerProduct" label="Product the sample header is in" :choices="HEADER_PRODUCT_CHOICES" />
      <div class="sampleHeaderFrame">
        <SiteHeader
          name="The Sample Site"
          home-to="#header"
          :product="headerProduct"
          :pages="SAMPLE_HEADER_PAGES"
          :is-on-tool-page="false"
          :link-component="SampleLink"
          :theme-storage-key="THEME_KEY"
        >
          <template #status><span class="badge">Saved</span></template>
        </SiteHeader>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="menus">
      <h2 id="menus" class="h3">Menu</h2>
      <nav class="menu sampleMenu" aria-label="Sample menu">
        <a href="#menus" class="menuItem" aria-current="page">The current page</a>
        <a href="#menus" class="menuItem">Another page</a>
        <button type="button" class="menuItem">A button row</button>
        <button type="button" class="menuItem" disabled>A disabled row</button>
        <button type="button" class="menuItem menuItemDanger">A danger row</button>
      </nav>
      <p><code>ThemeSlider</code> is the light/dark switch for a menu panel, on the same key as the header's button.</p>
      <ThemeSlider :storage-key="THEME_KEY" />
    </section>

    <section class="showcaseSection" aria-labelledby="popups">
      <h2 id="popups" class="h3">Popups</h2>
      <p>
        <code>AnchoredCard</code> opens beside the button that opened it, positioned by <code>FloatingPanel</code> and eased in
        and out by <code>PopupTransition</code>. With <code>hides-header</code> its heading row stays out of sight until its close
        button has focus (Shift+Tab from the field), for a card whose content says what it is.
      </p>
      <p>
        <code>ActionsMenu</code> is the ⋮ button: a short list of actions for a row, drawn by the same <code>FloatingPanel</code>.
      </p>
      <div class="row">
        <ActionsMenu label="Actions for the sample row" toggle-id="sampleActions">
          <button type="button" class="menuItem">Edit</button>
          <button type="button" class="menuItem menuItemDanger">Delete</button>
        </ActionsMenu>
      </div>
      <p>
        <code>ScrollToTop</code> is the arrow that appears in the bottom right corner once you are two screens down this page, and
        jumps back to the top.
      </p>
      <ScrollToTop />
      <p><code>ConfirmDialog</code> asks a question that has to be answered first, before something that cannot be taken back.</p>
      <div class="row">
        <button type="button" class="btn btnSecondary" @click="isDialogOpen = true">Delete the sample</button>
        <ConfirmDialog
          v-if="isDialogOpen"
          question="Delete the sample and all its history?"
          detail="Its 12 entries go with it. This cannot be undone."
          confirm-label="Delete sample"
          @confirm="isDialogOpen = false"
          @cancel="isDialogOpen = false"
        />
      </div>
      <p>
        <code>StatusToast</code> confirms that something happened, at the bottom of the window, and leaves after a few seconds.
      </p>
      <div class="row">
        <button type="button" class="btn btnSecondary" @click="toast?.show('Sample copied to clipboard.')">
          Copy the sample
        </button>
      </div>
      <p>Toasts queue: several fired together, even from separate instances, appear one after the other and never overlap.</p>
      <div class="row">
        <button type="button" class="btn btnSecondary" @click="fireSeveralToasts">Fire Four Toasts</button>
      </div>
      <StatusToast ref="toast" />
      <StatusToast ref="otherToast" />
      <p><code>LoadingScreen</code> covers the window while something loads, and fades out when it is ready.</p>
      <div class="row">
        <button type="button" class="btn btnSecondary" @click="showLoadingScreen">Load for 4 seconds</button>
      </div>
      <LoadingScreen :is-loading="isSampleLoading" />
      <div class="row">
        <button
          ref="cardOpener"
          type="button"
          class="btn btnSecondary"
          :aria-expanded="isCardOpen"
          @click="isCardOpen = !isCardOpen"
        >
          Add a note
        </button>
        <PopupTransition>
          <AnchoredCard v-if="isCardOpen && cardOpener" :anchor="cardOpener" heading="A note" @close="isCardOpen = false">
            <label class="fieldLabel" for="sampleCardNote">Note</label>
            <textarea id="sampleCardNote" v-model="cardNote" class="input" rows="2"></textarea>
          </AnchoredCard>
        </PopupTransition>
        <button
          ref="bareCardOpener"
          type="button"
          class="btn btnSecondary"
          :aria-expanded="isBareCardOpen"
          @click="isBareCardOpen = !isBareCardOpen"
        >
          Add a comment
        </button>
        <PopupTransition>
          <AnchoredCard
            v-if="isBareCardOpen && bareCardOpener"
            :anchor="bareCardOpener"
            heading="A comment"
            hides-header
            @close="isBareCardOpen = false"
          >
            <label class="visuallyHidden" for="sampleCardComment">Comment</label>
            <textarea id="sampleCardComment" v-model="bareCardText" class="input" rows="2" placeholder="Comment"></textarea>
          </AnchoredCard>
        </PopupTransition>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="disclosure">
      <h2 id="disclosure" class="h3">Disclosure</h2>
      <div class="card sampleCard">
        <h3 class="sectionTitle">
          <button
            type="button"
            class="disclosure"
            :aria-expanded="isDisclosureOpen"
            aria-controls="disclosureBody"
            @click="isDisclosureOpen = !isDisclosureOpen"
          >
            .disclosure
            <img :src="chevronIcon" class="iconSmall disclosureChevron" alt="" />
          </button>
        </h3>
        <p v-show="isDisclosureOpen" id="disclosureBody">The section the disclosure opens.</p>
      </div>
      <div class="card sampleCard">
        <DisclosureSection title="DisclosureSection (the component: easing, and scrolls into view)">
          <p>
            What it opens eases open, and the page scrolls just far enough to keep it on screen. Put it in a heading with
            <code>level</code> when it is a section of the page.
          </p>
        </DisclosureSection>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="highlights">
      <h2 id="highlights" class="h3">Highlights</h2>
      <div class="row">
        <p class="cue highlightSample" :class="{ cueActive: isCueActive }">.cue</p>
        <button type="button" class="btn btnSecondary btnSm" @click="flashCue">Flash the cue</button>
      </div>
      <div class="row">
        <p class="target highlightSample">.target</p>
        <p class="targetDanger highlightSample">.targetDanger</p>
      </div>
    </section>

    <section class="showcaseSection" aria-labelledby="icons">
      <h2 id="icons" class="h3">Icons</h2>
      <p>
        <code>.iconSmall</code>, named as on <a href="https://lucide.dev/icons">lucide.dev</a> and
        <a href="https://simpleicons.org">simpleicons.org</a>.
      </p>
      <ul class="icons">
        <li v-for="icon in ICONS" :key="icon.name" class="iconTile">
          <img :src="icon.url" class="iconSmall" alt="" />
          <code>{{ icon.name }}</code>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
/* The page's own layout; everything it shows is the library's classes */
.showcaseHeader {
  align-items: center;
  background-color: var(--bgMid);
  border-bottom: 1px solid var(--raisedBorder);
  display: flex;
  height: var(--headerHeight);
  justify-content: space-between;
  left: 0;
  padding-inline: var(--space2);
  position: fixed;
  right: 0;
  top: 0;
  z-index: 1;
}

.showcaseName {
  font-family: var(--fontHeading);
  font-size: var(--fontSizeMd);
  font-weight: 700;
  width: auto;
}

.showcase {
  display: flex;
  flex-direction: column;
  gap: var(--space3);
  padding-block: var(--space3);
}

.contents {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1) var(--space2);
  padding: var(--space2);
}

.showcaseSection {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
}

.colourGroup {
  display: flex;
  flex-direction: column;
}

.row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1);
}

.swatches {
  display: grid;
  gap: var(--space2);
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
}

.swatch {
  display: flex;
  flex-direction: column;
  font-size: var(--fontSizeSm);
  gap: var(--space1);
}

.swatchChip {
  border: 1px solid var(--borderMuted);
  border-radius: var(--radius);
  height: 3rem;
}

.spacingRow {
  align-items: center;
  display: flex;
  gap: var(--space2);
}

.spacingRow code {
  width: 6rem;
}

.spacingBar {
  background-color: var(--accentFull);
  border-radius: var(--radius);
  height: var(--space1);
}

.radiusSample {
  align-items: center;
  background-color: var(--bgTop);
  border: 1px solid var(--borderMuted);
  display: flex;
  font-size: var(--fontSizeSm);
  height: 4rem;
  justify-content: center;
  width: 8rem;
}

.sampleCard {
  color: var(--textFull);
  display: flex;
  flex-direction: column;
  font-weight: var(--weightBody);
  gap: var(--space2);
  padding: var(--space2);
}

.samplePanel {
  padding: var(--space2);
}

/* The raised panel's sample: its cards one step apart */
.sampleRaisedPanel {
  display: flex;
  flex-direction: column;
  gap: var(--space2);
}

/* A row of items: the page that uses .plainList arranges them */
.samplePlainList {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space1);
}

/* Holds the sample header in place: a transformed box is what a fixed element inside it is fixed to. Tall enough for its
   drop-down and its phone panel to open inside the frame. */
/* Wider than the page's column (centred on it), since the wide header needs about 900px: a column-wide frame would clip it */
.sampleHeaderFrame {
  border: 1px solid var(--raisedBorder);
  margin-left: 50%;
  max-width: none;
  translate: -50% 0;
  width: min(64rem, calc(100vw - 2rem));
  border-radius: var(--radius);
  height: 30rem;
  overflow: hidden;
  position: relative;
  transform: translate(0);
}

.sampleMenu {
  width: 16rem;
}

.highlightSample {
  border-radius: var(--radius);
  padding: var(--space1);
  width: auto;
}

.icons {
  display: grid;
  gap: var(--space1);
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.iconTile {
  align-items: center;
  display: flex;
  font-size: var(--fontSizeSm);
  gap: var(--space1);
  margin: 0;
}

.iconTile .iconSmall {
  height: 1.5rem;
  width: 1.5rem;
}
</style>
