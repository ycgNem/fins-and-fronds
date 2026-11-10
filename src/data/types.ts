// Typed content schema. Every content record lives in src/data/ and is checked by
// tests/data.test.ts (unique ids, valid cross-references, sane ranges).
import type { RampName } from './palette';

export type Range = readonly [number, number];
export type Water = 'fresh' | 'brackish' | 'marine';

// ---------------------------------------------------------------- regions

export type RegionId =
  | 'rio_negro' | 'amazon' | 'central_america' | 'mexico_karst' | 'xochimilco'
  | 'west_africa' | 'lake_malawi' | 'lake_tanganyika'
  | 'se_asia_peat' | 'se_asia_river' | 'hillstream' | 'south_asia' | 'sulawesi' | 'australia_png'
  | 'east_asia' | 'temperate_na' | 'temperate_eu'
  | 'mangrove'
  | 'indo_pacific' | 'red_sea' | 'caribbean' | 'seagrass' | 'kelp_forest' | 'rocky_shore'
  | 'open_ocean' | 'deep_sea' | 'cold_north';

export type Continent = 'South America' | 'Central America' | 'Africa' | 'Asia' | 'Oceania' | 'North America' | 'Europe' | 'Ocean';

export interface RegionDef {
  id: RegionId;
  name: string;
  continent: Continent;
  water: Water;
  /** typical natural parameters (what a biotope of this place aims for) */
  temp: Range;
  ph: Range;
  gh?: Range;
  sg?: Range;
  blurb: string;
  /** what a faithful biotope uses */
  scape: string;
  /** background / water look */
  look: WaterLook;
  expedition: { hours: number; cost: number; tier: number };
}

export type WaterLook = 'clear' | 'green' | 'blackwater' | 'amber' | 'rift' | 'brackish' | 'reef' | 'lagoon' | 'kelp' | 'cold' | 'pelagic' | 'deep' | 'pond' | 'cave';

// ---------------------------------------------------------------- creatures

export type Kind =
  | 'fish' | 'shrimp' | 'snail' | 'crab' | 'crayfish' | 'bivalve' | 'amphibian'
  | 'jelly' | 'cephalopod' | 'star' | 'urchin' | 'slug' | 'isopod';

export type Body =
  | 'torpedo' | 'slender' | 'deep' | 'disc' | 'angel' | 'cichlid' | 'eel' | 'loach' | 'cory' | 'pleco'
  | 'hatchet' | 'betta' | 'fancy' | 'koi' | 'puffer' | 'goby' | 'tang' | 'shark' | 'ray' | 'arowana'
  | 'knife' | 'seahorse' | 'pipefish' | 'lionfish' | 'flat' | 'round' | 'sculpin' | 'mudskipper'
  | 'shrimp' | 'snail' | 'crab' | 'crayfish' | 'mussel' | 'axolotl' | 'frog' | 'newt'
  | 'jelly' | 'octopus' | 'cuttle' | 'star' | 'urchin' | 'slug' | 'isopod' | 'spidercrab' | 'gardeneel';

export type Pattern =
  | 'plain' | 'stripe' | 'neon' | 'bars' | 'spots' | 'saddle' | 'split' | 'calico' | 'marble'
  | 'band' | 'tail' | 'mask' | 'dots' | 'tiger' | 'glow';

export interface Look {
  body: RampName;
  /** belly / lower half (defaults to a lighter step of body) */
  belly?: RampName;
  fin?: RampName;
  accent?: RampName;
  pattern?: Pattern;
  /** see-through body (glass catfish, ghost shrimp, jellies) */
  clear?: boolean;
  /** eyes missing (blind cave tetra) */
  blind?: boolean;
}

export type Temperament = 'peaceful' | 'semi' | 'aggressive' | 'predator';

/** where in the water column it lives (drives behavior and zone crowding) */
export type Zone = 'surface' | 'top' | 'mid' | 'bottom' | 'substrate' | 'glass' | 'rock' | 'drift' | 'land' | 'any';

