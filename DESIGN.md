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
(coins) and talk about it (reputation) -> spend on gear, livestock, upgrades and expeditions ->
tiers open new bays, waters (brackish at tier 2, marine at tier 3) and exhibits -> build the next
tank. Behind the counter, stock racks breed fish, shrimp and plants that shoppers buy; every tank
costs a little to run each day.

Tiers and the time a careful player takes to reach them (scripted playthroughs, 3x speed while
open and 10x while closed, `scripts/playthrough.ts`):

| Tier | Reputation | Bays + racks | Opens | About |
|---|---|---|---|---|
| Little Fish Shop | 0 | 1 + 1 | freshwater, the supplier's starter list | start |
| Neighborhood Fish Shop | 130 | 2 + 2 | CO2, bigger tanks, paludariums, expeditions | 45 min |
| Aquarium Store | 450 | 3 + 3 | brackish, chillers, coldwater | 1.5 h |
| Town Aquarium | 1700 | 5 + 4 | saltwater, reefs, koi pond, touch pool | 3 h |
| Regional Aquarium | 4500 | 7 + 6 | kreisels, kelp towers, SPS, sharks | 4.5 h |
| Grand Oceanarium | 11000 | 10 + 8 | the ocean window, the deep chamber | 7 h |

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
  glass film. Test strips read in steps; the Liquid Test Kits upgrade reads exactly.
- **Wellbeing** (`src/sim/wellbeing.ts`): hard factors multiply soft factors; health drifts
  toward mood. Predation (an oscar eats neons), fin nipping, territorial fights, assassin snails
  eating pest snails.
- **Tank types** (`src/sim/archetype.ts`, `src/data/archetypes.ts`): 63 declarative recognizers
  with hard rules (must pass) and weighted soft rules (authenticity) whose failing hints become
  the advice in the report card.
- **Life** (`src/sim/life.ts`): plant and coral growth, trimming and fragging, breeding by type
  (livebearers, egg scatterers, cave spawners, mouthbrooders, bubble nests, shell dwellers,
  Neocaridina colonies with color grades and wild-type reversion), pests.
- **Visitors** (`src/sim/visitors.ts`): visitors/hour per tank from its size (`sizeFactor`:
  growing to 300 L, slower to 3000 L, slowest beyond), the town (a little more each tier),
  rating and type appeal; coins per visitor from upgrades; guestbook lines picked from what is
  in the tank; nose prints; glass taps that startle the fish; the door bell.
- **Upkeep** (`src/sim/upkeep.ts`): power and water by size and water type, wear on the gear and
  food per animal, charged as the clock runs and shown on the report card.
- **Sales** (`src/sim/sales.ts`): a tank in a stock rack keeps breeders back and sells the rest
  to shoppers (more shoppers when the displays draw more visitors), plus cuttings and frags.
- **Letters** (`src/sim/letters.ts`, `src/data/progression.ts`): nine correspondents ask for
  specific tanks; up to three letters open at a time; the next one asks for something the shop
  does not already do and favors the current tier; an ask left six days goes back in the pile
  for a while. Replying pays coins, reputation and sometimes an unlock.
- **Expeditions** (`src/sim/expeditions.ts`): send Captain Wren to a region; wild-caught animals
  come back to the holding tank (collectors pay a premium), stones and plants to storage, and
  the supplier can then order them. On average a trip pays for itself.
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
2. Ida's tour builds the first tank with you: a size, a filter, heat and light, sand and slope,
   stone and wood, living plants, a squeeze of her old sponge so the tank is cycled, a school of
   fish floated in their bag, the first feeding, the report card. The shop opens.
3. Ida's two letters arrive first; then a letter every few hours, each asking for something the
   shop does not do yet (a school of eight, three kinds of plants, something that glows).
4. Upgrades (test kits, benches, a feeding rota) and a stock rack of breeding guppies come next.
   Around 45 minutes in, the Neighborhood Fish Shop tier opens a second bay and expeditions; a
   new tank borrows media from the first, or cycles for about three weeks on its own.

## Out of scope (for now)

Drawn people, a visible shop interior, combat, timed failure states, real-money anything.
