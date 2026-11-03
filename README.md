# liftingSchoolUI

The look of The Lifting School, shared by every site and app of the business: design tokens (colours, type, spacing, corners,
shadows, timings), base styles, the standard component classes, the fonts and the icons. Every project installs it, and none
keeps its own copy of the brand, so a change made here reaches all of them.

## Using it in a project

Install it straight from GitHub, pinned to a release tag (it is not on the npm registry). npm 12 refuses git dependencies
unless a project opts in, so first add a `.npmrc` beside the project's `package.json` with:

```ini
# Allows only the git dependencies listed in this project's own package.json (this library), not ones other packages pull in
allow-git=root
```

Then install over HTTPS (not `github:…`, which records an SSH address in the lockfile that a CI runner cannot clone):

```sh
npm install "git+https://github.com/socrastein/liftingSchoolUI.git#v0.1.1"
```

The package name is kebab-case (`lifting-school-ui`) because npm requires lowercase names; everything inside it is camelCase.
Installing runs no code: the library has no install or prepare scripts.

Load the whole look once, before the project's own styles:

```ts
// Vite (main.ts)
import "lifting-school-ui/css/index.css";

// Nuxt (nuxt.config.ts)
export default defineNuxtConfig({ css: ["lifting-school-ui/css/index.css"] });
```

Icons are plain SVG files: `import menuIcon from "lifting-school-ui/icons/menu.svg"`. Dark mode is the `dark` class on
`<html>`; the project's own colour-mode toggle sets it.

### Checking a project's styles

Every project runs the style rules checker over its own source from one of its tests, with its own short list of deliberate
exceptions, each with its reason (Vitest shown; the folder is `app` in a Nuxt project, `src` in a Vite one):

```ts
import { describeStyleProblem, findStyleProblemsUnder, type StyleException } from "lifting-school-ui/styleRules";

const EXCEPTIONS: StyleException[] = [
  { file: "app/components/Hero.vue", rule: "fontSize", property: "*", reason: "the hero keeps its own type" },
];

it("takes every colour, size, spacing value and duration from the tokens", () => {
  const problems = findStyleProblemsUnder("app", EXCEPTIONS);
  expect(problems.map(describeStyleProblem)).toEqual([]);
});
```

### Upgrading

Change the tag in `package.json` (or run the install line above with the new tag), install, and check the project's pages in
both themes. Each release's changes are in this repo's commit history between the two tags.

### Working on the look and a project at the same time

To see library edits live in a project before tagging a release, link the two (both repos side by side in `~/repos`):

```sh
cd ~/repos/liftingSchoolUI && npm link
cd ~/repos/someProject && npm link lifting-school-ui     # undo with: npm install
```

Vite's dev server only serves files inside the project unless told otherwise, so a linked library also needs
`server: { fs: { allow: [".."] } }` in the project's `vite.config.ts` while the link is in place.

## What is in it

| Path                 | What it is                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `css/index.css`      | The one import: loads the three files below in order.                                                                                                       |
| `css/tokens.css`     | Every value: colours (light in `:root`, dark in `.dark`), font sizes, spacing, radii, shadows, durations, the plate colours.                                |
| `css/base.css`       | Fonts, the reset, typography, the focus ring, the reduced-motion rule and the few utilities. Pulls in `css/animations.css`.                                 |
| `css/components.css` | The shared classes: `.btn`, `.segmented`, `.menu`, `.field`/`.input`, `.choice`, `.range`, `.table`, `.card`/`.panel`, `.badge`, `.alert`, `.disclosure`, … |
| `fonts/`             | Ubuntu Sans (text) and Montserrat (headings), both variable, with their licences.                                                                           |
| `icons/`             | Interface icons (Lucide), brand marks (Simple Icons) and the logo, each named as its source names it. `icons/LICENSES.md` says where each comes from.       |
| `js/plateColors.js`  | `plateColor(weight, lbs)`: which colour a plate of that weight is (`lifting-school-ui/plateColors`).                                                        |
| `js/styleRules.js`   | The style rules checker, for a project's tests (`lifting-school-ui/styleRules`; Node only, since it reads files).                                           |

## The rules of the look

Build from what is here before writing new CSS, in this library or in a project.

- **Tokens, never typed values.** Colours, font sizes, radii, spacing and durations come from the tokens. A project checks its own
  styles for hand-typed values with the style rules checker (above), listing its few deliberate exceptions with their reasons.
- **Few, clearly different steps** (less is more). Text: `--fontSizeSm/Md/Lg/Xl` plus the heading sizes `--fontSizeH1`..`H5` for
  display text that should be heading-sized without the heading font (prices, timers). Spacing: `--space1`..`4` (0.5, 1, 2, 4rem;
  each doubles, so a choice is never a close call). Radii: `--radius` (the default), `--radiusLg` (cards), `--radiusFull` (the
  badge, the one pill). Time: `--duration` (0.2s) and `--durationSlow` (0.6s). Tints: one 10% wash per colour (`--accentSubtle`,
  `--dangerSubtle`, `--successSubtle`, `--infoSubtle`), and one light divider for rows of a list or table (`--borderSubtle`). Body
  text weight is `--weightBody`. Body line height 1.5, headings 1.25. A value between two steps rounds at their geometric
  midpoint.