export type Diet = 'flake' | 'micro' | 'pellet' | 'frozen' | 'live' | 'algae' | 'veg' | 'plankton' | 'detritus' | 'snails' | 'carnivore' | 'coral' | 'stars';

export type Tag =
  | 'schooling' | 'shoaling' | 'nocturnal' | 'glow' | 'colorful' | 'iconic' | 'algae' | 'cleaner' | 'scavenger'
  | 'burrower' | 'jumper' | 'fin_nipper' | 'long_fin' | 'reef_safe' | 'reef_risk' | 'eats_inverts' | 'eats_snails'
  | 'eats_small' | 'plant_eater' | 'venomous' | 'territorial' | 'livebearer' | 'pest' | 'pest_hunter' | 'symbiont'
  | 'big' | 'tiny' | 'oddball' | 'cave' | 'filter_feeder' | 'endangered' | 'brackish_ok' | 'cold' | 'transparent'
  | 'amphibious' | 'aiptasia_eater' | 'shell_dweller' | 'mouthbrooder' | 'sensitive' | 'neo_color' | 'escape_artist'
  | 'color_change' | 'bioluminescent' | 'touchable' | 'photosynthetic';

/** habitat needs the tank must provide */
export type Need =
  | 'caves' | 'plants' | 'sand' | 'wood' | 'leaves' | 'lid' | 'open_air' | 'land' | 'hitch' | 'host' | 'shells'
  | 'rocks' | 'mature' | 'algae' | 'current' | 'dim' | 'swim_space' | 'floating' | 'mussel' | 'deep_sand' | 'kreisel'
  | 'chill' | 'soft_water' | 'hard_water' | 'moss';

export type BreedType = 'livebearer' | 'scatter' | 'cave' | 'mouthbrooder' | 'bubblenest' | 'shell' | 'pair' | 'colony' | 'nest' | 'mussel' | 'none';

export interface SpeciesDef {
  id: string;
  name: string;
  sci: string;
  kind: Kind;
  water: Water;
  regions: RegionId[];
  temp: Range;
  ph: Range;
  /** dGH, fresh and brackish */
  gh?: Range;
  /** specific gravity, brackish and marine */
  sg?: Range;
  /** adult length in cm */
  cm: number;
  /** sprite length in pixels (see pxForCm) */
  px: number;
  body: Body;
  look: Look;
  temper: Temperament;
  zone: Zone;
  /** minimum group size it feels safe in (1 = fine alone) */
  school: number;
  /** most of this species one tank should hold (bettas: 1) */
  max?: number;
  /** minimum tank volume in liters */
  minL: number;
  /** water movement it likes: 0 still, 1 gentle, 2 moderate, 3 strong, 4 torrent */
  flow: Range;
  diet: Diet[];
  rarity: 1 | 2 | 3 | 4 | 5;
  price: number;
  /** base visitor appeal 1-10 (color, size, behavior, fame) */
  appeal: number;
  tags: Tag[];
  needs: Need[];
  breed: { type: BreedType; ease: 0 | 1 | 2 | 3 | 4 | 5 };
  fact: string;
  /** how the player first gets it */
  source: 'start' | 'supplier' | 'expedition' | 'hitchhiker';
  /** how it turns up, for the codex, when that is not the usual way for its source (a hitchhiker
   *  that is bred, not carried in) */
  found?: string;
  /** aquarium tier needed before the supplier lists it */
  tier: number;
}

// ---------------------------------------------------------------- scape items

export type ItemCat = 'rock' | 'wood' | 'plant' | 'coral' | 'botanical' | 'decor' | 'land';

export type PlantKind =
  | 'carpet' | 'foreground' | 'rosette' | 'crypt' | 'stem' | 'grass' | 'ribbon' | 'epiphyte' | 'fern' | 'moss'
  | 'floating' | 'bulb' | 'emersed' | 'ball' | 'seagrass' | 'macroalgae' | 'kelp';

