#!/usr/bin/env bash
# Makes the PNG fallbacks of the browser-tab icon, icons/favicon/favicon-32.png and favicon-48.png, from icons/favicon/favicon.svg,
# so they have exactly the SVG's framing. Never edit the PNGs by hand: change the SVG and run this from the repo's root, then
# commit the results; consumers copy the files into their builds. (The home-screen icons are made by make-app-icons.sh.)
#
# Needs rsvg-convert (librsvg). It ignores the SVG's dark-mode rule, so the PNGs have the light-mode look: they are only the
# fallback for browsers without SVG tab icons.
set -euo pipefail

readonly SOURCE="icons/favicon/favicon.svg"
readonly OUT="icons/favicon"

# Writes one square PNG: <size in px>
make_favicon() {
  local size="$1"
  rsvg-convert --width "$size" --height "$size" "$SOURCE" -o "$OUT/favicon-$size.png"
}

make_favicon 32
make_favicon 48
echo "Favicons written to $OUT/"
