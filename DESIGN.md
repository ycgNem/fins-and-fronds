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
tank.

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
- **Visitors** (`src/sim/visitors.ts`): visitors/hour from tier, rating and type appeal; coins
  per visitor from upgrades; guestbook lines picked from what is in the tank; nose prints;
  glass taps that startle the fish.
- **Letters** (`src/sim/letters.ts`, `src/data/progression.ts`): nine correspondents ask for
  specific tanks; up to three letters open at a time; replying pays coins, reputation and
  sometimes an unlock.
- **Expeditions** (`src/sim/expeditions.ts`): send Captain Wren to a region; animals come back
  to the holding tank, stones and plants to storage, and the supplier can then order them.
- **Supplier**: implied. You order from a catalog and the order floats in a bag for half an
  hour to acclimate before the fish swim out.

## The first hour

1. You inherit "The Front Window": a neglected community tank with green glass, nose prints,
   pest snails that rode in on the java fern, and schools that are too small (3.5 stars).
2. Letters arrive within minutes: Pip wants the snails gone (assassin snails), Mr. Okafor's
   class wants a school of eight, the Driftwood Club wants three kinds of plants, Dr. Reyes will
   sit by a four-star tank.
3. Scraping, wiping, adding a stone and fixing the schools teaches the rating parts; the codex
   fills as the tank is recognized (adding a stone turns it into a Nature Aquarium).
4. Reputation reaches the Corner Aquarium tier: a second bay, CO2, paludariums and ripariums,
   the first expedition. The second tank teaches cycling: a fresh tank with no bacteria.

## Out of scope (for now)

Drawn people, a visible shop interior, combat, timed failure states, real-money anything.