export type CoralType = 'soft' | 'polyp' | 'mushroom' | 'lps' | 'sps' | 'anemone' | 'gorgonian' | 'clam' | 'filter' | 'nps' | 'coralline';

export type Shape =
  // rocks
  | 'boulder' | 'jagged' | 'holey' | 'pebbles' | 'slab' | 'strata' | 'porous' | 'spire' | 'veined' | 'banded'
  // wood
  | 'branchy' | 'twiggy' | 'chunk' | 'root' | 'tube' | 'tree' | 'arch' | 'bark' | 'gnarl'
  // plants
  | 'carpet' | 'tuft' | 'rosette' | 'crypt' | 'stem' | 'grass' | 'ribbon' | 'anubias' | 'fern' | 'moss'
  | 'floater' | 'lily' | 'leafy' | 'ball' | 'blades' | 'chaeto' | 'grape' | 'redweed' | 'kelp' | 'brush'
  // corals
  | 'branching' | 'plate' | 'dome' | 'polyps' | 'mushroom' | 'toadstool' | 'tentacles' | 'bubbles' | 'fan'
  | 'anemone' | 'clam' | 'duster' | 'mat' | 'xenia' | 'sun' | 'tree_coral' | 'rods'
  // botanicals and decor
  | 'leaves' | 'cones' | 'pods' | 'coconut' | 'shells' | 'chest' | 'ship' | 'castle' | 'columns' | 'lantern'
  | 'amphora' | 'claycave' | 'tubes' | 'clamshell' | 'bridge' | 'bank' | 'bromeliad';

export interface ItemFx {
  /** pH shift per "full load" (item area relative to a 100 L tank) */
  ph?: number;
  gh?: number;
  kh?: number;
  /** tannin release 0..1 per full load */
  tannin?: number;
  /** extra biological filtration (liters supported) */
  bio?: number;
  /** chance of hitchhiking pests on purchase */
  pests?: number;
}

export interface PlantSpec {
  kind: PlantKind;
  /** light needed: 1 low, 2 medium, 3 high */
  light: 1 | 2 | 3;
  /** CO2: 0 none, 1 helps, 2 required */
  co2: 0 | 1 | 2;
  /** growth speed 1 slow .. 5 fast */
  growth: 1 | 2 | 3 | 4 | 5;
  temp: Range;
  red?: boolean;
  /** sinks roots into the substrate (benefits from rich substrate) */
  rooted?: boolean;
  /** attach to wood or rock instead of the substrate */
  epiphyte?: boolean;
  /** grows emersed (above the waterline: riparium, paludarium, wabi-kusa) */
  emersed?: boolean;
  /** brackish tolerant */
  salt?: boolean;
}

export interface CoralSpec {
  type: CoralType;
  /** PAR range at its spot */
  par: Range;
  flow: Range;
  /** sting radius in px (0 = harmless) */
  sting: number;
  growth: 1 | 2 | 3 | 4 | 5;
  /** clownfish host */
  host?: boolean;
  /** needs feeding instead of light (sun coral, many gorgonians) */
  fed?: boolean;
  temp: Range;
  /** difficulty 1 easy .. 5 expert */
  care: 1 | 2 | 3 | 4 | 5;
  glow?: boolean;
  sway?: boolean;
}

export type Placement = 'ground' | 'attach' | 'surface' | 'rock' | 'land' | 'carpet' | 'hang' | 'glass';

export interface ItemDef {
  id: string;
  name: string;
  cat: ItemCat;
  water: Water[];
  regions?: RegionId[];
  price: number;
  tier: number;
  /** footprint in px at size 1 */
  w: number;
  h: number;
  place: Placement;
  shape: Shape;
  colors: RampName[];
  fx?: ItemFx;
  plant?: PlantSpec;
  coral?: CoralSpec;
  tags?: ItemTag[];
  blurb: string;
  source?: 'supplier' | 'expedition';
}

