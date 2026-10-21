// A new game: one front-window tank already running (a mature community tank that came with
// the building), a little money, and a few pest snails that rode in on the Java fern, waiting
// for the player's first assassin snails.
import { shell } from '../data';
import type { Water } from '../data/types';
import { BAL } from './balance';
import { newAnimal } from './life';
import { type GameState, type Placed, SAVE_VERSION, type Tank, type WaterSource } from './state';
import { defaultSalt, defaultSource, freshChem } from './water';

export function emptyTank(s: GameState, bay: number, shellId: string, water: Water, source?: WaterSource): Tank {
  const sh = shell(shellId);
  const src = source ?? defaultSource(water);
  const seeded = s.upgrades['seeded_media'] ?? 0;
  const substrate = water === 'marine' ? (s.tier >= 3 ? 'live_sand' : 'bare') : water === 'brackish' ? 'fine_sand' : 'fine_sand';
  return {
    id: s.nextUid++,
    name: `Tank ${s.tanks.length + 1}`,
    bay,
    shell: shellId,
    water,
    substrate: sh.tags.includes('kreisel') ? 'bare' : substrate,
    profile: [0.45, 0.5, 0.55, 0.5, 0.45, 0.4, 0.45, 0.5, 0.45],
    slope: 0.3,
    items: [],
    animals: [],
    equip: [],
    chem: freshChem(src, defaultSalt(water), seeded >= 2 ? 1 : seeded === 1 ? 0.5 : 0.01),
    set: { heater: 25, source: src, salt: defaultSalt(water), lightOn: 9, lightOff: 19, co2: false },
    pests: { snails: 0, aiptasia: 0, bubble: 0, had: false },
    ageDays: 0,
    fedAt: s.time,
    smudge: 0,
    bags: [],
    today: 0,
  };
}

export function place(s: GameState, t: Tank, id: string, x: number, layer: 0 | 1 | 2, opt: Partial<Placed> = {}): Placed {
  const p: Placed = { uid: s.nextUid++, id, x, layer, y: 0, size: 1, health: 0.9, flip: false, seed: (s.nextUid * 2654435761) >>> 0, ...opt };
  t.items.push(p);
  return p;
}

export function newGame(seed = Date.now() >>> 0): GameState {
  const s: GameState = {
    version: SAVE_VERSION,
    seed,
    time: 8 * 60 + 50,
    coins: BAL.startCoins,
    rep: 0,
    tier: 0,
    nextUid: 1,
    tanks: [],
    holding: [],
    inventory: {},
    unlocked: { species: [], items: [] },
    upgrades: {},
    codex: { archetypes: [], species: [], symbioses: [] },
    letters: [],
    lettersDone: [],
    expeditions: [],
    guestbook: [],
    stats: { visitors: 0, coins: 0, fry: 0, expeditions: 0 },
    settings: { gentle: true, volume: 0.6, speed: 1 },
    savedAt: Date.now(),
  };
  // The previous owner's tank, a little neglected: green glass, nose prints, pest snails, a
  // lopsided scape and schools that are too small. Fixing it teaches every system in the game.
  const t = emptyTank(s, 0, 'rimless_60', 'fresh');
  t.name = 'The Front Window';
  t.equip = ['hob_filter', 'heater_150', 'led_basic'];
  t.chem.bacA = 1;
  t.chem.bacB = 1;
  t.chem.temp = 25;
  t.chem.ph = 7.1;
  t.chem.no3 = 24;
  t.chem.glass = 0.35;
  t.chem.algae = 0.12;
  t.smudge = 0.4;
  t.ageDays = 40;
  t.slope = 0.15;
  t.profile = [0.4, 0.45, 0.5, 0.5, 0.45, 0.4, 0.4, 0.4, 0.35];
  const wood = place(s, t, 'malaysian_driftwood', 122, 1);
  place(s, t, 'java_fern', 116, 1, { on: wood.uid, y: 14 });
  place(s, t, 'vallisneria', 30, 0, { size: 0.9 });
  place(s, t, 'vallisneria', 44, 0);
  place(s, t, 'crypt_wendtii', 190, 2, { size: 0.8 });
  place(s, t, 'amazon_frogbit', 60, 1);
  for (let i = 0; i < 10; i++) t.animals.push(newAnimal(s, 'neon_tetra'));
  for (let i = 0; i < 4; i++) t.animals.push(newAnimal(s, 'bronze_cory'));
  for (let i = 0; i < 5; i++) t.animals.push(newAnimal(s, 'harlequin_rasbora'));
  for (let i = 0; i < 2; i++) t.animals.push(newAnimal(s, 'zebra_nerite'));
  t.pests = { snails: 6, aiptasia: 0, bubble: 0, had: true };
  s.tanks.push(t);
  return s;
}
