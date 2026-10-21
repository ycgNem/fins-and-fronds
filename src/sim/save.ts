// Saving: one autosave slot in localStorage plus JSON export/import. Each format change bumps
// SAVE_VERSION and adds a migration here, oldest first.
import { hasEquip, hasItem, hasShell, hasSpecies, hasUpgrade } from '../data';
import { type GameState, SAVE_VERSION } from './state';

export const SAVE_KEY = 'fins-and-fronds/save';

type Migration = (s: any) => void;
const MIGRATIONS: Record<number, Migration> = {
  // 1 -> 2: add migrations here when the format changes
};

export function serialize(s: GameState): string {
  s.savedAt = Date.now();
  return JSON.stringify(s);
}

export function deserialize(json: string): GameState {
  const s = JSON.parse(json);
  if (typeof s !== 'object' || !s || !Array.isArray(s.tanks)) throw new Error('not a Fins & Fronds save');
  for (let v = s.version ?? 1; v < SAVE_VERSION; v++) MIGRATIONS[v]?.(s);
  s.version = SAVE_VERSION;
  sanitize(s);
  return s as GameState;
}

/** Drop anything the content no longer knows about, so an old save never crashes the game. */
function sanitize(s: GameState) {
  s.tanks = s.tanks.filter((t) => hasShell(t.shell));
  for (const t of s.tanks) {
    t.items = t.items.filter((p) => hasItem(p.id));
    t.animals = t.animals.filter((a) => hasSpecies(a.sp));
    t.equip = t.equip.filter((e) => hasEquip(e));
    t.bags = (t.bags ?? []).filter((b) => hasSpecies(b.sp));
  }
  s.holding = s.holding.filter((a) => hasSpecies(a.sp));
  for (const k of Object.keys(s.upgrades)) if (!hasUpgrade(k)) delete s.upgrades[k];
}

export function saveLocal(s: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function loadLocal(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? deserialize(raw) : null;
  } catch {
    return null;
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
