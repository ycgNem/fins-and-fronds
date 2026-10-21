// Corals, anemones, clams and other sessile invertebrates. PAR bands follow the soft / LPS / SPS
// split in RESEARCH.md ("Reef"): soft 50-150, LPS 80-200, SPS 200-400.
import type { CoralSpec, ItemDef, ItemTag, Placement, RegionId, Shape, Water } from './types';
import type { RampName } from './palette';

interface CoralIn {
  id: string;
  name: string;
  shape: Shape;
  colors: RampName[];
  coral: CoralSpec;
  w: number;
  h: number;
  regions?: RegionId[];
  place?: Placement;
  price?: number;
  tier?: number;
  tags?: ItemTag[];
  blurb: string;
  water?: Water[];
  source?: 'supplier' | 'expedition';
}

function co(c: CoralIn): ItemDef {
  return {
    id: c.id, name: c.name, cat: 'coral', water: c.water ?? ['marine'], regions: c.regions ?? ['indo_pacific'],
    price: c.price ?? 10 + c.coral.care * 8, tier: c.tier ?? 3, w: c.w, h: c.h, place: c.place ?? 'rock', shape: c.shape,
    colors: c.colors, coral: c.coral, tags: c.tags, blurb: c.blurb, source: c.source ?? 'supplier',
  };
}

const tropical = [23, 28] as const;

