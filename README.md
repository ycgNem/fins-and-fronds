# Fins & Fronds

A cozy pixel-art aquarium tycoon for the browser. Scape, stock and care for every real kind of
aquarium (Iwagumi stones and Nature Aquarium driftwood, Rio Negro blackwater, Malawi rockwork,
cherry shrimp colonies, brackish mangroves, reefs, jelly kreisels and kelp towers) while the
visitors who pay for it all stay off-screen: you only see their nose prints on the glass.

TypeScript (strict) + Vite, one Canvas 2D, no engine.

## Play

- Online: https://ycgnem.github.io/fins-and-fronds/ (deployed from `master` by
  `.github/workflows/deploy.yml`)
- Double-click `Play.bat`, or
- `npm install` then `npm run dev` and open http://localhost:5180

Controls: mouse for everything. Keys: `1`-`6` tank modes, `Space` pause, `F` feed, `H` hall,
`V` watch a tank full screen, `[` `]` switch tanks, `Q` `W` `E` depth layer while placing,
`R` / `Shift+R` tilt a rock or wood (while placing it, or once it is selected), right-drag to pan a zoomed tank, mouse wheel to zoom, `Esc` cancel / menu. Touch: tap, pinch to
zoom, two fingers to pan, hold for help. The menu has a larger interface and colorblind-safe
colors.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server on port 5180 |
| `npm run build` | typecheck and build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` for the game, then for `scripts/` and `e2e/` |
| `npm test` | Vitest: content integrity and simulation tests |
| `npm run e2e` | browser smoke test (Playwright; uses system Chrome if Playwright's own is missing): new shop, intro, first tank, every mode and window, save and reload; screenshot in `e2e/out/` |
| `npx vite-node e2e/scale.ts` | 18-tank late game: frame times at 1280x720 and 1920x1080 and a simulated week |
| `npx vite-node e2e/shots.ts [hour]`, `e2e/windows.ts` | screenshots of the hall, tanks, dens, watch mode, the title, codex, letters, trips and menu |
| `npx vite-node scripts/playthrough.ts [seed] [days] [log]` | a scripted playthrough: tier times, coins by day, letters and expeditions |
| `npm run pixellab -- <tool> '<json>'` | call PixelLab from a script (`PIXELLAB_API_TOKEN` in the environment) |
| `Package for web.bat` | build and zip `dist/` for upload |

## Layout

| Path | What |
|---|---|
| `src/data/` | all content as typed records: species, plants, corals, hardscape, substrates, shells, equipment, regions, tank types, progression, guestbook |
| `src/sim/` | the headless simulation: water chemistry, wellbeing, tank-type recognition, rating, life, visitors, upkeep, sales, letters, expeditions, saves, player actions; every tuning number in `balance.ts` |
| `src/render/` | the tank view, creature behavior, procedural sprite generators, sprite cache |
| `src/ui/` | immediate-mode UI: HUD and hall, mode panels, windows, title, cutscenes, Ida's tour |
| `src/app/` | the app shell: input routing, camera, events, autosave |
| `src/engine/` | input (mouse, keys, touch), synthesized audio, random numbers |
| `src/art/` | imported sprite sheets: creatures, scape, backdrops, gear, cutscenes, shop, plates, icons, postcards |
| `art/` | the art pipeline and PixelLab budget |
| `scripts/` | PixelLab client and download helpers (TypeScript, run with vite-node) |
| `e2e/` | browser smoke, scale and screenshot runs |
| `tests/` | Vitest suites: content, simulation, progression (with the scripted player in `tests/bot.ts`) |

## Docs

[PLAN.md](PLAN.md) milestones and status · [DESIGN.md](DESIGN.md) pillars and systems ·
[RESEARCH.md](RESEARCH.md) the aquarium research behind the content · [STYLE.md](STYLE.md)
art bible · [art/README.md](art/README.md) art pipeline · [DECISIONS.md](DECISIONS.md) ·
[PROGRESS.md](PROGRESS.md)
