// Brackish water: mangroves, estuaries and tidal flats. Specific gravity follows the tiers in
// RESEARCH.md ("Brackish"): low-end 1.002-1.006, mid 1.008-1.012, high-end 1.015-1.020.
// Brackish tanks use marine salt, never plain aquarium salt.
import { group } from './define';
import type { SpeciesDef } from '../types';

export const BRACKISH: SpeciesDef[] = [
  ...group({ kind: 'fish', water: 'brackish', regions: ['mangrove'], temp: [24, 30], ph: [7.5, 8.5], gh: [8, 20], sg: [1.005, 1.015], tier: 2 }, [
    {
      id: 'archerfish', name: 'Banded Archerfish', sci: 'Toxotes jaculatrix', cm: 20, body: 'deep', sg: [1.003, 1.012],
      look: { body: 'silver', pattern: 'bars', accent: 'ink' }, temper: 'semi', zone: 'surface', school: 3, minL: 300, diet: ['live', 'frozen'],
      rarity: 3, appeal: 9, tags: ['iconic', 'oddball', 'eats_small'], needs: ['open_air', 'land'],
      fact: 'Archerfish shoot jets of water to knock insects off leaves, correcting for the bend of light at the surface, and they learn faces.',
    },
    {
      id: 'mono', name: 'Silver Mono', sci: 'Monodactylus argenteus', cm: 25, body: 'disc', sg: [1.005, 1.020],
      look: { body: 'silver', fin: 'yellow' }, temper: 'semi', zone: 'mid', school: 5, minL: 400, rarity: 2, appeal: 6, tags: ['schooling'],
      needs: ['swim_space'],
      fact: 'Monos school in estuaries as juveniles and move out to sea as they grow, so their tank should creep saltier over the years.',
    },
    {
      id: 'scat', name: 'Spotted Scat', sci: 'Scatophagus argus', cm: 30, body: 'disc',
      look: { body: 'gold_sand', pattern: 'spots', accent: 'ink' }, temper: 'peaceful', zone: 'mid', school: 3, minL: 400, diet: ['veg', 'flake'],
      rarity: 2, appeal: 6, tags: ['plant_eater'], needs: ['swim_space'],
      fact: "Spotted scats graze algae and almost anything else; their Latin name politely means 'dung-eater'.",
    },
    {
      id: 'figure_eight_puffer', name: 'Figure Eight Puffer', sci: 'Tetraodon biocellatus', cm: 8, body: 'puffer', temp: [24, 28], ph: [7.0, 8.0], sg: [1.000, 1.006],
      look: { body: 'olive', pattern: 'marble', accent: 'yellow' }, temper: 'semi', zone: 'mid', diet: ['snails', 'frozen'], rarity: 2, appeal: 8,
      tags: ['eats_snails', 'eats_inverts', 'brackish_ok', 'oddball'], needs: ['plants'], tier: 1,
      fact: "Puffers' beaks grow constantly, and crunching snails keeps them trimmed. Inflating is an emergency move, never something to provoke.",
    },
    {
      id: 'green_spotted_puffer', name: 'Green Spotted Puffer', sci: 'Dichotomyctere nigroviridis', cm: 15, body: 'puffer', temp: [24, 28], sg: [1.008, 1.020],
      look: { body: 'lime', belly: 'pearl', pattern: 'spots', accent: 'ink' }, temper: 'aggressive', zone: 'mid', minL: 150, diet: ['snails', 'frozen'],
      rarity: 2, appeal: 8, tags: ['eats_snails', 'eats_inverts', 'fin_nipper', 'oddball'],
      fact: 'Juvenile green spotted puffers tolerate low-end brackish water, but adults need it nearly marine.',
    },
    {
      id: 'bumblebee_goby', name: 'Bumblebee Goby', sci: 'Brachygobius doriae', cm: 3, body: 'goby', ph: [7.0, 8.5], sg: [1.002, 1.008],
      look: { body: 'yellow', pattern: 'bars', accent: 'ink' }, temper: 'semi', zone: 'bottom', school: 6, diet: ['frozen', 'live'], appeal: 6,
      tags: ['tiny', 'colorful', 'territorial'], needs: ['caves', 'shells'], tier: 1,
      fact: 'Bumblebee gobies perch on rocks with fused pelvic fins and claim tiny territories, each about the size of a shell.',
    },
    {
      id: 'mudskipper', name: 'Atlantic Mudskipper', sci: 'Periophthalmus barbarus', cm: 15, body: 'mudskipper',
      look: { body: 'sand', pattern: 'spots', accent: 'blue' }, temper: 'semi', zone: 'land', max: 3, diet: ['live', 'frozen'], rarity: 3, appeal: 9,
      tags: ['amphibious', 'oddball', 'iconic', 'territorial'], needs: ['land', 'open_air'],
      fact: "Mudskippers spend most of their time out of the water, breathing through their skin and a mouthful of water, and 'skip' on their pectoral fins.",
    },
    {
      id: 'orange_chromide', name: 'Orange Chromide', sci: 'Pseudetroplus maculatus', cm: 8, body: 'cichlid', temp: [23, 28], sg: [1.002, 1.010],
      look: { body: 'gold', pattern: 'dots', accent: 'ink' }, temper: 'semi', zone: 'bottom', rarity: 2, appeal: 6, tags: ['colorful', 'brackish_ok'],
      needs: ['rocks', 'caves'], breed: { type: 'cave', ease: 3 },
      fact: 'One of only a few Asian cichlids; orange chromides sometimes clean parasites off their bigger relatives, the green chromides.',
    },
    {
      id: 'sailfin_molly', name: 'Sailfin Molly', sci: 'Poecilia latipinna', cm: 12, body: 'torpedo', temp: [22, 28], sg: [1.000, 1.015],
      look: { body: 'silver', fin: 'gold', pattern: 'dots' }, temper: 'peaceful', zone: 'top', school: 3, diet: ['flake', 'algae'], appeal: 5,
      tags: ['livebearer', 'algae', 'brackish_ok'], breed: { type: 'livebearer', ease: 4 }, tier: 1,
      fact: 'Sailfin mollies range from Carolina marshes into salty lagoons; males raise a dorsal fin like a sail to court.',
    },
    {
      id: 'knight_goby', name: 'Knight Goby', sci: 'Stigmatogobius sadanundio', cm: 8, body: 'goby',
      look: { body: 'pearl', pattern: 'dots', accent: 'ink' }, temper: 'semi', zone: 'bottom', diet: ['frozen'], appeal: 5,
      tags: ['territorial'], needs: ['caves'],
      fact: 'Knight gobies stake out a cave and flare their fins at intruders, then settle in to watch the world go by.',
    },
  ]),
  ...group({ water: 'brackish', regions: ['mangrove'], temp: [22, 30], ph: [7.5, 8.5], gh: [8, 20], sg: [1.003, 1.015], tier: 2 }, [
    {
      id: 'red_claw_crab', name: 'Red Claw Crab', sci: 'Perisesarma bidens', kind: 'crab', cm: 5, body: 'crab',
      look: { body: 'brown', accent: 'red' }, temper: 'semi', zone: 'land', diet: ['detritus', 'pellet'], appeal: 6,
      tags: ['amphibious', 'escape_artist'], needs: ['land', 'lid'],
      fact: 'Often sold as freshwater crabs, red claws actually need brackish water and a dry place to climb out.',
    },
    {
      id: 'fiddler_crab', name: 'Fiddler Crab', sci: 'Afruca tangeri', kind: 'crab', cm: 5, body: 'crab',
      look: { body: 'sand', accent: 'gold' }, temper: 'peaceful', zone: 'land', diet: ['detritus'], rarity: 2, appeal: 8,
      tags: ['amphibious', 'oddball'], needs: ['land', 'sand'],
      fact: 'Male fiddler crabs wave one enormous claw to court females and warn off rivals.',
    },
  ]),
  // Nerites live in rivers but breed only in brackish estuaries: kept in freshwater, they never multiply.
  ...group({ kind: 'snail', water: 'fresh', regions: ['mangrove'], temp: [22, 28], ph: [7.0, 8.5], gh: [6, 18] }, [
    {
      id: 'zebra_nerite', name: 'Zebra Nerite', sci: 'Neritina natalensis', cm: 2.5, body: 'snail', look: { body: 'gold', pattern: 'stripe', accent: 'ink' },
      temper: 'peaceful', zone: 'glass', diet: ['algae'], appeal: 5, tags: ['algae', 'brackish_ok'], source: 'start',
      fact: 'Top algae grazers; they lay hard white eggs on wood and rock that never hatch in freshwater, because the larvae need brackish water.',
    },
    {
      id: 'horned_nerite', name: 'Horned Nerite', sci: 'Clithon corona', cm: 1.5, body: 'snail', look: { body: 'olive', pattern: 'bars', accent: 'ink' },
      temper: 'peaceful', zone: 'glass', diet: ['algae'], appeal: 5, tags: ['algae', 'brackish_ok', 'tiny'], needs: ['lid'],
      fact: 'Little spikes protect it from crabs in the mangroves; it likes to climb out of the water, so a lid helps.',
    },
  ]),
];