export type ItemTag =
  | 'stone' | 'cave' | 'hitch' | 'shells' | 'mussel' | 'leaf_litter' | 'tannin' | 'buffer' | 'floats' | 'decay'
  | 'biofilm' | 'whimsy' | 'set_galleon' | 'set_ruins' | 'set_zen' | 'set_toybox' | 'shrimp_hide' | 'bubbler'
  | 'moss_tree' | 'epiphyte_mount' | 'land' | 'coralline' | 'live';

// ---------------------------------------------------------------- substrates

export type Grain = 'bare' | 'fine_sand' | 'sand' | 'gravel' | 'pebble' | 'soil' | 'mud' | 'crushed';

export interface SubstrateDef {
  id: string;
  name: string;
  water: Water[];
  grain: Grain;
  colors: RampName[];
  fx: ItemFx;
  /** nutrient richness for rooted plants 0..3 */
  rich: number;
  price: number;
  tier: number;
  blurb: string;
}

// ---------------------------------------------------------------- shells (tank bodies)

export type ShellShape = 'rect' | 'cube' | 'bowl' | 'bowfront' | 'hex' | 'column' | 'kreisel' | 'lowboy' | 'paludarium' | 'riparium' | 'pond' | 'tower' | 'panorama' | 'pool' | 'cylinder';

export type ShellTag = 'open_top' | 'rimless' | 'drilled' | 'land' | 'tall' | 'shallow' | 'nano' | 'kreisel' | 'pond' | 'exhibit' | 'pico' | 'touch' | 'round';

export interface ShellDef {
  id: string;
  name: string;
  liters: number;
  /** nominal US gallons for the standard glass tanks sold in every fish shop */
  gal?: number;
  /** real outer size in cm (w x h), for the codex */
  cm: readonly [number, number, number];
  /** interior pixel size */
  w: number;
  h: number;
  shape: ShellShape;
  tags: ShellTag[];
  /** fraction of width that is land (paludarium, riparium shelf) */
  land?: number;
  /** water fills this fraction of the height (paludarium, riparium, wabi-kusa) */
  fill?: number;
  /** only these waters fit (kreisel: marine) */
  water?: Water[];
  price: number;
  tier: number;
  blurb: string;
}

// ---------------------------------------------------------------- equipment

export type Slot =
  | 'filter' | 'heater' | 'chiller' | 'light' | 'co2' | 'skimmer' | 'flow' | 'air' | 'uv' | 'ato' | 'doser'
  | 'feeder' | 'refugium' | 'mister' | 'ro' | 'lid' | 'moon' | 'media';

export interface EquipDef {
  id: string;
  name: string;
  slot: Slot;
  /** biological filtration: liters of bioload it supports */
  bio?: number;
  /** water turnover in liters per hour */
  lph?: number;
  /** pumps sized to the tank they serve: tank volumes per hour (up to lph) instead of a fixed lph */
  turnover?: number;
  /** heating / cooling power in watts */
  watts?: number;
  /** heaters and chillers: the biggest tank (US gallons) it holds on its own, as printed on the box */
  maxGal?: number;
  /** light intensity at 40 cm depth (PAR-like) */
  par?: number;
  /** light colour tint for the scene */
  tint?: 'warm' | 'neutral' | 'planted' | 'actinic' | 'moon';
  /** heat the light adds to the water (C) */
  heat?: number;
  /** CO2 added while lights are on (ppm) */
  co2?: number;
  /** CO2 stability 0..1 (DIY yeast is unstable and grows BBA) */
  steady?: number;
  /** aeration bonus 0..1 */
  air?: number;
  /** nitrate/phosphate export per day as a fraction */
  export?: number;
  water?: Water[];
  /** only on shells with this tag */
  needsShell?: ShellTag;
  /** gentle intake (shrimp, fry, seahorse safe) */
  gentle?: boolean;
  price: number;
  tier: number;
  blurb: string;
}