export const CORALS: ItemDef[] = [
  // ---------------------------------------------------------------- soft corals and polyps
  co({ id: 'green_star_polyps', name: 'Green Star Polyps', shape: 'mat', colors: ['purple', 'green'], w: 20, h: 6,
    coral: { type: 'polyp', par: [50, 250], flow: [1, 3], sting: 0, growth: 5, temp: tropical, care: 1, glow: true, sway: true },
    blurb: 'A purple mat of glowing green polyps that sways in the flow, and happily overgrows the whole rock if you let it.' }),
  co({ id: 'toadstool_leather', name: 'Toadstool Leather', shape: 'toadstool', colors: ['sand', 'pearl'], w: 22, h: 20,
    coral: { type: 'soft', par: [50, 200], flow: [1, 3], sting: 0, growth: 3, temp: tropical, care: 1, sway: true },
    blurb: 'A mushroom-shaped leather coral that puffs out a fuzz of polyps; it sheds a waxy skin now and then.' }),
  co({ id: 'kenya_tree', name: 'Kenya Tree', shape: 'tree_coral', colors: ['sand', 'olive'], w: 14, h: 22,
    coral: { type: 'soft', par: [50, 150], flow: [1, 2], sting: 0, growth: 4, temp: tropical, care: 1, sway: true },
    blurb: 'A hardy branching soft coral that drops little branches to clone itself across the reef.' }),
  co({ id: 'pulsing_xenia', name: 'Pulsing Xenia', shape: 'xenia', colors: ['pearl', 'lilac'], w: 12, h: 16,
    coral: { type: 'soft', par: [50, 200], flow: [1, 2], sting: 0, growth: 5, temp: tropical, care: 2, sway: true },
    blurb: 'Its polyps open and close like hands, pulsing all day; nobody is quite sure why.' }),
  co({ id: 'zoanthids', name: 'Zoanthids', shape: 'polyps', colors: ['orange', 'green'], w: 14, h: 5,
    coral: { type: 'polyp', par: [50, 250], flow: [1, 3], sting: 0, growth: 4, temp: tropical, care: 1, glow: true },
    blurb: 'Button polyps in endless named color morphs. Their Palythoa cousins carry palytoxin, so keepers wear gloves.' }),
  co({ id: 'mushroom_coral', name: 'Mushroom Coral', shape: 'mushroom', colors: ['purple', 'teal'], w: 12, h: 6,
    coral: { type: 'mushroom', par: [20, 120], flow: [0, 2], sting: 0, growth: 3, temp: tropical, care: 1, glow: true },
    blurb: 'Discosoma: flat discs that thrive in low light and slowly walk to where they like it.' }),
  co({ id: 'ricordea', name: 'Ricordea', shape: 'mushroom', colors: ['green', 'orange'], w: 10, h: 5, regions: ['caribbean'],
    coral: { type: 'mushroom', par: [40, 150], flow: [0, 2], sting: 0, growth: 2, temp: tropical, care: 2, glow: true },
    blurb: 'Ricordea florida: bumpy, jewel-bright Caribbean mushrooms that glow under blue light.' }),
  co({ id: 'clove_polyps', name: 'Clove Polyps', shape: 'polyps', colors: ['sand', 'pearl'], w: 14, h: 6,
    coral: { type: 'polyp', par: [50, 200], flow: [1, 2], sting: 0, growth: 4, temp: tropical, care: 1, sway: true },
    blurb: 'Feathery eight-armed polyps on running stolons; they close up when touched.' }),
  co({ id: 'sea_fan', name: 'Purple Sea Fan', shape: 'fan', colors: ['purple', 'lilac'], w: 26, h: 30, regions: ['caribbean'], tags: ['hitch'],
    coral: { type: 'gorgonian', par: [100, 300], flow: [2, 3], sting: 0, growth: 2, temp: tropical, care: 2, sway: true },
    blurb: 'Gorgonia ventalina: a lattice fan that grows across the current to catch plankton; seahorses grip it.' }),
  co({ id: 'sea_rod', name: 'Knobby Sea Rod', shape: 'rods', colors: ['brown', 'sand'], w: 18, h: 30, regions: ['caribbean'], tags: ['hitch'],
    coral: { type: 'gorgonian', par: [100, 300], flow: [2, 3], sting: 0, growth: 3, temp: tropical, care: 1, sway: true },
    blurb: 'Branching Caribbean sea rods covered in fuzzy polyps: the forest of the gorgonian reef.' }),
  co({ id: 'red_tree_sponge', name: 'Red Tree Sponge', shape: 'tree_coral', colors: ['red', 'orange'], w: 14, h: 22, regions: ['caribbean'],
    coral: { type: 'filter', par: [0, 150], flow: [1, 3], sting: 0, growth: 1, temp: tropical, care: 4, fed: true },
    blurb: 'A filter-feeding sponge with no light needs at all, but it starves in a too-clean tank and must never touch air.' }),
  co({ id: 'feather_duster', name: 'Feather Duster Worm', shape: 'duster', colors: ['brown', 'pearl'], w: 8, h: 14,
    coral: { type: 'filter', par: [0, 200], flow: [1, 2], sting: 0, growth: 1, temp: tropical, care: 1, fed: true, sway: true },
    blurb: 'A tube worm that unfurls a feathery crown to filter food, and snaps it shut at a passing shadow.' }),
  co({ id: 'sun_coral', name: 'Sun Coral', shape: 'sun', colors: ['orange', 'gold'], w: 12, h: 10,
    coral: { type: 'nps', par: [0, 60], flow: [1, 3], sting: 2, growth: 2, temp: tropical, care: 3, fed: true },
    blurb: 'Tubastraea has no algae inside it: it lives in caves and overhangs and opens golden polyps only to be fed.' }),
  // ---------------------------------------------------------------- LPS
  co({ id: 'hammer_coral', name: 'Hammer Coral', shape: 'tentacles', colors: ['green', 'gold'], w: 16, h: 14,
    coral: { type: 'lps', par: [80, 200], flow: [1, 2], sting: 18, growth: 2, temp: tropical, care: 2, glow: true, sway: true },
    blurb: 'Euphyllia ancora: anchor-tipped tentacles that sway in the current. Give it room; it stings neighbors.' }),
  co({ id: 'torch_coral', name: 'Torch Coral', shape: 'tentacles', colors: ['gold', 'green'], w: 16, h: 16,
    coral: { type: 'lps', par: [80, 200], flow: [1, 2], sting: 24, growth: 2, temp: tropical, care: 3, glow: true, sway: true },
    blurb: 'Long flowing tentacles with glowing tips, and at night long sweeper tentacles that sting anything nearby.' }),
  co({ id: 'frogspawn', name: 'Frogspawn Coral', shape: 'tentacles', colors: ['green', 'pink'], w: 16, h: 14,
    coral: { type: 'lps', par: [80, 200], flow: [1, 2], sting: 18, growth: 2, temp: tropical, care: 2, sway: true },
    blurb: 'Branching tentacles tipped in clusters of little beads, like a mass of frog eggs.' }),
  co({ id: 'bubble_coral', name: 'Bubble Coral', shape: 'bubbles', colors: ['pearl', 'sand'], w: 16, h: 12,
    coral: { type: 'lps', par: [50, 150], flow: [0, 1], sting: 20, growth: 2, temp: tropical, care: 2 },
    blurb: 'Plerogyra inflates grape-like vesicles by day and swaps them for stinging sweepers at night.' }),
  co({ id: 'brain_coral', name: 'Lobo Brain Coral', shape: 'dome', colors: ['red', 'green'], w: 18, h: 12,
    coral: { type: 'lps', par: [50, 150], flow: [1, 2], sting: 8, growth: 1, temp: tropical, care: 2, glow: true },
    blurb: 'Lobophyllia: big fleshy lobes in two-tone colors that puff up as it feeds.' }),
  co({ id: 'favia', name: 'Favia', shape: 'dome', colors: ['green', 'orange'], w: 12, h: 8,
    coral: { type: 'lps', par: [80, 200], flow: [1, 2], sting: 12, growth: 1, temp: tropical, care: 2, glow: true },
    blurb: 'A small brain coral with honeycomb corallites and surprisingly long night sweepers.' }),
  co({ id: 'duncan', name: 'Duncan Coral', shape: 'tentacles', colors: ['green', 'purple'], w: 12, h: 10,
    coral: { type: 'lps', par: [50, 150], flow: [1, 2], sting: 4, growth: 3, temp: tropical, care: 1, sway: true },
    blurb: 'Duncanopsammia: big green-purple polyps on branching stalks, one of the easiest LPS.' }),
  co({ id: 'candy_cane', name: 'Candy Cane Coral', shape: 'polyps', colors: ['green', 'sand'], w: 12, h: 10,
    coral: { type: 'lps', par: [80, 200], flow: [1, 2], sting: 3, growth: 3, temp: tropical, care: 1 },
    blurb: 'Caulastrea: striped trumpet polyps that grow into tidy, gentle clusters.' }),
  co({ id: 'acan', name: 'Acan Coral', shape: 'dome', colors: ['magenta', 'orange'], w: 14, h: 6,
    coral: { type: 'lps', par: [50, 150], flow: [1, 2], sting: 4, growth: 2, temp: tropical, care: 2, glow: true },
    blurb: 'Micromussa: a mosaic of fleshy polyps in rainbow colors, beloved of collectors.' }),
  co({ id: 'plate_coral', name: 'Plate Coral', shape: 'plate', colors: ['pink', 'sand'], w: 18, h: 6, place: 'ground',
    coral: { type: 'lps', par: [80, 200], flow: [0, 1], sting: 6, growth: 1, temp: tropical, care: 2, glow: true },
    blurb: 'Fungia lives loose on the sand, not on rock, and can slowly right itself if it is flipped.' }),
  co({ id: 'chalice', name: 'Chalice Coral', shape: 'plate', colors: ['orange', 'green'], w: 16, h: 6,
    coral: { type: 'lps', par: [50, 150], flow: [1, 2], sting: 8, growth: 2, temp: tropical, care: 2, glow: true },
    blurb: 'Encrusting plates with contrasting "eyes", named and traded like works of art.' }),
  // ---------------------------------------------------------------- SPS
  co({ id: 'acropora', name: 'Staghorn Acropora', shape: 'branching', colors: ['purple', 'blue'], w: 20, h: 22, tier: 4,
    coral: { type: 'sps', par: [200, 400], flow: [2, 4], sting: 2, growth: 3, temp: tropical, care: 5, glow: true },
    blurb: 'The reef builder. Acropora demands strong light, strong flow and rock-steady parameters; wild Caribbean staghorn is critically endangered.' }),
  co({ id: 'table_acropora', name: 'Table Acropora', shape: 'plate', colors: ['teal', 'sand'], w: 24, h: 8, tier: 4,
    coral: { type: 'sps', par: [250, 400], flow: [2, 4], sting: 2, growth: 3, temp: tropical, care: 5 },
    blurb: 'Grows into flat tables that shade the reef below; in the wild, fish shelter under them.' }),
  co({ id: 'montipora_cap', name: 'Montipora Cap', shape: 'plate', colors: ['orange', 'red'], w: 20, h: 6,
    coral: { type: 'sps', par: [100, 300], flow: [1, 3], sting: 0, growth: 4, temp: tropical, care: 3 },
    blurb: 'Swirling plates that layer like scrolls; the beginner SPS.' }),
  co({ id: 'montipora_digitata', name: 'Montipora digitata', shape: 'branching', colors: ['green', 'lime'], w: 14, h: 16,
    coral: { type: 'sps', par: [150, 350], flow: [2, 3], sting: 0, growth: 4, temp: tropical, care: 3 },
    blurb: 'Finger-like branches that grow fast and forgive the occasional mistake.' }),
  co({ id: 'birdsnest', name: "Bird's Nest Coral", shape: 'branching', colors: ['pink', 'peach'], w: 14, h: 14, tier: 4,
    coral: { type: 'sps', par: [200, 350], flow: [2, 3], sting: 0, growth: 3, temp: tropical, care: 4 },
    blurb: 'Seriatopora: needle-thin pink branches, as delicate as they look.' }),
  co({ id: 'stylophora', name: 'Stylophora', shape: 'branching', colors: ['pink', 'purple'], w: 14, h: 14, regions: ['red_sea', 'indo_pacific'],
    coral: { type: 'sps', par: [200, 350], flow: [2, 3], sting: 0, growth: 3, temp: tropical, care: 3 },
    blurb: 'Stubby, fuzzy branches; one of the most studied corals in the Red Sea.' }),
  // ---------------------------------------------------------------- anemones and clams
  co({ id: 'bubble_tip_anemone', name: 'Bubble-tip Anemone', shape: 'anemone', colors: ['green', 'red'], w: 18, h: 14,
    coral: { type: 'anemone', par: [100, 250], flow: [1, 3], sting: 10, growth: 2, temp: tropical, care: 3, host: true, sway: true },
    blurb: 'The classic clownfish host. Anemones wander until they find a spot they like, so cover your pump intakes.' }),
  co({ id: 'carpet_anemone', name: 'Carpet Anemone', shape: 'anemone', colors: ['teal', 'green'], w: 26, h: 8, place: 'ground', tier: 4,
    coral: { type: 'anemone', par: [150, 300], flow: [1, 2], sting: 30, growth: 1, temp: tropical, care: 4, host: true },
    blurb: 'A sticky, sand-dwelling host anemone big enough to eat a fish that wanders too close.' }),
  co({ id: 'rock_flower_anemone', name: 'Rock Flower Anemone', shape: 'anemone', colors: ['orange', 'green'], w: 12, h: 6, regions: ['caribbean'],
    coral: { type: 'anemone', par: [50, 200], flow: [1, 2], sting: 6, growth: 2, temp: tropical, care: 2 },
    blurb: 'A small, stay-put Caribbean anemone in sunset colors; perfect for nano reefs.' }),
  co({ id: 'condy_anemone', name: 'Condylactis Anemone', shape: 'anemone', colors: ['pearl', 'pink'], w: 20, h: 16, regions: ['caribbean'],
    coral: { type: 'anemone', par: [80, 250], flow: [1, 2], sting: 15, growth: 2, temp: tropical, care: 2, sway: true },
    blurb: 'The Caribbean giant anemone, with pink-tipped tentacles; Pacific clownfish rarely recognize it as a host.' }),
  co({ id: 'maxima_clam', name: 'Maxima Clam', shape: 'clam', colors: ['blue', 'teal'], w: 16, h: 8, tier: 4,
    coral: { type: 'clam', par: [200, 400], flow: [1, 2], sting: 0, growth: 1, temp: tropical, care: 4, glow: true },
    blurb: 'Tridacna maxima farms algae in a mantle of iridescent blue and green; each pattern is unique.' }),
  co({ id: 'crocea_clam', name: 'Crocea Clam', shape: 'clam', colors: ['purple', 'blue'], w: 12, h: 6, tier: 4,
    coral: { type: 'clam', par: [250, 400], flow: [1, 2], sting: 0, growth: 1, temp: tropical, care: 5, glow: true },
    blurb: 'The smallest giant clam bores into rock, leaving only its neon mantle showing.' }),
  // ---------------------------------------------------------------- cold-water anemones
  co({ id: 'giant_green_anemone', name: 'Giant Green Anemone', shape: 'anemone', colors: ['green', 'lime'], w: 20, h: 12, regions: ['rocky_shore'],
    coral: { type: 'anemone', par: [50, 250], flow: [1, 3], sting: 4, growth: 1, temp: [8, 18], care: 2 },
    tags: ['hitch'], blurb: 'Its green comes from algae living inside it; it sticks gently to a fingertip, a touch-pool favorite.' }),
  co({ id: 'plumose_anemone', name: 'Plumose Anemone', shape: 'anemone', colors: ['pearl', 'peach'], w: 16, h: 26, regions: ['cold_north', 'kelp_forest'], tier: 4,
    coral: { type: 'anemone', par: [0, 150], flow: [2, 3], sting: 4, growth: 2, temp: [4, 14], care: 2, fed: true, sway: true },
    blurb: 'Metridium: tall white columns crowned with a cauliflower of fine tentacles, filtering cold currents.' }),
];
