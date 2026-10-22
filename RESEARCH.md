# Research notes

What the game's content is built on. Numbers are simplified for play but start from real
hobby practice; where sources disagree, the game takes the common middle. Every section names
the data file that encodes it. Sources are listed at the end.

## 1. Kinds of aquarium

Aquaria split four ways at once, and the game uses all four:

- **By water**: freshwater, brackish (SG roughly 1.002-1.020) and marine (SG about 1.023-1.026).
- **By temperature**: tropical (24-28 C, needs a heater), coldwater/temperate (10-22 C:
  goldfish, axolotls, hillstream loaches, native fish; a chiller in warm rooms) and cold marine
  (kelp forest, tide pool, cold north: a chiller always).
- **By purpose or style**: community, species-only, biotope (one real place), planted /
  aquascape (Nature Aquarium, Iwagumi, Dutch, jungle, diorama, Walstad, wabi-kusa), specialist
  (shrimp, discus, puffers, cichlid lakes), oddball and monster tanks, and whimsy/themed tanks.
- **By system**: closed glass box, open-top riparium (plants rooted in the water, leaves in the
  air), paludarium (land and water), pond, reef with sump and skimmer, kreisel (round tank with
  laminar flow for jellies), and public-exhibit systems (kelp towers, touch pools, ocean windows,
  deep-sea chillers).

Encoded in `src/data/shells.ts` (19 tank bodies), `src/data/archetypes.ts` (63 tank types in
10 families) and `src/data/equipment.ts`.

## 2. Water chemistry and the nitrogen cycle

