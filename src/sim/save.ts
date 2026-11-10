// Saving: one autosave slot in localStorage plus JSON export/import. Each format change bumps
// SAVE_VERSION and adds a migration here, oldest first. A save that will not load is never erased:
// it stays in its slot and a copy goes to BACKUP_KEY, so a later fix can still read it.
import { archetype, correspondent, hasEquip, hasItem, hasRegion, hasShell, hasSpecies, hasUpgrade, request, shell, substrate, SYMBIOSES, TIERS, upgrade } from '../data';
import { PROJECTS } from '../data/progression';
import type { Water } from '../data/types';
import { newAnimal } from './life';
import { emptyTank, newGame } from './newgame';
import { type Animal, type GameState, SAVE_VERSION } from './state';
import { defaultSource, SOURCES, tanninLook } from './water';

export const SAVE_KEY = 'fins-and-fronds/save';
/** where a save that failed to load is copied before anything else can touch it */
export const BACKUP_KEY = 'fins-and-fronds/save.bad';

type Migration = (s: any) => void;
const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2: the fish-shop story. Old saves already have a running aquarium, so they skip the
  // intro and the guided first tank.
  1: (s) => {
    s.tutorial = { step: 0, done: true };
    s.seen = ['intro'];
  },
  // 2 -> 3: 0.3, the shop's week and the correspondents' stories
  2: (s) => {
    // the Conservation Fund's four levels became projects: each level paid for is that project
    // funded once (its reputation was paid out then, so none is added now)
    const fund = typeof s.upgrades?.conservation === 'number' ? s.upgrades.conservation : 0;
    const was = ['river', 'reef', 'seahorse', 'reserve'];
    if (fund > 0) {
      s.projects = isObj(s.projects) ? s.projects : {};
      for (const id of was.slice(0, fund)) s.projects[id] = Math.max(1, finite(s.projects[id]) ? s.projects[id] : 0);
    }
    if (isObj(s.upgrades)) delete s.upgrades.conservation;
    // letters answered before they were kept go under Kept to reread, with nothing noted: a reply
    // to one names what meets its ask today (letters.ts). Old replies stay out, as the names they
    // were read with are gone. `at` 0 means answered before the update, not on day 1 (keptAt).
    if (Array.isArray(s.lettersDone)) {
      s.lettersKept = isObj(s.lettersKept) ? s.lettersKept : {};
      for (const id of s.lettersDone) if (hasRequest(id) && !request(id).after && !s.lettersKept[id]) s.lettersKept[id] = { at: 0, vars: {} };
    }
    for (const t of Array.isArray(s.tanks) ? s.tanks : []) {
      if (!isObj(t)) continue;
      // wood starts soaking the day the save is loaded (the old wood never faded), so a stained
      // tank fades over the next weeks instead of at once
      const age = finite(t.ageDays) ? t.ageDays : 0;
      for (const p of Array.isArray(t.items) ? t.items : []) if (isObj(p) && !finite(p.since)) p.since = age;
      // a tank already tea-colored was so before: no notice for it now
      if (isObj(t.chem) && finite(t.chem.tannin) && tanninLook(t.chem.tannin) !== 'clear') t.toldTannin = true;
      // pests in a fresh or brackish tank were always snails (Aiptasia and bubble algae are marine),
      // so a tank cleared before the update still counts for Pip
      if (isObj(t.pests) && t.pests.had === true && t.water !== 'marine' && t.pests.hadSnails === undefined) t.pests.hadSnails = true;
    }
  },
};

