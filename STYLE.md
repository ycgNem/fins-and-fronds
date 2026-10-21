# Style bible

The look: a calm, sage-green aquarium hall in daylight, and inside each glass box a bright,
living world. Clean readable silhouettes, soft water light, saturated animals against calmer
scenery, and an interface of light sea-glass cards and paper that sits on the wall like signage.
References for mood (never to copy): Takashi Amano's Nature Aquarium photographs, Monterey
Bay Aquarium exhibits, cozy pixel-art games with strong palettes.

## Not Last Watt (redesign, 2026-10-21)

The owner's call: Fins & Fronds must not look like Last Watt (`Documents/candlepower`), and the
text especially. Until this redesign both games used the same 7 px bitmap font from the shared
kit and the same dark slate panels. What Last Watt does, and Fins & Fronds never does:

| Last Watt (do not) | Fins & Fronds (do) |
|---|---|
| The shared 7 px-cap, 1 px-stroke bitmap font | Two PixelLab faces: Fronds Text (rounded, 2 px strokes, 10 px caps) and Fronds Display (bubbly bold) for headings, names and big numbers (`src/ui/font.ts`) |
| Dark navy and slate rectangles with a 1 px light rim | Light sea-glass cards (`#c7dcd0`) with pixel-rounded corners, a soft drop shadow and dark ink text |
| A full-width black strip of tiny labels along the top | Three floating chips on the wall: aquarium and tank, clock and speed, reputation and coins |
| A bottom tray of square slab buttons in framed groups | Mode folder tabs on top of the side card; window pills along the bottom edge, no tray |
| A near-black world where lit things glow | A sage papered wall, a wainscot and a wooden floor; the tanks are the bright things |
| Amber and violet status colors, uppercase stat labels | Teal and gold pills with a pressable lip, sentence-case labels, green / orange / red moods |

If a new screen starts to look like a dark box with small pale text, it is drifting toward
Last Watt: put it on sea glass or paper instead.

## Palette

- **Resurrect 64** (Kerrie Lake), defined in `src/data/palette.ts` as `PALETTE` and named ramps
  (`RAMP.teal`, `RAMP.wood`, `RAMP.sand`...). Every sprite pixel is a palette color.
- Records name ramps, not raw colors (a neon tetra is `body: 'blue', accent: 'red'`), so a
  recolor is one edit.
- The one exception: **scene light and water grading** (water tints, tannins, green water, the
  milk of a bacterial bloom, light shafts, caustics, night, moonlight and actinic blue, the haze
  over the back layers) may blend off-palette, because it is light passing through water, not
  paint on a sprite.

## Scale and sizes

- Tank pixels are drawn 1:1, then the whole tank is scaled by a whole number (usually 3x-4x on
  screen). The UI has its own buffer of at least 800x450 UI pixels, scaled by a whole number
  (1x at 1280x720, 2x at 1920x1080).
- **Creatures: small animals get a head start** (8 px + 3.3 px per cm up to 12 cm: a 3 cm neon
  is 18 px, a 2.5 cm cherry shrimp 16 px, a 12 cm angelfish 48 px), then compressed so big fish
  still fit (`pxForCm` in `src/data/species/define.ts`). Imported art sets the final drawn
  length (`creatureLength`). Fry are the adult art at half length.
- Scape items have a footprint `w x h` in pixels at size 1; plants and corals grow and shrink.
- Tanks: the starter is 240x136 interior; exhibit tanks go up to 960x300.

## Drawing rules

- Light from the **upper left**. Bodies shade top-light to belly-dark; bellies use the lighter
  belly ramp.
- **Outlines**: creatures get a dark 1 px outline (palette 0). Stones and wood get a selective
  outline (bottom and right only) so they sit into the scene. Plants outline in their own darkest
  green so they stay soft.
- Ordered **Bayer dithering** for gradients (backdrops, bodies, substrate), never noise dither.
- Every creature faces **right**; the renderer mirrors.
- Animation: 4 frames for swimming and crawling (tail beat, leg shuffle, jelly pulse); 4 frames
  of sway for plants and soft corals. Stones, wood and decor are still.
- Depth: three layers (back, middle, front). Back items sit higher on the sloped substrate and
  get a light water haze; front items are crisp.
