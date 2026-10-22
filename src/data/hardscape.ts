// Hardscape: stones, driftwood, botanicals, land and decor. Effects on water chemistry follow
// RESEARCH.md ("Hardscape and water chemistry"): calcareous stone raises pH and hardness, wood
// and leaf litter release tannins and lower pH, inert stone changes nothing.
import type { ItemDef } from './types';

const fresh = ['fresh'] as ItemDef['water'];
const freshBrack = ['fresh', 'brackish'] as ItemDef['water'];
const all = ['fresh', 'brackish', 'marine'] as ItemDef['water'];
const marine = ['marine'] as ItemDef['water'];

export const ROCKS: ItemDef[] = [
  {
    id: 'seiryu_stone', name: 'Seiryu Stone', cat: 'rock', water: freshBrack, price: 18, tier: 0, w: 40, h: 30, place: 'ground', shape: 'veined',
    colors: ['slate', 'pearl'], fx: { ph: 0.3, gh: 1.5, kh: 1.5 }, tags: ['stone', 'buffer'],
    blurb: 'Blue-grey stone laced with white calcite. The Iwagumi classic, but it slowly hardens the water: keep it away from soft-water shrimp.',
  },
  {
    id: 'dragon_stone', name: 'Dragon Stone (Ohko)', cat: 'rock', water: all, price: 16, tier: 0, w: 36, h: 28, place: 'ground', shape: 'holey',
    colors: ['gold_sand', 'brown'], tags: ['stone', 'cave'],
    blurb: 'Wrinkled, holey clay stone in warm browns. Light, inert and full of pockets for moss and Bucephalandra.',
  },
  {
    id: 'lava_rock', name: 'Lava Rock', cat: 'rock', water: all, price: 10, tier: 0, w: 28, h: 22, place: 'ground', shape: 'porous',
    colors: ['black', 'red'], fx: { bio: 40 }, tags: ['stone', 'cave'],
    blurb: 'Porous volcanic rock: a home for filter bacteria and an anchor for roots and epiphytes.',
  },
  {
    id: 'river_pebbles', name: 'River Pebbles', cat: 'rock', water: all, price: 6, tier: 0, w: 44, h: 14, place: 'ground', shape: 'pebbles',
    colors: ['taupe', 'sand'], tags: ['stone'],
    blurb: 'A scatter of smooth water-worn pebbles; the floor of every stream.',
  },
  {
    id: 'river_boulder', name: 'River Boulder', cat: 'rock', water: all, price: 14, tier: 0, w: 38, h: 26, place: 'ground', shape: 'boulder',
    colors: ['slate', 'taupe'], regions: ['hillstream', 'temperate_na'], tags: ['stone'],
    blurb: 'A rounded boulder polished by floods; hillstream loaches cling to its sunlit top.',
  },
  {
    id: 'slate_stack', name: 'Slate Stack', cat: 'rock', water: all, price: 12, tier: 0, w: 34, h: 22, place: 'ground', shape: 'slab',
    colors: ['black', 'slate'], tags: ['stone', 'cave'],
    blurb: 'Flat slabs stacked into caves: spawning sites for angels and plecos and dens for cichlids.',
  },
  {
    id: 'texas_holey_rock', name: 'Texas Holey Rock', cat: 'rock', water: freshBrack, price: 16, tier: 1, w: 34, h: 26, place: 'ground', shape: 'holey',
    colors: ['bone', 'sand'], regions: ['central_america', 'mexico_karst'], fx: { ph: 0.5, gh: 3, kh: 3 }, tags: ['stone', 'cave', 'buffer'],
    blurb: 'Limestone riddled with tunnels. It buffers water hard and alkaline, ideal for livebearers and Central American cichlids.',
  },
  {
    id: 'tufa_rock', name: 'Tufa Rock', cat: 'rock', water: freshBrack, price: 16, tier: 1, w: 32, h: 24, place: 'ground', shape: 'porous',
    colors: ['bone', 'taupe'], regions: ['lake_malawi', 'lake_tanganyika'], fx: { ph: 0.5, gh: 3, kh: 3 }, tags: ['stone', 'cave', 'buffer'],
    blurb: 'Soft calcareous rock that buffers water hard and alkaline, just what Rift Lake cichlids want.',
  },
  {
    id: 'malawi_rock', name: 'Rift Lake Rock Pile', cat: 'rock', water: fresh, price: 20, tier: 1, w: 46, h: 34, place: 'ground', shape: 'boulder',
    colors: ['taupe', 'sand'], regions: ['lake_malawi', 'lake_tanganyika'], tags: ['stone', 'cave'],
    blurb: 'Rounded stones stacked into a reef of caves and sight-breaks, so every mbuna can claim a doorway.',
  },
  {
    id: 'pagoda_stone', name: 'Pagoda Stone', cat: 'rock', water: fresh, price: 18, tier: 1, w: 30, h: 34, place: 'ground', shape: 'strata',
    colors: ['gold_sand', 'taupe'], tags: ['stone'],
    blurb: 'Layered stone that stacks into tiered mountains for diorama landscapes.',
  },
  {
    id: 'frodo_stone', name: 'Frodo Stone', cat: 'rock', water: fresh, price: 16, tier: 1, w: 34, h: 26, place: 'ground', shape: 'boulder',
    colors: ['brown', 'gold_sand'], tags: ['stone'],
    blurb: 'Smooth brown stone with gentle lines, an inert alternative to Seiryu for soft-water Iwagumi.',
  },
  {
    id: 'petrified_wood', name: 'Petrified Wood', cat: 'rock', water: all, price: 22, tier: 1, w: 30, h: 30, place: 'ground', shape: 'banded',
    colors: ['brown', 'gold_sand'], tags: ['stone'],
    blurb: 'Ancient wood turned to stone, keeping every ring and crack of the tree. Completely inert.',
  },
  {
    id: 'fluorite_stone', name: 'Fluorite Stone', cat: 'rock', water: fresh, price: 28, tier: 2, w: 24, h: 22, place: 'ground', shape: 'banded',
    colors: ['purple', 'green'], tags: ['stone'],
    blurb: 'Crystal bands of green and purple: inert, rare and beautiful under planted lights.',
  },
  {
    id: 'pale_volcanic', name: 'Pale Volcanic Rock', cat: 'rock', water: fresh, price: 18, tier: 2, w: 32, h: 24, place: 'ground', shape: 'porous',
    colors: ['pearl', 'taupe'], regions: ['sulawesi'], tags: ['stone', 'cave'],
    blurb: 'Light, porous rock like the iron-stained shores of the Malili Lakes, home of cardinal shrimp.',
  },
  {
    id: 'ryuoh_stone', name: 'Ryuoh Stone', cat: 'rock', water: freshBrack, price: 18, tier: 0, w: 40, h: 32, place: 'ground', shape: 'veined',
    colors: ['slate', 'black'], fx: { ph: 0.1, gh: 0.5, kh: 0.5 }, tags: ['stone'],
    blurb: 'Elephant-skin stone: dark grey, furrowed with deep wrinkles that hold shadow. A little calcareous, so it nudges the hardness up a touch.',
  },
  {
    id: 'yamaya_stone', name: 'Yamaya Stone', cat: 'rock', water: fresh, price: 20, tier: 1, w: 32, h: 40, place: 'ground', shape: 'jagged',
    colors: ['sage', 'slate'], tags: ['stone'],
    blurb: 'Sharp green-grey Japanese stone that looks like a mountain already furred with moss. Inert, and made for a tall Iwagumi peak.',
  },
  {
    id: 'live_rock', name: 'Live Rock', cat: 'rock', water: marine, price: 30, tier: 3, w: 40, h: 30, place: 'ground', shape: 'porous',
    colors: ['lilac', 'pink'], fx: { bio: 120, pests: 0.3 }, tags: ['stone', 'cave', 'live', 'coralline'],
    blurb: 'Ocean rock already alive with bacteria, coralline algae and critters. It cycles a tank fast but can carry hitchhikers like Aiptasia.',
  },
  {
    id: 'dry_reef_rock', name: 'Dry Reef Rock', cat: 'rock', water: marine, price: 16, tier: 3, w: 40, h: 30, place: 'ground', shape: 'porous',
    colors: ['bone', 'sand'], fx: { bio: 30 }, tags: ['stone', 'cave'],
    blurb: 'Cheap and pest-free; it starts sterile, needs time to mature, and turns purple as coralline algae creeps over it.',
  },
  {
    id: 'ceramic_rock', name: 'Ceramic Reef Arch', cat: 'rock', water: marine, price: 26, tier: 3, w: 48, h: 34, place: 'ground', shape: 'spire',
    colors: ['bone', 'pink'], fx: { bio: 40 }, tags: ['stone', 'cave'],
    blurb: 'Manufactured rock cast into arches and shelves: pest-free, designable and full of swim-throughs.',
  },
  {
    id: 'granite_boulder', name: 'Granite Boulder', cat: 'rock', water: marine, price: 20, tier: 3, w: 46, h: 32, place: 'ground', shape: 'boulder',
    colors: ['slate', 'pink'], regions: ['kelp_forest', 'cold_north', 'rocky_shore'], tags: ['stone', 'cave'],
    blurb: 'Speckled boulders of the cold coast, where kelp holdfasts grip and wolf eels den.',
  },
  {
    id: 'barnacle_rock', name: 'Barnacled Rock', cat: 'rock', water: marine, price: 18, tier: 3, w: 36, h: 24, place: 'ground', shape: 'jagged',
    colors: ['slate', 'bone'], regions: ['rocky_shore'], tags: ['stone', 'shells'],
    blurb: 'Tide-pool rock crusted with barnacles; empty barnacle shells make homes for grunt sculpins.',
  },
];

