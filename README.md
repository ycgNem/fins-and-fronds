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
`[` `]` switch tanks, `Q` `W` `E` depth layer while placing, right-drag to pan a zoomed tank,
mouse wheel to zoom, `Esc` cancel / menu.

## Scripts

| | |
|---|---|
| `npm run dev` | dev server on port 5180 |
| `npm run build` | typecheck and build to `dist/` |
| `npm run typecheck` | `tsc --noEmit` for the game, then for `scripts/` and `e2e/` |
| `npm test` | Vitest: content integrity and simulation tests |
| `npm run e2e` | browser smoke test (Playwright; uses system Chrome if Playwright's own is missing), screenshot in `e2e/out/` |
| `npm run pixellab -- <tool> '<json>'` | call PixelLab from a script (`PIXELLAB_API_TOKEN` in the environment) |
| `Package for web.bat` | build and zip `dist/` for upload |

## Layout

| Path | What |
|---|---|
| `src/data/` | all content as typed records: species, plants, corals, hardscape, substrates, shells, equipment, regions, tank types, progression, guestbook |
| `src/sim/` | the headless simulation: water chemistry, wellbeing, tank-type recognition, rating, life, visitors, letters, expeditions, saves, player actions |
| `src/render/` | the tank view, creature behavior, procedural sprite generators, sprite cache |
| `src/ui/` | immediate-mode UI: HUD, mode panels, windows, title |
| `src/app/` | the app shell: input routing, camera, events, autosave |
| `src/engine/` | input, audio, random numbers |
| `src/art/` | imported sprite sheets (empty until the art milestones) |
| `art/` | the art pipeline and PixelLab budget |
| `scripts/` | PixelLab client and download helpers (TypeScript, run with vite-node) |
| `e2e/` | browser smoke test |
| `tests/` | Vitest suites |

## Docs

[PLAN.md](PLAN.md) milestones and status · [DESIGN.md](DESIGN.md) pillars and systems ·
[RESEARCH.md](RESEARCH.md) the aquarium research behind the content · [STYLE.md](STYLE.md)
art bible · [art/README.md](art/README.md) art pipeline · [DECISIONS.md](DECISIONS.md) ·
[PROGRESS.md](PROGRESS.md)
