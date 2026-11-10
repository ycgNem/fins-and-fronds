# Decisions

Short records of choices that shape the code. Newest first.

## 2026-11-08 (0.3: the critique and improvement pass)

A full critique (playability, pacing, bugs, the first hour, the late game) found 188 problems.
Six packages fixed them in parallel; three more review rounds checked the merge and each round of
fixes, then a real-browser verification. The calls that shape the code:

- **The interface answers "why not?".** A disabled button still shows its tooltip and plays a
  soft refusal on click; an action that refuses toasts in red (`app.run`). Status text uses
  darker versions of the status fills (`UI.goodText` and friends), so colorblind-safe mode stays
  readable, and out-of-range readings carry an arrow.
- **"Good fit" predicts the water a tank is heading for.** `hints.heading` settles the water at
  equilibrium with the stones, soil, wood, heater and CO2, counts bagged fish as released, and
  the reasons name the cause ("the stones will push pH to ~8.2").
- **Hall news comes from the stats, not new sim events.** Star gains and new tank types get a
  chime and sparkle, a sharp wellbeing drop a red toast, and hall cards small attention badges.
- **Every tank the game sells is keepable at the tier that sells it.** Species arrive with the
  first tank big enough for them; chillers are rated in gallons (`BAL.chillDrop`) with one at
  every tier that sells cold-water animals; exhibits have a heat exchanger. Reef pH stops at
  calcite saturation (`BAL.calcitePh`, 8.3), active soil floors pH near 6.2, peat softens, and the
  thermostat snaps to its set point within `BAL.tempTol`. Tests check that every tank type can
  reach its temperature.
- **Breeding fills the room it has, then stops.** A brood needs room for the grown young in the
  filter and in the water (about 1.2 cm of animal per liter; inverts count 0.3 of their length),
  none past 150 animals. Fry do not count toward a species' limit; grown young past it go to the
  holding tank. Non-gentle filters take tiny fry; guarding parents raise one brood at a time.
  Stock racks keep a breeding group back (`sales.reserveOf`: the keep setting or the school size
  up to 10, or a pair), and the best animals stay as breeders.
- **Shoppers arrive as a Poisson stream** at a fixed average rate, so every game speed sells the
  same. Hunger eases in from 16 h and is real by 48 h: once a day is fine.
- **A save that will not load is never erased.** Continue keeps it, copies it to
  `fins-and-fronds/save.bad` and the title says so. Loading fills, repairs or drops every field,
  including all of 0.3's. Save version 3 turns old Conservation Fund levels into funded
  projects, dates old wood's soak from the tank's age (no stain notice storm on load) and
  keeps Pip's snail letter for shops that already cleared their snails.
- **Near-miss tank types must be reachable.** `archetype.couldBecome` drops a type whose hard
  rules want another water, animals from another water or corals in fresh water, so a
  freshwater tank of ribbon plants is never "close to" a Seahorse Tank, on the report card,
  in the Ideas or in letter progress.
- **Blackwater stays stained, a handful of leaves does not.** Soaked wood keeps a lasting tint
  (`BAL.woodTanninFloor` 0.4) and leaf litter stains by its area (`BAL.leafStain`), each patch
  capped at `BAL.leafStainMax` 0.8 of its strength: one catappa patch tints a tank up to 29 gallons
  amber (about 0.24) and activated carbon clears it; two patches, or leaves with wood, make
  blackwater, so Rio Negro and peat-swamp tanks stay recognized with the things their hints ask
  for. The cap sits below 1 so a single patch never hovers at the 0.3 those types require.
- **Kelp reads its light at its crown** (`facts.plantPar`): gas floats hold the blades up, so a
  new kelp in an 8.5 m tower is lit like its top, not its middle. Every other plant still reads
  halfway up.
- **Letters remember what answered them.** The tank, species and count are recorded when a
  letter becomes ready, and replies quote that, with natural fallbacks for older saves.
  `{k:one|many}` prints a count with its noun.
- **Letters the shop already answers still arrive**, as thank-yous that can be answered at once
  (`BAL.letterMetShare`, one open at a time). Correspondents write back a day later and quote the
  tank; each story ends in a keepsake (`ks:<correspondent>`), kept in the codex and shown on a
  shelf in the hall where there is room.
- **Coins turn into reputation through repeatable conservation projects** (`src/sim/projects.ts`),
  replacing the one-shot Conservation Fund; old fund levels carry over as fundings.
