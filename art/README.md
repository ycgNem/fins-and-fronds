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
| creatures-1 | species up to 24 px (24 px packs; shrimp and the 16 smallest animals redone at 24) | 64 |
| creatures-2 | 25-37 px species (36 px pack) | 41 |
| creatures-3 | 41-61 px species (56 px packs, cleaned) | 33 |
| creatures-4 | the largest species (Pixen, one each) | 51 |
| scape-1 | hero hardscape and Amazon sword (48 px pack); Ryuoh and Yamaya stone, hornwood and the hollow log (Pixen) | 15 |
| scape-2, scape-3, scape-4 | small scape (scape-2 redone at 24 px, fittonia and three Euphyllia corals by Pixen), 24 and 40 px (64-slot packs) | 47, 37, 37 |
| scape-5 | stems, ribbons, kelp, lotus, banks, galleon (Pixen) | 21 |
| backdrops | far strips for 13 water looks | 13 |
| equipment | in-tank gear | 12 |
| cutscenes | the intro (keys, dusty shop, note, morning) and the town opening (cs:) | 8 |
| shop | props around the tanks: counter, cat, shelf, plants, poster, buckets, chalkboard, supplies, notice board, OPEN sign (sh:) | 11 |
| plates | codex plates, one per tank type (pl:<archetype>) | 63 |
| icons | window and tab icons, coin, reputation, letter stamps, postmark, scroll, title emblem (ui:, st:) | 27 |
| postcards | one picture per collecting region (pc:<region>), cropped inside the drawn border | 27 |

The kuhli loach in creatures-4 is hand-painted (the PixelLab candidates were noisy pink worms;
the first version read as a ladder). The old one is kept in `art/raw/old/`, as are the 16 px
creatures-1 and scape-2 sprites that the detail pass replaced.

All 189 species and all 153 scape items have imported art.

## Budget

The plan's budget was 1000 generations for M4-M8 plus reserve. M4-M8 and the redesign art used about 600.

| Milestone | Area | Planned | Spent | Status |
|---|---|---|---|---|
| M4 | Style lock: two fonts, heroes, backdrop, importer | 60 | 60 (fonts 45, hero pack 15) | done |
| M5 | 189 species stills (swim, crawl and pulse frames derived) | 320 | 125 | done |
| M6 | 153 scape items (sway frames derived) | 170 | 63 | done |
| M7 | 13 backdrops, 12 pieces of equipment, stand tries | 100 | 29 | done |
| M8 | Icons and stamps, 63 codex plates, 27 postcards, logo emblem | 150 | 77 (plates 40, icons 10, postcards 27) | done |
| Redesign | Intro and town cutscenes, shop props, a kuhli retry | (reserve) | 250 (cutscenes 120, shop 120, kuhli 10) | done |
| Feedback | 16 small animals and 47 small plants and corals at 24 px, 4 new stones and woods | (reserve) | 32 | done |
| | **Total** | **1000** | **about 632** | |

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
| 2026-10-21 | Cutscenes: 8 Pro scenes at 400x224, two retried after timeouts | 120 | style ref for the later scenes was intro_inside |
| 2026-10-21 | Shop props: 11 Pro props, the counter twice | 120 | styled from intro_inside so the shop matches the intro |
| 2026-10-21 | Kuhli loach Pro retry (64 candidates at 48x16) | 10 | none used: hand-painted instead |
| 2026-10-21 | Codex plates: four 64 px 16-packs (63 plates + the emblem) | 40 | every candidate used, in archetype order |
| 2026-10-21 | Icons: one 32 px pack of 26 | 10 | 15 icons, 9 stamps, postmark, scroll; 16 px copies made at runtime (majority 2x2) |
| 2026-10-21 | Postcards: 27 Pixen at 160x96 | 27 | 2 resubmitted after the 10-job limit; cropped 6 px for the drawn borders |
| 2026-10-21 | Detail pass: 24 px creature pack for the 16 smallest animals (ember tetra, chili rasbora, CPD, endler, dwarf seahorse, comb jelly, Thai micro crab, nerites and other snails, tuxedo urchin) | 10 | the 16 px pack read as blobs next to the 24-36 px art; drawn about 20 px now. Trumpet snail rotated to crawl |
| 2026-10-21 | Detail pass: 24 px scape pack for all 47 scape-2 plants, corals and decor | 10 | fittonia, hammer, torch and frogspawn came back as noise: 4 Pixen redos at 24x24, black outline softened (plants: darkest green) |
| 2026-10-21 | New hardscape: Ryuoh stone, Yamaya stone, hornwood (Talawa), hollow log; 2 Pixen takes each | 8 | the log snapped to olive like other PixelLab wood: repainted onto the taupe ramp by luminance |
