# liftingSchoolUI

The Lifting School's shared look, installed by every site and app of the business as a git dependency pinned to a tag
(`lifting-school-ui`). What it holds, how projects use it and the rules of the look are in `README.md`; read it first.

General workflow, commit style and comment style come from the global CLAUDE.md. This file only covers what is specific to this
repo.

## Commands

- `npm run format`: formats every file with Prettier (`.prettierrc.json`); `npm run format:check` only reports. Format before
  proposing a commit.

## Rules that are easy to break

- **This repo is the only source of the look.** Consumers (`../nuxtBusinessSite`, `../liftingApp`, …) never edit or copy these
  files; a change to a token or shared class is made here, released, and picked up by bumping each consumer's tag.
- **Nothing is built on install.** npm installs a git dependency as it is, so everything a consumer imports (`css/`, `fonts/`,
  `icons/`) is shipped as written, with no build step. Only the paths in `package.json`'s `files` reach consumers.
- **A change is a release.** Releases follow semver while the version is 0.x: a minor bump (0.2.0) for anything that can change how
  a consumer looks or breaks a class it uses (a renamed or removed class or token, a changed value), a patch bump (0.1.1) for
  additions and fixes that change nothing existing. Bump `version` in `package.json` in the release commit and tag it `vX.Y.Z`.
- **Public repo.** Never commit secrets. The fonts and icons are redistributed under their licences, which must stay with them
  (`fonts/*/`, `icons/licences/`); a new icon or font gets its source and licence recorded (`icons/LICENSES.md`).
- **Contrast is measured, not assumed.** Every colour token's comment gives its contrast ratios; a new or changed colour gets
  measured in both themes and its comment updated.