- Fish waste and uneaten food release **ammonia**. *Nitrosomonas*-type bacteria (and archaea)
  oxidize it to **nitrite**; *Nitrospira*/*Nitrobacter*-type bacteria oxidize nitrite to
  **nitrate**. Ammonia and nitrite are toxic at fractions of a ppm; nitrate is mild and is
  removed by plants and water changes.
- A new tank has neither colony. A **fishless cycle** doses ammonia with no animals until it
  and nitrite both read zero within a day of a dose: commonly 2-6 weeks, faster with seeded
  media or bottled bacteria. The nitrite-eaters lag the ammonia-eaters, so nitrite spikes late.
- A milky **bacterial bloom** is common in new tanks and clears on its own.
- **pH** follows KH (carbonate buffer); wood, leaf litter and peat lower pH and release
  **tannins** (tea-colored water); limestone, Seiryu stone, Texas holey rock, crushed coral and
  aragonite raise pH, GH and KH. Active aquasoils lower pH and KH for a few months.
- Warm water holds less **oxygen**; surface agitation and air pumps add it.
- Brackish and marine tanks lose fresh water to evaporation, so salinity creeps up; you top
  off with fresh water (an auto top-off does it for you).

Encoded in `src/sim/water.ts` (two bacteria populations, equilibrium pull toward source water
plus substrate and hardscape effects, bloom, algae, glass film, evaporation) and the Water panel
(test strips vs liquid kits).

## 3. Aquascaping styles

- **Nature Aquarium** (Takashi Amano): wood and stone that read as a landscape, many plant
  species but restrained colors, open swimming space, small schooling fish.
- **Iwagumi**: stone only (one rock type, an odd number of stones), one dominant main stone
  (oyaishi) placed off-center near a third, a carpet of one or two species, one school of fish.
- **Dutch**: no hardscape; terraced "streets" of stem plants contrasting in color and leaf
  shape; dates from Dutch competitions of the 1950s.
- **Jungle**: wild and overgrown, floating plants, roots, dim light.
- **Diorama**: miniature mountain or forest landscapes built from stone, wood and moss.
- **Walstad** (Diana Walstad's *Ecology of the Planted Aquarium*): soil capped with sand, lots
  of plants, little or no filtration, low tech.
- **Wabi-kusa**: a ball of substrate covered with emersed-grown plants in shallow water.
- Composition rules used by the scape score: substrate sloped up toward the back, a focal
  point near a third, odd numbers, few materials, open water, depth layering.

Encoded in `src/data/archetypes.ts` and `src/sim/rating.ts` (scape score).

## 4. Biotopes

Each of the 27 regions in `src/data/regions.ts` carries temperature, pH, hardness or salinity, a
backdrop look and the hardscape a faithful biotope uses. Highlights:

- **Rio Negro**: tea-dark, very soft (GH ~0-2), acidic (pH 4.5-6.5), warm; sand, branches,
  leaf litter, few plants; cardinal tetras, pencilfish, hatchetfish.
- **Amazon clearwater/floodplain**, **Central America** (hard, alkaline, rock and wood,
  cichlids, livebearers), **Mexican karst cenotes** (blind cave tetra), **Xochimilco** (axolotl).
- **Lake Malawi** (pH ~7.7-8.6, hard, rock piles, mbuna) and **Lake Tanganyika** (pH ~8.5-9,
  very hard, shell beds and rock, shell-dwellers): the "freshwater reef" alternative to marine.
- **West African rainforest streams**, **Southeast Asian peat swamps** (pH 4-6, bettas,
  rasboras), **Southeast Asian rivers**, **hillstreams** (cool, fast, oxygen-rich, hillstream
  loaches), **South Asia**, **Sulawesi** (warm, alkaline, cardinal shrimp), **Australia and New
  Guinea** (rainbowfish, e.g. Lake Kutubu), **East Asia** (rice paddies, medaka), **temperate
  North America and Europe** (sunfish, bitterling and swan mussel).
- **Mangroves** (brackish estuaries: archerfish, monos, scats, mudskippers, fiddler crabs).
- **Marine**: Indo-Pacific reef, Red Sea, Caribbean, seagrass beds, kelp forest, rocky shore
  (tide pool), open ocean, deep sea, cold north.

## 5. Brackish water

- Low-end brackish (SG 1.002-1.008) suits bumblebee gobies, knight gobies, sailfin mollies,
  orange chromides; mid (1.008-1.015) archers, scats, monos; high (1.015-1.020) figure-eight
  puffers, monos as adults. Many brackish fish move toward full marine as they age.
- Use marine salt, not plain aquarium salt (it lacks the buffering minerals).
- Mangrove roots, sand and mud, and a land area for mudskippers and fiddler crabs.

Encoded in `src/data/species/brackish.ts`, the mangrove and mudflat archetypes, and the
mangrove and paludarium shells.

## 6. Reefs and saltwater alternatives

- **FOWLR** (fish only with live rock): marine without corals; easier, allows predators.
- **Soft corals** (leathers, mushrooms, zoanthids, star polyps): forgiving, PAR ~50-150.
- **LPS** (torch, hammer, frogspawn, brain, acans): PAR ~80-200, moderate flow, many sting.
- **SPS** (Acropora, Montipora): PAR ~200-400+, strong flow, very stable parameters.
- Reef parameters: SG ~1.025-1.026, 24-26 C, alkalinity 7-11 dKH, calcium ~400-450 ppm,
  magnesium ~1300 ppm, near-zero nitrate and phosphate for SPS.
- **Live rock** (from the ocean) brings bacteria and biodiversity but also hitchhikers
  (Aiptasia, bristle worms, mantis shrimp); **dry rock** is pest-free but must be cycled;
  **ceramic rock** is shaped for aquascaping and also starts sterile.
- **Saltwater alternatives** in the game: brackish tanks, Rift Lake hard-water rockwork (the
  colors of a reef with fresh water), FOWLR, and nano reefs.
- Clownfish host anemones (bubble-tip, carpet); peppermint shrimp eat Aiptasia; emerald crabs
  graze bubble algae; cleaner shrimp run cleaning stations.

Encoded in `src/data/corals.ts`, `src/data/species/marine.ts`, `src/data/hardscape.ts` (live,
dry, ceramic rock) and the reef archetypes.

## 7. Driftwood and hardscape

| Wood | What it is like |
|---|---|
| Spider wood | Thin, branching roots; light; sinks after soaking; grows a harmless white biofilm at first |
| Manzanita | Dense, red-brown, tree-like branching; few tannins |
| Mopani | Heavy two-tone (light and dark) African hardwood; strong tannins |
| Malaysian driftwood | Dark, heavy, sinks at once; strong tannins |
| Redmoor root | Twisting reddish roots; floats until soaked |
| Cholla | Hollow cactus skeleton full of holes; shrimp graze it |
| Ghost wood | Pale, branching, contrasts with dark backgrounds |
| Sumatra wood | Twisty, layered, dark |
| Bonsai driftwood | Assembled trunk and canopy, made to carry moss as a "tree" |
| Mangrove roots | Prop roots for brackish tanks |
| Cork bark | Floats; for backgrounds and paludariums |
| Bog oak | Ancient preserved oak; very dark |

Stones: Seiryu (blue-grey with white calcite veins; raises hardness), dragon stone / ohko
(holey, clay, inert), lava rock (porous, great for bacteria), river pebbles and boulders, slate,
Texas holey rock and tufa (calcareous, for Rift Lake tanks), pagoda stone, frodo stone, petrified
wood, fluorite, pale volcanic. Leaf litter (catappa, oak), alder cones and seed pods soften and
stain the water.

Encoded in `src/data/hardscape.ts` with chemistry effects in `fx`.

## 8. Shrimp and snails

- **Neocaridina davidi** (cherry shrimp and its color lines: blue dream, yellow, green jade,
  black rose): hardy, pH ~6.5-8, GH ~6-12, 18-28 C. Color is graded (sakura, fire red, painted)
  and mixed lines revert toward brownish wild type over generations.
- **Caridina** (crystal red, blue bolt): soft acidic water (pH ~5.8-6.8, GH 4-6, low TDS),
  active soil, cool and very stable; they do not interbreed with Neocaridina.
- **Amano shrimp**: the best algae eaters, breed only in brackish larval stages.
- Others: ghost, bamboo and vampire (filter feeders), Sulawesi cardinal shrimp (warm, alkaline).
- **Assassin snail** (*Clea/Anentome helena*): hunts pest snails (bladder, ramshorn, Malaysian
  trumpet), ignores fish and adult shrimp, breeds slowly (one egg per capsule); the classic
  chemical-free pest control.
- **Nerites** (zebra, horned): top algae eaters, do not breed in fresh water.
- **Mystery, rabbit, Japanese trapdoor** snails: peaceful; **Malaysian trumpet snails**
  burrow and stir the sand; **bladder and ramshorn** snails hitchhike in on plants and boom
  when overfed.

Encoded in `src/data/species/freshwater.ts`, the pest model in `src/sim/life.ts`, and Pip's
letters ("A cherry shrimp colony", "The snail situation").

## 9. Public exhibits

- **Kreisel**: a round tank with a laminar circular current that keeps jellies off the walls
  (moon jellies, sea nettles, comb jellies).
- **Kelp forest**: tall, cold, surge-driven, bright (Monterey Bay Aquarium's is the reference).
- **Touch pools**: shallow cold-water tanks with stars, urchins, hermit crabs, rays.
- **Open ocean**: huge volumes, sardine schools, sharks; **deep sea**: dark, cold, slow.

Encoded in the exhibit shells and the Public Exhibit archetypes.

## 10. Heaters

- Heaters are sold by the tank size they suit. Manufacturers' charts and the usual rule of
  thumb come to about 3 to 5 watts per US gallon: 50 W up to 10 gallons, 150 W up to about 30,
  200 W up to about 50, 300 W up to about 75.
- A heater at the edge of its rating struggles in a cold room. For big tanks the common advice
  is two smaller heaters at opposite ends: their ratings add up, and if one fails or sticks on,
  the other limits the damage.
- In the game a heater holds a tank of its rated size about 5 C above the hall (22 C to 27 C),
  more in a smaller tank and less in a bigger one. Ratings add up, so two heaters work too.

## Sources

Aquarium types and systems
- https://en.wikipedia.org/wiki/Freshwater_aquarium
- https://en.wikipedia.org/wiki/Brackish-water_aquarium
- https://en.wikipedia.org/wiki/Vivarium
- https://enviroliteracy.org/animals/what-are-the-different-types-of-aquarium-systems/
- https://theredcircle.com.ph/what-are-the-different-types-of-aquariums/
- https://www.liveaquaria.com/blogs/aquarium-setup/aquarium-setup-styles-ideas-for-exceptional-aquarium-setups

Nitrogen cycle
- https://gensou.sg/aquarium-cycling-timeline/
- https://fishyhub.com/sg/blogs/blog-detail/how-to-cycle-a-fish-tank
- https://krakencorals.co.uk/blogs/news/how-to-cycle-an-aquarium

Aquascaping
- https://en.wikipedia.org/wiki/Aquascaping
- https://www.fishkeeper.co.uk/stories/the-art-of-aquascaping
- https://www.2hraquarist.com/pages/creating-aquascapes
- https://www.buildyouraquarium.com/aquascaping/
- https://www.gcshop-sg.com/blogs/plants-aquascaping/what-is-aquascaping

Biotopes
- https://biotope-aquarium.info/
- https://gensou.sg/amazon-biotope-aquarium/
- https://tropicalfreshwaterfish.com/biotope.html
- https://tropicalfreshwaterfish.com/biotope_lake_tanganyika.htm
- https://www.furrycritter.com/pages/articles/fish/biotope_aquariums.htm
- https://fishyhub.com/sg/blogs/blog-detail/biotope-aquarium
- https://www.rainbowfish.angfa.org.au/Lacust.htm
- https://seriouslyfish.com/species/melanotaenia-lacustris

Brackish
- https://aquariumcoop.com/blogs/aquarium/brackish-aquarium
- https://www.tankflare.com/blogs/brackish-water-aquariums
- https://fishtankadvisor.com/brackish-water-fish/
- https://furrycritter.com/pages/articles/fish/brackish_aquarium_overview.htm

Coldwater
- https://www.tankflare.com/blogs/coldwater-aquariums-beyond-goldfish
- https://articles.hepper.com/cold-water-fish-for-your-aquarium/
- https://ornamentalfish.org/what-we-do/advice-information/care-sheets/caresheets-tropical-freshwater-fish/how-to-look-after-hillstream-and-weather-loaches/

Reefs and rock
- https://gensou.sg/saltwater-reef-tank-comparison-guide/
- https://topshelfaquatics.com/blogs/news/beginner-s-guide-to-coral-types-soft-corals-lps-sps
- https://krakencorals.co.uk/blogs/news/parameters-for-your-reef
- https://www.bulkreefsupply.com/content/post/the-ultimate-buyers-guide-to-dry-live-rock
- https://www.marinedepot.com/blog/2015/06/types-of-reef-aquarium-rock
- https://www.mantasystems.net/a/blog/post/Live-Dry-Rock
- https://reefbuilders.com/2016/11/30/what-to-keep-in-saltwater-aquarium

Seahorses and cephalopods
- https://www.chewy.com/education/fish/saltwater-fish/a-beginners-guide-to-keeping-seahorses
- https://seahorse.com/topic/new-to-seahorses-need-help-with-fact-vs-ficti/
- https://tonmo.com/threads/tropical-octopus-species-for-mid-sized-tank.30203/
- https://tonmo.com/threads/my-escape-proof-octopus-tank.8300/

Driftwood
- https://gensou.sg/best-driftwood-aquascaping/
- https://buceplant.com/collections/wood
- https://buildyouraquarium.com/aquarium-driftwood
- https://fresh.bulkreefsupply.com/content/post/driftwood-hardscapes

Shrimp and snails
- https://gensou.sg/caridina-vs-neocaridina-shrimp-differences/
- https://gensou.sg/caridina-shrimp-care-guide/
- https://www.tfhmagazine.com/articles/freshwater/dwarf-freshwater-shrimps
- https://buildyouraquarium.com/freshwater-shrimp-species
- https://www.hepper.com/types-of-aquarium-shrimp/
- https://www.aquariumcoop.com/blogs/aquarium/assassin-snail
- https://www.theshrimpfarm.com/posts/assassin-snail-care/
- https://aquahoy.com/assassin-snail-anentome-helena-care-feeding/
- https://fishyhub.com/sg/blogs/blog-detail/aquarium-snail-guide

Public exhibits
- https://orangecoastcollege.edu/academics/math-sciences/marine-science/aquarium/open-ocean.html
- https://tos.org/oceanography/assets/docs/2-1_packard.pdf
- https://www.zoochat.com/community/threads/12-19-review-of-aquarium-of-the-pacific.433390/
