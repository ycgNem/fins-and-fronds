// Native habitats. A tank whose livestock all come from one region can become a biotope
// archetype; expeditions to a region bring back its species, plants and stones.
// Parameter ranges are the natural ranges biotope keepers aim for (RESEARCH.md, "Biotopes").
import type { RegionDef } from './types';

export const REGIONS: RegionDef[] = [
  // ---------------------------------------------------------------- South & Central America
  {
    id: 'rio_negro', name: 'Rio Negro Blackwater', continent: 'South America', water: 'fresh',
    temp: [26, 30], ph: [4.5, 6.5], gh: [0, 4], look: 'blackwater',
    blurb: 'Tea-dark, very soft, acidic water stained by tannins from the flooded forest (igapó). Few plants grow; life hides in roots and leaf litter.',
    scape: 'Fine pale sand, a deep bed of leaf litter, tangled roots and branches reaching down from the surface, dim light, almost no plants.',
    expedition: { hours: 10, cost: 220, tier: 1 },
  },
  {
    id: 'amazon', name: 'Amazon Clearwater & Floodplain', continent: 'South America', water: 'fresh',
    temp: [24, 29], ph: [6.0, 7.5], gh: [2, 10], look: 'clear',
    blurb: 'Sunlit tributaries and floodplain lakes with Amazon swords at the margins, schools of tetras and dwarf cichlids on the sand.',
    scape: 'Sand, smooth driftwood, Echinodorus swords and floating plants, open swimming water.',
    expedition: { hours: 8, cost: 160, tier: 0 },
  },
  {
    id: 'central_america', name: 'Central American Rivers', continent: 'Central America', water: 'fresh',
    temp: [24, 29], ph: [7.0, 8.2], gh: [8, 20], look: 'clear',
    blurb: 'Hard, alkaline rivers over limestone from Mexico to Costa Rica and the Caribbean islands: home of livebearers and the boldest cichlids.',
    scape: 'Limestone rubble and holey rock, sand and gravel, sparse hardy plants, caves for spawning pairs.',
    expedition: { hours: 8, cost: 160, tier: 0 },
  },
  {
    id: 'mexico_karst', name: 'Mexican Karst Caves', continent: 'Central America', water: 'fresh',
    temp: [20, 25], ph: [7.0, 8.0], gh: [10, 20], look: 'cave',
    blurb: 'Lightless cenotes and cave pools in the Sierra de El Abra where tetras lost their eyes and found their way by feel.',
    scape: 'Pale limestone, holey rock, no plants, very dim blue light.',
    expedition: { hours: 12, cost: 300, tier: 2 },
  },
  {
    id: 'xochimilco', name: 'Xochimilco Canals', continent: 'Central America', water: 'fresh',
    temp: [14, 20], ph: [7.0, 8.0], gh: [7, 14], look: 'pond',
    blurb: 'The last wild canals of the axolotl in Mexico City: cool, still, muddy water among floating gardens (chinampas).',
    scape: 'Fine sand or bare bottom, smooth stones, cool still water, hardy plants, hides.',
    expedition: { hours: 10, cost: 260, tier: 2 },
  },
  // ---------------------------------------------------------------- Africa
  {
    id: 'west_africa', name: 'West African Rainforest Streams', continent: 'Africa', water: 'fresh',
    temp: [24, 28], ph: [6.0, 7.5], gh: [2, 10], look: 'amber',
    blurb: 'Shaded forest creeks of Nigeria, Cameroon and the Congo basin, lightly stained, with Anubias and Bolbitis on the rocks.',
    scape: 'Sand, roots, Anubias and Bolbitis tied to wood, leaf litter, caves for kribs.',
    expedition: { hours: 10, cost: 220, tier: 1 },
  },
  {
    id: 'lake_malawi', name: 'Lake Malawi Rock Shore', continent: 'Africa', water: 'fresh',
    temp: [24, 28], ph: [7.8, 8.6], gh: [10, 20], look: 'rift',
    blurb: 'A Rift lake as clear as a reef, with rock piles crowded by colorful, quarrelsome mbuna. The water chemistry is remarkably uniform.',
    scape: 'Piled rounded rock with many caves and sight-breaks, sand, few or no plants (Vallisneria at most).',
    expedition: { hours: 12, cost: 280, tier: 1 },
  },
  {
    id: 'lake_tanganyika', name: 'Lake Tanganyika', continent: 'Africa', water: 'fresh',
    temp: [24, 28], ph: [7.8, 9.0], gh: [12, 20], look: 'rift',
    blurb: 'The second-deepest lake on Earth: very hard, very alkaline water, shell beds of Neothauma snails and endless rocky slopes.',
    scape: 'Sand with beds of empty snail shells, rock stacks, open water above.',
    expedition: { hours: 12, cost: 280, tier: 1 },
  },
  // ---------------------------------------------------------------- Asia
  {
    id: 'se_asia_peat', name: 'Southeast Asian Peat Swamp', continent: 'Asia', water: 'fresh',
    temp: [24, 29], ph: [4.0, 6.5], gh: [0, 4], look: 'blackwater',
    blurb: 'Borneo and Sumatra peat forest: amber, extremely soft, acidic water where only Cryptocorynes thrive.',
    scape: 'Dark sand, peat, catappa leaves and seed pods, submerged branches, Cryptocoryne clusters, dim light.',
    expedition: { hours: 12, cost: 260, tier: 1 },
  },
  {
    id: 'se_asia_river', name: 'Southeast Asian Rivers & Rice Fields', continent: 'Asia', water: 'fresh',
    temp: [23, 29], ph: [6.0, 7.5], gh: [3, 12], look: 'green',
    blurb: 'Thai floodplains, Mekong tributaries and paddies: bettas in still margins, barbs and loaches in the current.',
    scape: 'Sand and fine gravel, driftwood, Java fern, Cryptocoryne and floating plants.',
    expedition: { hours: 8, cost: 180, tier: 0 },
  },
  {
    id: 'hillstream', name: 'Asian Hillstreams', continent: 'Asia', water: 'fresh',
    temp: [18, 24], ph: [6.5, 7.5], gh: [4, 12], look: 'clear',
    blurb: 'Cool, fast, oxygen-rich mountain streams of southern China and Vietnam. Loaches cling flat to sunlit boulders.',
    scape: 'Smooth river pebbles and boulders, strong one-way flow, biofilm-covered rock, very few plants.',
    expedition: { hours: 10, cost: 220, tier: 1 },
  },
  {
    id: 'south_asia', name: 'South Asian Streams', continent: 'Asia', water: 'fresh',
    temp: [22, 27], ph: [6.5, 7.5], gh: [4, 14], look: 'clear',
    blurb: 'Streams and ponds of India, Sri Lanka and Myanmar: danios, barbs, gouramis and Cryptocoryne wendtii.',
    scape: 'Gravel and pebbles, roots, Aponogeton and Cryptocoryne, gentle to moderate flow.',
    expedition: { hours: 8, cost: 180, tier: 0 },
  },
  {
    id: 'sulawesi', name: 'Sulawesi Malili Lakes', continent: 'Asia', water: 'fresh',
    temp: [26, 30], ph: [7.5, 8.5], gh: [4, 8], look: 'clear',
    blurb: 'Ancient lakes Matano and Towuti: warm, soft but alkaline, iron-rich water with endemic shrimp, rabbit snails and sailfin silversides.',
    scape: 'Pale volcanic rock, sand, no plants to speak of, warm and very clean.',
    expedition: { hours: 14, cost: 360, tier: 2 },
  },
  {
    id: 'australia_png', name: 'Australia & New Guinea', continent: 'Oceania', water: 'fresh',
    temp: [22, 28], ph: [7.0, 8.2], gh: [6, 14], look: 'clear',
    blurb: 'Clear rainforest streams and limestone lakes like Lake Kutubu (pH 7.6-8.1): rainbowfish and blue-eyes in bright, open water.',
    scape: 'Sand, roots, open midwater, grasses and Vallisneria along the back.',
    expedition: { hours: 12, cost: 260, tier: 1 },
  },
  {
    id: 'east_asia', name: 'East Asian Ponds & Paddies', continent: 'Asia', water: 'fresh',
    temp: [10, 26], ph: [6.5, 8.0], gh: [5, 15], look: 'pond',
    blurb: 'Rice paddies, garden ponds and slow rivers of Japan and China: home of medaka, goldfish, koi and weather loaches.',
    scape: 'Fine gravel or sand, floating plants, lilies, smooth stones, unheated water.',
    expedition: { hours: 8, cost: 160, tier: 0 },
  },
  // ---------------------------------------------------------------- temperate
  {
    id: 'temperate_na', name: 'North American Creeks', continent: 'North America', water: 'fresh',
    temp: [10, 24], ph: [6.5, 8.0], gh: [5, 15], look: 'clear',
    blurb: 'Riffles and pools of eastern North America, where darters and sunfish wear colors to rival any reef fish.',
    scape: 'Cobbles and gravel, oak leaves, fast riffle flow at one end, unheated water.',
    expedition: { hours: 8, cost: 180, tier: 1 },
  },
  {
    id: 'temperate_eu', name: 'European Ponds & Streams', continent: 'Europe', water: 'fresh',
    temp: [8, 22], ph: [7.0, 8.0], gh: [8, 18], look: 'green',
    blurb: 'Cool, weedy ponds and slow streams: sticklebacks building nests, bitterlings laying eggs inside freshwater mussels.',
    scape: 'Sand and gravel, hornwort and Elodea, freshwater mussels, unheated water.',
    expedition: { hours: 8, cost: 180, tier: 1 },
  },
  // ---------------------------------------------------------------- brackish
  {
    id: 'mangrove', name: 'Mangroves & Estuaries', continent: 'Ocean', water: 'brackish',
    temp: [24, 30], ph: [7.5, 8.5], gh: [8, 20], sg: [1.003, 1.015], look: 'brackish',
    blurb: 'Where rivers meet the sea: arching mangrove roots, mudflats at low tide, archerfish spitting at insects and mudskippers out on the mud.',
    scape: 'Mud and sand, mangrove roots, a land shelf above the waterline, marine salt (not aquarium salt) at mid-brackish strength.',
    expedition: { hours: 10, cost: 260, tier: 2 },
  },
  // ---------------------------------------------------------------- marine
  {
    id: 'indo_pacific', name: 'Indo-Pacific Coral Reefs', continent: 'Ocean', water: 'marine',
    temp: [24, 28], ph: [8.0, 8.4], sg: [1.023, 1.026], look: 'reef',
    blurb: 'The Coral Triangle and beyond: the richest reefs on Earth, from clownfish in their anemones to tangs over the reef crest.',
    scape: 'Live or cured reef rock, aragonite sand, corals at every height, strong turbulent flow, bright blue-white light.',
    expedition: { hours: 14, cost: 420, tier: 3 },
  },
  {
    id: 'red_sea', name: 'Red Sea Reefs', continent: 'Ocean', water: 'marine',
    temp: [24, 28], ph: [8.1, 8.4], sg: [1.025, 1.027], look: 'reef',
    blurb: 'Warm, salty and crystal clear, with endemic tangs, dottybacks and some of the hardiest corals in the world.',
    scape: 'Reef rock, white sand, SPS and soft corals, very bright light.',
    expedition: { hours: 16, cost: 480, tier: 3 },
  },
  {
    id: 'caribbean', name: 'Caribbean Reefs', continent: 'Ocean', water: 'marine',
    temp: [24, 28], ph: [8.0, 8.4], sg: [1.023, 1.026], look: 'reef',
    blurb: 'Gorgonian forests of sea fans and sea rods, royal grammas under ledges and jawfish hovering over their burrows.',
    scape: 'Reef rock, sand, gorgonians, ricordea and rock flower anemones.',
    expedition: { hours: 14, cost: 420, tier: 3 },
  },
  {
    id: 'seagrass', name: 'Tropical Lagoons & Seagrass', continent: 'Ocean', water: 'marine',
    temp: [24, 29], ph: [8.0, 8.4], sg: [1.022, 1.026], look: 'lagoon',
    blurb: 'Shallow sunlit meadows of turtle grass: nurseries for seahorses, pipefish, upside-down jellies and conchs.',
    scape: 'Deep sand, seagrass beds, calcareous algae, a few rocks, gentle flow.',
    expedition: { hours: 12, cost: 360, tier: 3 },
  },
  {
    id: 'kelp_forest', name: 'Temperate Kelp Forest', continent: 'Ocean', water: 'marine',
    temp: [10, 20], ph: [7.9, 8.3], sg: [1.024, 1.026], look: 'kelp',
    blurb: 'Cold Californian water and towering giant kelp, gold Garibaldi guarding their patches and sheephead keeping urchins in check.',
    scape: 'Granite boulders, sand channels, giant kelp reaching the surface, surge-like flow, a chiller.',
    expedition: { hours: 14, cost: 480, tier: 4 },
  },
  {
    id: 'rocky_shore', name: 'Rocky Shores & Tide Pools', continent: 'Ocean', water: 'marine',
    temp: [10, 18], ph: [7.9, 8.3], sg: [1.024, 1.026], look: 'cold',
    blurb: 'Cold intertidal pools of anemones, sea stars, hermit crabs and sculpins: the classic touch pool.',
    scape: 'Barnacled rock, cobbles, shallow cold water, wave surge.',
    expedition: { hours: 10, cost: 320, tier: 3 },
  },
  {
    id: 'open_ocean', name: 'Open Ocean', continent: 'Ocean', water: 'marine',
    temp: [14, 24], ph: [8.0, 8.3], sg: [1.024, 1.026], look: 'pelagic',
    blurb: 'Blue water with nothing to hide behind: drifting jellies, glittering sardine schools and the big cruisers that hunt them.',
    scape: 'Nothing at all. A round or circulating tank so drifters never meet a corner.',
    expedition: { hours: 18, cost: 600, tier: 4 },
  },
  {
    id: 'deep_sea', name: 'Deep Sea', continent: 'Ocean', water: 'marine',
    temp: [4, 12], ph: [7.6, 8.1], sg: [1.025, 1.027], look: 'deep',
    blurb: 'The twilight and midnight zones. Few deep animals survive at the surface, but a cold, dark chamber can keep giant isopods, spider crabs and pinecone fish.',
    scape: 'Dark silt, sparse rock, very cold water, almost no light.',
    expedition: { hours: 24, cost: 900, tier: 5 },
  },
  {
    id: 'cold_north', name: 'Cold Northern Seas', continent: 'Ocean', water: 'marine',
    temp: [4, 12], ph: [7.9, 8.2], sg: [1.024, 1.026], look: 'cold',
    blurb: 'Subarctic North Pacific and Atlantic: wolf eels in their dens, round lumpsuckers, king crabs and plumose anemones.',
    scape: 'Granite boulders, plumose anemones, cobbles, a powerful chiller.',
    expedition: { hours: 18, cost: 640, tier: 4 },
  },
];
