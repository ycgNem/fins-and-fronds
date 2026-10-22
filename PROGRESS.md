# Progress log

## 2026-10-21: play-test feedback pass

- Backdrops toned down (low, hazy, crossfading) and steadier: shrimp and snails barely change the look.
- Ida's tour: no Skip, a Back button, a note that keeps to a band above the tank (or beside a
  window), and no tutorial outline showing through a window. Cutscenes have no Skip either.
- Acclimation bags are bigger, crisp and show the actual fish inside. Shop props draw 1.25x.
- Sound only from the tank on screen; new fry are a soft bubble, not a chime.
- Sloped and sculpted substrate: items settle onto the sand, swimmers stay out of it, bottom
  dwellers walk between rows and reach sunk food; sand can be heaped higher.
- Name any animal (Look panel, with arrows through its kind); named animals are never sold.
- Pest snails hitchhike less often (12% of plants).
- Art (32 gens): 16 small animals and 47 small plants and corals redone at 24 px; new Ryuoh and
  Yamaya stones, hornwood and a hollow log (a cave for plecos and loaches).
- Checks: typecheck clean, 29/29 tests, smoke test passing; looked at in the browser at 1280x720
  (hall, tank view, tutorial note with Back, the stock tank window, a sloped scape at 6x, naming).

## 2026-10-21: the shop story, many tanks, M8-M12 and release

- The redesign the owner asked for: an empty shop and an intro cutscene where you get the keys,
  Ida's tour, a town-opening cutscene, tank sizes in gallons, landscaping (sand, slope, a
  sculpted profile), stock racks that breed and sell, and a shop around the tanks (street window
  with weather, clock, OPEN sign, chalkboard, corkboard, shelf, counter and a cat).
- After TanksForNothing: caves and logs as dens, peeking and burrowing, territorial keepers,
  depth planes, shadows, side glass, night rest, sand puffs from cories, watch mode (V).
- Multiple tanks scale: the hall grows to 10 display bays and 8 stock racks; 18 tanks run at
  about 8 ms a frame and a game week simulates in about a second (`e2e/scale.ts`).
- Critique fixes: modal windows, Esc order, confirmations, offline income, predation, many
  data errors (regions, hardness, salinity), free ammonia by pH, oxygen saturation, cycling.
- The kuhli loach read as a ladder: repainted by hand, and buried loaches show only their heads.
- M8: 63 codex plates, 27 region postcards, window and toolbar icons, coin and reputation icons,
  letter stamps and postmarks, the title emblem (77 gens; about 600 used in all).
- M9: a scripted player and progression tests; size-based visitors, upkeep, letter pacing,
  wild-caught premiums, the conservation fund, new tier thresholds.
- M10: synthesized ambience and effects that follow the tank on screen; Ambience slider.
- M11: larger interface, colorblind-safe colors, touch gestures, more hover help, a menu that
  fits small screens.
- M12: the smoke test builds, scrapes, saves, reloads and continues; pushed to Pages.
- Checks: typecheck clean, 29/29 tests, smoke, scale and window screenshots passing.

Next, if wanted: hand-animated hero cycles, reference-photo checks of the biotope tanks, more
bot templates (it never builds the tank types the letters ask for), and a real-player pass on
pacing.

## 2026-10-21: the redesign and art milestones M4-M7

- Redesigned the look so it no longer resembles Last Watt, the text above all: two PixelLab
  fonts (Fronds Text for reading, Fronds Display for titles, names and numbers), light
  sea-glass cards and paper, three floating chips instead of a top bar, folder tabs on the side
  card, window pills instead of a bottom tray, and a sage daylight hall with a wainscot and a
  wooden floor. The UI buffer is now at least 800x450 and every panel and window was laid out
  again (`src/ui/*`). STYLE.md records what Fins & Fronds never does.
- M4: importer, review sheets, locked PixelLab settings. Small animals got a head start in
  `pxForCm`.
- M5: imported art for all 189 species (four sheets); every facing checked and flipped by hand.
- M6: imported art for all 153 scape items (five sheets); imported items now scale with growth
  and brown with poor health instead of only showing at size 1.
- M7: far backdrops for 13 water looks, tiled and hazed behind the scape; sprites for the
  in-tank gear; a paneled wooden cabinet stand (black for reef-ready tanks); exhibits set into
  sage stone; the hall centers its bays.
- About 277 PixelLab generations (batch log in art/README.md).
- Typecheck clean; 16/16 tests; `npm run e2e` passes. Looked at in the browser at 1280x720:
  title tank, a saved game at night, the hall.

Next: M8 (UI icons, codex plates, stationery, postcards, logo) and the M6 reference-photo check
in played tanks.

## 2026-10-21: framework, content, sim and a playable slice

- Scaffolded the project (Vite + TypeScript strict) next to Sprocket & Sprout, sharing its
  palette, bitmap font, RNG and PixelLab scripts.
- Researched aquarium types in depth (RESEARCH.md) and wrote the content: 189 species,
  153 scape items, 13 substrates, 19 shells, 40 equipment, 27 regions, 63 tank types,
  23 upgrades, 34 letters, 9 correspondents, 9 partnerships.
- Built the simulation: water chemistry and the nitrogen cycle, wellbeing, tank-type
  recognition, the five-part rating, growth, breeding and Neocaridina color lines, pests and
  assassin snails, visitors, letters, expeditions, saves.
- Built the renderer and UI: procedural creatures (fish body plans plus shrimp, snails, crabs,
  crayfish, amphibians, jellies, octopus, cuttlefish, stars, urchins, slugs, isopods, seahorses),
  procedural scenery (stones, driftwoods, plants with sway, corals, decor), the tank scene, glass
  algae and fingerprints you scrape and wipe, creature behaviors, six mode panels, seven
  windows, the hall and the title screen.
- Checked in the browser: title, new game, report card, placing stones (the starter tank became
  a Nature Aquarium), stock predictions, gear, water, care, scraping, letters, codex, trips,
  upgrades, hall. No console errors.
- The tank now draws in window pixels at its own whole-number zoom (3x on a 1280x720 window)
  while the UI stays in 640x360 UI pixels, so the aquarium fills the screen instead of sitting
  small at 1x.
- PixelLab helper scripts converted to TypeScript (`scripts/*.ts`, run with vite-node) and
  type-checked with `tsconfig.scripts.json`; added the `e2e/smoke.ts` browser smoke test.
- Typecheck clean; 16/16 tests; build and smoke test pass.

Next: M4 art style lock (PLAN.md).