export const WOODS: ItemDef[] = [
  {
    id: 'spider_wood', name: 'Spider Wood', cat: 'wood', water: freshBrack, price: 16, tier: 0, w: 46, h: 44, place: 'ground', shape: 'twiggy',
    colors: ['pale_wood'], fx: { tannin: 0.25, ph: -0.1 }, tags: ['floats', 'biofilm', 'epiphyte_mount', 'moss_tree'],
    blurb: 'Azalea root with a hundred thin twisting branches. It floats until soaked and grows a harmless white biofilm the first weeks, which shrimp love.',
  },
  {
    id: 'manzanita', name: 'Manzanita', cat: 'wood', water: freshBrack, price: 18, tier: 0, w: 44, h: 46, place: 'ground', shape: 'branchy',
    colors: ['wood'], fx: { tannin: 0.1 }, tags: ['floats', 'epiphyte_mount', 'moss_tree'],
    blurb: 'Dense, smooth red-brown branches from the American Southwest; low in tannins, but it needs weighing down at first.',
  },
  {
    id: 'mopani', name: 'Mopani Wood', cat: 'wood', water: freshBrack, price: 16, tier: 0, w: 36, h: 28, place: 'ground', shape: 'chunk',
    colors: ['brown', 'gold_sand'], fx: { tannin: 0.6, ph: -0.2 }, tags: ['tannin', 'cave'],
    blurb: 'Heavy two-toned African hardwood that sinks at once and leaches tannins for weeks: boil it first, or embrace the tea.',
  },
  {
    id: 'malaysian_driftwood', name: 'Malaysian Driftwood', cat: 'wood', water: freshBrack, price: 14, tier: 0, w: 40, h: 28, place: 'ground', shape: 'root',
    colors: ['brown'], fx: { tannin: 0.35, ph: -0.15 }, tags: ['tannin', 'cave', 'epiphyte_mount'],
    blurb: 'The classic: dark, dense, sinks almost immediately, full of caves and crannies that plecos love to rasp.',
  },
  {
    id: 'redmoor', name: 'Redmoor Root', cat: 'wood', water: freshBrack, price: 18, tier: 0, w: 44, h: 40, place: 'ground', shape: 'root',
    colors: ['wood'], fx: { tannin: 0.2 }, tags: ['epiphyte_mount', 'moss_tree'],
    blurb: 'Rhododendron root with spidery red-brown tendrils, excellent for tying on epiphytes. Sinks within about a week.',
  },
  {
    id: 'cholla', name: 'Cholla Wood', cat: 'wood', water: freshBrack, price: 6, tier: 0, w: 30, h: 10, place: 'ground', shape: 'tube',
    colors: ['pale_wood'], fx: { tannin: 0.2, ph: -0.05 }, tags: ['decay', 'shrimp_hide', 'biofilm'],
    blurb: 'The woody skeleton of a cactus, full of holes. Shrimp graze it, and it slowly softens and decays within a year or two.',
  },
  {
    id: 'ghost_wood', name: 'Ghost Wood', cat: 'wood', water: freshBrack, price: 18, tier: 1, w: 44, h: 40, place: 'ground', shape: 'branchy',
    colors: ['bone'], fx: { tannin: 0.05 }, tags: ['epiphyte_mount'],
    blurb: 'Sandblasted pale wood (some say manzanita, some say Pacific driftwood). Bright branches that pop against dark backgrounds.',
  },
  {
    id: 'sumatra_wood', name: 'Sumatra Wood', cat: 'wood', water: freshBrack, price: 20, tier: 1, w: 42, h: 32, place: 'ground', shape: 'gnarl',
    colors: ['brown', 'black'], regions: ['se_asia_peat'], fx: { tannin: 0.3 }, tags: ['cave', 'epiphyte_mount'],
    blurb: 'Gnarled, twisted dark wood with deep cracks and holes: heavy and full of character.',
  },
  {
    id: 'bonsai_driftwood', name: 'Bonsai Driftwood', cat: 'wood', water: fresh, price: 30, tier: 1, w: 40, h: 54, place: 'ground', shape: 'tree',
    colors: ['wood'], fx: { tannin: 0.1 }, tags: ['moss_tree', 'epiphyte_mount'],
    blurb: 'Wood assembled into the shape of a tree. Tie moss to the branches and grow a canopy: the heart of a diorama scape.',
  },
  {
    id: 'mangrove_root', name: 'Mangrove Roots', cat: 'wood', water: freshBrack, price: 22, tier: 2, w: 54, h: 60, place: 'ground', shape: 'arch',
    colors: ['wood', 'black'], regions: ['mangrove'], fx: { tannin: 0.2 }, tags: ['hitch', 'cave'],
    blurb: 'Arching prop roots rising out of the water: the architecture of every estuary.',
  },
  {
    id: 'cork_bark', name: 'Cork Bark', cat: 'wood', water: freshBrack, price: 12, tier: 1, w: 30, h: 40, place: 'ground', shape: 'bark',
    colors: ['brown', 'gold_sand'], fx: { tannin: 0.05 }, tags: ['floats', 'land', 'epiphyte_mount'],
    blurb: 'Light, buoyant bark for paludarium backgrounds and land shelves; bromeliads and moss root into it.',
  },
  {
    id: 'bogwood', name: 'Bog Oak', cat: 'wood', water: freshBrack, price: 22, tier: 1, w: 46, h: 30, place: 'ground', shape: 'gnarl',
    colors: ['black'], regions: ['temperate_eu'], fx: { tannin: 0.4, ph: -0.2 }, tags: ['tannin', 'cave'],
    blurb: 'Ancient wood preserved for centuries in peat bogs, black as coal and heavy with tannins.',
  },
  {
    id: 'hornwood', name: 'Hornwood (Talawa)', cat: 'wood', water: freshBrack, price: 18, tier: 0, w: 30, h: 50, place: 'ground', shape: 'branchy',
    colors: ['wood', 'brown'], fx: { tannin: 0.3, ph: -0.1 }, tags: ['tannin', 'epiphyte_mount'],
    blurb: 'Talawa root from Southeast Asia: slender red-brown spires that curve up like horns. Dense, sinks at once and tints the water a little.',
  },
  {
    id: 'hollow_log', name: 'Hollow Log', cat: 'wood', water: freshBrack, price: 16, tier: 0, w: 48, h: 30, place: 'ground', shape: 'tube',
    colors: ['taupe', 'brown'], fx: { tannin: 0.15 }, tags: ['cave', 'epiphyte_mount'],
    blurb: 'A weathered hollow branch laid on its side. Plecos, loaches and shy cichlids move straight into the tunnel.',
  },
];

