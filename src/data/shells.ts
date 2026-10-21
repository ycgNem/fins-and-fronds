// Tank bodies. Interior pixel sizes use the same 4 px per cm as small fish, compressed for the big
// exhibit tanks so they pan instead of shrinking the art (RESEARCH.md, "Tank shapes").
import type { ShellDef } from './types';

/** The standard framed glass tanks of every fish shop, by nominal US gallons (real dimensions). */
const STANDARD: ShellDef[] = [
  {
    id: 'std_5', name: '5 Gallon', gal: 5, liters: 19, cm: [41, 21, 25], w: 164, h: 96, shape: 'rect', tags: ['nano'], price: 25, tier: 0,
    blurb: 'A 16 x 8 x 10 inch starter: a betta, a few shrimp or a single moss-and-stone scape. Too small for schools.',
  },
  {
    id: 'std_10', name: '10 Gallon', gal: 10, liters: 38, cm: [51, 25, 30], w: 204, h: 116, shape: 'rect', tags: [], price: 40, tier: 0,
    blurb: 'The 20 x 10 x 12 inch tank nearly every fishkeeper starts with: a small school of tetras or a shrimp colony.',
  },
  {
    id: 'std_20l', name: '20 Gallon Long', gal: 20, liters: 76, cm: [76, 30, 30], w: 300, h: 116, shape: 'rect', tags: [], price: 70, tier: 0,
    blurb: 'Thirty inches long and only twelve tall: swimming room for schools, a wide canvas for scaping and easy to light.',
  },
  {
    id: 'std_29', name: '29 Gallon', gal: 29, liters: 110, cm: [76, 30, 46], w: 300, h: 172, shape: 'rect', tags: [], price: 100, tier: 0,
    blurb: 'The same footprint as a 20 long, but tall enough for angelfish, Amazon swords and tall stem plants.',
  },
  {
    id: 'std_40b', name: '40 Gallon Breeder', gal: 40, liters: 151, cm: [91, 46, 41], w: 364, h: 156, shape: 'rect', tags: [], price: 150, tier: 1,
    blurb: 'Eighteen inches front to back: the deep footprint scapers and cichlid keepers love.',
  },
  {
    id: 'std_55', name: '55 Gallon', gal: 55, liters: 208, cm: [122, 33, 53], w: 440, h: 200, shape: 'rect', tags: [], price: 220, tier: 1,
    blurb: 'The classic four-foot tank: long and narrow, made for big schools, rainbowfish and active cichlids.',
  },
  {
    id: 'std_75', name: '75 Gallon', gal: 75, liters: 284, cm: [122, 46, 53], w: 440, h: 200, shape: 'rect', tags: ['drilled'], price: 320, tier: 2,
    blurb: 'Four feet long and a foot and a half deep, drilled for a sump: room for depth, rockwork and a real reef.',
  },
  {
    id: 'std_125', name: '125 Gallon', gal: 125, liters: 473, cm: [183, 46, 53], w: 600, h: 200, shape: 'rect', tags: ['drilled'], price: 560, tier: 3,
    blurb: 'Six feet of glass: oscars, silver dollars, a geophagus crowd or a reef you can walk along.',
  },
];