- **Light mode separates surfaces by hue, a thin edge and a soft shadow, never by near-white brightness steps alone**, which blur
  together. The page is a cool lavender (`--bgBase`) and the one near-white face (`--bgMid` = `--bgTop`) sits on it with
  `--raisedBorder` and `--shadowRaised`. Dark mode separates by tone and has no edges or shadows. No hard offset shadows, no gloss,
  nothing that lifts on hover.
- **Layering inside a card:** give each mode its own means. A container that holds raised things is `--bgMid`, and the things raised
  on it are `.card` faces (`--bgTop`): in dark mode they stand out by the lighter shade, in light mode (one face colour) by their own
  edge and shadow.
- **Plate colours** follow Rogue's competition plates, so a plate on screen looks like the one in the gym: pounds 55 red, 45 blue,
  35 yellow, 25 green; kilograms 25 red, 20 blue, 15 yellow, 10 green; every lighter plate grey. `--plateRed` and the rest are for
  edges and badges (adjusted per theme for contrast); `--plateFaceRed` and the rest are the plates' true colours, the same in both
  themes.
- **Type:** Ubuntu Sans for text (`--fontBody`), Montserrat for headings (`--fontHeading`), both variable fonts. Keep body fonts
  variable: the static Ubuntu files looked harsh on a Linux desktop with full font hinting.
- **State lives in ARIA, not in classes**: `aria-pressed`, `aria-current`, `aria-invalid` and `aria-expanded` are what the styling
  reads, so the look and what a screen reader hears cannot disagree.
- **A component's own `<style scoped>` holds only its layout** (size, position, how it arranges its children), never its own
  colours, outlines or shadows. A look that two components need becomes a shared class here.
- **Accessibility (WCAG 2.2 AA)** is built in: every colour pair in the tokens is measured (the comments give the ratios), the focus
  ring and reduced-motion rule cover everything, and no class relies on colour alone. A change that lowers a contrast ratio is a bug:
  measure a new colour pair in both themes, and run `npm run a11y`.

## The shared classes

All camelCase; a part or variant is the block's name plus a suffix, as `.card` → `.cardHeader`. The showcase shows each in use.

- **Surfaces:** `.card` (a lifted face that holds content), `.panel` (a group inside a card), `.cardLink` (a card that is a link:
  hover deepens it), `.cardHeader` with `.cardTitle` (a card's title row), `.sectionTitle` (the small uppercase heading of a
  section), `.toolCard` (a tool's card: a padded column of its parts), and `.readingColumn` (the centred column of a page you read).
- **Controls:** `.btn` with `.btnPrimary`, `.btnSecondary`, `.btnSubtle` or `.btnDanger`, plus `.btnSm`, `.btnIcon` (square, needs
  an `aria-label`), `.btnBlock` and `.btnEdged` (a coloured edge from `--edgeColor`, set to a theme token). A bare `<button>` has no
  look at all (the global rule is a reset), so a button that should look like one says `.btn`. `.segmented` + `.segmentedItem` for
  one-of-several choices; the chosen item is `aria-pressed="true"`. `.disclosure` for a heading that opens a section, and
  `.range` for a slider.
- **Forms:** `.field` (label, control and note as one unit), `.fieldLabel`, `.input` (input, select and textarea alike; invalid is
  drawn from `aria-invalid`), `.fieldNote`, `.fieldError`, `.choice` with `.radio` or `.checkbox`, and `.honeypot`.
- **Data:** `.table` (caption, small uppercase column headings, light row rules), with `.tableNumber` on cells of figures so a
  column of prices lines up. `.timeDisplay` for a timer's big figure, and `.listItemTitle` for the title line of a list item.
- **Messages and navigation:** `.badge` (plus `.badgeInfo`, and `.badgeBlue` … `.badgeGrey`: a plate colour as the border),
  `.alert` with `.alertDanger` (give it `role="alert"` when it appears after an action), `.menu` + `.menuItem` (the current page's
  row is `aria-current="page"`, which NuxtLink and RouterLink set), and `.pageTitle` (a page's visible title).
- **Highlights:** `.cue` + `.cueActive` (a brief outline on the part of a page that just changed), `.target` and `.targetDanger`
  (what a control is about to act on).

## Working on the library

`npm run dev` opens the showcase (http://localhost:4100): every token, class and icon of the library in use, with a light/dark
switch, so a change can be seen in both themes before it is released. `npm run a11y` checks the built showcase against WCAG 2.2
AA in both themes (axe, plus a contrast check measured from the drawn pixels). `npm test`, `npm run typecheck` and
`npm run format:check` cover the rest; `CLAUDE.md` lists every command and the release steps.

## Planned

- **Lucide icons as Vue components** (`@lucide/vue`, written `<Carrot />`) instead of SVG files shown with `<img>`. An inline icon is
  drawn in `currentColor`, so it takes the text colour around it, in both themes and on accent fills, with no inverting: the
  `.dark .iconSmall` and `.menuItem[aria-current] .iconSmall` filter rules go, and so do the Lucide files in `icons/`. Brand marks and
  the logo stay files. Planned with the shared Vue components, since it changes how every icon in every project is drawn.

## Licences

All rights reserved: the code and the look are The Lifting School's and are not licensed for reuse; the repository is public only
so projects can install it without credentials. The fonts and icons keep their own licences: `fonts/montserrat/OFL.txt`,
`fonts/ubuntuSans/UBUNTU-FONT-LICENCE.txt` and `icons/LICENSES.md`.
