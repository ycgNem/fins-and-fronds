# Art pipeline

Every sprite in the game has a name. Until real art exists for a name, a procedural generator
draws it (`src/render/art/creatures.ts`, `src/render/art/scenery.ts`), so the game is always
complete. Real art replaces sprites one sheet at a time without code changes.

## Names

| Name | What |
|---|---|
| `sp:<species>` or `sp:<species>:<0-3>` | creature still or swim frame, facing right; the art's width is the adult's drawn length |
| `it:<item>` or `it:<item>:<0-3>` | scape item at size 1 (sway frames for plants and soft corals); other sizes scale it, poor health browns plants |
| `bg:<look>` | far backdrop strip for a water look, tiled along the back of the tank |
| `eq:<name>` | visible equipment: `sponge_filter`, `heater`, `titanium_heater`, `lily_in`, `lily_out`, `powerhead`, `wavemaker`, `airstone`, `co2`, `feeder`, `mister`, `hob` |
| `ui:<name>` | interface pieces (planned, M8) |

Ids come from `src/data` (for example `sp:cherry_shrimp:2`, `it:spider_wood`).

## Flow

1. Generate with PixelLab (MCP tools `mcp__pixellab__*`, or `npm run pixellab -- <tool> '<json>'`
   with `PIXELLAB_API_TOKEN` in the environment; never write the token to a file). Settings per
   asset type are in STYLE.md.
2. Download candidates into `art/raw/try/<pack>/` (scratch, ignored by git):
   `npx vite-node scripts/pl-fetch.ts frames <frame_0 url> <count> <dir>` for object packs,
   `curl -sL https://api.pixellab.ai/mcp/images/<job_id>/download` for Pixen images.
   `npx vite-node scripts/art-sheet.ts <dir> [scale] [cols]` writes a numbered contact sheet.
3. Copy the chosen candidates to `art/raw/<sheet>/<id>.png` and list them in
   `art/batches/<sheet>.json`:
   ```json
   { "sheet": "creatures-4", "clean": true, "sprites": {
       "sp:koi": "art/raw/creatures-4/koi.png",
       "sp:oscar": { "src": "art/raw/creatures-4/oscar.png", "flip": true },
       "sp:bamboo_shark": { "src": "...", "crop": [62, 0, 106, 48] },
       "sp:glass_catfish": { "src": "...", "alpha": 0.75 } } }
   ```
   `flip` mirrors to face right, `crop` takes part of the source, `alpha` makes see-through
   animals and glass, `clean` keeps only the main shape (drops captions and slivers of
   neighboring cells that some packs return; leave it off for items made of several pieces,
   like leaf litter or pebbles), `anim` overrides the derived animation.
4. Import: `npx vite-node scripts/sprites-import.ts <sheet>` snaps to Resurrect 64, trims, derives
   the 4 animation frames, sets anchors and writes `src/art/<sheet>.png` + `.json` (format in
   `src/art/README.md`) and a 3x preview in `art/raw/`.
5. Review: `npx vite-node scripts/art-review.ts <sheet> [scale] [cols]` draws every sprite with
   its name (`art/raw/<sheet>-review.png`). Check facing, size and stray pixels, fix the batch,
   import again.
6. Run the game: imported names win over procedural ones automatically
   (`loadImportedArt` in `src/render/art/sprites.ts`).

## Sheets

| Sheet | What | Count |
|---|---|---|
| creatures-1 | species up to 24 px (16 and 24 px packs, shrimp redone at 24) | 64 |
| creatures-2 | 25-37 px species (36 px pack) | 41 |
| creatures-3 | 41-61 px species (56 px packs, cleaned) | 33 |
| creatures-4 | the largest species (Pixen, one each) | 51 |
| scape-1 | hero hardscape and Amazon sword (48 px pack) | 11 |
| scape-2, scape-3, scape-4 | scape up to 16, 24 and 40 px (64-slot packs) | 47, 37, 37 |
| scape-5 | stems, ribbons, kelp, lotus, banks, galleon (Pixen) | 21 |
| backdrops | far strips for 13 water looks | 13 |
| equipment | in-tank gear | 12 |

All 189 species and all 153 scape items have imported art.

## Budget

The plan's budget was 1000 generations for M4-M8 plus reserve. M4-M7 used about 280.

| Milestone | Area | Planned | Spent | Status |
|---|---|---|---|---|
| M4 | Style lock: two fonts, heroes, backdrop, importer | 60 | 60 (fonts 45, hero pack 15) | done |
| M5 | 189 species stills (swim, crawl and pulse frames derived) | 320 | 125 | done |
| M6 | 153 scape items (sway frames derived) | 170 | 63 | done |
| M7 | 13 backdrops, 12 pieces of equipment, stand tries | 100 | 29 | done |
| M8 | UI skin and icons, 63 codex plates, stationery, 27 postcards, logo | 150 | | |
| | Reserve | 200 | | |
| | **Total** | **1000** | **about 277** | |

## Batch log

| Date | Batch | Gens | Notes |
|---|---|---|---|
| 2026-10-21 | Fonts: Fronds Text, Fronds Display, a rejected 8 px text face | 45 | the redesign away from Last Watt's font |
| 2026-10-21 | Creature packs: 16, 24 and 36 px, shrimp at 24, three 56 px 16-packs | 70 | 56 px packs return captions and neighbor slivers: `clean` |
| 2026-10-21 | Creature Pixen: 2 tests, 49 large species, 4 redos (koi, bamboo shark, spider crab, horseshoe crab) | 55 | facing flipped per sprite after review |
| 2026-10-21 | Scape packs: 48 px heroes, 16, 24, 40 px | 50 | every primary pick used except pagoda stone |
| 2026-10-21 | Scape Pixen: 20 large items, pagoda stone, 7 redos | 28 | redos: potted ambulia, cactus-like aponogeton, blob elodea, tiny ceramic rock, banks, galleon |
| 2026-10-21 | Backdrops: 14 looks, 3 redos | 17 | pelagic dropped (fish school too heavy); stays procedural |
| 2026-10-21 | Equipment pack (24 px), two cabinet tries | 12 | cabinets snapped badly to the palette; stand is procedural |