- **A week with visiting days, and a sleep button** (`src/sim/week.ts`): Tuesday's bench,
  Friday's school trip, Saturday's market, Sunday's judging. Clicking the Closed sign sleeps to
  9:00. Stock racks are behind the counter: they draw no visitors and earn only from sales.
- **Expeditions are for finds, not farming.** A haul is worth about 1.1x its cost, a region fished
  often gives less until it recovers, and each trip tries to bring something the supplier does
  not sell.
- **The Grand Oceanarium has an ending:** a two-shot finale that cannot be skipped, then Ida's
  last letter. Saves already at tier 5 see it once on load. Every top-tier letter waits for the
  finale (`state.seen` has it), so a shop that reaches the top overnight hears Ida first; open
  letters are never held.
- **Retuned with the scripted player.** Tiers at 0/130/450/2300/5800/13500 reputation,
  `repPerVisitor` 0.05, tank-type reputation (6 + 8 x tier) x appeal, saltwater animals x1.8 and
  brackish x1.3, substrate priced by floor area.
- **Touch and high-DPI screens are first-class.** The canvas is sized in device pixels and the
  interface scale is a whole number of them. A tap is a click even when the finger lifts off the
  canvas, one finger drags lists, two pan and pinch, and an upright phone gets a "turn sideways"
  card. Watch mode is zoom and pan only, with a Back button.
- **A drag is a preview until release.** Esc, a window, the hall or a tank switch put the piece
  back; pieces keep 40% of their width inside the glass (`BAL.edgeRoom`); hit tests use drawn
  pixels in paint order.
- **What floats over the tank stays in the view.** Coin and tap pops are placed in shares of the
  glass on a spot no other pop covers and inside `app.viewport()`, rise together (so they never
  meet), are trimmed at the view's edge and let go when the view or the glass size changes. The
  brass plaque hides when a zoomed tank's stand leaves the view. Racks and the hall keep their own
  layouts.
- **The pixel font keeps the accents it can draw.** `font.addAccents` builds a e i o u with an
  acute, n with a tilde and u with a diaeresis from the base glyphs (marks on the empty rows 0-1);
  `clean` keeps those and strips any other accent, so Tomas is Tomás and nothing draws as '?'.
- **Patch notes live in `src/data/patchnotes.ts`** and `CHANGELOG.md`. The What's new window
  opens once for a returning player after an update (seen version in localStorage), never for a
  new shop, never over Ida's tour, and stays under Menu.

## 2026-10-21 (second play-test pass)

- **Nothing overlaps, and the UI checks itself.** `ui.audit` records every text, button and panel
  a frame draws, and `ui.overlaps(propsDrawn)` lists text on text, text on another button, text
  under or spilling out of a panel, text off screen and shop props under the interface. Writing
  that belongs to a prop (the chalkboard, the corkboard badge) or a passing toast is drawn inside
  `ui.own(...)` and is not counted. The layouts give way rather than collide: an empty rack in a
  short row shows just its button, names shorten to leave room for the figure beside them, a prop
  that does not fit its corner is left out, the OPEN sign drops to its art's size in a narrow
  window, only the two newest toasts show, and while Ida's tour runs a window leaves her the wall
  on its left.
- **The backdrop shows whole, fading up into the water.** Cropping it to half the depth cut the
  scenery off at the sand. Now the full strip stands on the back of the substrate and thins out
  upward in a Bayer dither (the rest of the tank fades the same way), hazed 55% and drawn at 85%.
- **Heaters are rated in gallons, like the boxes in a real shop.** 50 W up to 10 gal, 150 W up to
  30, the new 200 W up to 50, 300 W up to 75, titanium 1000 W up to 250. A heater holds a tank of
  its rated size 5 C above the hall (`BAL.heatLift`), more in a smaller tank, less in a bigger
  one, and ratings add up, so two heaters work too. The Heat tab says whether each one is big
  enough for this tank, and the thermostat says when the heaters top out below it.
- **Ambient sound never loops audibly.** Noise buffers are 13.7 s, and the filter trickle is
  shaped by slow random drift instead of fixed-rate LFOs (two sines beat into a pattern that
  repeats every ten seconds). The trickle is about half as loud and softer (bandpass 1400 Hz,
  lowpass 3200 Hz); sponge filters and airstones send about a third as many bubbles.