export const SHELLS: ShellDef[] = [
  ...STANDARD,
  {
    id: 'glass_bowl', name: 'Glass Bowl', liters: 4, cm: [22, 20, 22], w: 88, h: 76, shape: 'bowl', tags: ['open_top', 'pico', 'round'], fill: 0.7,
    water: ['fresh'], price: 12, tier: 0,
    blurb: 'Too small and round for fish, perfect for a wabi-kusa ball, a marimo or a few shrimp. Fish deserve filtered tanks.',
  },
  {
    id: 'nano_cube', name: 'Nano Cube 27', liters: 27, cm: [30, 30, 30], w: 120, h: 112, shape: 'cube', tags: ['rimless', 'nano'], price: 40, tier: 0,
    blurb: 'A rimless 30 cm cube: shrimp colonies, a betta, a nano reef or a single perfect Iwagumi.',
  },
  {
    id: 'rimless_60', name: '60P Rimless', liters: 64, cm: [60, 30, 36], w: 240, h: 136, shape: 'rect', tags: ['rimless'], price: 90, tier: 0,
    blurb: 'The 60 x 30 x 36 cm standard of aquascaping contests worldwide; low iron glass, silicone you can barely see.',
  },
  {
    id: 'lowboy_60', name: 'Shallow Lowboy', liters: 48, cm: [60, 45, 24], w: 240, h: 92, shape: 'lowboy', tags: ['rimless', 'shallow'], price: 90, tier: 1,
    blurb: 'Wide and shallow: carpets get plenty of light and stones loom large, ideal for Iwagumi and Walstad bowls of light.',
  },
  {
    id: 'column_tall', name: 'Tall Column', liters: 90, cm: [40, 40, 70], w: 150, h: 220, shape: 'column', tags: ['tall'], price: 140, tier: 1,
    blurb: 'A tall column for angelfish, seahorses and anything that lives in vertical roots and seagrass.',
  },
  {
    id: 'bowfront_110', name: 'Bowfront 180', liters: 180, cm: [90, 38, 50], w: 320, h: 180, shape: 'bowfront', tags: [], price: 160, tier: 1,
    blurb: 'A curved front glass that pulls the scape toward the viewer: the classic living-room aquarium.',
  },
  {
    id: 'hex_80', name: 'Hexagon Tower', liters: 80, cm: [50, 50, 60], w: 180, h: 200, shape: 'hex', tags: ['tall'], price: 130, tier: 1,
    blurb: 'Six panes, viewed from any side; a centerpiece for a room, if not for an aquascaper.',
  },
  {
    id: 'long_120', name: 'Long 120', liters: 240, cm: [120, 45, 45], w: 440, h: 172, shape: 'rect', tags: ['drilled'], price: 300, tier: 2,
    blurb: 'A four-foot show tank, drilled for a sump: room for big schools, real swimming space and serious reefs.',
  },
  {
    id: 'reef_cube_250', name: 'Reef Cube 250', liters: 250, cm: [65, 65, 60], w: 240, h: 220, shape: 'cube', tags: ['rimless', 'drilled'], price: 380, tier: 3,
    blurb: 'A deep rimless cube with an overflow box: corals viewed from three sides.',
  },
  {
    id: 'paludarium_90', name: 'Paludarium 90', liters: 120, cm: [90, 45, 60], w: 320, h: 220, shape: 'paludarium', tags: ['land', 'tall'], land: 0.4, fill: 0.5,
    price: 220, tier: 1,
    blurb: 'Half land, half water: a bank of moss and bromeliads above a pool, with mist rolling over the edge.',
  },
  {
    id: 'riparium_75', name: 'Open-top Riparium', liters: 70, cm: [75, 35, 45], w: 280, h: 170, shape: 'riparium', tags: ['open_top', 'land'], land: 0.15, fill: 0.6,
    price: 150, tier: 1,
    blurb: 'An open tank with planters hanging on the rim: emersed plants above, their roots and fish below.',
  },
  {
    id: 'mangrove_100', name: 'Mangrove Shelf', liters: 150, cm: [100, 50, 50], w: 360, h: 180, shape: 'paludarium', tags: ['land', 'open_top'], land: 0.35, fill: 0.55,
    water: ['brackish', 'fresh'], price: 260, tier: 2,
    blurb: 'A low tidal tank with a mudflat shelf and an open top for mangrove leaves, archerfish shots and mudskipper displays.',
  },
  {
    id: 'kreisel_200', name: 'Kreisel', liters: 200, cm: [100, 100, 40], w: 230, h: 230, shape: 'kreisel', tags: ['kreisel', 'round'], water: ['marine'],
    price: 600, tier: 4,
    blurb: 'A round tank whose gentle circular current keeps jellies suspended and away from the walls, invented in the 1960s for plankton research.',
  },
  {
    id: 'show_180', name: '180 Show Tank', liters: 700, cm: [180, 60, 65], w: 600, h: 220, shape: 'rect', tags: ['drilled'], price: 900, tier: 3,
    blurb: 'Six feet of glass for monster fish, big schools and dramatic reefs. Walk along it to see it all.',
  },
  {
    id: 'koi_pond', name: 'Indoor Koi Pond', liters: 4000, cm: [300, 150, 90], w: 760, h: 180, shape: 'pond', tags: ['pond', 'open_top', 'exhibit'], water: ['fresh'],
    price: 2200, tier: 3,
    blurb: 'A sunken pond with a viewing window: koi, comets, lilies and lotus, unheated and alive with seasons.',
  },
  {
    id: 'touch_pool', name: 'Touch Pool', liters: 1500, cm: [240, 120, 40], w: 700, h: 110, shape: 'pool', tags: ['open_top', 'touch', 'shallow', 'exhibit'],
    water: ['marine'], price: 1800, tier: 3,
    blurb: 'A shallow cold pool at hand height where visitors may gently touch sea stars, urchins and anemones with two fingers.',
  },
  {
    id: 'kelp_tower', name: 'Kelp Tower', liters: 30000, cm: [400, 300, 850], w: 460, h: 420, shape: 'tower', tags: ['tall', 'exhibit'], water: ['marine'],
    price: 9000, tier: 4,
    blurb: 'A multi-story tank with a wave machine at the top, tall enough for giant kelp to reach the light.',
  },
  {
    id: 'ocean_window', name: 'Ocean Window', liters: 200000, cm: [1200, 600, 600], w: 960, h: 300, shape: 'panorama', tags: ['exhibit'], water: ['marine'],
    price: 25000, tier: 5,
    blurb: 'A great acrylic window onto open water: sardine rivers, cruising sharks and drifting rays.',
  },
  {
    id: 'deep_chamber', name: 'Deep Chamber', liters: 6000, cm: [300, 200, 250], w: 340, h: 280, shape: 'cylinder', tags: ['exhibit'], water: ['marine'],
    price: 12000, tier: 5,
    blurb: 'A chilled, nearly dark cylinder that recreates the twilight zone for the few deep animals that can live in an aquarium.',
  },
];
