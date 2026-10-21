# Fins & Fronds: Plan and Milestones

A cozy pixel-art aquarium tycoon where **the aquariums are the game**. You build, scape, stock
and care for every real kind of aquarium (planted Nature Aquarium and Iwagumi, Rio Negro
blackwater, Malawi rockwork, shrimp colonies, brackish mangroves, reefs, kreisels, kelp towers)
and the visitors, the shop and the people who write to you are felt but never drawn.

Design: [DESIGN.md](DESIGN.md). Research behind the content: [RESEARCH.md](RESEARCH.md).
Art bible: [STYLE.md](STYLE.md). Art pipeline and the PixelLab budget: [art/README.md](art/README.md).

## Where things stand (2026-10-21)

| | |
|---|---|
| Content | 189 species (129 fish, 20 shrimp, 12 snails, 9 crabs, jellies, cephalopods, stars, urchins, amphibians), 153 scape items (66 plants, 38 corals, 19 stones, 12 driftwoods, botanicals, decor, land), 13 substrates, 19 tank shells, 40 pieces of equipment, 27 regions, 63 recognizable tank types, 23 upgrades, 34 letters from 9 correspondents, 9 partnerships |
| Simulation | Nitrogen cycle with two bacteria populations, pH/GH/KH equilibrium from source water, substrate and hardscape, tannins, salinity and evaporation, oxygen, temperature, algae, glass film; per-species wellbeing; archetype recognition; five-part rating; visitors, coins, reputation and tiers; breeding (incl. Neocaridina color lines and grades); pests (pest snails vs assassin snails, Aiptasia, bubble algae); letters; expeditions; save, export, import and offline income |
| Story | You open Ida Fenwick's shut fish shop with no tank set up: an intro cutscene (the keys, the dusty shop, her note), Ida's tour through the first tank, a town-opening cutscene at the Town Aquarium tier |
| Presentation | Title screen, tank view with watch mode, six tank modes, seven windows, a hall that grows to 10 display bays and 8 stock racks, and the shop around them (street window with weather, clock, OPEN sign, chalkboard of offers, corkboard of letters, the cat). Tanks have dens, caves and burrowing animals, three depth planes, shadows and side glass |
| Economy | Visitors by tank size and rating, running costs, stock tanks that breed and sell, expeditions that pay their way, letters as goals, a conservation fund for late coins. Scripted playthroughs reach tier 1 in about 43 minutes and saltwater in about 3 hours |
| Sound | Synthesized ambience that follows the tank on screen (filter trickle, pump hum, surge, visitor babble, rain, bubbles, the door bell) and remade effects |
| Art | About 600 of 1000 planned PixelLab generations used. Imported art for all 189 species, 153 scape items, 13 water backdrops, 12 pieces of gear, 8 cutscene paintings, 11 shop props, 63 codex plates, 27 postcards and 27 icons and stamps |
| Checks | `npm run typecheck` clean, `npm test` 29/29 (including `tests/progression.test.ts`), `npm run e2e` smoke test (build, stock, save, reload), `e2e/scale.ts` (18 tanks), `e2e/windows.ts` (screenshots) |
| Live | https://ycgnem.github.io/fins-and-fronds/ (GitHub Pages from `master`) |

## Milestones

Each milestone ends with: typecheck clean, tests green, the game opened in the browser and
looked at, and PROGRESS.md updated. Gen counts are PixelLab generations (budget: 1000).

### M0 Scaffold - done
Vite + TypeScript (strict), one canvas, low-res buffer scaled by a whole number, folder
framework (`src/data`, `src/sim`, `src/render`, `src/ui`, `src/app`, `src/engine`, `src/art`,
`art/`, `scripts/`, `tests/`), Play.bat, packaging script, launch config.

### M1 Research and content - done
Research every kind of aquarium (RESEARCH.md) and encode it as typed data checked by
`tests/data.test.ts`. Acceptance: every region, species, item and archetype cites real
parameters; cherry shrimp, assassin snails, a dozen driftwoods, the nitrogen cycle, aquascaping
styles and saltwater alternatives are all in.

### M2 Simulation core - done
Pure, headless sim (`src/sim`) with an event queue. Acceptance: the starter tank rates 3-4
stars and is recognized; a fishless cycle completes in about six days with a nitrite spike;
assassin snails clear pest snails; an oscar eats neons; Iwagumi, Rio Negro and a jelly kreisel
are recognized; saves round-trip.

### M3 Playable vertical slice - done (procedural art)
Tank renderer (water looks per biotope, depth bands, light shafts, caustics, bubbles, tints,
night and moonlight, glass algae and fingerprints you scrape and wipe off), creature behaviors
(schools, bottom-gliders, glass crawlers, perchers, drifting jellies, land walkers, burrowing
garden eels, nocturnal hiding, feeding, startle on glass taps), and the full UI: Look, Scape,
Stock, Gear, Water, Care; Letters, Codex, Trips, Upgrades, Guestbook, Menu, New tank; the hall.
Verified in the browser: new game, report card, scraping and wiping the glass, placing stones
(the starter became a Nature Aquarium), stock predictions, gear, water, care, every window and
the hall, with no console errors. Still to prove end to end (M9): a full run from a new game to
tier 1 by playing only.