- **Rocks and wood tilt.** `Placed.rot` (degrees as seen, steps of 15) turns the sprite through
  Scale2x twice before sampling, so edges stay clean, and the turned piece rests on its lowest
  pixel. Epiphytes and corals on it ride along; the scape height in the rating uses the turned
  box. `R` / `Shift+R` while placing or on the selected piece, or the tilt stepper on its card.

## 2026-10-21 (owner's play-test feedback)

- **The tank is yours, the backdrop is a hint.** The far backdrops stay but sit low (at most half
  the water depth) and faint, a change of look crossfades, and shrimp and snails only nudge which
  look is chosen, so a bag of cherry shrimp no longer swaps the whole background.
- **Ida's tour cannot be skipped, and neither can the cutscenes.** Instead the note has Back, to
  reread earlier steps (the current step keeps its place). The note lives in a band at the top of
  the tank view and the hall that both leave free, so it never covers a tank; over a window it
  moves to the wall beside it. Pointer targets remember their UI layer, so the pulsing outline
  never shows through a window.
- **A tank is heard only while you watch it.** The hall plays the room, the visitors and the rain;
  a tank's filter, air and pumps, its new fry and its sales play only on its own view. New fry get
  a soft bubble instead of the three-note chime (a breeding bristlenose pair chimed constantly).
- **Named animals are pets.** Any animal can be named from the Look panel (arrows step through the
  others of its kind); a named animal is never sold from a stock tank.
- **Slopes behave.** Pieces settle until their downhill side touches the sand; swimmers keep clear
  of the sand of the plane they are drawn in; bottom dwellers walk between rows instead of jumping
  and come to the front row for sunk food. Sculpting can heap sand to 1.45x the old limit.
- **Small art at 24 px.** The 16 px packs read as blobs beside the detailed art, so the 16 smallest
  animals and the 47 small plants and corals were redone at 24 px. They draw a little larger
  (an ember tetra is about 20 px, like a neon); readability wins over strict scale here.
- **Shop props at 1.25x**, the one fractional scale in the game (STYLE.md, Interface).
- **Pest snails hitchhike on 12% of plants** (was 30%). The scripted player climbs about 3% faster
  for it; the tier-time test bounds moved down slightly to match.

## 2026-10-21 (story, balance, sound, release)

- **GitHub Pages only.** The owner asked for no itch.io page until further notice; `master` deploys
  to https://ycgnem.github.io/fins-and-fronds/ through `.github/workflows/deploy.yml`.
- **You start with nothing in the window.** The old opening handed you a neglected tank; now the
  shop is empty and Ida's tour builds the first tank with you, ending with her seeded sponge so
  the first tank skips the three-week cycle (later tanks borrow media or wait).
- **Real cycle times.** A fishless cycle takes about three weeks of game time (RESEARCH.md); the
  old six days taught the wrong lesson. Seeding from a mature filter is the shortcut.
- **Visitors follow tank size, not tier.** The old per-tier base (20 to 200 visitors an hour per
  tank) made late income explode (a week at tier 5 went from 50k to 171k). Now a tank draws by
  its size, on a curve that flattens past 300 L and 3000 L, and the town grows only 50% across
  all tiers. A full tier-5 week is about 39k.
- **Balance by a scripted player.** `tests/bot.ts` plays like a careful human and the test
  suite holds the pacing: about 45 minutes to tier 1, 3 hours to saltwater. Real time is
  estimated at 3x speed while open, 10x while closed, plus time to scape.
- **Letters are goals.** A new letter asks for something the shop does not already do and leans
  to the current tier; unanswerable asks go back in the pile after six days so the queue never
  jams.
- **Synthesized sound, no samples.** The ambience and effects are built from noise, filters and
  oscillators in Web Audio: nothing to license, nothing to download, and every layer can follow
  the tank on screen.
- **Hand-painted when the model fails.** The PixelLab kuhli loaches came back as noisy pink worms
  and the first version read as a ladder, so the kuhli is hand-placed pixels in the palette.
- **Icons are drawn 32 px and halved by majority.** Buttons need 16 px; a 2x2 majority
  downscale (darker wins ties) keeps outlines where browser scaling drops every other pixel.
- **Accessibility options.** A larger interface fills the screen in quarter steps (softer
  pixels, bigger text); colorblind-safe mode swaps green and red for blue and orange.

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
