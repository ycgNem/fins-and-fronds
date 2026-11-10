# Design

## Pillars

1. **The aquarium is the game.** The screen is a tank. Nearly every decision is about water,
   stone, wood, plants and animals; money and visitors exist to feed that.
2. **Real aquaria, made cozy.** Every tank type, parameter and pairing comes from real
   fishkeeping (RESEARCH.md), simplified until it reads at a glance but never wrong. Playing
   should teach you how to keep a real tank.
3. **Felt, not seen.** Visitors, shopkeepers, letter writers and the expedition captain are
   never drawn. You know them by nose prints on the glass, coins plinking into the box, a
   guestbook line, stationery colors and postcards.
4. **Clear rewards.** One rating per tank (five parts, stars), one codex to fill, letters that
   say exactly what someone wants, tiers that open new waters.
5. **Art is the product.** Placeholders are procedural so the game is always playable, but the
   final look is hand-directed PixelLab art under a strict style bible (STYLE.md).
6. **Gentle by default.** Gentle mode (on by default) lets animals sicken but never die.

## Core loop

Scape and stock a tank -> it gets recognized as a tank type and rated -> visitors come and pay
(coins) and talk about it (reputation) -> spend on gear, livestock, upgrades, expeditions and
conservation projects ->
tiers open new bays, waters (brackish at tier 2, marine at tier 3) and exhibits -> build the next
tank. Behind the counter, stock racks breed fish, shrimp and plants that shoppers buy; every tank
costs a little to run each day.

Tiers and the time a careful player takes to reach them (scripted playthroughs, 3x speed while
open and 10x while closed, `scripts/playthrough.ts`):

| Tier | Reputation | Bays + racks | Opens | About |
|---|---|---|---|---|
| Little Fish Shop | 0 | 1 + 1 | freshwater, the supplier's starter list | start |
| Neighborhood Fish Shop | 130 | 2 + 2 | CO2, bigger tanks, paludariums, expeditions, small chillers and coldwater natives | 30-45 min |
| Aquarium Store | 450 | 3 + 3 | brackish, bigger chillers, coldwater specialists | 75-100 min |
| Town Aquarium | 2300 | 5 + 4 | saltwater, reefs, koi pond, touch pool, the blue-spotted ray | 2.8-3.3 h |
| Regional Aquarium | 5800 | 7 + 6 | kreisels, kelp towers, SPS, sharks, ray lagoons | 3.9-4.5 h |
| Grand Oceanarium | 13500 | 10 + 8 | the ocean window, the deep chamber, the finale | 5.1-5.9 h |

After the finale the shop carries on: the codex, all 63 tank types, the late letters and the
projects are left to finish.

Extra Bays adds up to five more display bays across the tiers.

The **rating** (0-100, shown as half stars) is the central gate:

| Part | Weight | What it measures |
|---|---|---|
| Wellbeing | 27% | Each species' mood: water fit (temperature, pH, hardness, salinity), toxins, oxygen, school size, space, tankmates, habitat needs, food |
| Habitat | 20% | Clean, stable water, cycle, filter capacity, glass algae and nose prints, pests |
| Scape | 20% | Composition: fill, layers, focal point near a third, slope, materials, open water, plant health |
| Authenticity | 13% | How true the tank is to its recognized type (prestigious types count more) |
| Spectacle | 20% | Appeal of the animals, schools, partnerships, fry, corals, plants |

Stars: about 63 = 3, 78 = 4, 92 = 5.

## Systems

- **Water** (`src/sim/water.ts`): the nitrogen cycle, pH/GH/KH pulled toward the source water
  plus substrate and hardscape effects, tannins, salinity and evaporation, oxygen, algae and the
  glass film. Test strips read in steps; the Liquid Test Kits upgrade reads exactly. Carbonate
  sand and rock lift pH toward calcite saturation (8.3) and no further; active soil floors pH
  near 6.2; peat softens and acidifies. New wood leaches less as it soaks but keeps a lasting
  tint, leaf litter and cones stain by their area, and the first tea stain gets one note. Salinity stops at SG 1.040 without top-off. Most nitrifying bacteria live
  in the filter: take out the last one and about a quarter is left on the glass, gravel and wood.
  Heaters and chillers are both rated in gallons; exhibit life support and surge are sized to the
  exhibit. Plant light is measured at the plant's mid-height.
- **Wellbeing** (`src/sim/wellbeing.ts`): hard factors multiply soft factors; health drifts
  toward mood. Predation (an oscar eats neons), fin nipping, territorial fights, assassin snails
  eating pest snails.
- **Tank types** (`src/sim/archetype.ts`, `src/data/archetypes.ts`): 63 declarative recognizers
  with hard rules (must pass) and weighted soft rules (authenticity) whose failing hints become
  the advice in the report card.