- Readability first: a species must be recognizable at its in-game size from its silhouette and
  two colors (cardinal vs neon tetra: the red runs the full belly on a cardinal).

## Water looks

Fourteen backdrops (`LOOKS` in `src/render/tankview.ts`): clear, green, blackwater, amber, rift,
brackish, reef, lagoon, kelp, cold, pelagic, deep, pond, cave. Each is a 5-step palette gradient
from surface to floor plus a far silhouette tone and a haze tone. The look is chosen from the
water type, the shell, the residents' home region and the tank's state (tannins, green water).

## Interface

Everything is drawn by `src/ui/ui.ts` from the tokens in `UI` (`src/data/palette.ts`).

- **Type.** Fronds Text for everything you read; Fronds Display (`u.head`) for card titles,
  window titles, tank names, the plaque and big numbers. Both are 14 px cells, caps on rows
  1-10, baseline row 10, so they share a line. Body line height 15, labelled rows 17, sprite
  rows 26-32. Ink is dark (`text`, `strong`) on light; white text only on teal, green or red.
- **Cards.** Sea glass (`panel` #c7dcd0) with a dark sage outline (`edge`), a white top edge, a
  greyer foot and a 3 px drop shadow, corners rounded 4. Insets (wells for sprites and lists)
  are a darker wash of `panelLo`. Letters, postcards, the guestbook and guestbook slips are
  paper (`paper`, ink `paperInk`).
- **Buttons.** Pills with a 2 px lip that sinks when pressed: teal (normal), green (good), red
  (bad), white with an outline (flat, for tabs and small controls), gold (`pick`) when selected.
- **Tabs.** The six tank modes are folder tabs along the top of the side card; the selected tab
  joins the card. Inside cards, pill tabs in rows.
- **The wall.** Sage gradient (`wallTop` to `wallBottom`) with a faint frond-sprig wallpaper, a
  pale chair rail at 70%, wainscot boards, a dark wooden floor. Chips and pills float on it.
- **Colors with meaning.** Coins: a gold coin icon (`coin`) and rust price text (`gold`).
  Reputation: teal (`accent`). Moods and readings: green / orange / red (`good`, `warn`, `bad`).

## PixelLab settings (locked in M4, 2026-10-21)

Pass the Resurrect 64 hex list as `palette` wherever a tool takes one, and `view: "sidescroller"`
(objects) or `view: "side"` (Pixen). The importer snaps every pixel to the palette either way.

| Asset | Tool | Size | Notes |
|---|---|---|---|
| Creatures up to about 40 px | `create_1_direction_object` with `item_descriptions`, one species per slot | 16, 24 or 36 (64 candidates per call, 10-15 gens) | The model ignores "facing right": check every sprite on the review sheet and set `flip` in the batch |
| Creatures over 40 px | `create_image_pixen`, `no_background`, `direction: east`, single black outline | the species length by its body height, multiples of 4 | 1 gen each. Wide canvases sometimes come back with two animals (`crop` one) or a painted ground shadow (regenerate with "no shadow, no ground") |
| Small scape (to 40 px) | `create_1_direction_object` as above | 16, 24 or 40 | Fill the spare slots with second takes of the hard items (carpets, floaters, polyps) |
| Large scape | `create_image_pixen`, selective outline | the footprint rounded up to multiples of 4, at least 32 | Say "growing from gravel, no pot" for plants and "filling the frame" for rocks |
| Far backdrops (`bg:<look>`) | `create_image_pixen`, `no_background`, lineless, low detail | 320x96 | Say "fully underwater, no water surface, no sky". Tiled with every other tile mirrored and washed with the look's haze tone in game. Open ocean (`pelagic`) keeps the plain procedural horizon |
| Equipment (`eq:<name>`) | `create_1_direction_object` | 24 | Glass parts import at 0.7-0.85 alpha |
| Fonts | `create_font` | atlas of 8 columns by 10 rows | Built into `src/ui/fonts/*.ts` by `scripts/font-build.ts` |
| Stands and frames | procedural, not PixelLab | | Resurrect 64 has few mid browns, so PixelLab wood snaps to olive and pink. The cabinet is drawn from `RAMP.wood` |

Animation frames are derived by the importer (tail beat, leg shuffle, jelly pulse, sway), so
`animate_image` is not part of the pipeline yet.
