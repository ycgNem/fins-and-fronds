// Marine fish and invertebrates: reefs, lagoons, kelp forests, tide pools, open ocean, deep sea and
// cold northern seas. Reef parameters: SG 1.023-1.026, pH 8.0-8.4 (RESEARCH.md, "Reef").
import { group } from './define';
import type { SpeciesDef } from '../types';

const reef = { water: 'marine', temp: [24, 28], ph: [8.0, 8.4], sg: [1.023, 1.026], tier: 3 } as const;
const cold = { water: 'marine', ph: [7.9, 8.3], sg: [1.024, 1.026], tier: 4 } as const;

export const MARINE: SpeciesDef[] = [
  // ---------------------------------------------------------------- Indo-Pacific reef fish
  ...group({ ...reef, kind: 'fish', regions: ['indo_pacific'] }, [
    {
      id: 'ocellaris_clownfish', name: 'Ocellaris Clownfish', sci: 'Amphiprion ocellaris', cm: 8, body: 'deep',
      look: { body: 'orange', pattern: 'band', accent: 'pearl', fin: 'orange' }, temper: 'semi', zone: 'mid', school: 2, max: 2, minL: 60, diet: ['flake', 'frozen'],
      rarity: 1, appeal: 9, tags: ['iconic', 'reef_safe', 'symbiont', 'colorful'], breed: { type: 'pair', ease: 3 },
      fact: 'All clownfish hatch male; the largest in a group becomes female, and if she is lost the biggest male changes sex to take her place.',
    },
    {
      id: 'regal_tang', name: 'Regal Tang', sci: 'Paracanthurus hepatus', cm: 30, body: 'tang',
      look: { body: 'blue', accent: 'navy', fin: 'yellow', pattern: 'mask' }, temper: 'semi', zone: 'mid', minL: 500, flow: [2, 3], diet: ['veg', 'frozen'],
      rarity: 3, appeal: 10, tags: ['iconic', 'reef_safe', 'algae', 'big'], needs: ['swim_space', 'rocks'],
      fact: 'Regal tangs wedge into rock crevices to sleep, and when frightened they sometimes lie flat on their side, "playing dead".',
    },
    {
      id: 'yellow_tang', name: 'Yellow Tang', sci: 'Zebrasoma flavescens', cm: 20, body: 'tang',
      look: { body: 'yellow' }, temper: 'semi', zone: 'mid', minL: 300, flow: [2, 3], diet: ['veg'], rarity: 2, appeal: 8,
      tags: ['reef_safe', 'algae', 'colorful'], needs: ['swim_space'],
      fact: 'From Hawaiian reefs; at night it fades and shows a pale stripe, and its tail "scalpel" is a reminder that it is a surgeonfish.',
    },
    {
      id: 'flame_angelfish', name: 'Flame Angelfish', sci: 'Centropyge loricula', cm: 10, body: 'deep',
      look: { body: 'red', pattern: 'bars', accent: 'ink', fin: 'blue' }, temper: 'semi', zone: 'rock', max: 1, minL: 200, diet: ['veg', 'frozen'],
      rarity: 3, appeal: 9, tags: ['colorful', 'reef_risk'], needs: ['rocks'],
      fact: 'A dwarf angelfish that grazes rock all day; it may nip clam mantles and fleshy corals, so reef keepers take a calculated risk.',
    },
    {
      id: 'mandarin_dragonet', name: 'Mandarin Dragonet', sci: 'Synchiropus splendidus', cm: 7, body: 'goby',
      look: { body: 'blue', accent: 'orange', pattern: 'marble', fin: 'teal' }, temper: 'peaceful', zone: 'rock', max: 2, minL: 200, diet: ['plankton', 'live'],
      rarity: 4, appeal: 10, tags: ['colorful', 'reef_safe', 'sensitive'], needs: ['mature', 'rocks'],
      fact: 'Mandarins pick tiny copepods off the rock all day; only a mature tank with a refugium raises enough to feed one.',
    },
    {
      id: 'firefish', name: 'Firefish Goby', sci: 'Nemateleotris magnifica', cm: 8, body: 'slender',
      look: { body: 'pearl', fin: 'red', accent: 'magenta', pattern: 'tail' }, temper: 'peaceful', zone: 'mid', diet: ['frozen', 'plankton'], rarity: 2, appeal: 7,
      tags: ['reef_safe', 'jumper', 'colorful'], needs: ['lid', 'caves'],
      fact: 'Firefish hover above their burrow flicking a long dorsal fin, and dart into the rock at the first shadow.',
    },
    {
      id: 'yellow_watchman_goby', name: 'Yellow Watchman Goby', sci: 'Cryptocentrus cinctus', cm: 10, body: 'goby',
      look: { body: 'yellow', pattern: 'dots', accent: 'sky' }, temper: 'semi', zone: 'substrate', diet: ['frozen'], rarity: 2, appeal: 6,
      tags: ['reef_safe', 'symbiont', 'burrower'], needs: ['sand', 'deep_sand'],
      fact: 'It shares a burrow with a nearly blind pistol shrimp: the shrimp digs, the goby keeps watch and flicks its tail to warn of danger.',
    },
    {
      id: 'banggai_cardinal', name: 'Banggai Cardinalfish', sci: 'Pterapogon kauderni', cm: 8, body: 'deep',
      look: { body: 'silver', pattern: 'bars', accent: 'ink', fin: 'pearl' }, temper: 'peaceful', zone: 'mid', school: 3, diet: ['frozen'], rarity: 2, appeal: 7,
      tags: ['reef_safe', 'mouthbrooder', 'endangered', 'iconic'], breed: { type: 'mouthbrooder', ease: 3 },
      fact: "Found only around Indonesia's Banggai Islands; the male broods the eggs in his mouth and releases fully formed young.",
    },
    {
      id: 'sixline_wrasse', name: 'Sixline Wrasse', sci: 'Pseudocheilinus hexataenia', cm: 8, body: 'slender',
      look: { body: 'purple', pattern: 'stripe', accent: 'orange' }, temper: 'semi', zone: 'rock', max: 1, diet: ['frozen', 'flake'], appeal: 6,
      tags: ['reef_safe', 'pest_hunter', 'territorial'], needs: ['rocks'],
      fact: 'Six-lines patrol the rockwork eating pests like flatworms and pyramid snails, though they can bully gentler newcomers.',
    },
    {
      id: 'lionfish', name: 'Red Lionfish', sci: 'Pterois volitans', cm: 38, body: 'lionfish',
      look: { body: 'red', pattern: 'bars', accent: 'pearl', fin: 'pearl' }, temper: 'predator', zone: 'mid', minL: 400, diet: ['frozen', 'carnivore'],
      rarity: 3, appeal: 9, tags: ['venomous', 'iconic', 'eats_small', 'eats_inverts', 'big'], needs: ['rocks', 'caves'],
      fact: 'At home on Indo-Pacific reefs, lionfish are an invasive pest in the Caribbean, where divers hunt them to protect native fish.',
    },
    {
      id: 'picasso_trigger', name: 'Picasso Triggerfish', sci: 'Rhinecanthus aculeatus', cm: 30, body: 'deep',
      look: { body: 'sand', pattern: 'stripe', accent: 'blue', fin: 'yellow' }, temper: 'aggressive', zone: 'mid', minL: 400, diet: ['frozen', 'carnivore'],
      rarity: 3, appeal: 8, tags: ['eats_inverts', 'reef_risk', 'colorful', 'oddball'], needs: ['rocks', 'sand'],
      fact: 'Triggers lock their first dorsal spine upright to wedge into crevices, and the Picasso grunts audibly when disturbed.',
    },
    {
      id: 'porcupine_puffer', name: 'Porcupine Puffer', sci: 'Diodon holocanthus', cm: 30, body: 'puffer',
      look: { body: 'sand', pattern: 'spots', accent: 'brown' }, temper: 'semi', zone: 'mid', minL: 500, diet: ['frozen', 'snails'], rarity: 3, appeal: 9,
      tags: ['eats_inverts', 'iconic', 'oddball', 'big'], needs: ['swim_space'],
      fact: 'Puppy-dog eyes and a habit of watching visitors make porcupine puffers favorites; they crunch shellfish to wear down their beaks.',
    },
    {
      id: 'snowflake_moray', name: 'Snowflake Moray', sci: 'Echidna nebulosa', cm: 60, body: 'eel',
      look: { body: 'pearl', pattern: 'spots', accent: 'ink', fin: 'gold' }, temper: 'predator', zone: 'rock', minL: 400, diet: ['frozen', 'carnivore'],
      rarity: 3, appeal: 8, tags: ['eats_inverts', 'escape_artist', 'nocturnal', 'oddball'], needs: ['caves', 'lid', 'rocks'],
      fact: 'Morays gape constantly to pump water over their gills: it looks threatening but is just breathing. Snowflakes prefer crabs to fish.',
    },
    {
      id: 'bamboo_shark', name: 'Brownbanded Bamboo Shark', sci: 'Chiloscyllium punctatum', cm: 100, body: 'shark',
      look: { body: 'sand', pattern: 'bars', accent: 'brown' }, temper: 'predator', zone: 'bottom', minL: 2000, diet: ['frozen', 'carnivore'],
      rarity: 4, appeal: 10, tags: ['iconic', 'big', 'eats_inverts', 'nocturnal'], needs: ['sand', 'swim_space'], breed: { type: 'pair', ease: 1 }, tier: 4,
      fact: 'Bamboo sharks rest on the sand by day; their pups hatch from leathery egg cases after about four months.',
    },
    {
      id: 'copperband_butterfly', name: 'Copperband Butterflyfish', sci: 'Chelmon rostratus', cm: 20, body: 'deep',
      look: { body: 'pearl', pattern: 'bars', accent: 'orange' }, temper: 'peaceful', zone: 'mid', minL: 300, diet: ['frozen', 'live'], rarity: 3, appeal: 8,
      tags: ['aiptasia_eater', 'pest_hunter', 'reef_risk', 'sensitive'], needs: ['rocks', 'mature'],
      fact: 'Its long tweezer snout plucks food from crevices, including Aiptasia, the pest anemone reef keepers dread.',
    },
    {
      id: 'flashlight_fish', name: 'Flashlight Fish', sci: 'Anomalops katoptron', cm: 10, body: 'deep',
      look: { body: 'black', accent: 'sky', pattern: 'glow' }, temper: 'peaceful', zone: 'mid', school: 6, diet: ['frozen', 'live'], rarity: 4, appeal: 9,
      tags: ['nocturnal', 'bioluminescent', 'glow', 'schooling', 'oddball'], needs: ['dim', 'caves'], tier: 4, source: 'expedition',
      fact: 'Glowing bacteria live in pouches under its eyes; it blinks them on and off by rotating the organs, to signal and to confuse predators.',
    },
    {
      id: 'garden_eel', name: 'Spotted Garden Eel', sci: 'Heteroconger hassi', cm: 40, body: 'gardeneel',
      look: { body: 'pearl', pattern: 'spots', accent: 'ink' }, temper: 'peaceful', zone: 'substrate', school: 5, minL: 300, diet: ['plankton'], rarity: 3, appeal: 9,
      tags: ['schooling', 'oddball', 'iconic'], needs: ['deep_sand'], tier: 4,
      fact: 'Garden eels live in colonies, each poking out of its own sand burrow to catch plankton, and all vanish at once when startled.',
    },
    {
      id: 'lyretail_anthias', name: 'Lyretail Anthias', sci: 'Pseudanthias squamipinnis', regions: ['indo_pacific', 'red_sea'], cm: 15, body: 'torpedo',
      look: { body: 'orange', fin: 'magenta' }, temper: 'peaceful', zone: 'mid', school: 5, minL: 400, diet: ['frozen', 'plankton'], rarity: 2, appeal: 8,
      tags: ['schooling', 'reef_safe', 'colorful'], needs: ['swim_space', 'current'],
      fact: 'Anthias live in harems of one magenta male and many orange females; if he dies, the top female becomes male.',
    },
    {
      id: 'dragonface_pipefish', name: 'Dragonface Pipefish', sci: 'Corythoichthys haematopterus', regions: ['indo_pacific', 'seagrass'], cm: 15, body: 'pipefish',
      look: { body: 'sand', pattern: 'bars', accent: 'red' }, temper: 'peaceful', zone: 'bottom', school: 2, diet: ['live', 'plankton'], rarity: 3, appeal: 7,
      tags: ['sensitive', 'oddball'], needs: ['mature', 'hitch'],
      fact: 'A seahorse cousin stretched out straight, it hunts copepods along the sand; like seahorses, the males carry the eggs.',
    },
    {
      id: 'dwarf_cuttlefish', name: 'Dwarf Cuttlefish', sci: 'Sepia bandensis', kind: 'cephalopod', cm: 7, body: 'cuttle', temp: [24, 27],
      look: { body: 'sand', pattern: 'marble', accent: 'pearl' }, temper: 'predator', zone: 'mid', minL: 120, diet: ['live'], rarity: 4, appeal: 10,
      tags: ['color_change', 'oddball', 'iconic', 'eats_inverts'], needs: ['sand', 'rocks'], tier: 4, source: 'expedition',
      fact: 'Cuttlefish ripple color patterns across their skin with millions of pigment cells, though they are colorblind themselves.',
    },
  ]),
  // ---------------------------------------------------------------- Red Sea
  ...group({ ...reef, kind: 'fish', regions: ['red_sea'], sg: [1.025, 1.027] }, [
    {
      id: 'sohal_tang', name: 'Sohal Tang', sci: 'Acanthurus sohal', cm: 40, body: 'tang',
      look: { body: 'pearl', pattern: 'stripe', accent: 'navy', fin: 'orange' }, temper: 'aggressive', zone: 'mid', minL: 1000, flow: [2, 4], diet: ['veg'],
      rarity: 4, appeal: 9, tags: ['big', 'reef_safe', 'territorial'], needs: ['swim_space'], tier: 4,
      fact: 'The sohal patrols the surging reef crest and defends its algae patch with razor-sharp tail spines.',
    },
    {
      id: 'purple_tang', name: 'Purple Tang', sci: 'Zebrasoma xanthurum', cm: 25, body: 'tang',
      look: { body: 'purple', fin: 'yellow' }, temper: 'semi', zone: 'mid', minL: 400, flow: [2, 3], diet: ['veg'], rarity: 3, appeal: 9,
      tags: ['reef_safe', 'algae', 'colorful'], needs: ['swim_space'],
      fact: 'Deep purple with a yellow tail, the purple tang grazes turf algae on shallow Red Sea reefs.',
    },
    {
      id: 'fridmani_dottyback', name: 'Orchid Dottyback', sci: 'Pseudochromis fridmani', cm: 7, body: 'slender',
      look: { body: 'purple', accent: 'ink' }, temper: 'semi', zone: 'rock', diet: ['frozen', 'flake'], rarity: 2, appeal: 7,
      tags: ['reef_safe', 'pest_hunter', 'colorful'], needs: ['rocks', 'caves'],
      fact: 'A small, vivid Red Sea endemic that hunts bristleworms and other pests deep in the rockwork.',
    },
  ]),
  // ---------------------------------------------------------------- Caribbean
  ...group({ ...reef, kind: 'fish', regions: ['caribbean'] }, [
    {
      id: 'royal_gramma', name: 'Royal Gramma', sci: 'Gramma loreto', cm: 8, body: 'slender', look: { body: 'magenta', fin: 'gold', pattern: 'split' },
      temper: 'peaceful', zone: 'rock', diet: ['frozen', 'flake'], appeal: 8, tags: ['reef_safe', 'colorful', 'cave'], needs: ['caves', 'rocks'],
      fact: 'Royal grammas hang upside down under ledges, orienting to the nearest rock surface rather than to "up".',
    },
    {
      id: 'queen_angelfish', name: 'Queen Angelfish', sci: 'Holacanthus ciliaris', cm: 45, body: 'deep', look: { body: 'gold', accent: 'sky', fin: 'yellow' },
      temper: 'semi', zone: 'mid', minL: 800, diet: ['frozen', 'veg'], rarity: 4, appeal: 10, tags: ['iconic', 'big', 'reef_risk', 'colorful'],
      needs: ['swim_space', 'rocks'], tier: 4, fact: 'Named for the crown spot on its forehead, the queen angel eats mostly sponges in the wild.',
    },
    {
      id: 'blue_chromis', name: 'Blue Chromis', sci: 'Chromis cyanea', cm: 12, body: 'torpedo', look: { body: 'sky', accent: 'ink' },
      temper: 'peaceful', zone: 'mid', school: 5, diet: ['flake', 'plankton'], appeal: 6, tags: ['schooling', 'reef_safe', 'colorful'],
      fact: 'Blue chromis gather in clouds above the reef to pick plankton and dive for cover together when a predator passes.',
    },
    {
      id: 'neon_goby', name: 'Neon Goby', sci: 'Elacatinus oceanops', cm: 5, body: 'goby', look: { body: 'ink', pattern: 'neon', accent: 'sky' },
      temper: 'peaceful', zone: 'rock', max: 2, diet: ['frozen'], appeal: 6, tags: ['cleaner', 'reef_safe', 'tiny'], breed: { type: 'pair', ease: 3 },
      fact: 'Neon gobies run cleaning stations on coral heads, and even predators hold still to be picked clean.',
    },
    {
      id: 'yellowhead_jawfish', name: 'Yellowhead Jawfish', sci: 'Opistognathus aurifrons', cm: 10, body: 'slender', look: { body: 'pearl', accent: 'yellow' },
      temper: 'peaceful', zone: 'substrate', diet: ['frozen', 'plankton'], rarity: 2, appeal: 8, tags: ['reef_safe', 'mouthbrooder', 'jumper', 'burrower'],
      needs: ['deep_sand', 'lid'], fact: 'Jawfish build stone-lined burrows by mouth and hover above them; males brood the eggs in their mouths.',
    },
  ]),
  // ---------------------------------------------------------------- seahorses and lagoon life
  ...group({ ...reef, kind: 'fish', regions: ['seagrass', 'caribbean'], temp: [20, 26] }, [
    {
      id: 'dwarf_seahorse', name: 'Dwarf Seahorse', sci: 'Hippocampus zosterae', cm: 2.5, body: 'seahorse', look: { body: 'olive', pattern: 'dots' },
      temper: 'peaceful', zone: 'mid', school: 2, minL: 20, flow: [0, 1], diet: ['live'], rarity: 3, appeal: 9, tags: ['iconic', 'tiny', 'sensitive'],
      needs: ['hitch'], breed: { type: 'pair', ease: 3 },
      fact: 'One of the smallest seahorses; the male carries the eggs in a brood pouch and gives birth to tiny, perfect young.',
    },
    {
      id: 'lined_seahorse', name: 'Lined Seahorse', sci: 'Hippocampus erectus', cm: 15, body: 'seahorse', look: { body: 'gold', pattern: 'dots', accent: 'brown' },
      temper: 'peaceful', zone: 'mid', school: 2, minL: 110, flow: [0, 1], diet: ['frozen'], rarity: 3, appeal: 10, tags: ['iconic', 'sensitive'],
      needs: ['hitch'], breed: { type: 'pair', ease: 2 },
      fact: 'Seahorses are slow swimmers that grip seagrass and gorgonians with their tails; strong pumps, stinging corals and fast tankmates are out.',
    },
  ]),
  // ---------------------------------------------------------------- reef invertebrates
  ...group({ ...reef, regions: ['indo_pacific'] }, [
    {
      id: 'cleaner_shrimp', name: 'Skunk Cleaner Shrimp', sci: 'Lysmata amboinensis', kind: 'shrimp', cm: 6, body: 'shrimp',
      look: { body: 'red', pattern: 'stripe', accent: 'pearl' }, temper: 'peaceful', zone: 'rock', diet: ['frozen', 'detritus'], appeal: 7,
      tags: ['cleaner', 'reef_safe'], needs: ['rocks', 'caves'],
      fact: 'Cleaner shrimp wave their antennae at passing fish, which queue up to have parasites picked off, even from inside their mouths.',
    },
    {
      id: 'fire_shrimp', name: 'Fire Shrimp', sci: 'Lysmata debelius', kind: 'shrimp', cm: 5, body: 'shrimp',
      look: { body: 'red', pattern: 'dots', accent: 'pearl' }, temper: 'peaceful', zone: 'rock', diet: ['frozen'], rarity: 2, appeal: 8,
      tags: ['cleaner', 'reef_safe', 'colorful'], needs: ['caves'],
      fact: 'Blood-red with white spots, fire shrimp hide by day and come out to clean fish that visit their caves.',
    },
    {
      id: 'pistol_shrimp', name: 'Randall\'s Pistol Shrimp', sci: 'Alpheus randalli', kind: 'shrimp', cm: 4, body: 'shrimp',
      look: { body: 'pearl', pattern: 'bars', accent: 'red' }, temper: 'peaceful', zone: 'substrate', diet: ['frozen', 'detritus'], rarity: 2, appeal: 6,
      tags: ['reef_safe', 'symbiont', 'burrower'], needs: ['sand', 'deep_sand'],
      fact: 'Snapping its big claw makes a collapsing bubble so violent it flashes light and stuns prey, one of the loudest sounds on the reef.',
    },
    {
      id: 'harlequin_shrimp', name: 'Harlequin Shrimp', sci: 'Hymenocera picta', kind: 'shrimp', cm: 5, body: 'shrimp',
      look: { body: 'pearl', pattern: 'spots', accent: 'magenta' }, temper: 'peaceful', zone: 'rock', diet: ['stars'], rarity: 4, appeal: 9,
      tags: ['colorful', 'oddball'], needs: ['rocks'],
      fact: 'Harlequin shrimp eat only sea stars, flipping them over and dining for days; keepers raise starfish just to feed them.',
    },
    {
      id: 'sexy_shrimp', name: 'Sexy Shrimp', sci: 'Thor amboinensis', kind: 'shrimp', cm: 1.5, body: 'shrimp',
      look: { body: 'orange', pattern: 'spots', accent: 'pearl' }, temper: 'peaceful', zone: 'rock', school: 3, diet: ['detritus'], rarity: 2, appeal: 7,
      tags: ['tiny', 'reef_safe', 'symbiont'],
      fact: 'Named for the way it sways its raised tail, the sexy shrimp lives among the tentacles of anemones and corals.',
    },
    {
      id: 'coral_banded_shrimp', name: 'Coral Banded Shrimp', sci: 'Stenopus hispidus', kind: 'shrimp', regions: ['indo_pacific', 'caribbean'], cm: 7, body: 'shrimp',
      look: { body: 'pearl', pattern: 'bars', accent: 'red' }, temper: 'semi', zone: 'rock', max: 2, diet: ['frozen'], appeal: 7, tags: ['cleaner', 'reef_safe'],
      needs: ['caves'], fact: 'Banded boxer shrimp hang upside down in caves, waving long white antennae to advertise their cleaning service.',
    },
    {
      id: 'trochus_snail', name: 'Trochus Snail', sci: 'Trochus sp.', kind: 'snail', cm: 3, body: 'snail', look: { body: 'sand', pattern: 'bars', accent: 'red' },
      temper: 'peaceful', zone: 'glass', diet: ['algae'], tags: ['algae', 'reef_safe'], breed: { type: 'colony', ease: 2 },
      fact: 'Unlike many reef snails, trochus can flip themselves back upright, and they often breed in reef tanks.',
    },
    {
      id: 'blue_linckia', name: 'Blue Linckia Star', sci: 'Linckia laevigata', kind: 'star', cm: 30, body: 'star', look: { body: 'blue' },
      temper: 'peaceful', zone: 'glass', diet: ['detritus'], rarity: 4, appeal: 8, tags: ['iconic', 'sensitive'], needs: ['mature'],
      fact: 'Blue sea stars graze biofilm and are hard to keep: they need a very mature tank and slow, careful acclimation.',
    },
    {
      id: 'tuxedo_urchin', name: 'Tuxedo Urchin', sci: 'Mespilia globulus', kind: 'urchin', cm: 5, body: 'urchin', look: { body: 'teal', accent: 'red' },
      temper: 'peaceful', zone: 'rock', diet: ['algae'], appeal: 6, tags: ['algae', 'reef_safe', 'oddball'],
      fact: 'Tuxedo urchins hold bits of shell and algae over themselves with tube feet, like a little hat or sunshade.',
    },
  ]),
  ...group({ ...reef, regions: ['caribbean'] }, [
    {
      id: 'peppermint_shrimp', name: 'Peppermint Shrimp', sci: 'Lysmata wurdemanni', kind: 'shrimp', cm: 5, body: 'shrimp',
      look: { body: 'pearl', pattern: 'stripe', accent: 'red', clear: true }, temper: 'peaceful', zone: 'rock', diet: ['detritus', 'frozen'], appeal: 5,
      tags: ['reef_safe', 'aiptasia_eater', 'pest_hunter', 'nocturnal'],
      fact: 'Peppermint shrimp are hired for one job: eating Aiptasia, the glass anemone pest that hitchhikes in on live rock.',
    },
    {
      id: 'astraea_snail', name: 'Astraea Snail', sci: 'Lithopoma tectum', kind: 'snail', cm: 4, body: 'snail', look: { body: 'sand' },
      temper: 'peaceful', zone: 'glass', diet: ['algae'], tags: ['algae', 'reef_safe'],
      fact: "Astraea snails graze film algae but can't right themselves if they fall over: a keeper's job, or a hermit crab's lunch.",
    },
    {
      id: 'nassarius_snail', name: 'Nassarius Snail', sci: 'Nassarius vibex', kind: 'snail', cm: 1.5, body: 'snail', look: { body: 'taupe' },
      temper: 'peaceful', zone: 'substrate', diet: ['detritus'], tags: ['scavenger', 'burrower', 'reef_safe'], needs: ['sand'],
      fact: 'Buried in the sand with only a snorkel-like siphon showing, nassarius snails erupt in a rush when food lands.',
    },
    {
      id: 'emerald_crab', name: 'Emerald Crab', sci: 'Mithraculus sculptus', kind: 'crab', cm: 4, body: 'crab', look: { body: 'green' },
      temper: 'peaceful', zone: 'rock', diet: ['algae'], appeal: 5, tags: ['algae', 'reef_safe', 'pest_hunter', 'nocturnal'],
      fact: 'Emerald crabs are famous for eating bubble algae, the shiny green balloons that can take over a reef.',
    },
    {
      id: 'scarlet_hermit', name: 'Scarlet Reef Hermit', sci: 'Paguristes cadenati', kind: 'crab', cm: 3, body: 'crab', look: { body: 'red', accent: 'gold' },
      temper: 'peaceful', zone: 'rock', diet: ['algae', 'detritus'], appeal: 5, tags: ['algae', 'reef_safe', 'scavenger'], needs: ['shells'],
      fact: 'Hermit crabs trade up to bigger shells as they grow; a few spare empty shells prevent squabbles.',
    },
    {
      id: 'lettuce_sea_slug', name: 'Lettuce Sea Slug', sci: 'Elysia crispata', kind: 'slug', cm: 5, body: 'slug', look: { body: 'lime', pattern: 'marble', accent: 'sky' },
      temper: 'peaceful', zone: 'rock', diet: ['algae'], rarity: 2, appeal: 7, tags: ['algae', 'photosynthetic', 'oddball'],
      fact: 'It keeps the chloroplasts of the algae it eats working inside its own body: a slug that runs partly on sunlight.',
    },
    {
      id: 'serpent_star', name: 'Red Serpent Star', sci: 'Ophioderma squamosissimum', kind: 'star', cm: 30, body: 'star', look: { body: 'red' },
      temper: 'peaceful', zone: 'rock', diet: ['detritus'], rarity: 2, appeal: 6, tags: ['scavenger', 'nocturnal', 'reef_safe'],
      fact: 'Serpent stars hide by day and send out a single arm when they smell food.',
    },
    {
      id: 'upside_down_jelly', name: 'Upside-down Jelly', sci: 'Cassiopea xamachana', kind: 'jelly', regions: ['seagrass', 'caribbean'], cm: 20, body: 'jelly',
      temp: [24, 29], look: { body: 'olive', accent: 'pearl', pattern: 'spots' }, temper: 'peaceful', zone: 'substrate', school: 3, diet: ['plankton'], rarity: 2,
      appeal: 8, tags: ['photosynthetic', 'oddball'], needs: ['sand'],
      fact: 'Cassiopea lies bell-down on the sand with its arms up, farming algae in its tissues like a coral.',
    },
  ]),
  // ---------------------------------------------------------------- kelp forest and rocky shore (cold)
  ...group({ ...cold, kind: 'fish', regions: ['kelp_forest'], temp: [12, 20] }, [
    {
      id: 'garibaldi', name: 'Garibaldi', sci: 'Hypsypops rubicundus', cm: 30, body: 'deep', look: { body: 'orange' },
      temper: 'aggressive', zone: 'rock', minL: 600, diet: ['frozen', 'veg'], rarity: 3, appeal: 9, tags: ['cold', 'iconic', 'territorial', 'colorful'],
      needs: ['chill', 'rocks'], fact: "California's state marine fish; males tend a nest of red algae and click loudly at divers who come too close.",
    },
    {
      id: 'california_sheephead', name: 'California Sheephead', sci: 'Semicossyphus pulcher', cm: 90, body: 'deep',
      look: { body: 'black', accent: 'red', belly: 'pearl', pattern: 'band' }, temper: 'semi', zone: 'mid', minL: 4000, diet: ['frozen', 'carnivore'],
      rarity: 4, appeal: 8, tags: ['cold', 'big', 'eats_inverts'], needs: ['chill', 'rocks', 'swim_space'], tier: 5,
      fact: 'Sheephead eat sea urchins, and by keeping urchin numbers down they help kelp forests stand.',
    },
    {
      id: 'blue_rockfish', name: 'Blue Rockfish', sci: 'Sebastes mystinus', cm: 40, body: 'deep', look: { body: 'slate', pattern: 'marble', fin: 'slate' },
      temper: 'peaceful', zone: 'mid', school: 6, minL: 3000, diet: ['frozen', 'plankton'], rarity: 3, appeal: 7, tags: ['cold', 'schooling', 'big'],
      needs: ['chill', 'swim_space'], fact: 'Blue rockfish school in the kelp canopy and can live for decades; some rockfish species pass a century.',
    },
    {
      id: 'leopard_shark', name: 'Leopard Shark', sci: 'Triakis semifasciata', cm: 120, body: 'shark', look: { body: 'slate', pattern: 'saddle', accent: 'ink' },
      temper: 'predator', zone: 'bottom', school: 3, minL: 20000, diet: ['frozen', 'carnivore'], rarity: 4, appeal: 10, tags: ['cold', 'iconic', 'big', 'eats_inverts'],
      needs: ['chill', 'swim_space', 'sand'], tier: 5,
      fact: 'Leopard sharks cruise kelp beds and sandy bays in schools; harmless to people, they are favorites of big exhibit tanks.',
    },
  ]),
  ...group({ ...cold, regions: ['kelp_forest', 'rocky_shore'], temp: [8, 18] }, [
    {
      id: 'bimac_octopus', name: 'California Two-spot Octopus', sci: 'Octopus bimaculoides', kind: 'cephalopod', cm: 30, body: 'octopus', temp: [16, 22],
      look: { body: 'brown', accent: 'sky', pattern: 'mask' }, temper: 'predator', zone: 'rock', max: 1, minL: 200, diet: ['frozen', 'live'], rarity: 4, appeal: 10,
      tags: ['iconic', 'escape_artist', 'color_change', 'eats_inverts'], needs: ['lid', 'caves'], source: 'expedition',
      fact: 'Two-spot octopuses solve puzzles, recognize keepers and squeeze through any gap bigger than their beak, so lids get weighted down.',
    },
    {
      id: 'purple_urchin', name: 'Purple Sea Urchin', sci: 'Strongylocentrotus purpuratus', kind: 'urchin', cm: 10, body: 'urchin', look: { body: 'purple' },
      temper: 'peaceful', zone: 'rock', diet: ['algae', 'veg'], appeal: 5, tags: ['cold', 'algae', 'plant_eater', 'touchable'], tier: 3,
      fact: 'Without predators like sea otters and sheephead, purple urchins mow kelp forests down into bare "urchin barrens".',
    },
    {
      id: 'ochre_star', name: 'Ochre Sea Star', sci: 'Pisaster ochraceus', kind: 'star', cm: 25, body: 'star', look: { body: 'orange' },
      temper: 'peaceful', zone: 'rock', diet: ['carnivore'], appeal: 7, tags: ['cold', 'touchable', 'iconic', 'eats_inverts'], tier: 3,
      fact: 'A keystone species: take ochre stars away and mussels crowd out almost everything else on the shore.',
    },
  ]),
  ...group({ ...cold, regions: ['rocky_shore'], temp: [10, 18], tier: 3 }, [
    {
      id: 'tidepool_sculpin', name: 'Tidepool Sculpin', sci: 'Oligocottus maculosus', kind: 'fish', cm: 9, body: 'sculpin',
      look: { body: 'olive', pattern: 'marble', accent: 'sand' }, temper: 'peaceful', zone: 'rock', diet: ['frozen'], appeal: 5, tags: ['cold'],
      needs: ['chill', 'rocks'], fact: 'Tidepool sculpins find their way back to the same home pool after being moved, using smell and memory.',
    },
    {
      id: 'grunt_sculpin', name: 'Grunt Sculpin', sci: 'Rhamphocottus richardsonii', kind: 'fish', regions: ['rocky_shore', 'cold_north'], cm: 8, body: 'sculpin', temp: [7, 14],
      look: { body: 'gold', pattern: 'bars', accent: 'brown', fin: 'orange' }, temper: 'peaceful', zone: 'rock', diet: ['frozen'], rarity: 3, appeal: 9,
      tags: ['cold', 'oddball', 'iconic'], needs: ['chill', 'rocks', 'shells'],
      fact: 'Grunt sculpins walk on finger-like pectoral rays and often live inside empty giant barnacle shells.',
    },
    {
      id: 'blueband_hermit', name: 'Blueband Hermit Crab', sci: 'Pagurus samuelis', kind: 'crab', cm: 3, body: 'crab', look: { body: 'olive', accent: 'sky' },
      temper: 'peaceful', zone: 'rock', diet: ['detritus'], appeal: 5, tags: ['cold', 'scavenger', 'touchable'], needs: ['shells'],
      fact: 'Tide-pool hermits pick their shells carefully and will queue in size order to swap homes when a new shell appears.',
    },
    {
      id: 'horseshoe_crab', name: 'Atlantic Horseshoe Crab', sci: 'Limulus polyphemus', kind: 'crab', cm: 50, body: 'crab', temp: [14, 26],
      look: { body: 'brown', accent: 'olive' }, temper: 'peaceful', zone: 'bottom', minL: 800, diet: ['detritus', 'frozen'], rarity: 2, appeal: 9,
      tags: ['touchable', 'iconic', 'oddball', 'scavenger'], needs: ['sand'],
      regions: ['seagrass'],
      fact: 'Not crabs at all: horseshoe crabs are older than the dinosaurs and closer kin to spiders and scorpions. Their copper-based blue blood is used to test medicines for contamination. They live on Atlantic and Gulf coasts.',
    },
  ]),
  // ---------------------------------------------------------------- open ocean drifters
  ...group({ ...cold, regions: ['open_ocean'], temp: [14, 22] }, [
    {
      id: 'moon_jelly', name: 'Moon Jelly', sci: 'Aurelia aurita', kind: 'jelly', regions: ['open_ocean', 'kelp_forest'], cm: 25, body: 'jelly', temp: [15, 22],
      look: { body: 'pearl', clear: true, accent: 'lilac' }, temper: 'peaceful', zone: 'drift', school: 5, minL: 150, flow: [1, 2], diet: ['plankton'], rarity: 2,
      appeal: 9, tags: ['iconic', 'transparent'], needs: ['kreisel'], breed: { type: 'colony', ease: 2 },
      fact: 'Moon jellies have no brain, heart or bones; the four horseshoe rings in the bell are their reproductive organs.',
    },
    {
      id: 'sea_nettle', name: 'Pacific Sea Nettle', sci: 'Chrysaora fuscescens', kind: 'jelly', regions: ['open_ocean', 'kelp_forest'], cm: 30, body: 'jelly', temp: [12, 18],
      look: { body: 'orange', clear: true, accent: 'gold' }, temper: 'peaceful', zone: 'drift', school: 3, minL: 300, flow: [1, 2], diet: ['plankton'], rarity: 3,
      appeal: 10, tags: ['iconic', 'venomous'], needs: ['kreisel', 'chill'],
      fact: 'Sea nettles trail tentacles several meters long; in a kreisel lit from above they glow like slow orange lanterns.',
    },
    {
      id: 'comb_jelly', name: 'Sea Gooseberry', sci: 'Pleurobrachia bachei', kind: 'jelly', regions: ['open_ocean', 'cold_north'], cm: 2, body: 'jelly', temp: [10, 18],
      look: { body: 'pearl', clear: true }, temper: 'peaceful', zone: 'drift', school: 5, minL: 100, flow: [1, 2], diet: ['plankton'], rarity: 4,
      appeal: 9, tags: ['transparent', 'oddball'], needs: ['kreisel'], tier: 5, source: 'expedition',
      fact: 'Comb jellies are not true jellyfish: they row with rows of beating cilia. The running rainbows are light diffracting off the combs; sea gooseberries do not glow in the dark.',
    },
    {
      id: 'pacific_sardine', name: 'Pacific Sardine', sci: 'Sardinops sagax', kind: 'fish', cm: 20, body: 'torpedo', temp: [14, 22],
      look: { body: 'silver', accent: 'navy', pattern: 'dots' }, temper: 'peaceful', zone: 'mid', school: 30, minL: 20000, diet: ['plankton'], rarity: 2, appeal: 9,
      tags: ['schooling', 'iconic'], needs: ['swim_space'], tier: 5,
      fact: 'A sardine school moves as one body; in a round tank it becomes a silver river that never meets a corner.',
    },
  ]),
  // ---------------------------------------------------------------- deep sea and cold northern seas
  ...group({ ...cold, regions: ['deep_sea'], temp: [6, 14], ph: [7.6, 8.1], sg: [1.025, 1.027], tier: 5, source: 'expedition' }, [
    {
      id: 'pinecone_fish', name: 'Pinecone Fish', sci: 'Monocentris japonica', kind: 'fish', cm: 15, body: 'round', temp: [14, 20],
      look: { body: 'gold', pattern: 'spots', accent: 'ink' }, temper: 'peaceful', zone: 'mid', school: 3, diet: ['frozen'], rarity: 4, appeal: 9,
      tags: ['bioluminescent', 'glow', 'nocturnal', 'oddball'], needs: ['dim', 'chill'],
      fact: 'Armored in plate-like scales, pinecone fish carry glowing bacteria in organs on the lower jaw, like little headlights.',
    },
    {
      id: 'chain_catshark', name: 'Chain Catshark', sci: 'Scyliorhinus retifer', kind: 'fish', regions: ['deep_sea', 'cold_north'], cm: 45, body: 'shark', temp: [8, 14],
      look: { body: 'sand', pattern: 'saddle', accent: 'ink' }, temper: 'predator', zone: 'bottom', minL: 1500, diet: ['frozen', 'carnivore'], rarity: 4, appeal: 9,
      tags: ['glow', 'eats_inverts', 'nocturnal'], needs: ['chill', 'dim', 'sand'],
      fact: 'Under blue light, chain catsharks fluoresce green in a pattern other catsharks can probably see.',
    },
    {
      id: 'japanese_spider_crab', name: 'Japanese Spider Crab', sci: 'Macrocheira kaempferi', kind: 'crab', cm: 300, body: 'spidercrab', temp: [10, 16],
      look: { body: 'orange', pattern: 'spots', accent: 'pearl' }, temper: 'peaceful', zone: 'bottom', minL: 8000, diet: ['detritus', 'frozen'], rarity: 5, appeal: 10,
      tags: ['big', 'iconic', 'cold', 'scavenger'], needs: ['chill', 'dim'],
      fact: 'The largest arthropod alive, with leg spans up to 3.7 m; Japanese aquariums keep them in cold, dim tanks.',
    },
    {
      id: 'giant_isopod', name: 'Giant Isopod', sci: 'Bathynomus giganteus', kind: 'isopod', cm: 40, body: 'isopod', temp: [6, 12],
      look: { body: 'pearl', accent: 'peach' }, temper: 'peaceful', zone: 'bottom', minL: 400, diet: ['detritus', 'carnivore'], rarity: 4, appeal: 9,
      tags: ['big', 'oddball', 'iconic', 'cold', 'scavenger'], needs: ['chill', 'dim'],
      fact: 'A giant cousin of the pill bug from the deep Gulf of Mexico; one in a Japanese aquarium famously went over five years without eating.',
    },
  ]),
  ...group({ ...cold, regions: ['cold_north'], temp: [4, 12], tier: 4 }, [
    {
      id: 'wolf_eel', name: 'Wolf Eel', sci: 'Anarrhichthys ocellatus', kind: 'fish', cm: 200, body: 'eel', temp: [6, 12],
      look: { body: 'slate', pattern: 'spots', accent: 'sand' }, temper: 'semi', zone: 'rock', minL: 5000, diet: ['frozen', 'carnivore'], rarity: 4, appeal: 10,
      tags: ['cold', 'big', 'iconic', 'eats_inverts'], needs: ['chill', 'caves'], tier: 5,
      fact: 'Wolf eels pair for life and share a den; their crushing jaws are made for urchins and crabs, and old males have wonderfully wrinkled faces.',
    },
    {
      id: 'spiny_lumpsucker', name: 'Pacific Spiny Lumpsucker', sci: 'Eumicrotremus orbis', kind: 'fish', cm: 7, body: 'round', temp: [4, 10],
      look: { body: 'green', pattern: 'dots', accent: 'olive' }, temper: 'peaceful', zone: 'rock', diet: ['frozen'], rarity: 3, appeal: 10,
      tags: ['cold', 'oddball', 'iconic'], needs: ['chill', 'rocks'],
      fact: 'Ping-pong-ball sized, lumpsuckers stick to rocks with a sucker disc made from their pelvic fins and swim like wobbling balloons.',
    },
    {
      id: 'red_king_crab', name: 'Red King Crab', sci: 'Paralithodes camtschaticus', kind: 'crab', cm: 150, body: 'spidercrab', temp: [2, 8],
      look: { body: 'red', pattern: 'spots' }, temper: 'semi', zone: 'bottom', minL: 4000, diet: ['detritus', 'carnivore'], rarity: 4, appeal: 9,
      tags: ['cold', 'big', 'iconic', 'scavenger'], needs: ['chill'], tier: 5, source: 'expedition',
      fact: 'King crabs march across the seafloor in great herds, and young ones pile into "pods" of thousands for safety.',
    },
  ]),
];
