# liftingSchoolUI

The look of The Lifting School, shared by every site and app of the business: design tokens (colours, type, spacing, corners,
shadows, timings), base styles, the standard component classes, the fonts and the icons. Every project installs it, and none
keeps its own copy of the brand, so a change made here reaches all of them.

## Using it in a project

Install it straight from GitHub, pinned to a release tag (it is not on the npm registry):

```sh
npm install github:socrastein/liftingSchoolUI#v0.1.0
```

That adds `"lifting-school-ui": "github:socrastein/liftingSchoolUI#v0.1.0"` to `package.json`. The package name is kebab-case
because npm requires lowercase names; everything inside it is camelCase.

Load the whole look once, before the project's own styles:

```ts
// Vite (main.ts)
import "lifting-school-ui/css/index.css";

// Nuxt (nuxt.config.ts)
export default defineNuxtConfig({ css: ["lifting-school-ui/css/index.css"] });
```

Icons are plain SVG files: `import menuIcon from "lifting-school-ui/icons/menu.svg"`. Dark mode is the `dark` class on
`<html>`; the project's own colour-mode toggle sets it.

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

## The rules of the look

Build from what is here before writing new CSS, in this library or in a project.

- **Tokens, never typed values.** Colours, font sizes, radii, spacing and durations come from the tokens. A project checks its own
  styles for hand-typed values with the style rules checker (coming to this library), listing its few deliberate exceptions with
  their reasons.
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
- **Accessibility (WCAG 2.2 AA)** is built in: every colour pair in the tokens is measured (the comments give the ratios), the focus
  ring and reduced-motion rule cover everything, and no class relies on colour alone. A change that lowers a contrast ratio is a bug.

## Planned

- **Lucide icons as Vue components** (`@lucide/vue`, written `<Carrot />`) instead of SVG files shown with `<img>`. An inline icon is
  drawn in `currentColor`, so it takes the text colour around it, in both themes and on accent fills, with no inverting: the
  `.dark .iconSmall` and `.menuItem[aria-current] .iconSmall` filter rules go, and so do the Lucide files in `icons/`. Brand marks and
  the logo stay files. Planned with the shared Vue components, since it changes how every icon in every project is drawn.

## Licences

All rights reserved: the code and the look are The Lifting School's and are not licensed for reuse; the repository is public only
so projects can install it without credentials. The fonts and icons keep their own licences: `fonts/montserrat/OFL.txt`,
`fonts/ubuntuSans/UBUNTU-FONT-LICENCE.txt` and `icons/LICENSES.md`.
