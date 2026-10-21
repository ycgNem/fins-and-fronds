// Substrates. Active soils and calcareous sands change water chemistry (RESEARCH.md,
// "Substrates"); everything else is inert and differs in grain, color and rooting.
import type { SubstrateDef } from './types';

export const SUBSTRATES: SubstrateDef[] = [
  {
    id: 'fine_sand', name: 'Fine River Sand', water: ['fresh', 'brackish'], grain: 'fine_sand', colors: ['sand'], fx: {}, rich: 0, price: 10, tier: 0,
    blurb: 'Soft on cory barbels and loach bellies; burrowers dive straight into it.',
  },
  {
    id: 'black_sand', name: 'Black Sand', water: ['fresh', 'brackish'], grain: 'sand', colors: ['black'], fx: {}, rich: 0, price: 12, tier: 0,
    blurb: 'Dark sand makes tetras and shrimp glow, and suits blackwater and peat-swamp tanks.',
  },
  {
    id: 'gravel', name: 'Natural Gravel', water: ['fresh', 'brackish'], grain: 'gravel', colors: ['taupe'], fx: {}, rich: 0, price: 8, tier: 0,
    blurb: 'Inert and easy to clean, but poor for rooting plants and rough on bottom-dwellers.',
  },
  {
    id: 'clay_gravel', name: 'Fired Clay Gravel', water: ['fresh'], grain: 'gravel', colors: ['brown', 'red'], fx: {}, rich: 1, price: 14, tier: 0,
    blurb: 'Porous fired clay that holds nutrients for roots without changing water chemistry.',
  },
  {
    id: 'aquasoil', name: 'Active Aquasoil', water: ['fresh'], grain: 'soil', colors: ['brown', 'black'], fx: { ph: -0.8, kh: -3, gh: -1 }, rich: 3, price: 22, tier: 0,
    blurb: 'Baked volcanic soil packed with nutrients that softens water and buffers pH low. It leaches ammonia when new and loses its buffering after a year or so.',
  },
  {
    id: 'capped_soil', name: 'Capped Soil (Walstad)', water: ['fresh'], grain: 'soil', colors: ['sand', 'brown'], fx: {}, rich: 3, price: 12, tier: 0,
    blurb: "Organic potting soil under a sand cap, Diana Walstad's low-tech recipe: plants feed from the soil and need no CO2.",
  },
  {
    id: 'pebble_bed', name: 'Pebble Bed', water: ['fresh', 'marine'], grain: 'pebble', colors: ['taupe', 'slate'], fx: {}, rich: 0, price: 10, tier: 0,
    blurb: 'Smooth river pebbles: the bed of a hillstream or a cold rocky shore.',
  },
  {
    id: 'crushed_coral', name: 'Crushed Coral', water: ['fresh', 'brackish', 'marine'], grain: 'crushed', colors: ['bone'], fx: { ph: 0.6, kh: 4, gh: 4 }, rich: 0,
    price: 14, tier: 1, blurb: 'Buffers water hard and alkaline. Perfect for Rift lakes and brackish tanks, wrong for soft-water fish.',
  },
  {
    id: 'mud', name: 'Estuary Mud', water: ['brackish', 'fresh'], grain: 'mud', colors: ['brown', 'taupe'], fx: {}, rich: 2, price: 10, tier: 2,
    blurb: 'Fine mud for mangroves and mudskippers; kept shallow so it never turns stagnant.',
  },
  {
    id: 'aragonite_sand', name: 'Aragonite Sand', water: ['marine', 'brackish'], grain: 'sand', colors: ['bone', 'pearl'], fx: { ph: 0.4, kh: 2 }, rich: 0,
    price: 16, tier: 2, blurb: 'Calcium carbonate sand that helps hold reef pH and alkalinity steady.',
  },
  {
    id: 'live_sand', name: 'Live Sand', water: ['marine'], grain: 'fine_sand', colors: ['bone'], fx: { bio: 60, ph: 0.3, kh: 1 }, rich: 0, price: 24, tier: 3,
    blurb: 'Aragonite sand seeded with bacteria and tiny critters; deep beds host sand-sifters, jawfish and garden eels.',
  },
  {
    id: 'deep_silt', name: 'Deep-sea Silt', water: ['marine'], grain: 'mud', colors: ['black', 'slate'], fx: {}, rich: 0, price: 20, tier: 5,
    blurb: 'Dark, fine silt like the floor of the twilight zone.',
  },
  {
    id: 'bare', name: 'Bare Bottom', water: ['fresh', 'brackish', 'marine'], grain: 'bare', colors: ['glass'], fx: {}, rich: 0, price: 0, tier: 0,
    blurb: 'No substrate at all: easiest to clean, standard for discus grow-outs, axolotl tubs and kreisels.',
  },
];