export const BOTANICALS: ItemDef[] = [
  {
    id: 'catappa_leaves', name: 'Catappa Leaves', cat: 'botanical', water: freshBrack, price: 4, tier: 0, w: 26, h: 5, place: 'ground', shape: 'leaves',
    colors: ['brown', 'gold_sand'], regions: ['se_asia_peat', 'se_asia_river'], fx: { tannin: 0.3, ph: -0.1 }, tags: ['leaf_litter', 'tannin'],
    blurb: 'Indian almond leaves soften and stain the water and grow a film that fry and shrimp graze; bettas nest under them.',
  },
  {
    id: 'alder_cones', name: 'Alder Cones', cat: 'botanical', water: freshBrack, price: 3, tier: 0, w: 16, h: 5, place: 'ground', shape: 'cones',
    colors: ['black', 'brown'], regions: ['temperate_eu'], fx: { tannin: 0.3, ph: -0.15 }, tags: ['tannin'],
    blurb: 'Tiny cones of the alder tree; a handful lowers pH and tints the water amber.',
  },
  {
    id: 'oak_leaves', name: 'Oak Leaf Litter', cat: 'botanical', water: fresh, price: 3, tier: 0, w: 26, h: 5, place: 'ground', shape: 'leaves',
    colors: ['gold_sand', 'brown'], regions: ['temperate_na', 'temperate_eu'], fx: { tannin: 0.15 }, tags: ['leaf_litter'],
    blurb: 'Dried oak leaves, the natural floor of temperate creeks; darters and shrimp forage in it.',
  },
  {
    id: 'seed_pods', name: 'Forest Seed Pods', cat: 'botanical', water: fresh, price: 6, tier: 0, w: 18, h: 8, place: 'ground', shape: 'pods',
    colors: ['brown', 'wood'], regions: ['rio_negro', 'amazon'], fx: { tannin: 0.15 }, tags: ['leaf_litter', 'cave'],
    blurb: 'Seed pods from the flooded forest floor make caves for dwarf cichlids and cover for shy tetras.',
  },
  {
    id: 'coconut_cave', name: 'Coconut Cave', cat: 'botanical', water: freshBrack, price: 4, tier: 0, w: 14, h: 10, place: 'ground', shape: 'coconut',
    colors: ['brown', 'wood'], tags: ['cave'],
    blurb: 'Half a coconut shell with a door cut in: the cozy classic cave.',
  },
  {
    id: 'neothauma_shells', name: 'Neothauma Shells', cat: 'botanical', water: freshBrack, price: 8, tier: 1, w: 22, h: 6, place: 'ground', shape: 'shells',
    colors: ['bone', 'sand'], regions: ['lake_tanganyika'], fx: { gh: 0.3, kh: 0.3 }, tags: ['shells'],
    blurb: 'Empty Neothauma snail shells, the real homes of Tanganyika shell dwellers.',
  },
];