- **Life** (`src/sim/life.ts`): plant and coral growth, trimming and fragging, breeding by type
  (livebearers, egg scatterers, cave spawners, mouthbrooders, bubble nests, shell dwellers,
  Neocaridina colonies with color grades and wild-type reversion), pests. A brood arrives only
  while the tank has room for the young once grown (the filter's capacity, about 1.2 cm of animal
  per liter, inverts at 0.3 of their length, none past 150 animals); fish are stressed past
  1.3 cm/L. Filters that are not gentle take half the tiny fry, guarding parents raise one brood
  at a time, and grown young past a species' per-tank limit move to the holding tank. Plant
  eaters graze soft plants (anubias, java fern, marimo, kelp and emersed plants are safe); reef-risk
  fish nip fleshy corals. Hunger eases in from 16 h and is real by 48 h.
- **Visitors** (`src/sim/visitors.ts`): visitors/hour per display tank from its size
  (`sizeFactor`: growing to 300 L, slower to 3000 L, slowest beyond), the town (a little more
  each tier), rating and type appeal; coins per visitor from upgrades; guestbook lines picked
  from what is in the tank; nose prints; glass taps that startle the fish; the door bell. Stock
  racks are behind the counter and draw no one. A whole decor set, the museum guide and funded
  projects add a few percent. A new tank type earns (6 + 8 x tier) x appeal reputation.
- **The week** (`src/sim/week.ts`): Tuesday is Dr. Reyes's bench (word follows wellbeing),
  Friday Room 4's school trip (visitors follow spectacle, fewer coins, more reputation), Saturday
  market day (more visitors and shoppers), Sunday the Driftwood Club's judging (word follows the
  scape, a rosette at 16:00 for the best real scape: at least four stones, roots, plants or
  corals, with animals or plants). Clicking the Closed sign sleeps until 9:00.
- **Projects** (`src/sim/projects.ts`): seven repeatable conservation and breeding projects at
  tiers 2-5. Each funding costs 1.5x and earns 1.3x the reputation of the last, sends a line from
  the people running it, and the first three add a little to every display's visitors.
- **Upkeep** (`src/sim/upkeep.ts`): power and water by size and water type, wear on the gear and
  food per animal, charged as the clock runs and shown on the report card.
- **Sales** (`src/sim/sales.ts`): a tank in a stock rack keeps a breeding group back (the keep
  setting or the school size up to 10, or a pair, and always the best animals) and sells the rest
  to shoppers, who arrive at random at an average rate set by the displays' visitors; plus
  cuttings and frags. Brighter Neocaridina grades and captive-bred saltwater fish sell for more.
  Saltwater animals cost 1.8x, brackish 1.3x; substrate is priced by floor area.
- **Letters** (`src/sim/letters.ts`, `src/data/progression.ts`): ten correspondents write 63
  letters; up to three are open at a time and the next favors the current tier. Most ask for
  something the shop does not do yet, but up to 40% (one at a time) are thank-yous for something
  it already does and can be answered at once. An ask left six days goes back in the pile for a
  while. Replying pays coins, reputation (about 5-9% of the climb to the next tier) and sometimes
  an unlock; some answers bring a reply a day later that quotes your tank, and each
  correspondent's story ends with a keepsake. Ida's last letter follows the finale.
- **Codex**: every species is listed, missing ones as silhouettes; Dr. Reyes's notebooks show
  where they live. Milestones and family plaques pay out, and the keepsakes are kept there.
- **Expeditions** (`src/sim/expeditions.ts`): send Captain Wren to a region; wild-caught animals
  come back to the holding tank (collectors pay a premium), stones and plants to storage, and
  the supplier can then order them. A haul is worth about 1.1x the trip to collectors (more with
  Better Nets); a region fished again soon gives 20% less per recent trip and recovers half a
  trip a day. Each trip tries to bring something the supplier does not sell, and some stones and
  plants come only from trips.
- **Dens and behavior** (`src/render/agents.ts`): shy animals claim a cave or log that fits them
  and peek out; burrowers with no den dig in, head showing; territorial keepers chase intruders
  off their door; schools share a depth; day fish rest low when the lights go out.
- **Sound** (`src/engine/audio.ts`): synthesized ambience that follows the tank on screen
  (`SoundScene`) and synthesized effects.
- **Supplier**: implied. You order from a catalog and the order floats in a bag for half an
  hour to acclimate before the fish swim out.

## The first hour

1. The intro: a rainy night, Ida Fenwick's keys, a dusty shop with bare stands and one empty
   tank by the window, a jar of her old filter sponges and her note. Morning comes.
2. Ida's tour builds the first tank with you: the 20 gallon long she picks out, a filter, heat and light, sand and slope,
   stone and wood, living plants, a squeeze of her old sponge so the tank is cycled, a school of
   fish floated in their bag (ten neons or eight harlequins), the first feeding, the report
   card. The shop opens.
3. Ida's two letters arrive first; then a letter every few hours, each asking for something the
   shop does not do yet (a school of eight, three kinds of plants, something that glows).
4. Upgrades (test kits, benches, a feeding rota) and a stock rack of breeding guppies come next.
   Around 30 minutes in, the Neighborhood Fish Shop tier opens a second bay and expeditions; a
   new tank borrows media from the first, or cycles for about three weeks on its own.

## Out of scope (for now)

Drawn people, a visible shop interior, combat, timed failure states, real-money anything.