// ---------------------------------------------------------------- tank archetypes (the codex)

export type Family =
  | 'Community' | 'Planted & Aquascape' | 'Freshwater Biotope' | 'Specialist' | 'Coldwater' | 'Brackish'
  | 'Semi-aquatic' | 'Marine' | 'Reef' | 'Public Exhibit';

/** A declarative check on a tank's facts (see src/sim/archetype.ts). */
export type Rule =
  | { t: 'water'; is: Water }
  | { t: 'temp'; min?: number; max?: number }
  | { t: 'ph'; min?: number; max?: number }
  | { t: 'gh'; min?: number; max?: number }
  | { t: 'sg'; min?: number; max?: number }
  | { t: 'liters'; min?: number; max?: number }
  | { t: 'shell'; tag: ShellTag; not?: boolean }
  | { t: 'animals'; min?: number; max?: number }
  | { t: 'species'; min?: number; max?: number }
  | { t: 'kind'; kinds: Kind[]; min?: number; max?: number }
  | { t: 'has'; ids: string[]; min?: number; max?: number }
  | { t: 'tag'; tag: Tag; min?: number; max?: number }
  | { t: 'region'; ids: RegionId[]; frac: number }
  | { t: 'items'; cat?: ItemCat; tag?: ItemTag; ids?: string[]; min?: number; max?: number }
  | { t: 'plants'; kinds?: PlantKind[]; min?: number; max?: number; species?: boolean }
  | { t: 'coverage'; min?: number; max?: number }
  | { t: 'corals'; types?: CoralType[]; min?: number; max?: number }
  | { t: 'substrate'; grains?: Grain[]; ids?: string[] }
  | { t: 'equip'; slot: Slot; min?: number; max?: number }
  | { t: 'tannin'; min?: number; max?: number }
  | { t: 'par'; min?: number; max?: number }
  | { t: 'flow'; min?: number; max?: number }
  | { t: 'odd_stones' }
  | { t: 'one_rock_type' }
  | { t: 'focal_thirds' }
  | { t: 'slope' }
  | { t: 'schools'; size: number; min?: number }
  | { t: 'age'; days: number };

export interface ArchetypeRule {
  rule: Rule;
  /** must pass for the archetype to apply */
  hard?: boolean;
  /** weight for the authenticity score (default 1) */
  w?: number;
  /** what to tell the player when it fails */
  hint: string;
}

export interface ArchetypeDef {
  id: string;
  name: string;
  family: Family;
  /** higher wins ties; specific biotopes beat generic community tanks */
  priority: number;
  tier: number;
  blurb: string;
  /** the real-world practice, from RESEARCH.md */
  real: string;
  rules: ArchetypeRule[];
  /** visitor appeal multiplier when recognized */
  appeal: number;
}

// ---------------------------------------------------------------- progression

export type UpgradeTrack = 'tanks' | 'care' | 'visitors' | 'expeditions' | 'decor' | 'husbandry';

export interface UpgradeDef {
  id: string;
  track: UpgradeTrack;
  name: string;
  /** rep: a one-off grant of reputation when bought (conservation projects) */
  levels: { cost: number; tier: number; text: string; rep?: number }[];
}

export interface TierDef {
  level: number;
  name: string;
  rep: number;
  bays: number;
  /** stock-rack slots in the back room: tanks whose fish and plants are for sale */
  racks: number;
  unlocks: string;
}

export interface CorrespondentDef {
  id: string;
  name: string;
  /** who they are, in a phrase (they are never drawn; you know them by their letters) */
  role: string;
  stationery: RampName;
  signoff: string;
}