export function serialize(s: GameState): string {
  s.savedAt = Date.now();
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState {
  const s = JSON.parse(json);
  if (typeof s !== 'object' || !s || !Array.isArray(s.tanks)) throw new Error('not a Fins & Fronds save');
  for (let v = typeof s.version === 'number' ? s.version : 1; v < SAVE_VERSION; v++) MIGRATIONS[v]?.(s);
  s.version = SAVE_VERSION;
  sanitize(s);
  return s as GameState;
}

// ---------------------------------------------------------------- sanitizing

type Obj = Record<string, any>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const WATERS: Water[] = ['fresh', 'brackish', 'marine'];

/** content lookups that throw on an unknown id, as a yes/no */
const knows = (get: (id: string) => unknown) => (id: unknown): boolean => {
  if (typeof id !== 'string') return false;
  try {
    get(id);
    return true;
  } catch {
    return false;
  }
};
const hasRequest = knows(request), hasSubstrate = knows(substrate), hasArchetype = knows(archetype), hasCorrespondent = knows(correspondent);

/** Fill in whatever is missing or of the wrong type from the defaults, recursing into objects. */
function fill<T>(o: unknown, def: T): T {
  if (!isObj(o)) return structuredClone(def);
  for (const [k, d] of Object.entries(def as Obj)) {
    const v = o[k];
    if (isObj(d)) o[k] = fill(v, d);
    else if (Array.isArray(d)) {
      if (!Array.isArray(v)) o[k] = structuredClone(d);
    } else if (typeof d === 'number') {
      if (!finite(v)) o[k] = d;
    } else if (typeof v !== typeof d) o[k] = d;
  }
  return o as T;
}

/** an optional field keeps its value only if it has the right type */
function optional(o: Obj, k: string, type: 'number' | 'string' | 'boolean') {
  if (!(k in o)) return;
  if (type === 'number' ? !finite(o[k]) : typeof o[k] !== type) delete o[k];
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
/** the same, each once */
const uniq = (v: unknown): string[] => [...new Set(strings(v))];

/** a record of finite numbers (at least `min`) with known keys */
function numbers(v: unknown, ok: (k: string) => boolean = () => true, min = -Infinity): Record<string, number> {
  const out: Record<string, number> = {};
  if (isObj(v)) for (const [k, n] of Object.entries(v)) if (ok(k) && finite(n) && n >= min) out[k] = n;
  return out;
}

/** a record of strings (a letter's names and numbers) */
function words(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (isObj(v)) for (const [k, x] of Object.entries(v)) if (typeof x === 'string') out[k] = x;
  return out;
}

function animals(v: unknown, blank: GameState): Animal[] {
  if (!Array.isArray(v)) return [];
  return v.filter((a) => isObj(a) && hasSpecies(a.sp)).map((a: Obj) => {
    const out = fill(a, { ...newAnimal(blank, a.sp), uid: -1 });
    optional(out, 'name', 'string');
    optional(out, 'wild', 'boolean');
    return out;
  });
}

/**
 * Make an old, partial or hand-edited save safe to play: drop what the content no longer knows
 * (or move it to holding, for animals), fill in missing fields and repair broken numbers, so a
 * save that loads never crashes later.
 */
function sanitize(s: Obj) {
  const blank = newGame(finite(s.seed) ? s.seed : 1);
  // an existing shop has finished Ida's tour unless it says otherwise
  fill(s, { ...blank, tutorial: { step: 0, done: true }, seen: ['intro'], savedAt: 0 });
  s.tier = Math.max(0, Math.min(TIERS.length - 1, Math.floor(s.tier)));
  const holding = animals(s.holding, blank);

  const tanks: Obj[] = [];
  for (const t of s.tanks as unknown[]) {
    if (!isObj(t)) continue;
    if (!hasShell(t.shell)) {
      // the tank itself is gone from the catalog; its animals wait in holding
      holding.push(...animals(t.animals, blank));
      if (Array.isArray(t.bags)) for (const b of t.bags) if (isObj(b)) holding.push(...animals(b.animals, blank));
      continue;
    }
    const sh = shell(t.shell);
    const water: Water = WATERS.includes(t.water) ? t.water : (sh.water?.[0] ?? 'fresh');
    t.water = water;
    const def = emptyTank(blank, 0, t.shell, water);
    fill(t, { ...def, id: -1 });
    if (!hasSubstrate(t.substrate)) t.substrate = def.substrate;
    const src = SOURCES[t.set.source as keyof typeof SOURCES];
    if (!src || src.water !== water) t.set.source = defaultSource(water);
    if (!t.profile.length || !t.profile.every(finite)) t.profile = def.profile;
    t.slope = Math.max(0, Math.min(1, t.slope));
    optional(t, 'keep', 'number');
    optional(t, 'toldTannin', 'boolean');
    optional(t.pests, 'hadSnails', 'boolean');
    t.equip = strings(t.equip).filter(hasEquip);
    t.animals = animals(t.animals, blank);
    t.bags = (t.bags as unknown[]).filter((b): b is Obj => isObj(b) && hasSpecies(b.sp)).map((b) => {
      fill(b, { sp: b.sp, n: 0, until: 0 });
      if ('animals' in b) {
        b.animals = animals(b.animals, blank);
        b.n = b.animals.length;
      }
      b.n = Math.max(0, Math.floor(b.n));
      return b;
    }).filter((b) => b.n > 0);
    t.items = (t.items as unknown[]).filter((p): p is Obj => isObj(p) && hasItem(p.id)).map((p) => {
      fill(p, { uid: -1, id: p.id, x: Math.round(sh.w / 2), layer: 1, y: 0, size: 1, health: 0.9, flip: false, seed: 1 });
      if (p.layer !== 0 && p.layer !== 1 && p.layer !== 2) p.layer = 1;
      optional(p, 'rot', 'number');
      optional(p, 'on', 'number');
      optional(p, 'since', 'number');
      return p;
    });
    // an epiphyte or coral whose rock is gone settles on the sand
    for (const p of t.items) if ('on' in p && !t.items.some((q: Obj) => q !== p && q.uid === p.on)) {
      delete p.on;
      p.y = 0;
    }
    tanks.push(t);
  }
  s.tanks = tanks;
  s.holding = holding;

  const inv: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.inventory as Obj)) if (hasItem(id) && finite(n) && n >= 1) inv[id] = Math.floor(n);
  s.inventory = inv;
  s.unlocked.species = strings(s.unlocked.species).filter(hasSpecies);
  s.unlocked.items = strings(s.unlocked.items).filter(hasItem);
  for (const [k, v] of Object.entries(s.upgrades as Obj)) {
    if (!hasUpgrade(k) || !finite(v)) delete s.upgrades[k];
    else s.upgrades[k] = Math.max(0, Math.min(upgrade(k).levels.length, Math.floor(v)));
  }
  s.codex.archetypes = strings(s.codex.archetypes).filter(hasArchetype);
  s.codex.species = strings(s.codex.species).filter(hasSpecies);
  s.codex.symbioses = strings(s.codex.symbioses).filter((id) => SYMBIOSES.some((y) => y.id === id));

  const open = new Set<string>();
  s.letters = (s.letters as unknown[]).filter((l): l is Obj => isObj(l) && hasRequest(l.id) && !open.has(l.id) && !!open.add(l.id))
    .map((l) => {
      fill(l, { id: l.id, arrived: s.time, ready: false, read: false });
      if ('vars' in l) l.vars = words(l.vars);
      if ('answer' in l) l.answer = words(l.answer);
      optional(l, 'met', 'boolean');
      return l;
    });
  s.lettersDone = strings(s.lettersDone);
  if (Array.isArray(s.lettersResting)) s.lettersResting = s.lettersResting.filter((x: unknown) => isObj(x) && hasRequest(x.id) && finite(x.until));
  else delete s.lettersResting;
  // the fields added in 0.3 are optional, but never of the wrong type: the story, the codex's
  // plaques and keepsakes, projects, fished-out regions
  const kept: Obj = {};
  if (isObj(s.lettersKept)) for (const [id, k] of Object.entries(s.lettersKept)) {
    if (!hasRequest(id) || !isObj(k)) continue;
    kept[id] = { at: finite(k.at) ? k.at : 0, vars: words(k.vars) };
    if (typeof k.met === 'boolean') kept[id].met = k.met;
    if (isObj(k.answer)) kept[id].answer = words(k.answer);
  }
  s.lettersKept = kept;
  s.keepsakes = uniq(s.keepsakes).filter(hasCorrespondent);
  s.story = uniq(s.story);
  s.milestones = uniq(s.milestones);
  s.projects = numbers(s.projects, (id) => PROJECTS.some((p) => p.id === id), 0);
  for (const id of Object.keys(s.projects)) s.projects[id] = Math.floor(s.projects[id]);
  s.codexAt = numbers(s.codexAt, hasSpecies);
  s.fished = numbers(s.fished, hasRegion, 0);
  if (!finite(s.dipCaught) || s.dipCaught < 0) delete s.dipCaught;

  s.expeditions = (s.expeditions as unknown[]).filter((e): e is Obj => isObj(e) && hasRegion(e.region)).map((e) => {
    fill(e, { id: -1, region: e.region, start: s.time, end: s.time });
    if ('finds' in e) {
      e.finds = Array.isArray(e.finds) ? e.finds.filter((x: unknown) => isObj(x) && finite(x.n) && (x.kind === 'species' ? hasSpecies(x.id) : x.kind === 'item' && hasItem(x.id))) : [];
    }
    optional(e, 'postcard', 'string');
    if (Array.isArray(e.finds)) for (const x of e.finds) optional(x, 'first', 'boolean');
    return e;
  });
  s.guestbook = (s.guestbook as unknown[]).filter((x): x is Obj => isObj(x) && typeof x.text === 'string').slice(0, 60)
    .map((x) => {
      fill(x, { time: 0, text: '', who: '' });
      optional(x, 'tank', 'number');
      return x;
    });
  for (const k of ['sold', 'salesToday', 'upkeep']) optional(s.stats, k, 'number');
  for (const k of ['textSize', 'ambience']) optional(s.settings, k, 'number');
  for (const k of ['calmColors', 'sellCuttings']) optional(s.settings, k, 'boolean');
  s.seen = strings(s.seen);

  // every tank, item, animal and expedition needs its own uid, below nextUid
  const used = new Set<number>();
  const broken: [Obj, string][] = [];
  const claim = (o: Obj, k: string) => {
    if (Number.isInteger(o[k]) && o[k] >= 0 && !used.has(o[k])) used.add(o[k]);
    else broken.push([o, k]);
  };
  for (const t of s.tanks) {
    claim(t, 'id');
    for (const p of t.items) claim(p, 'uid');
    for (const a of t.animals) claim(a, 'uid');
    for (const b of t.bags) for (const a of b.animals ?? []) claim(a, 'uid');
  }
  for (const a of s.holding) claim(a, 'uid');
  for (const e of s.expeditions) claim(e, 'id');
  let next = Math.max(1, Math.floor(s.nextUid));
  for (const u of used) next = Math.max(next, u + 1);
  for (const [o, k] of broken) o[k] = next++;
  s.nextUid = next;
}

// ---------------------------------------------------------------- local storage

export function saveLocal(s: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export type LoadResult = { state: GameState } | { error: string };

/**
 * The autosave, if there is one. A save that fails to load is left in its slot and copied to
 * BACKUP_KEY; the caller must not start over on top of it without asking.
 */
export function loadLocal(): LoadResult | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return { state: deserialize(raw) };
  } catch (e) {
    try {
      localStorage.setItem(BACKUP_KEY, raw);
    } catch {
      /* storage full: the save is still in its own slot */
    }
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function clearLocal() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* storage unavailable */
  }
}
