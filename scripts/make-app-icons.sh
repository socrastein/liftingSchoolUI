#!/usr/bin/env bash
# Makes the home-screen icons in icons/app/ from icons/logo.svg, for any site or app of the business that can be installed
# or bookmarked to a home screen. Run it from the repo's root when the logo or the page colour changes, and commit the results;
# consumers copy the files into their builds.
#
# Needs rsvg-convert (librsvg) and magick (ImageMagick).
#
# Each icon is the logo centred on the light page colour (--bgBase, read from css/tokens.css), the look of the business site's
# apple-touch-icon. The logo's share of each square:
#   ordinary icons 76%:  about the margin that apple-touch-icon has.
#   maskable icon  56%:  Android crops a maskable icon to any shape inside the central circle of 80% of its width
#                        (the "safe zone", https://web.dev/articles/maskable-icon). At 56% wide the logo's corners reach
#                        38% of the width from the centre, inside that circle's 40% radius.
set -euo pipefail

readonly LOGO="icons/logo.svg"
readonly OUT="icons/app"
# The first --bgBase in tokens.css is light mode's (:root comes before .dark): "  --bgBase: #e9edf7;" -> "#e9edf7"
BACKGROUND="$(grep -m1 -- '--bgBase:' css/tokens.css | sed -E 's/.*:[[:space:]]*(#[0-9a-fA-F]+);.*/\1/')"
readonly BACKGROUND

# Writes one square icon: <size in px> <logo's share of the width, in percent> <file name>
make_icon() {
  local size="$1" logo_percent="$2" name="$3"
  local logo_width=$((size * logo_percent / 100))
  rsvg-convert --keep-aspect-ratio --width "$logo_width" "$LOGO" |
    magick -size "${size}x${size}" "xc:$BACKGROUND" - -gravity center -composite -depth 8 -strip "$OUT/$name"
}

mkdir -p "$OUT"
make_icon 180 76 apple-touch-icon.png
make_icon 192 76 icon-192.png
make_icon 512 76 icon-512.png
make_icon 512 56 icon-maskable-512.png
echo "Icons written to $OUT/ on $BACKGROUND"