export type RequestCheck =
  | { t: 'rating'; stars: number }
  | { t: 'archetype'; id?: string; family?: Family }
  | { t: 'school'; size: number }
  | { t: 'tag'; tag: Tag; min: number }
  | { t: 'kind'; kind: Kind; min: number }
  | { t: 'species'; id: string; min: number }
  | { t: 'plant_species'; min: number }
  | { t: 'no_fish' }
  | { t: 'big_fish'; cm: number }
  | { t: 'region_tank'; continent: Continent }
  | { t: 'fry' }
  | { t: 'water'; is: Water; stars: number }
  | { t: 'corals'; min: number }
  | { t: 'symbiosis' }
  | { t: 'night' }
  | { t: 'decor_set'; tag: ItemTag }
  | { t: 'pests_clear' }
  /** asks nothing: a reply, a thank-you or a promise kept (ready as soon as it arrives) */
  | { t: 'none' }
  /** a tank with no animals at all, rated this many stars on its plants and stones */
  | { t: 'no_animals'; stars: number }
  /** this many expeditions come home */
  | { t: 'trips'; min: number }
  /** this many wild-caught animals living in the display tanks */
  | { t: 'wild'; min: number }
  /** one tank scoring this much (0-100) on one part of its rating */
  | { t: 'part'; part: 'wellbeing' | 'habitat' | 'scape' | 'authenticity' | 'spectacle'; min: number }
  /** this many tank types or species in the codex */
  | { t: 'codex'; kind: 'archetypes' | 'species'; min: number }
  /** a conservation project funded this many times (any project when no id) */
  | { t: 'project'; id?: string; min: number };

/** what a letter does for the shop when it is answered, besides its reward */
export type LetterEffect = 'name_koi' | 'guide' | 'notebook';

export interface RequestDef {
  id: string;
  from: string;
  title: string;
  text: string;
  check: RequestCheck;
  /** unlock: an upgrade, item, shell or species it brings; spare: animals sent to holding instead
   *  when the shop already has the unlock (so the promised surprise always comes) */
  reward: { coins: number; rep: number; unlock?: string; spare?: { sp: string; n: number } };
  tier: number;
  /** sent before any other letter of its tier (Ida's opening letters) */
  first?: boolean;
  /** only sent once it makes sense: 'pests' waits until pest snails have turned up (in a tank or
   *  caught in the dip); 'finale' waits for the Grand Oceanarium's opening night */
  when?: 'pests' | 'finale';
  /** a reply in a correspondent's story: sent only after this letter was answered (a day later) */
  after?: string;
  /** the line that opens the letter when the shop already does what it asks */
  met?: string;
  /** Pip's thank-you when the plant dip caught the pest snails before any got into a tank */
  metDip?: string;
  /** answering it ends the correspondent's story with a keepsake for the shop's shelf */
  keepsake?: string;
  effect?: LetterEffect;
}

/** A conservation or breeding project the aquarium can fund again and again (a coin sink that
 *  turns coins into reputation, a postcard and something you can see). */
export interface ProjectDef {
  id: string;
  name: string;
  /** who runs it (a correspondent id), for the stationery and the thank-you line */
  from: string;
  tier: number;
  /** coins and reputation for the first funding; later ones cost more (BAL.projectCostGrowth) */
  cost: number;
  rep: number;
  /** the region whose postcard picture goes on its card */
  region: RegionId;
  blurb: string;
  /** one line per funding, in order (the last repeats) */
  lines: string[];
  /** what the shop gets: more visitors per funding, or a species the supplier can now order */
  effect: { visitors?: number; unlock?: string };
}

/** A day of the week with something on (src/sim/week.ts). */
export interface WeekEventDef {
  /** what changes: wellbeing talked about (bench), spectacle draws (school), crowds and shoppers
   *  (market), scapes talked about and a rosette (judging) */
  id: 'bench' | 'school' | 'market' | 'judging';
  /** 0 Monday .. 6 Sunday */
  day: number;
  name: string;
  /** a correspondent it belongs to */
  from: string;
  /** the toast when the shop opens */
  text: string;
}

export interface SymbiosisDef {
  id: string;
  a: string;
  /** species id, or 'item:<coral id>' for a host coral/anemone */
  b: string;
  name: string;
  text: string;
}
