// Freshwater fish and amphibians, grouped by native region. Ranges follow common care sheets and
// biotope guides (RESEARCH.md); facts are written to be true, and short enough for a codex card.
import { group } from './define';
import type { SpeciesDef } from '../types';

const fish = { kind: 'fish', water: 'fresh' } as const;

export const FRESHWATER: SpeciesDef[] = [
  // ---------------------------------------------------------------- Rio Negro blackwater
  ...group({ ...fish, regions: ['rio_negro'], temp: [24, 30], ph: [4.5, 7.0], gh: [0, 6] }, [
    {
      id: 'cardinal_tetra', name: 'Cardinal Tetra', sci: 'Paracheirodon axelrodi', cm: 3, body: 'torpedo',
      look: { body: 'blue', belly: 'red', pattern: 'neon', fin: 'pearl' }, temper: 'peaceful', zone: 'mid', school: 10,
      diet: ['flake', 'micro'], appeal: 5, tags: ['schooling', 'glow', 'colorful'], breed: { type: 'scatter', ease: 1 },
      fact: 'Most cardinals are still caught by piabeiros, fishermen of the middle Rio Negro, whose sustainable trade helps protect the flooded forest.',
    },
    {
      id: 'rummynose_tetra', name: 'Rummynose Tetra', sci: 'Hemigrammus rhodostomus', regions: ['amazon'], cm: 4.5, body: 'torpedo', temp: [24, 28], ph: [5.5, 7.0],
      look: { body: 'silver', accent: 'red', pattern: 'tail', fin: 'pearl' }, temper: 'peaceful', zone: 'mid', school: 10, flow: [1, 2],
      appeal: 5, tags: ['schooling'], fact: 'Their red noses blush brightest in clean, stable water and fade when something is off, so keepers read them like a test kit. This one is from the lower Amazon; its Rio Negro cousin is Hemigrammus bleheri.',
    },
    {
      id: 'marbled_hatchetfish', name: 'Marbled Hatchetfish', sci: 'Carnegiella strigata', cm: 3.5, body: 'hatchet', temp: [24, 28], ph: [5.5, 7.0],
      look: { body: 'silver', pattern: 'marble', accent: 'ink' }, temper: 'peaceful', zone: 'surface', school: 6, appeal: 5,
      tags: ['schooling', 'jumper'], needs: ['lid', 'floating'],
      fact: 'Hatchetfish can glide clear of the water by beating their big pectoral fins, so a tight lid is a must.',
    },
    {
      id: 'golden_pencilfish', name: 'Golden Pencilfish', sci: 'Nannostomus beckfordi', cm: 4.5, body: 'slender', temp: [24, 28], ph: [5.0, 7.5],
      look: { body: 'gold', pattern: 'stripe', accent: 'red' }, temper: 'peaceful', zone: 'top', school: 6, needs: ['plants', 'dim'],
      fact: 'Pencilfish wear a different pattern at night: the daytime stripe breaks up into dark blotches.',
    },
    {
      id: 'agassizii', name: "Agassiz's Dwarf Cichlid", sci: 'Apistogramma agassizii', regions: ['rio_negro', 'amazon'], cm: 8, body: 'cichlid', ph: [5.0, 7.0],
      look: { body: 'gold', fin: 'orange', accent: 'blue', pattern: 'stripe' }, temper: 'semi', zone: 'bottom', max: 3, rarity: 2, appeal: 7,
      tags: ['colorful', 'territorial'], needs: ['caves', 'leaves'], breed: { type: 'cave', ease: 3 },
      fact: 'Female dwarf cichlids guard their fry in a little cloud, flashing yellow to call them close.',
    },
    {
      id: 'discus', name: 'Discus', sci: 'Symphysodon discus', regions: ['rio_negro', 'amazon'], cm: 15, body: 'disc', temp: [28, 31], ph: [5.0, 7.0],
      look: { body: 'orange', accent: 'blue', pattern: 'marble', fin: 'orange' }, temper: 'peaceful', zone: 'mid', school: 5, minL: 250, flow: [0, 1],
      diet: ['frozen', 'pellet'], rarity: 3, appeal: 9, tags: ['iconic', 'colorful', 'sensitive'], needs: ['soft_water'], breed: { type: 'pair', ease: 2 },
      fact: 'Discus parents feed their fry on a mucus they secrete from their own skin for the first weeks of life.',
    },
    {
      id: 'altum_angelfish', name: 'Altum Angelfish', sci: 'Pterophyllum altum', cm: 18, body: 'angel', temp: [28, 31], ph: [4.5, 6.5],
      look: { body: 'silver', pattern: 'bars', accent: 'red', fin: 'pearl' }, temper: 'semi', zone: 'mid', school: 4, minL: 300, flow: [0, 1],
      diet: ['frozen', 'flake'], rarity: 4, appeal: 9, tags: ['iconic', 'eats_small'], needs: ['wood', 'soft_water'], source: 'expedition', tier: 2,
      fact: 'The tallest angelfish: its fins can span 30 cm top to bottom, made for slipping between vertical roots in the Orinoco and upper Rio Negro.',
    },
    {
      id: 'leaf_fish', name: 'Amazon Leaf Fish', sci: 'Monocirrhus polyacanthus', regions: ['rio_negro', 'amazon'], cm: 8, body: 'deep', temp: [25, 28], ph: [6.0, 7.0],
      look: { body: 'gold_sand', pattern: 'marble' }, temper: 'predator', zone: 'mid', diet: ['live'], rarity: 3, appeal: 6,
      tags: ['oddball', 'eats_small'], needs: ['plants', 'leaves', 'dim'], source: 'expedition', tier: 1,
      fact: 'It drifts head-down like a dead leaf, then engulfs passing fish with a mouth that shoots forward in a blink.',
    },
  ]),
  // ---------------------------------------------------------------- Amazon clearwater and floodplain
  ...group({ ...fish, regions: ['amazon'], temp: [23, 28], ph: [6.0, 7.5], gh: [2, 12] }, [
    {
      id: 'neon_tetra', name: 'Neon Tetra', sci: 'Paracheirodon innesi', cm: 3, body: 'torpedo', temp: [20, 26], ph: [5.5, 7.5],
      look: { body: 'blue', belly: 'pearl', accent: 'red', pattern: 'neon', fin: 'pearl' }, temper: 'peaceful', zone: 'mid', school: 10,
      diet: ['flake', 'micro'], appeal: 4, tags: ['schooling', 'glow', 'colorful'], breed: { type: 'scatter', ease: 1 }, source: 'start',
      fact: "A neon's stripe is made of stacked light-reflecting plates; at night it dims as the plates tilt, which may help it hide.",
    },
    {
      id: 'ember_tetra', name: 'Ember Tetra', sci: 'Hyphessobrycon amandae', cm: 2, body: 'torpedo', temp: [23, 29], ph: [5.5, 7.0],
      look: { body: 'orange', fin: 'red' }, temper: 'peaceful', zone: 'mid', school: 10, diet: ['micro', 'flake'], appeal: 4,
      tags: ['schooling', 'tiny', 'colorful'], needs: ['plants'],
      fact: 'From the Araguaia basin in Brazil; at 2 cm embers glow brightest over dark substrate and among plants.',
    },
    {
      id: 'angelfish', name: 'Angelfish', sci: 'Pterophyllum scalare', cm: 15, body: 'angel', temp: [24, 30],
      look: { body: 'silver', pattern: 'bars', fin: 'pearl' }, temper: 'semi', zone: 'mid', minL: 150, flow: [0, 1], diet: ['flake', 'frozen'],
      rarity: 2, appeal: 7, tags: ['iconic', 'eats_small'], needs: ['plants'], breed: { type: 'pair', ease: 3 },
      fact: 'Angelfish spawn on broad leaves or slate and fan their eggs; grown angels will happily eat any neon small enough to swallow.',
    },
    {
      id: 'bronze_cory', name: 'Bronze Corydoras', sci: 'Corydoras aeneus', cm: 6.5, body: 'cory', temp: [22, 27], ph: [6.0, 7.8],
      look: { body: 'olive', belly: 'sand', accent: 'teal' }, temper: 'peaceful', zone: 'bottom', school: 6, diet: ['pellet', 'detritus'],
      tags: ['scavenger', 'shoaling'], needs: ['sand'], breed: { type: 'scatter', ease: 2 }, source: 'start',
      fact: 'Corydoras gulp air at the surface and absorb oxygen through the gut; a quick dash upward is normal, not distress.',
    },
    {
      id: 'panda_cory', name: 'Panda Corydoras', sci: 'Corydoras panda', cm: 5, body: 'cory', temp: [20, 25],
      look: { body: 'pearl', accent: 'ink', pattern: 'mask' }, temper: 'peaceful', zone: 'bottom', school: 6, diet: ['pellet', 'detritus'], appeal: 5,
      tags: ['scavenger', 'shoaling'], needs: ['sand'], breed: { type: 'scatter', ease: 2 },
      fact: 'Named for its black eye patches, the panda cory comes from cool, clear Andean foothill streams in Peru.',
    },
    {
      id: 'sterbai_cory', name: 'Sterba\'s Corydoras', sci: 'Corydoras sterbai', cm: 6.5, body: 'cory', temp: [24, 30],
      look: { body: 'black', accent: 'orange', pattern: 'dots' }, temper: 'peaceful', zone: 'bottom', school: 6, diet: ['pellet', 'detritus'], appeal: 5, rarity: 2,
      tags: ['scavenger', 'shoaling'], needs: ['sand'], breed: { type: 'scatter', ease: 2 },
      fact: 'One of the few cories happy at discus temperatures; it trails orange-edged pectoral fins over the sand.',
    },
    {
      id: 'otocinclus', name: 'Otocinclus', sci: 'Otocinclus vittatus', cm: 4, body: 'pleco', temp: [21, 27], ph: [5.5, 7.5],
      look: { body: 'sand', pattern: 'stripe', accent: 'ink' }, temper: 'peaceful', zone: 'glass', school: 6, diet: ['algae'],
      tags: ['algae', 'sensitive', 'shoaling'], needs: ['mature', 'algae', 'plants'],
      fact: 'Otos graze the biofilm on leaves and glass; a new, spotless tank can starve them, so they belong in mature setups.',
    },
    {
      id: 'bristlenose_pleco', name: 'Bristlenose Pleco', sci: 'Ancistrus sp.', cm: 12, body: 'pleco', temp: [22, 27],
      look: { body: 'olive', pattern: 'dots', accent: 'pearl' }, temper: 'peaceful', zone: 'bottom', diet: ['algae', 'veg'], appeal: 4,
      tags: ['algae'], needs: ['wood', 'caves'], breed: { type: 'cave', ease: 3 },
      fact: 'Bristlenoses rasp driftwood for fiber, and males grow branching bristles on their snouts.',
    },
    {
      id: 'german_blue_ram', name: 'German Blue Ram', sci: 'Mikrogeophagus ramirezi', regions: [], cm: 6, body: 'cichlid', temp: [27, 30], ph: [5.0, 7.0], gh: [0, 6],
      look: { body: 'gold', accent: 'blue', pattern: 'spots', fin: 'red' }, temper: 'peaceful', zone: 'bottom', max: 4, rarity: 2, appeal: 8,
      tags: ['colorful', 'sensitive'], needs: ['soft_water', 'plants'], breed: { type: 'pair', ease: 2 },
      fact: 'Rams come from the warm, soft llanos of the Orinoco basin; pairs dig little pits in the sand to keep their fry together.',
    },
    {
      id: 'oscar', name: 'Oscar', sci: 'Astronotus ocellatus', cm: 33, body: 'cichlid', temp: [22, 28],
      look: { body: 'black', accent: 'orange', pattern: 'spots' }, temper: 'predator', zone: 'mid', minL: 350, diet: ['pellet', 'frozen'],
      rarity: 2, appeal: 8, tags: ['iconic', 'big', 'eats_small'], needs: ['swim_space'], breed: { type: 'pair', ease: 2 }, tier: 1,
      fact: 'Oscars recognize the people who feed them, begging at the glass and sulking when the decor is rearranged.',
    },
    {
      id: 'silver_arowana', name: 'Silver Arowana', sci: 'Osteoglossum bicirrhosum', cm: 90, body: 'arowana', temp: [24, 30], ph: [6.0, 7.0],
      look: { body: 'silver', fin: 'pearl' }, temper: 'predator', zone: 'surface', minL: 1200, diet: ['frozen', 'live'], rarity: 4, appeal: 10,
      tags: ['iconic', 'big', 'jumper', 'eats_small'], needs: ['lid', 'swim_space'], breed: { type: 'mouthbrooder', ease: 0 }, tier: 3,
      fact: 'In the flooded forest, arowanas leap up to two meters out of the water to snatch insects and even small birds from branches.',
    },
    {
      id: 'motoro_ray', name: 'Motoro Stingray', sci: 'Potamotrygon motoro', cm: 45, body: 'ray', temp: [24, 29],
      look: { body: 'brown', accent: 'orange', pattern: 'spots' }, temper: 'predator', zone: 'bottom', minL: 800, diet: ['frozen', 'live'], rarity: 4, appeal: 9,
      tags: ['iconic', 'big', 'venomous', 'eats_inverts'], needs: ['sand', 'swim_space'], breed: { type: 'livebearer', ease: 1 }, tier: 3,
      fact: 'Freshwater stingrays give birth to live pups. They need wide open sand, not height, and their tail spine demands respect.',
    },
    {
      id: 'black_ghost_knifefish', name: 'Black Ghost Knifefish', sci: 'Apteronotus albifrons', cm: 45, body: 'knife', temp: [23, 28],
      look: { body: 'black', accent: 'pearl', pattern: 'band' }, temper: 'semi', zone: 'bottom', minL: 400, diet: ['frozen', 'live'], rarity: 3, appeal: 7,
      tags: ['nocturnal', 'oddball', 'eats_small'], needs: ['caves', 'dim'], tier: 2,
      fact: 'Black ghosts swim forwards or backwards on one long rippling fin and "see" with a weak electric field.',
    },
    {
      id: 'red_bellied_piranha', name: 'Red-bellied Piranha', sci: 'Pygocentrus nattereri', cm: 28, body: 'deep', temp: [24, 28],
      look: { body: 'silver', belly: 'red', pattern: 'dots' }, temper: 'predator', zone: 'mid', school: 5, minL: 400, diet: ['frozen', 'carnivore'], rarity: 3, appeal: 8,
      tags: ['iconic', 'schooling', 'eats_small'], needs: ['swim_space', 'plants'], tier: 2,
      fact: 'Despite the legend, red-bellies are nervous fish that school for safety and mostly scavenge; a group in a big tank is surprisingly shy.',
    },
    {
      id: 'silver_dollar', name: 'Silver Dollar', sci: 'Metynnis argenteus', cm: 15, body: 'disc', temp: [24, 28],
      look: { body: 'silver', fin: 'red' }, temper: 'peaceful', zone: 'mid', school: 5, minL: 300, diet: ['veg', 'flake'], appeal: 5,
      tags: ['schooling', 'plant_eater'], needs: ['swim_space'],
      fact: 'Vegetarian cousins of piranhas, silver dollars will mow a planted tank down to stubs.',
    },
    {
      id: 'mystery_snail', name: 'Mystery Snail', sci: 'Pomacea diffusa', kind: 'snail', cm: 5, body: 'snail', temp: [20, 28], ph: [7.0, 8.2],
      look: { body: 'gold' }, temper: 'peaceful', zone: 'glass', diet: ['algae', 'detritus'], appeal: 5, tags: ['algae', 'scavenger'],
      breed: { type: 'colony', ease: 3 }, fact: 'Mystery snails breathe through a snorkel-like siphon and lay pink egg clutches above the waterline.',
    },
  ]),
  // ---------------------------------------------------------------- Central America and the Caribbean islands
  ...group({ ...fish, regions: ['central_america'], temp: [22, 28], ph: [7.0, 8.2], gh: [8, 20] }, [
    {
      id: 'guppy', name: 'Guppy', sci: 'Poecilia reticulata', cm: 4, body: 'torpedo', look: { body: 'silver', fin: 'magenta', accent: 'blue', pattern: 'calico' },
      temper: 'peaceful', zone: 'top', school: 3, appeal: 5, tags: ['livebearer', 'colorful', 'long_fin', 'brackish_ok'],
      breed: { type: 'livebearer', ease: 5 }, source: 'start',
      fact: 'Named after Robert Guppy, who sent them from Trinidad in 1866. A female can store sperm and drop several broods from one mating.',
    },
    {
      id: 'endler', name: "Endler's Livebearer", sci: 'Poecilia wingei', cm: 2.5, body: 'torpedo', look: { body: 'olive', fin: 'orange', accent: 'teal', pattern: 'calico' },
      temper: 'peaceful', zone: 'top', school: 3, appeal: 5, rarity: 2, tags: ['livebearer', 'colorful', 'tiny'], breed: { type: 'livebearer', ease: 5 },
      fact: "Endler's come from Laguna de los Patos in Venezuela; breeders keep the line pure by never mixing them with guppies.",
    },
    {
      id: 'platy', name: 'Platy', sci: 'Xiphophorus maculatus', cm: 5, body: 'torpedo', temp: [20, 26], look: { body: 'orange', fin: 'black', pattern: 'tail' },
      temper: 'peaceful', zone: 'mid', school: 3, tags: ['livebearer', 'colorful'], breed: { type: 'livebearer', ease: 5 }, source: 'start',
      fact: 'Wild platies are olive and spotted; the sunset reds and "Mickey Mouse" tails are generations of selective breeding.',
    },
    {
      id: 'swordtail', name: 'Swordtail', sci: 'Xiphophorus hellerii', cm: 12, body: 'torpedo', look: { body: 'red', fin: 'black', pattern: 'tail' },
      temper: 'peaceful', zone: 'mid', school: 3, appeal: 5, tags: ['livebearer', 'jumper', 'colorful'], needs: ['lid', 'swim_space'],
      breed: { type: 'livebearer', ease: 4 }, fact: 'Only males grow the sword, an extension of the lower tail; females prefer males with longer swords.',
    },
    {
      id: 'black_molly', name: 'Black Molly', sci: 'Poecilia sphenops', cm: 8, body: 'torpedo', temp: [24, 28], ph: [7.5, 8.5], gh: [10, 25],
      look: { body: 'black', fin: 'black' }, temper: 'peaceful', zone: 'top', school: 3, diet: ['flake', 'algae'],
      tags: ['livebearer', 'algae', 'brackish_ok'], breed: { type: 'livebearer', ease: 4 },
      fact: 'Mollies are happiest in hard water; in the wild they range from freshwater streams into brackish lagoons.',
    },
    {
      id: 'convict_cichlid', name: 'Convict Cichlid', sci: 'Amatitlania nigrofasciata', cm: 12, body: 'cichlid', ph: [6.5, 8.0],
      look: { body: 'pearl', pattern: 'bars', accent: 'ink' }, temper: 'aggressive', zone: 'bottom', max: 2, minL: 120, appeal: 5,
      tags: ['territorial'], needs: ['caves', 'rocks'], breed: { type: 'cave', ease: 5 },
      fact: 'The classic first cichlid to breed: a pair will dig, defend a cave and herd a cloud of fry around the tank.',
    },
    {
      id: 'firemouth', name: 'Firemouth Cichlid', sci: 'Thorichthys meeki', cm: 15, body: 'cichlid', temp: [24, 30], ph: [6.5, 8.0],
      look: { body: 'slate', belly: 'red', pattern: 'spots', accent: 'red' }, temper: 'semi', zone: 'bottom', max: 2, minL: 150, appeal: 6,
      tags: ['territorial', 'colorful'], needs: ['caves', 'sand'], breed: { type: 'cave', ease: 3 },
      fact: 'Firemouths flare their throat pouch to show off the red, a bluff that usually settles disputes without a fight.',
    },
    {
      id: 'jack_dempsey', name: 'Jack Dempsey', sci: 'Rocio octofasciata', cm: 25, body: 'cichlid', temp: [22, 30], ph: [6.5, 8.0],
      look: { body: 'black', accent: 'teal', pattern: 'spots' }, temper: 'aggressive', zone: 'mid', max: 1, minL: 300, diet: ['pellet', 'frozen'], rarity: 2, appeal: 7,
      tags: ['territorial', 'big', 'eats_small'], needs: ['caves', 'rocks'], breed: { type: 'cave', ease: 3 }, tier: 1,
      fact: 'Named in the 1920s after the heavyweight boxer for its pugnacious face, though it is calmer than its reputation.',
    },
    {
      id: 'cpo_crayfish', name: 'Mexican Dwarf Crayfish', sci: 'Cambarellus patzcuarensis', kind: 'crayfish', cm: 4, body: 'crayfish', temp: [15, 25],
      look: { body: 'orange' }, temper: 'semi', zone: 'bottom', max: 4, diet: ['pellet', 'detritus'], rarity: 2, appeal: 6,
      tags: ['scavenger', 'colorful'], needs: ['caves'], breed: { type: 'colony', ease: 3 },
      fact: 'A dwarf crayfish from Lake Pátzcuaro in Mexico that rarely bothers fish, though shrimp should keep an eye on it.',
    },
  ]),
  // ---------------------------------------------------------------- Mexican karst and Xochimilco
  ...group({ ...fish, regions: ['mexico_karst'], temp: [20, 25], ph: [6.5, 8.0], gh: [10, 20], source: 'expedition', tier: 2 }, [
    {
      id: 'blind_cave_tetra', name: 'Blind Cave Tetra', sci: 'Astyanax mexicanus', cm: 9, body: 'torpedo', look: { body: 'pink', blind: true },
      temper: 'peaceful', zone: 'mid', school: 6, rarity: 2, appeal: 7, tags: ['schooling', 'cave', 'oddball'], needs: ['rocks', 'dim'],
      breed: { type: 'scatter', ease: 2 },
      fact: 'Cave populations lost their eyes over generations underground, yet they school by feeling pressure waves along the lateral line.',
    },
  ]),
  ...group({ water: 'fresh', regions: ['xochimilco'], temp: [14, 20], ph: [7.0, 8.0], gh: [7, 14], source: 'expedition', tier: 2 }, [
    {
      id: 'axolotl', name: 'Axolotl', sci: 'Ambystoma mexicanum', kind: 'amphibian', cm: 25, body: 'axolotl', look: { body: 'pink', accent: 'magenta' },
      temper: 'peaceful', zone: 'bottom', minL: 80, flow: [0, 1], diet: ['frozen', 'carnivore'], rarity: 3, appeal: 10,
      tags: ['iconic', 'endangered', 'cold', 'oddball'], needs: ['chill', 'sand', 'caves'], breed: { type: 'scatter', ease: 2 },
      fact: 'Axolotls stay larval for life, keep their feathery gills and can regrow limbs and parts of the heart. Wild ones are critically endangered.',
    },
  ]),
  // ---------------------------------------------------------------- West Africa
  ...group({ ...fish, regions: ['west_africa'], temp: [24, 28], ph: [6.0, 7.5], gh: [2, 10] }, [
    {
      id: 'kribensis', name: 'Kribensis', sci: 'Pelvicachromis pulcher', cm: 9, body: 'cichlid', look: { body: 'gold', belly: 'pink', pattern: 'stripe', accent: 'ink' },
      temper: 'semi', zone: 'bottom', max: 2, appeal: 6, tags: ['colorful', 'territorial'], needs: ['caves'], breed: { type: 'cave', ease: 4 },
      fact: 'Female kribs are the showier sex: they flash a cherry-red belly to court males into a cave.',
    },
    {
      id: 'congo_tetra', name: 'Congo Tetra', sci: 'Phenacogrammus interruptus', cm: 8, body: 'torpedo', temp: [23, 28],
      look: { body: 'gold', pattern: 'stripe', accent: 'teal', fin: 'pearl' }, temper: 'peaceful', zone: 'mid', school: 6, appeal: 6, rarity: 2,
      tags: ['schooling', 'glow', 'colorful', 'long_fin'], needs: ['swim_space'],
      fact: 'Males trail lace-edged fins, and their scales shift from gold to electric blue as they turn in the light.',
    },
    {
      id: 'african_butterflyfish', name: 'African Butterflyfish', sci: 'Pantodon buchholzi', cm: 10, body: 'hatchet', temp: [24, 30],
      look: { body: 'brown', pattern: 'marble', fin: 'pearl' }, temper: 'semi', zone: 'surface', diet: ['live', 'frozen'], rarity: 2, appeal: 6,
      tags: ['oddball', 'jumper', 'eats_small'], needs: ['lid', 'floating'], tier: 1,
      fact: 'One of the oldest fish lineages alive, it waits under floating leaves for insects and can glide a short way above the water.',
    },
    {
      id: 'african_dwarf_frog', name: 'African Dwarf Frog', sci: 'Hymenochirus boettgeri', kind: 'amphibian', cm: 3, body: 'frog', temp: [22, 28], ph: [6.5, 7.8],
      look: { body: 'olive', pattern: 'spots' }, temper: 'peaceful', zone: 'bottom', school: 2, flow: [0, 1], diet: ['frozen'], appeal: 6,
      tags: ['oddball'], needs: ['lid', 'plants'], breed: { type: 'scatter', ease: 1 },
      fact: 'Fully aquatic frogs that float at the surface with limbs outstretched, the "zen pose", and gulp air between dives.',
    },
    {
      id: 'senegal_bichir', name: 'Senegal Bichir', sci: 'Polypterus senegalus', cm: 30, body: 'eel', ph: [6.0, 8.0], temp: [24, 29],
      look: { body: 'olive', belly: 'sand' }, temper: 'predator', zone: 'bottom', minL: 300, diet: ['frozen', 'pellet'], rarity: 2, appeal: 7,
      tags: ['oddball', 'eats_small', 'jumper'], needs: ['lid', 'caves'], tier: 1,
      fact: 'Bichirs breathe air with paired lungs and have barely changed in tens of millions of years; visitors call them dinosaur eels.',
    },
    {
      id: 'elephantnose', name: 'Elephantnose Fish', sci: 'Gnathonemus petersii', cm: 23, body: 'slender',
      look: { body: 'black', pattern: 'band', accent: 'pearl' }, temper: 'peaceful', zone: 'bottom', minL: 250, diet: ['frozen', 'live'], rarity: 3, appeal: 7,
      tags: ['nocturnal', 'oddball', 'sensitive'], needs: ['sand', 'dim', 'caves'], tier: 2,
      fact: 'Its trunk-like chin is an electric sense organ, and relative to body size it has one of the largest brains of any fish.',
    },
    {
      id: 'vampire_shrimp', name: 'Vampire Shrimp', sci: 'Atya gabonensis', kind: 'shrimp', cm: 15, body: 'shrimp', temp: [23, 29],
      look: { body: 'slate', pattern: 'dots', accent: 'sky' }, temper: 'peaceful', zone: 'bottom', flow: [2, 3], diet: ['plankton'], rarity: 3, appeal: 8,
      tags: ['filter_feeder', 'oddball', 'big', 'nocturnal'], needs: ['current', 'caves'],
      fact: 'Despite the name, a gentle filter feeder the size of a crayfish that fans food from the current and shifts from pink to blue-grey.',
    },
  ]),
  // ---------------------------------------------------------------- Lake Malawi
  ...group({ ...fish, regions: ['lake_malawi'], temp: [24, 28], ph: [7.6, 8.8], gh: [4, 20], tier: 1 }, [
    {
      id: 'yellow_lab', name: 'Electric Yellow Lab', sci: 'Labidochromis caeruleus', cm: 10, body: 'cichlid', look: { body: 'yellow', fin: 'black' },
      temper: 'semi', zone: 'rock', appeal: 7, tags: ['colorful', 'mouthbrooder'], needs: ['rocks', 'caves', 'hard_water'], breed: { type: 'mouthbrooder', ease: 3 },
      fact: 'The gentlest mbuna; like all of them, the female carries eggs and fry in her mouth for about three weeks.',
    },
    {
      id: 'demasoni', name: 'Demasoni', sci: 'Pseudotropheus demasoni', cm: 7, body: 'cichlid', look: { body: 'blue', pattern: 'bars', accent: 'navy' },
      temper: 'aggressive', zone: 'rock', school: 12, rarity: 2, appeal: 7, tags: ['colorful', 'territorial', 'mouthbrooder'],
      needs: ['rocks', 'caves', 'hard_water'], breed: { type: 'mouthbrooder', ease: 3 },
      fact: 'So feisty that keepers house a dozen or more together, so no single fish takes all the aggression.',
    },
    {
      id: 'red_zebra', name: 'Red Zebra', sci: 'Maylandia estherae', cm: 12, body: 'cichlid', look: { body: 'orange' },
      temper: 'aggressive', zone: 'rock', school: 3, appeal: 7, tags: ['colorful', 'territorial', 'mouthbrooder'], needs: ['rocks', 'caves', 'hard_water'],
      breed: { type: 'mouthbrooder', ease: 3 }, fact: 'Females are orange while many males are pale blue; the "red zebra" is named for the females.',
    },
    {
      id: 'flavescent_peacock', name: 'Flavescent Peacock', sci: 'Aulonocara stuartgranti', cm: 12, body: 'cichlid', look: { body: 'blue', accent: 'gold', pattern: 'bars' },
      temper: 'semi', zone: 'bottom', rarity: 2, appeal: 8, tags: ['colorful', 'mouthbrooder'], needs: ['sand', 'rocks', 'hard_water'],
      breed: { type: 'mouthbrooder', ease: 3 }, fact: 'Peacocks hunt over open sand, listening for buried invertebrates with enlarged pores along the head.',
    },
  ]),
  // ---------------------------------------------------------------- Lake Tanganyika
  ...group({ ...fish, regions: ['lake_tanganyika'], temp: [24, 27], ph: [7.8, 9.2], gh: [8, 20], tier: 1 }, [
    {
      id: 'multies', name: 'Multies (Shell Dwellers)', sci: 'Neolamprologus multifasciatus', cm: 4, body: 'cichlid', look: { body: 'sand', pattern: 'bars', accent: 'blue' },
      temper: 'semi', zone: 'bottom', school: 6, rarity: 2, appeal: 7, tags: ['shell_dweller', 'tiny'], needs: ['shells', 'sand', 'hard_water'],
      breed: { type: 'shell', ease: 4 }, fact: 'The smallest cichlid in the world lives in colonies on beds of empty snail shells, digging and redecorating all day.',
    },
    {
      id: 'fairy_cichlid', name: 'Fairy Cichlid', sci: 'Neolamprologus brichardi', cm: 9, body: 'cichlid', look: { body: 'sand', fin: 'pearl', accent: 'blue', pattern: 'mask' },
      temper: 'semi', zone: 'rock', appeal: 6, tags: ['territorial'], needs: ['rocks', 'caves', 'hard_water'], breed: { type: 'cave', ease: 4 },
      fact: "Older siblings stay home and help guard their parents' newest fry, one of the few fish with cooperative breeding.",
    },
    {
      id: 'frontosa', name: 'Frontosa', sci: 'Cyphotilapia frontosa', cm: 33, body: 'cichlid', look: { body: 'blue', pattern: 'bars', accent: 'pearl' },
      temper: 'predator', zone: 'mid', school: 4, minL: 500, diet: ['frozen', 'pellet'], rarity: 3, appeal: 9, tags: ['big', 'eats_small', 'mouthbrooder'],
      needs: ['rocks', 'hard_water', 'swim_space'], breed: { type: 'mouthbrooder', ease: 1 }, tier: 2,
      fact: 'Frontosas live in deep water and grow a big fatty hump on the forehead; slow and stately, they eat any fish that fits.',
    },
    {
      id: 'tropheus', name: 'Tropheus', sci: 'Tropheus moorii', cm: 12, body: 'cichlid', look: { body: 'black', accent: 'gold', pattern: 'band' },
      temper: 'aggressive', zone: 'rock', school: 10, diet: ['algae', 'veg'], rarity: 3, appeal: 8, tags: ['algae', 'territorial', 'mouthbrooder'],
      needs: ['rocks', 'hard_water'], breed: { type: 'mouthbrooder', ease: 2 }, tier: 2,
      fact: 'Tropheus graze algae off the rocks; dozens of local color forms exist, each from its own stretch of shoreline.',
    },
    {
      id: 'cuckoo_catfish', name: 'Cuckoo Catfish', sci: 'Synodontis multipunctatus', cm: 15, body: 'cory', look: { body: 'sand', pattern: 'spots', accent: 'ink' },
      temper: 'semi', zone: 'bottom', school: 4, diet: ['pellet', 'detritus'], rarity: 3, appeal: 7, tags: ['scavenger', 'oddball'], needs: ['rocks', 'hard_water'], tier: 2,
      fact: 'A brood parasite: it slips its eggs among spawning mouthbrooders, and the cichlid mother unknowingly raises catfish fry that eat her own.',
    },
  ]),
  // ---------------------------------------------------------------- Southeast Asia: peat swamps
  ...group({ ...fish, regions: ['se_asia_peat'], temp: [24, 29], ph: [4.5, 7.0], gh: [0, 6] }, [
    {
      id: 'harlequin_rasbora', name: 'Harlequin Rasbora', sci: 'Trigonostigma heteromorpha', cm: 4.5, body: 'torpedo', temp: [22, 28], ph: [6.0, 7.8], gh: [2, 12],
      look: { body: 'peach', accent: 'ink', pattern: 'split' }, temper: 'peaceful', zone: 'mid', school: 8, appeal: 5, tags: ['schooling', 'colorful'],
      breed: { type: 'scatter', ease: 1 }, source: 'start',
      fact: 'Harlequins lay their eggs upside down on the underside of broad leaves, often Cryptocoryne.',
    },
    {
      id: 'chili_rasbora', name: 'Chili Rasbora', sci: 'Boraras brigittae', cm: 2, body: 'torpedo', look: { body: 'red', pattern: 'stripe', accent: 'ink' },
      temper: 'peaceful', zone: 'mid', school: 10, diet: ['micro'], rarity: 2, appeal: 5, tags: ['schooling', 'tiny', 'colorful'], needs: ['plants', 'soft_water'],
      fact: 'At under 2 cm, mosquito rasboras live in the darkest blackwater pools of Borneo, glowing red against the tannins.',
    },
    {
      id: 'chocolate_gourami', name: 'Chocolate Gourami', sci: 'Sphaerichthys osphromenoides', cm: 5, body: 'deep', look: { body: 'brown', pattern: 'bars', accent: 'gold' },
      temper: 'peaceful', zone: 'mid', school: 4, diet: ['micro', 'frozen'], rarity: 3, appeal: 6, tags: ['sensitive', 'mouthbrooder'],
      needs: ['soft_water', 'dim', 'leaves'], breed: { type: 'mouthbrooder', ease: 1 }, tier: 1,
      fact: 'Unlike most gouramis, which build bubble nests, chocolate gouramis are mouthbrooders from pH 4 peat swamps.',
    },
    {
      id: 'pearl_gourami', name: 'Pearl Gourami', sci: 'Trichopodus leerii', cm: 12, body: 'deep', look: { body: 'pearl', pattern: 'dots', belly: 'orange' },
      temper: 'peaceful', zone: 'top', appeal: 6, tags: ['colorful'], needs: ['plants', 'floating'], breed: { type: 'bubblenest', ease: 3 },
      fact: 'Males build bubble nests under floating leaves and turn fiery orange at the throat when courting.',
    },
    {
      id: 'kuhli_loach', name: 'Kuhli Loach', sci: 'Pangio kuhlii', cm: 10, body: 'loach', look: { body: 'orange', pattern: 'bars', accent: 'ink' },
      temper: 'peaceful', zone: 'substrate', school: 6, diet: ['pellet', 'detritus'], appeal: 5, tags: ['nocturnal', 'burrower', 'scavenger', 'shoaling'],
      needs: ['sand', 'caves', 'dim'],
      fact: 'Kuhlis vanish into the sand by day and pile together in a knot under roots; at night they ribbon out across the bottom.',
    },
    {
      id: 'sparkling_gourami', name: 'Sparkling Gourami', sci: 'Trichopsis pumila', regions: ['se_asia_peat', 'se_asia_river'], cm: 4, body: 'deep',
      look: { body: 'olive', accent: 'blue', pattern: 'dots', fin: 'red' }, temper: 'peaceful', zone: 'mid', school: 4, appeal: 5, rarity: 2,
      tags: ['colorful'], needs: ['plants', 'floating'], breed: { type: 'bubblenest', ease: 2 },
      fact: 'Sparkling gouramis croak: males click audibly using special tendons in their pectoral fins.',
    },
  ]),
  // ---------------------------------------------------------------- Southeast Asia: rivers and rice fields
  ...group({ ...fish, regions: ['se_asia_river'], temp: [23, 28], ph: [6.0, 7.5], gh: [3, 12] }, [
    {
      id: 'betta', name: 'Betta', sci: 'Betta splendens', cm: 6, body: 'betta', temp: [24, 30], look: { body: 'crimson', fin: 'crimson', accent: 'blue' },
      temper: 'semi', zone: 'top', max: 1, minL: 20, flow: [0, 1], diet: ['pellet', 'frozen'], appeal: 7,
      tags: ['iconic', 'colorful', 'long_fin', 'territorial'], needs: ['plants', 'floating', 'lid'], breed: { type: 'bubblenest', ease: 3 }, source: 'start',
      fact: 'Wild bettas are short-finned fish of rice paddies and swamps that breathe air with a labyrinth organ, so males can guard nests in still water.',
    },
    {
      id: 'tiger_barb', name: 'Tiger Barb', sci: 'Puntigrus tetrazona', cm: 7, body: 'deep', temp: [22, 27],
      look: { body: 'gold', pattern: 'bars', accent: 'ink', fin: 'red' }, temper: 'semi', zone: 'mid', school: 8, appeal: 5,
      tags: ['schooling', 'fin_nipper', 'colorful'],
      fact: 'In a big group, tiger barbs chase each other and leave tankmates alone; in a group of three they nip every long fin in sight.',
    },
    {
      id: 'clown_loach', name: 'Clown Loach', sci: 'Chromobotia macracanthus', cm: 25, body: 'loach', temp: [25, 30],
      look: { body: 'orange', pattern: 'bars', accent: 'ink', fin: 'red' }, temper: 'peaceful', zone: 'bottom', school: 5, minL: 400,
      diet: ['pellet', 'snails'], rarity: 2, appeal: 7, tags: ['shoaling', 'eats_snails', 'colorful'], needs: ['caves', 'sand'], tier: 1,
      fact: 'Clown loaches click audibly, sleep lying on their sides (which alarms new keepers) and hunt pest snails with relish.',
    },
    {
      id: 'glass_catfish', name: 'Glass Catfish', sci: 'Kryptopterus vitreolus', cm: 8, body: 'slender', temp: [22, 26], ph: [6.5, 7.5],
      look: { body: 'pearl', clear: true }, temper: 'peaceful', zone: 'mid', school: 6, flow: [1, 2], rarity: 2, appeal: 7,
      tags: ['schooling', 'transparent', 'oddball', 'sensitive'], needs: ['plants', 'current'],
      fact: 'You can see straight through a glass catfish to its spine; they hang in loose schools facing into the current.',
    },
    {
      id: 'bamboo_shrimp', name: 'Bamboo Shrimp', sci: 'Atyopsis moluccensis', kind: 'shrimp', cm: 8, body: 'shrimp',
      look: { body: 'brown', pattern: 'stripe', accent: 'pearl' }, temper: 'peaceful', zone: 'bottom', flow: [2, 3], diet: ['plankton'], rarity: 2, appeal: 6,
      tags: ['filter_feeder', 'oddball'], needs: ['current', 'wood'],
      fact: 'Bamboo shrimp sit in the current and open fans on their front legs to sieve food from the water.',
    },
    {
      id: 'assassin_snail', name: 'Assassin Snail', sci: 'Anentome helena', kind: 'snail', cm: 2.5, body: 'snail', temp: [22, 28], ph: [6.5, 8.0],
      look: { body: 'gold', pattern: 'stripe', accent: 'brown' }, temper: 'semi', zone: 'substrate', diet: ['snails', 'frozen'], appeal: 5,
      tags: ['pest_hunter', 'eats_snails', 'burrower'], needs: ['sand'], breed: { type: 'colony', ease: 1 }, source: 'start',
      fact: 'Assassins bury themselves in the sand and track prey by scent through their siphon; they clear pest snails but leave big mystery snails and nerites alone.',
    },
    {
      id: 'malaysian_trumpet_snail', name: 'Malaysian Trumpet Snail', sci: 'Melanoides tuberculata', kind: 'snail', regions: ['se_asia_river', 'south_asia'], cm: 2.5, body: 'snail',
      temp: [18, 30], look: { body: 'brown', pattern: 'dots' }, temper: 'peaceful', zone: 'substrate', diet: ['detritus'], price: 1,
      tags: ['burrower', 'scavenger', 'pest'], breed: { type: 'colony', ease: 4 }, source: 'hitchhiker',
      fact: 'Trumpet snails tunnel through the sand by day, keeping it aerated, and give birth to live young, so a colony grows unseen.',
    },
    {
      id: 'thai_micro_crab', name: 'Thai Micro Crab', sci: 'Limnopilos naiyanetri', kind: 'crab', cm: 1, body: 'crab', look: { body: 'pearl', clear: true },
      temper: 'peaceful', zone: 'surface', diet: ['plankton'], rarity: 3, appeal: 6, tags: ['tiny', 'filter_feeder', 'oddball'], needs: ['plants', 'floating'],
      fact: "One of the world's smallest crabs, it clings to floating plant roots and filters food with its hairy legs.",
    },
  ]),
  // ---------------------------------------------------------------- Asian hillstreams
  ...group({ ...fish, regions: ['hillstream'], temp: [18, 24], ph: [6.5, 7.5], gh: [4, 12], tier: 1 }, [
    {
      id: 'reticulated_hillstream_loach', name: 'Reticulated Hillstream Loach', sci: 'Sewellia lineolata', cm: 6, body: 'flat',
      look: { body: 'gold', pattern: 'spots', accent: 'ink' }, temper: 'peaceful', zone: 'glass', school: 3, flow: [3, 4], diet: ['algae'], rarity: 2, appeal: 7,
      tags: ['algae', 'oddball'], needs: ['current', 'rocks', 'mature'],
      fact: 'Shaped like a tiny stingray, it uses its fins as a suction cup to cling to boulders in the torrent.',
    },
    {
      id: 'white_cloud_minnow', name: 'White Cloud Minnow', sci: 'Tanichthys albonubes', regions: ['hillstream', 'east_asia'], cm: 4, body: 'torpedo', temp: [14, 24], ph: [6.5, 8.0],
      look: { body: 'olive', pattern: 'stripe', accent: 'gold', fin: 'red' }, temper: 'peaceful', zone: 'top', school: 6, tags: ['schooling', 'cold', 'colorful'],
      breed: { type: 'scatter', ease: 3 }, tier: 0,
      fact: "Discovered on White Cloud Mountain in China in the 1930s and once called the poor man's neon, it is happy without a heater.",
    },
  ]),
  // ---------------------------------------------------------------- South Asia
  ...group({ ...fish, regions: ['south_asia'], temp: [22, 27], ph: [6.5, 7.5], gh: [4, 14] }, [
    {
      id: 'zebra_danio', name: 'Zebra Danio', sci: 'Danio rerio', cm: 5, body: 'torpedo', temp: [18, 26], ph: [6.5, 8.0],
      look: { body: 'gold', pattern: 'stripe', accent: 'blue' }, temper: 'peaceful', zone: 'top', school: 6, flow: [1, 3], tags: ['schooling'],
      breed: { type: 'scatter', ease: 3 }, source: 'start',
      fact: 'Zebrafish are a star of science: their see-through embryos let biologists watch a vertebrate heart form in real time.',
    },
    {
      id: 'cherry_barb', name: 'Cherry Barb', sci: 'Puntius titteya', cm: 5, body: 'torpedo', look: { body: 'red', pattern: 'stripe', accent: 'brown' },
      temper: 'peaceful', zone: 'mid', school: 6, appeal: 5, tags: ['schooling', 'colorful'], breed: { type: 'scatter', ease: 3 },
      fact: 'From shaded Sri Lankan streams; males turn a deep cherry red when they spar over a female.',
    },
    {
      id: 'dwarf_gourami', name: 'Dwarf Gourami', sci: 'Trichogaster lalius', cm: 8, body: 'deep', temp: [24, 28],
      look: { body: 'red', pattern: 'bars', accent: 'blue' }, temper: 'peaceful', zone: 'top', max: 2, appeal: 6, tags: ['colorful'],
      needs: ['plants', 'floating'], breed: { type: 'bubblenest', ease: 3 },
      fact: 'Males weave bubble nests with bits of plant; their "feelers" are long pelvic fins packed with taste cells.',
    },
    {
      id: 'celestial_pearl_danio', name: 'Celestial Pearl Danio', sci: 'Danio margaritatus', cm: 2.5, body: 'torpedo', temp: [20, 26],
      look: { body: 'navy', pattern: 'dots', accent: 'pearl', fin: 'orange' }, temper: 'peaceful', zone: 'mid', school: 8, diet: ['micro'], rarity: 2, appeal: 6,
      tags: ['tiny', 'colorful', 'shoaling'], needs: ['plants'],
      fact: 'Unknown to science until 2006, when it turned up in a small spring-fed pond in Myanmar and caused a sensation.',
    },
    {
      id: 'rosy_barb', name: 'Rosy Barb', sci: 'Pethia conchonius', cm: 10, body: 'deep', temp: [18, 25], ph: [6.0, 8.0],
      look: { body: 'pink', pattern: 'tail', fin: 'ink' }, temper: 'peaceful', zone: 'mid', school: 6, tags: ['schooling', 'cold', 'colorful'],
      fact: 'A subtropical barb from northern India, comfortable in an unheated room, that blushes rose-red in breeding season.',
    },
  ]),
  // ---------------------------------------------------------------- Sulawesi
  ...group({ water: 'fresh', regions: ['sulawesi'], temp: [26, 30], ph: [7.5, 8.5], gh: [4, 8], source: 'expedition', tier: 2 }, [
    {
      id: 'celebes_rainbow', name: 'Celebes Rainbowfish', sci: 'Marosatherina ladigesi', kind: 'fish', cm: 7, body: 'torpedo', temp: [24, 28], ph: [7.0, 8.0],
      look: { body: 'gold', fin: 'yellow', accent: 'teal', pattern: 'stripe' }, temper: 'peaceful', zone: 'top', school: 6, rarity: 2, appeal: 6,
      tags: ['schooling', 'colorful', 'long_fin'], needs: ['hard_water'],
      fact: 'Males sport yellow-and-black edged sail fins; in the wild they live only in streams of southern Sulawesi.',
    },
    {
      id: 'cardinal_shrimp', name: 'Sulawesi Cardinal Shrimp', sci: 'Caridina dennerli', kind: 'shrimp', cm: 2, body: 'shrimp',
      look: { body: 'red', pattern: 'dots', accent: 'pearl' }, temper: 'peaceful', zone: 'rock', school: 6, diet: ['algae', 'detritus'], rarity: 4, appeal: 8,
      tags: ['tiny', 'sensitive', 'endangered', 'colorful'], needs: ['rocks', 'mature'], breed: { type: 'colony', ease: 1 },
      fact: 'From Lake Matano: warm, soft but alkaline water. Critically endangered in the wild; aquarium strains keep the line alive.',
    },
    {
      id: 'rabbit_snail', name: 'Rabbit Snail', sci: 'Tylomelania sp.', kind: 'snail', cm: 8, body: 'snail', look: { body: 'brown', accent: 'gold' },
      temper: 'peaceful', zone: 'bottom', diet: ['detritus', 'algae'], rarity: 3, appeal: 7, tags: ['scavenger', 'oddball'], needs: ['hard_water'],
      breed: { type: 'colony', ease: 1 },
      fact: "Rabbit snails from Sulawesi's ancient lakes have long ear-like tentacles and give birth to one big baby at a time.",
    },
  ]),
  // ---------------------------------------------------------------- Australia and New Guinea
  ...group({ ...fish, regions: ['australia_png'], temp: [22, 28], ph: [7.0, 8.2], gh: [6, 14], tier: 1 }, [
    {
      id: 'boesemani_rainbow', name: "Boeseman's Rainbowfish", sci: 'Melanotaenia boesemani', cm: 10, body: 'deep', temp: [24, 30],
      look: { body: 'blue', belly: 'orange', pattern: 'split' }, temper: 'peaceful', zone: 'mid', school: 6, rarity: 2, appeal: 8,
      tags: ['schooling', 'colorful'], needs: ['swim_space', 'plants'], breed: { type: 'scatter', ease: 3 },
      fact: 'Half blue, half orange, it lives only in the Ajamaru Lakes of West Papua, where wild stocks are threatened.',
    },
    {
      id: 'kutubu_rainbow', name: 'Lake Kutubu Rainbowfish', sci: 'Melanotaenia lacustris', cm: 12, body: 'deep', temp: [21, 27], ph: [7.5, 8.2],
      look: { body: 'teal', belly: 'pearl', pattern: 'stripe' }, temper: 'peaceful', zone: 'mid', school: 6, rarity: 2, appeal: 7,
      tags: ['schooling', 'colorful'], needs: ['swim_space'], breed: { type: 'scatter', ease: 3 },
      fact: 'From limestone-fed Lake Kutubu in Papua New Guinea (pH 7.6 to 8.1); its turquoise back flashes like sunlit water.',
    },
    {
      id: 'threadfin_rainbow', name: 'Threadfin Rainbowfish', sci: 'Iriatherina werneri', cm: 5, body: 'torpedo', temp: [24, 29],
      look: { body: 'gold', fin: 'pearl', accent: 'red' }, temper: 'peaceful', zone: 'top', school: 6, diet: ['micro'], rarity: 2, appeal: 7,
      tags: ['long_fin', 'colorful', 'shoaling'], needs: ['plants'],
      fact: 'Males trail fin threads longer than their bodies and spread them in courtship dances; keep them away from fin nippers.',
    },
    {
      id: 'forktail_blue_eye', name: 'Forktail Blue-eye', sci: 'Pseudomugil furcatus', cm: 5, body: 'torpedo', temp: [24, 27],
      look: { body: 'yellow', fin: 'yellow', accent: 'sky' }, temper: 'peaceful', zone: 'top', school: 6, appeal: 6,
      tags: ['schooling', 'colorful'], fact: 'Named for their luminous blue eyes; they dart along the surface of clear Papuan streams.',
    },
  ]),
  // ---------------------------------------------------------------- East Asian ponds and paddies (coldwater)
  ...group({ ...fish, regions: ['east_asia'], temp: [10, 24], ph: [6.5, 8.0], gh: [5, 15] }, [
    {
      id: 'comet_goldfish', name: 'Comet Goldfish', sci: 'Carassius auratus', cm: 30, body: 'torpedo', look: { body: 'orange', fin: 'orange' },
      temper: 'peaceful', zone: 'mid', school: 3, minL: 300, flow: [1, 2], diet: ['flake', 'veg'], appeal: 5,
      tags: ['cold', 'big', 'iconic', 'plant_eater'], needs: ['swim_space'], breed: { type: 'scatter', ease: 2 },
      fact: 'The goldfish-in-a-bowl is a myth worth breaking: comets grow to 30 cm and belong in big tanks or ponds.',
    },
    {
      id: 'oranda', name: 'Oranda Goldfish', sci: 'Carassius auratus', cm: 18, body: 'fancy', temp: [16, 24],
      look: { body: 'orange', fin: 'pearl', accent: 'red', pattern: 'calico' }, temper: 'peaceful', zone: 'mid', school: 2, minL: 150, flow: [0, 1],
      diet: ['pellet', 'veg'], rarity: 2, appeal: 8, tags: ['cold', 'iconic', 'long_fin'], breed: { type: 'scatter', ease: 2 },
      fact: "Fancy goldfish were bred in China over a thousand years; the oranda's raspberry-like wen takes years to grow.",
    },
    {
      id: 'koi', name: 'Koi', sci: 'Cyprinus rubrofuscus', cm: 70, body: 'koi', temp: [4, 25], ph: [7.0, 8.5],
      look: { body: 'pearl', accent: 'red', pattern: 'calico' }, temper: 'peaceful', zone: 'mid', school: 3, minL: 3000, flow: [1, 2], diet: ['pellet', 'veg'],
      rarity: 3, appeal: 9, tags: ['cold', 'big', 'iconic'], needs: ['swim_space'], breed: { type: 'scatter', ease: 1 }, tier: 3,
      fact: 'Nishikigoi, "brocaded carp", were developed by rice farmers in Niigata, Japan, and can live well over 50 years.',
    },
    {
      id: 'medaka', name: 'Medaka', sci: 'Oryzias latipes', cm: 4, body: 'torpedo', temp: [10, 28], look: { body: 'gold', fin: 'pearl' },
      temper: 'peaceful', zone: 'top', school: 6, tags: ['cold', 'schooling', 'brackish_ok'], breed: { type: 'scatter', ease: 4 },
      fact: 'Japanese rice fish carry their egg clusters on their bellies for a few hours; medaka have even bred in orbit.',
    },
    {
      id: 'weather_loach', name: 'Weather Loach', sci: 'Misgurnus anguillicaudatus', cm: 20, body: 'loach', temp: [5, 25],
      look: { body: 'olive', pattern: 'dots', belly: 'sand' }, temper: 'peaceful', zone: 'substrate', school: 3, minL: 150, diet: ['pellet', 'detritus'], appeal: 5,
      tags: ['cold', 'burrower', 'scavenger', 'eats_snails'], needs: ['sand'],
      fact: 'Weather loaches grow restless before storms, sensing falling air pressure: a living barometer.',
    },
    {
      id: 'paradise_fish', name: 'Paradise Fish', sci: 'Macropodus opercularis', cm: 9, body: 'betta', temp: [16, 26],
      look: { body: 'red', pattern: 'bars', accent: 'blue' }, temper: 'semi', zone: 'top', max: 2, appeal: 6,
      tags: ['cold', 'colorful', 'territorial'], needs: ['plants', 'floating', 'lid'], breed: { type: 'bubblenest', ease: 3 },
      fact: 'Among the first exotic aquarium fish brought to Europe (1869), paradise fish shrug off unheated rooms.',
    },
    {
      id: 'cherry_shrimp', name: 'Cherry Shrimp', sci: "Neocaridina davidi 'Red Cherry'", kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'red', accent: 'crimson' }, temper: 'peaceful', zone: 'bottom', school: 10, flow: [0, 2], diet: ['algae', 'detritus', 'flake'], appeal: 5,
      tags: ['algae', 'scavenger', 'tiny', 'neo_color', 'colorful'], needs: ['moss'], breed: { type: 'colony', ease: 5 }, source: 'start',
      fact: "Wild Neocaridina are brown and camouflaged. Red cherries were bred in Taiwan and graded from Sakura through Fire Red to Painted Fire Red. Bloody Mary is a separate, deeper red line.",
    },
    {
      id: 'blue_dream_shrimp', name: 'Blue Dream Shrimp', sci: "Neocaridina davidi 'Blue Dream'", kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'blue' }, temper: 'peaceful', zone: 'bottom', school: 10, diet: ['algae', 'detritus'], rarity: 2, appeal: 6,
      tags: ['algae', 'scavenger', 'tiny', 'neo_color', 'colorful'], needs: ['moss'], breed: { type: 'colony', ease: 5 },
      fact: 'Every Neocaridina color is one species; mix blue dreams with cherries and within a few generations the colony drifts back to wild brown.',
    },
    {
      id: 'yellow_shrimp', name: 'Yellow Neocaridina', sci: "Neocaridina davidi 'Yellow'", kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'gold' }, temper: 'peaceful', zone: 'bottom', school: 10, diet: ['algae', 'detritus'], appeal: 5,
      tags: ['algae', 'scavenger', 'tiny', 'neo_color', 'colorful'], needs: ['moss'], breed: { type: 'colony', ease: 5 },
      fact: 'Yellow shrimp show best over dark substrate and green moss; a pale saddle on a female is a clutch of developing eggs.',
    },
    {
      id: 'green_jade_shrimp', name: 'Green Jade Shrimp', sci: "Neocaridina davidi 'Green Jade'", kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'green' }, temper: 'peaceful', zone: 'bottom', school: 10, diet: ['algae', 'detritus'], rarity: 2, appeal: 5,
      tags: ['algae', 'scavenger', 'tiny', 'neo_color', 'colorful'], needs: ['moss'], breed: { type: 'colony', ease: 5 },
      fact: 'Green jades are a newer Neocaridina line; like all of them they graze biofilm all day and molt their skins as they grow.',
    },
    {
      id: 'black_rose_shrimp', name: 'Black Rose Shrimp', sci: "Neocaridina davidi 'Black Rose'", kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'black' }, temper: 'peaceful', zone: 'bottom', school: 10, diet: ['algae', 'detritus'], rarity: 2, appeal: 6,
      tags: ['algae', 'scavenger', 'tiny', 'neo_color'], needs: ['moss'], breed: { type: 'colony', ease: 5 },
      fact: 'Black rose shrimp look like lacquered jet against pale sand, a favorite contrast in shrimp-only nano tanks.',
    },
    {
      id: 'wild_neocaridina', name: 'Wild-type Neocaridina', sci: 'Neocaridina davidi', kind: 'shrimp', cm: 2.5, body: 'shrimp', temp: [18, 28],
      look: { body: 'brown', pattern: 'dots' }, temper: 'peaceful', zone: 'bottom', school: 10, diet: ['algae', 'detritus'], price: 1, appeal: 2,
      tags: ['algae', 'scavenger', 'tiny'], needs: ['moss'], breed: { type: 'colony', ease: 5 }, source: 'hitchhiker',
      fact: 'What every Neocaridina color line drifts back to when colors are mixed: the speckled brown camouflage of wild Taiwanese shrimp.',
    },
    {
      id: 'amano_shrimp', name: 'Amano Shrimp', sci: 'Caridina multidentata', kind: 'shrimp', cm: 5, body: 'shrimp', temp: [18, 28], ph: [6.0, 8.0],
      look: { body: 'pearl', pattern: 'dots', clear: true, accent: 'brown' }, temper: 'peaceful', zone: 'bottom', school: 3, diet: ['algae', 'detritus'], appeal: 5,
      tags: ['algae', 'scavenger'], source: 'start',
      fact: 'Takashi Amano made these famous as algae eaters in his Nature Aquariums; their larvae need brackish water, so they never breed in a normal tank.',
    },
    {
      id: 'crystal_red_shrimp', name: 'Crystal Red Shrimp', sci: "Caridina cantonensis 'Crystal Red'", kind: 'shrimp', cm: 2.5, body: 'shrimp',
      temp: [18, 24], ph: [5.8, 6.8], gh: [4, 6], look: { body: 'pearl', pattern: 'bars', accent: 'red' }, temper: 'peaceful', zone: 'bottom', school: 10,
      diet: ['algae', 'detritus'], rarity: 3, appeal: 7, tags: ['tiny', 'sensitive', 'colorful'], needs: ['soft_water', 'mature'],
      breed: { type: 'colony', ease: 2 }, tier: 1,
      fact: 'Bred in Japan in the 1990s from a red mutation of the bee shrimp; they need soft, acidic water over active soil and suffer above 25 C.',
    },
    {
      id: 'blue_bolt_shrimp', name: 'Blue Bolt Shrimp', sci: "Caridina cf. cantonensis 'Blue Bolt'", kind: 'shrimp', cm: 2.5, body: 'shrimp',
      temp: [18, 24], ph: [5.8, 6.8], gh: [4, 6], look: { body: 'sky', pattern: 'plain', accent: 'pearl' }, temper: 'peaceful', zone: 'bottom', school: 10,
      diet: ['algae', 'detritus'], rarity: 4, appeal: 8, tags: ['tiny', 'sensitive', 'colorful'], needs: ['soft_water', 'mature'],
      breed: { type: 'colony', ease: 1 }, tier: 2,
      fact: "A 'Taiwan bee' line, sky blue from head to tail; collectors pay a small fortune for a solid, even blue.",
    },
    {
      id: 'japanese_trapdoor_snail', name: 'Japanese Trapdoor Snail', sci: 'Sinotaia quadrata histrica', kind: 'snail', cm: 4, body: 'snail', temp: [5, 26],
      look: { body: 'olive' }, temper: 'peaceful', zone: 'bottom', diet: ['algae', 'detritus'], tags: ['cold', 'algae', 'scavenger'],
      breed: { type: 'colony', ease: 2 }, fact: 'A pond snail that seals itself behind a trapdoor (operculum) and gives birth to live young.',
    },
    {
      id: 'fire_bellied_newt', name: 'Chinese Fire-bellied Newt', sci: 'Cynops orientalis', kind: 'amphibian', cm: 9, body: 'newt', temp: [15, 22],
      look: { body: 'black', belly: 'orange' }, temper: 'peaceful', zone: 'bottom', diet: ['frozen', 'live'], rarity: 2, appeal: 8,
      tags: ['cold', 'amphibious'], needs: ['land', 'chill', 'lid'], tier: 2,
      fact: 'Fire-bellied newts flash an orange belly to warn that their skin is toxic, and they need both water and a dry haul-out.',
    },
  ]),
  // ---------------------------------------------------------------- North American creeks
  ...group({ ...fish, regions: ['temperate_na'], temp: [10, 24], ph: [6.5, 8.0], gh: [5, 15], tier: 1 }, [
    {
      id: 'rainbow_darter', name: 'Rainbow Darter', sci: 'Etheostoma caeruleum', cm: 6, body: 'goby', temp: [10, 22],
      look: { body: 'olive', accent: 'orange', pattern: 'bars', fin: 'blue' }, temper: 'peaceful', zone: 'rock', flow: [2, 4], diet: ['frozen', 'live'],
      rarity: 2, appeal: 7, tags: ['cold', 'colorful'], needs: ['current', 'rocks', 'chill'],
      fact: 'Darters have no swim bladder: they perch on stones in the riffles and dart from rock to rock.',
    },
    {
      id: 'longear_sunfish', name: 'Longear Sunfish', sci: 'Lepomis megalotis', cm: 15, body: 'deep', temp: [10, 26],
      look: { body: 'orange', accent: 'teal', pattern: 'marble' }, temper: 'semi', zone: 'mid', minL: 150, diet: ['frozen', 'pellet'], rarity: 2, appeal: 7,
      tags: ['cold', 'colorful', 'territorial'], needs: ['rocks', 'plants'], breed: { type: 'nest', ease: 3 },
      fact: 'Male longears fan out gravel nests in the shallows and guard them, glowing orange with turquoise squiggles.',
    },
    {
      id: 'redbelly_dace', name: 'Southern Redbelly Dace', sci: 'Chrosomus erythrogaster', cm: 7, body: 'torpedo', temp: [8, 22],
      look: { body: 'olive', belly: 'red', pattern: 'stripe' }, temper: 'peaceful', zone: 'mid', school: 6, appeal: 5, tags: ['cold', 'schooling', 'colorful'],
      needs: ['current'], fact: 'In spring, redbelly dace light up scarlet and yellow and spawn over the gravel nests of sunfish.',
    },
    {
      id: 'ghost_shrimp', name: 'Ghost Shrimp', sci: 'Palaemonetes paludosus', kind: 'shrimp', cm: 4, body: 'shrimp', temp: [15, 27],
      look: { body: 'pearl', clear: true }, temper: 'peaceful', zone: 'bottom', school: 3, diet: ['detritus', 'flake'], price: 2,
      tags: ['transparent', 'scavenger', 'cold'], breed: { type: 'colony', ease: 2 }, tier: 0,
      fact: "You can watch a ghost shrimp's dinner travel through its clear body. Often sold as feeders, they are charming scavengers.",
    },
    {
      id: 'red_ramshorn', name: 'Red Ramshorn Snail', sci: 'Planorbella duryi', kind: 'snail', cm: 2, body: 'snail', temp: [15, 28],
      look: { body: 'red' }, temper: 'peaceful', zone: 'glass', diet: ['algae', 'detritus'], price: 2, tags: ['algae', 'scavenger'],
      breed: { type: 'colony', ease: 5 }, tier: 0,
      fact: "Ramshorns have no trapdoor (operculum), which makes them an assassin snail's favorite meal.",
    },
    {
      id: 'bladder_snail', name: 'Bladder Snail', sci: 'Physella acuta', kind: 'snail', regions: ['temperate_na', 'temperate_eu'], cm: 1, body: 'snail', temp: [10, 28],
      look: { body: 'sand' }, temper: 'peaceful', zone: 'glass', diet: ['detritus'], price: 0, tags: ['pest', 'scavenger', 'tiny'],
      breed: { type: 'colony', ease: 5 }, source: 'hitchhiker', tier: 0,
      fact: 'Bladder snails ride in on new plants as eggs; a population boom means too much food, not too many snails.',
    },
    {
      id: 'red_swamp_crayfish', name: 'Red Swamp Crayfish', sci: 'Procambarus clarkii', kind: 'crayfish', cm: 12, body: 'crayfish', temp: [10, 26],
      look: { body: 'red', accent: 'ink' }, temper: 'aggressive', zone: 'bottom', max: 1, diet: ['pellet', 'veg'], appeal: 6,
      tags: ['eats_small', 'plant_eater', 'escape_artist', 'cold'], needs: ['caves', 'lid'],
      fact: 'Native to the southern US and invasive almost everywhere else, it will shred a planted tank overnight.',
    },
  ]),
  // ---------------------------------------------------------------- European ponds
  ...group({ ...fish, regions: ['temperate_eu'], temp: [8, 22], ph: [7.0, 8.0], gh: [8, 18], tier: 1 }, [
    {
      id: 'bitterling', name: 'European Bitterling', sci: 'Rhodeus amarus', cm: 8, body: 'deep', look: { body: 'silver', accent: 'magenta', pattern: 'stripe' },
      temper: 'peaceful', zone: 'mid', school: 4, rarity: 2, appeal: 6, tags: ['cold', 'symbiont'], needs: ['mussel'], breed: { type: 'mussel', ease: 2 },
      fact: "Female bitterlings lay eggs inside living freshwater mussels with a long ovipositor; the mussel's larvae ride on the fish in return.",
    },
    {
      id: 'stickleback', name: 'Three-spined Stickleback', sci: 'Gasterosteus aculeatus', regions: ['temperate_eu', 'temperate_na'], cm: 6, body: 'torpedo', temp: [4, 20],
      look: { body: 'olive', belly: 'red' }, temper: 'semi', zone: 'mid', diet: ['frozen', 'live'], appeal: 5, tags: ['cold', 'brackish_ok', 'territorial'],
      needs: ['plants', 'chill'], breed: { type: 'nest', ease: 3 },
      fact: 'Male sticklebacks glue a tunnel nest from plant bits, then zigzag-dance to lead a female inside.',
    },
    {
      id: 'swan_mussel', name: 'Swan Mussel', sci: 'Anodonta cygnea', kind: 'bivalve', cm: 15, body: 'mussel', temp: [5, 22],
      look: { body: 'olive' }, temper: 'peaceful', zone: 'substrate', diet: ['plankton'], rarity: 2, appeal: 3,
      tags: ['filter_feeder', 'cold', 'symbiont'], needs: ['sand'], breed: { type: 'mussel', ease: 1 },
      fact: 'Freshwater mussels filter liters of water an hour; their larvae ride on fish gills, and bitterlings repay the favor by nesting inside them.',
    },
  ]),
];
