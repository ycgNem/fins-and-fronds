// The whole saveable game state. Everything here is plain JSON; derived numbers (ratings, moods,
// archetypes) live in TankStats, are recomputed after loading and are not saved.
import type { Water } from '../data/types';

export const SAVE_VERSION = 2;

export type WaterSource = 'tap' | 'soft' | 'blackwater' | 'hard' | 'brackish' | 'marine';

/** A scape item placed in a tank. x is the item's center in tank pixels; y is height above the substrate. */
export interface Placed {
  uid: number;
  id: string;
  x: number;
  /** 0 back, 1 middle, 2 front */
  layer: 0 | 1 | 2;
  /** height of the item's base above the substrate (stacked stones, epiphytes, corals on rock) */
  y: number;
  /** uid of the rock or wood an epiphyte or coral sits on */
  on?: number;
  /** growth scale: plants and corals grow, trimming and fragging cut back */
  size: number;
  health: number;
  flip: boolean;
  seed: number;
}

export interface Animal {
  uid: number;
  sp: string;
  /** age in game days */
  age: number;
  health: number;
  mood: number;
  /** born in this aquarium and not yet grown */
  fry: boolean;
  bornHere: boolean;
  /** caught on an expedition: collectors pay a premium */
  wild?: boolean;
  /** Neocaridina color grade 0 (pale) .. 3 (solid) */
  grade: number;
  name?: string;
}

export interface Chem {
  temp: number;
  ph: number;
  gh: number;
  kh: number;
  sg: number;
  nh3: number;
  no2: number;
  no3: number;
  o2: number;
  co2: number;
  tannin: number;
  /** milky bacterial bloom 0..1 */
  cloud: number;
  /** algae on rock and plants 0..1 */
  algae: number;
  /** algae film on the front glass 0..1 */
  glass: number;
  /** nitrifying bacteria colonization, ammonia-eaters and nitrite-eaters 0..1 */
  bacA: number;
  bacB: number;
}

export interface TankSettings {
  heater: number;
  source: WaterSource;
  /** target specific gravity for brackish and marine tanks */
  salt: number;
  lightOn: number;
  lightOff: number;
  co2: boolean;
}

export interface Pests {
  snails: number;
  aiptasia: number;
  bubble: number;
  /** pests were ever seen here (a cleared tank counts for Pip's letter) */
  had: boolean;
}

export interface Tank {
  id: number;
  name: string;
  bay: number;
  shell: string;
  water: Water;
  substrate: string;
  /** substrate height across the tank, 0..1 of the max depth */
  profile: number[];
  /** how much higher the substrate sits at the back than the front, 0..1 (the classic aquascape slope) */
  slope: number;
  items: Placed[];
  animals: Animal[];
  equip: string[];
  chem: Chem;
  set: TankSettings;
  pests: Pests;
  ageDays: number;
  /** game minute of the last feeding */
  fedAt: number;
  /** fingerprints and nose prints from visitors 0..1 */
  smudge: number;
  /** fish in bags floating at the surface, released when acclimated */
  bags: { sp: string; n: number; until: number; animals?: Animal[] }[];
  /** coins earned today (for the plaque) */
  today: number;
  /** stock tanks keep this many of each species back as breeders; the rest are for sale */
  keep?: number;
}

export interface Expedition {
  id: number;
  region: string;
  start: number;
  end: number;
  /** filled in when it returns */
  finds?: { kind: 'species' | 'item'; id: string; n: number }[];
  postcard?: string;
}

export interface GuestEntry {
  time: number;
  text: string;
  who: string;
  tank?: number;
}

export interface Letter {
  id: string;
  arrived: number;
  ready: boolean;
  read: boolean;
}

export interface GameState {
  version: number;
  seed: number;
  /** game minutes since the start (day = 1440) */
  time: number;
  coins: number;
  rep: number;
  tier: number;
  nextUid: number;
  tanks: Tank[];
  holding: Animal[];
  /** loose items: cuttings, frags, expedition stones */
  inventory: Record<string, number>;
  unlocked: { species: string[]; items: string[] };
  upgrades: Record<string, number>;
  codex: { archetypes: string[]; species: string[]; symbioses: string[] };
  letters: Letter[];
  lettersDone: string[];
  /** letters put back unanswered, which wait until `until` before they can come again */
  lettersResting?: { id: string; until: number }[];
  expeditions: Expedition[];
  guestbook: GuestEntry[];
  stats: { visitors: number; coins: number; fry: number; expeditions: number; sold?: number; salesToday?: number; upkeep?: number };
  settings: { gentle: boolean; volume: number; speed: number; textSize?: number; calmColors?: boolean; sellCuttings?: boolean };
  /** Ida's guided first tank: the step the player is on, or done (src/ui/tutorial.ts) */
  tutorial: { step: number; done: boolean };
  /** cutscenes already shown, so each plays once (src/ui/cutscene.ts) */
  seen: string[];
  /** real-world ms timestamp of the last save, for offline income */
  savedAt: number;
}

export const MINUTES_PER_DAY = 1440;

export function dayOf(time: number): number {
  return Math.floor(time / MINUTES_PER_DAY) + 1;
}

export function hourOf(time: number): number {
  return (time % MINUTES_PER_DAY) / 60;
}

export function clockText(time: number): string {
  const h = Math.floor(hourOf(time));
  const m = Math.floor(time % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}
