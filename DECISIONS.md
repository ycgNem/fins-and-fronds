# Decisions

Short records of choices that shape the code. Newest first.

## 2026-10-21 (redesign and art)

- **Not Last Watt.** The owner disliked how close the text and panels were to Last Watt. Fins &
  Fronds has its own PixelLab fonts and a light, daylight look; the shared 7 px font and dark
  slate panels are gone (STYLE.md, "Not Last Watt").
- **UI buffer of at least 800x450.** The new text face has 10 px caps and 2 px strokes, so the UI
  reference grew from 640x360 to 800x450 to keep it at about the same size on screen. The UI
  scale is the whole-number floor of min(width / 800, height / 450).
- **Small animals get a head start.** `pxForCm` adds 8 px before 3.3 px per cm, so a 3 cm neon
  is 18 px and stays readable; imported art then sets the drawn length (`creatureLength`).
- **Packs for small art, Pixen for big art.** 64-candidate object packs (10-15 gens) for
  everything up to about 40 px; one Pixen image (1 gen) per large species or item on an exact
  canvas.
- **Facing is fixed in the batch, not the prompt.** PixelLab ignores "facing right", so every
  sprite is checked on a review sheet and mirrored with `flip`.
- **Animation is derived.** The importer makes the 4 swim, crawl, pulse or sway frames from the
  still; hand-animated cycles are optional polish.
- **Procedural where the palette fights the model.** Wooden stands came back olive and pink
  after snapping to Resurrect 64, so the cabinet is drawn from `RAMP.wood`; open ocean keeps
  its plain horizon.

## 2026-10-21

- **One low-res buffer for everything.** (The size is superseded above: now at least 800x450.)
  The canvas backing store is about 640x360 and CSS
  scales it by a whole number; the UI draws into it 1:1 and each tank renders into its own
  canvas at native size, then scales by a whole-number zoom (or 0.5 for huge exhibits). Keeps
  every pixel square without a separate UI scale.
- **Procedural placeholders behind sprite names.** Every creature and item is drawn from its
  data (body plan, pattern, ramps, shape) and cached; imported sheets override by name. The game
  is complete before any PixelLab spend, and art can land in any order.
- **Visitors, shop and people are implied.** No character sprites: coins, nose prints, taps,
  guestbook lines, letters and postcards carry them. Saves the art budget for the tanks.
- **Sim is pure and evented.** `src/sim` never touches the DOM; the app drains `game.events`
  each frame for sounds, toasts, coin pops, feeding and startles. Tests run the sim headless.
- **Tank types are data.** 63 archetypes are declarative rule lists; the same rules give
  recognition, the authenticity score and the advice text.
- **Stock predictions use the real mood model.** The order list runs `speciesMoods` on a copy of
  the tank with the new animals added, so the "ok / ! / x" marks can never disagree with what
  happens after purchase.
- **Gentle mode on by default.** Animals can sicken but never die unless the player turns it off.
- **1 real second = 1 game minute at 1x** (speeds pause, 1x, 3x, 10x); open 9:00-19:00; night
  openings to 23:00 with the upgrade. Offline income is capped (8 game hours).
- **Test strips vs liquid kits.** Without the upgrade, water readings snap to test-strip steps;
  the upgrade shows exact values.
- **TypeScript strict from the first commit** (global rule), Vite, Vitest.