export const LAND: ItemDef[] = [
  {
    id: 'moss_bank', name: 'Mossy Bank', cat: 'land', water: freshBrack, price: 14, tier: 1, w: 44, h: 20, place: 'land', shape: 'bank',
    colors: ['green', 'brown'], tags: ['land'],
    blurb: 'A sloped bank of soil and moss above the waterline for newts, crabs and frogs to haul out on.',
  },
  {
    id: 'mudflat', name: 'Mudflat', cat: 'land', water: ['brackish'], price: 14, tier: 2, w: 44, h: 14, place: 'land', shape: 'bank',
    colors: ['brown', 'taupe'], regions: ['mangrove'], tags: ['land'],
    blurb: 'A low tidal mudflat where mudskippers skip, display and dig their burrows.',
  },
];

export const DECOR: ItemDef[] = [
  {
    id: 'treasure_chest', name: 'Bubbling Treasure Chest', cat: 'decor', water: all, price: 12, tier: 0, w: 16, h: 12, place: 'ground', shape: 'chest',
    colors: ['wood', 'gold'], tags: ['whimsy', 'set_galleon', 'bubbler'],
    blurb: 'Pops open every so often in a burst of bubbles. Children press their noses to the glass for this.',
  },
  {
    id: 'sunken_galleon', name: 'Sunken Galleon', cat: 'decor', water: all, price: 24, tier: 1, w: 50, h: 34, place: 'ground', shape: 'ship',
    colors: ['wood', 'brown'], tags: ['whimsy', 'set_galleon', 'cave'],
    blurb: 'A broken little galleon on its side, with portholes for fish to swim through.',
  },
  {
    id: 'ruined_columns', name: 'Ruined Columns', cat: 'decor', water: all, price: 18, tier: 1, w: 30, h: 36, place: 'ground', shape: 'columns',
    colors: ['bone', 'sand'], tags: ['whimsy', 'set_ruins'],
    blurb: 'Toppled marble columns from an imaginary drowned city.',
  },
  {
    id: 'amphora', name: 'Ancient Amphora', cat: 'decor', water: all, price: 10, tier: 1, w: 14, h: 18, place: 'ground', shape: 'amphora',
    colors: ['peach', 'brown'], tags: ['whimsy', 'set_ruins', 'cave'],
    blurb: 'A clay jar lying on its side; octopuses and blennies move right in.',
  },
  {
    id: 'stone_lantern', name: 'Stone Lantern', cat: 'decor', water: fresh, price: 16, tier: 1, w: 14, h: 24, place: 'ground', shape: 'lantern',
    colors: ['slate', 'pearl'], tags: ['whimsy', 'set_zen'],
    blurb: 'A little ishidoro garden lantern for a quiet koi or medaka tank.',
  },
  {
    id: 'zen_bridge', name: 'Arched Garden Bridge', cat: 'decor', water: fresh, price: 16, tier: 1, w: 34, h: 16, place: 'ground', shape: 'bridge',
    colors: ['red', 'wood'], tags: ['whimsy', 'set_zen'],
    blurb: 'A red-lacquered arched bridge, as in a Japanese garden pond.',
  },
  {
    id: 'toy_castle', name: 'Toy Castle', cat: 'decor', water: all, price: 14, tier: 0, w: 26, h: 30, place: 'ground', shape: 'castle',
    colors: ['slate', 'red'], tags: ['whimsy', 'set_toybox', 'cave'],
    blurb: 'Turrets, flags and a gate to swim through. Aquascapers wince; kids cheer.',
  },
  {
    id: 'bubbling_clam', name: 'Bubbling Clam', cat: 'decor', water: all, price: 10, tier: 0, w: 14, h: 8, place: 'ground', shape: 'clamshell',
    colors: ['pink', 'pearl'], tags: ['whimsy', 'set_toybox', 'bubbler'],
    blurb: 'An air-powered clam that yawns open and lets out a bubble with a pearl inside.',
  },
  {
    id: 'clay_cave', name: 'Clay Spawning Cave', cat: 'decor', water: freshBrack, price: 6, tier: 0, w: 14, h: 9, place: 'ground', shape: 'claycave',
    colors: ['peach', 'red'], tags: ['cave'],
    blurb: 'A plain fired-clay tube: plecos, kribs and dwarf cichlids raise families in these.',
  },
  {
    id: 'shrimp_tubes', name: 'Shrimp Tubes', cat: 'decor', water: freshBrack, price: 5, tier: 0, w: 14, h: 8, place: 'ground', shape: 'tubes',
    colors: ['brown', 'peach'], tags: ['shrimp_hide', 'cave'],
    blurb: 'A bundle of tiny ceramic tubes where freshly molted shrimp can hide until their shells harden.',
  },
];

export const HARDSCAPE: ItemDef[] = [...ROCKS, ...WOODS, ...BOTANICALS, ...LAND, ...DECOR];