### M4 Art style lock - done (60 gens)
- Redesign away from Last Watt (STYLE.md, "Not Last Watt"): two PixelLab fonts (Fronds Text,
  Fronds Display), sea-glass and paper cards, floating chips, folder tabs and pills, a sage
  daylight hall. The UI buffer grew from 640x360 to at least 800x450 so the 10 px caps read at
  the same physical size, and every panel and window was laid out again.
- Importer (`scripts/sprites-import.ts`), review sheets (`scripts/art-review.ts`,
  `scripts/art-sheet.ts`) and the locked PixelLab settings (STYLE.md, art/README.md).
- Small animals get a head start in `pxForCm` so a neon reads at 18 px; imported art sets the
  drawn length.

### M5 Creatures - done (125 gens)
- Imported stills for all 189 species (four sheets), facing checked one by one on review sheets.
  Swim, crawl and pulse frames are derived by the importer; fry are the adult art at half size.
- Not done, optional: hand-animated cycles (`animate_image`) for the heroes. Neocaridina color
  lines are species of their own, so each already has its art; grades fade it as before.

### M6 Scape - done (63 gens)
- Imported art for all 153 items (five sheets) with derived sway for plants and soft corals.
  Imported items scale with growth and brown with poor health.
- Still to check (M9): the Nature Aquarium, Iwagumi, Rio Negro and mixed reef screenshots against
  reference photos, in played tanks.

### M7 Tanks, equipment and backdrops - done (29 gens)
- PixelLab far backdrops for 13 water looks, tiled and hazed behind the scape (`drawFar` in
  `src/render/tankview.ts`); open ocean keeps the procedural horizon.
- PixelLab sprites for the in-tank gear (lily pipes, heaters, sponge filter, HOB, powerheads,
  wavemakers, airstone, CO2 diffuser, mister), procedural fallback kept.
- Cabinet stands drawn from the wood ramp (black for reef-ready tanks), exhibits set into sage
  stone. Shell rims stay procedural. The hall centers its bays on the wall.

### Redesign: the shop story, many tanks and a deeper tank - done (250 gens)
- You start with an empty shop: an intro cutscene, Ida's tour (filter, heat, light, sand and
  slope, stone and wood, plants, her seeded sponge, fish, feeding, the report card, letters,
  codex, upgrades, the hall, the stock room), and a town-opening cutscene at tier 3.
- Tanks in gallons (5 to 125, plus cubes, bowfronts, exhibits); landscaping with sand types,
  slope and a sculpted profile.
- Selling and breeding: stock racks breed animals and plants for shoppers; display bays and
  racks fill the hall as the shop grows (verified with 18 tanks at 1280x720 and 1920x1080).
- A deeper tank (after TanksForNothing): caves and logs as dens with animals peeking out,
  burrowers that dig in with the head showing, territorial den keepers, night rest, depth
  planes with scale, shadows and side glass, watch mode.
- Water fixes from the critique: free ammonia by pH, oxygen saturation by temperature and
  salt, a three-week fishless cycle, seeding from a mature filter.

### M8 Interface, codex and correspondence - done (77 gens)
- 63 codex plates, 27 region postcards (also shown in the trip list), window and toolbar icons
  (16 px copies made by a 2x2 majority downscale), coin and reputation icons, 9 letter stamps
  and a postmark, the title emblem. Stationery colors stay procedural.

### M9 Balance and progression - done
- `tests/bot.ts` plays a careful run; `tests/progression.test.ts` asserts tier 1 in about 30-45
  minutes (43), saltwater in 3-4 hours (3), every tier in order, a tight early economy, upkeep,
  expedition value, the offline cap and that every letter can be answered by its tier.
- Visitors scale with tank size and a modest town factor; running costs; slower letters that
  ask for something not yet done; wild-caught premiums; a conservation fund.

### M10 Audio - done
- All synthesized instead of samples (no files to license or ship): ambience layers that follow
  the tank on screen and the hall, a visitor babble that rises with traffic, rain, bubbles and
  the door bell; remade effects; an Ambience slider.

### M11 Polish and access - done
- Larger interface option, colorblind-safe status colors, touch (pinch, two-finger pan, long
  press for help), hover help on coins, a two-column menu that scrolls on small screens.
  Performance: 18 tanks draw the hall in about 8 ms.

### M12 Release - done
- `e2e/smoke.ts` builds, scapes and stocks, scrapes, saves, reloads and continues.
- Deployed to GitHub Pages from `master` (no itch.io page until the owner asks).

## Gen budget

| Area | Planned | Spent |
|---|---|---|
| M4 style lock | 60 | 60 |
| M5 creatures | 320 | 125 |
| M6 scape | 170 | 63 |
| M7 tanks, equipment, backdrops | 100 | 29 |
| M8 UI, codex, letters, postcards, logo | 150 | 77 |
| Redesign: cutscenes, shop props, kuhli retry | (reserve) | 250 |
| **Total** | **1000** | **about 600** |

Batch packs of 64 candidates per call made creatures and small scape far cheaper than planned;
the savings can go to M8 or to animated hero cycles. Batch log: art/README.md.

## Open questions
- Whether tanks in the hall should show live animation (costly) or cached snapshots.
- How far to take real-time breeding genetics for Neocaridina (grades now; full color genetics later?).
- Whether expeditions should become a small map screen in M8 or stay a list with postcards.
