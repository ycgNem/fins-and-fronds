// Saves: an old, partial or broken save either loads into a game that runs, or is kept untouched
// (with a backup copy) for a later version to read. Continue never erases it.
import { afterEach, describe, expect, it } from 'vitest';
import * as act from '../src/sim/actions';
import { Game } from '../src/sim/Game';
import { keptAt } from '../src/sim/letters';
import { newAnimal } from '../src/sim/life';
import { newGame, place, showcaseTank } from '../src/sim/newgame';
import { BACKUP_KEY, deserialize, loadLocal, SAVE_KEY, serialize } from '../src/sim/save';

/** a running shop with a bit of everything in it: epiphytes, holding, storage, letters, a trip */
function shop() {
  const s = newGame(21);
  s.tutorial.done = true;
  s.tier = 2;
  s.settings.sellCuttings = true;
  const t = showcaseTank(s);
  t.items[0].rot = 15;
  s.holding.push(newAnimal(s, 'guppy'));
  s.inventory['java_moss'] = 2;
  s.letters.push({ id: 'fry', arrived: s.time, ready: false, read: false });
  s.expeditions.push({ id: s.nextUid++, region: 'rio_negro', start: s.time, end: s.time + 600 });
  return serialize(s);
}

/** load, play two days with care, and save again */
function play(json: string) {
  const s = deserialize(json);
  const g = new Game(s);
  for (let h = 0; h < 48; h++) {
    g.tick(60);
    if (h % 12 === 0) for (const t of s.tanks) act.feed(g, t);
  }
  deserialize(serialize(s));
  return s;
}

type Mut = (o: any) => void;
const BROKEN: [string, Mut][] = [
  ['no holding', (o) => delete o.holding],
  ['unknown letters', (o) => {
    o.letters.push({ id: 'old_letter', arrived: 0, ready: false, read: false });
    o.lettersResting = [{ id: 'gone', until: 1e9 }];
  }],
  ['unknown inventory item', (o) => (o.inventory.old_plant = 3)],
  ['unknown substrate and source', (o) => {
    o.tanks[0].substrate = 'old_sand';
    o.tanks[0].set.source = 'old_source';
  }],
  ['expedition to an unknown region', (o) => o.expeditions.push({ id: 5, region: 'atlantis', start: 0, end: 10 })],
  ['unknown finds', (o) => (o.expeditions[0].finds = [{ kind: 'species', id: 'dodo', n: 2 }, { kind: 'item', id: 'old_rock', n: 1 }])],
  ['no pests', (o) => delete o.tanks[0].pests],
  ['no guestbook, stats, settings, codex, unlocked', (o) => {
    for (const k of ['guestbook', 'stats', 'settings', 'codex', 'unlocked', 'letters', 'lettersDone', 'inventory', 'upgrades', 'expeditions']) delete o[k];
  }],
  ['broken tank fields', (o) => {
    const t = o.tanks[0];
    t.items[0].rot = 'abc';
    delete t.chem.bacA;
    delete t.set;
    delete t.profile;
    t.water = 'lava';
  }],
  ['wrong types in the fields added in 0.3', (o) => {
    o.milestones = {};
    o.story = { guide: true };
    o.keepsakes = 'tomas';
    o.projects = { river: '2', reef: -1, atlantis: 3 };
    o.fished = { amazon: 'x', atlantis: 2 };
    o.codexAt = { neon_tetra: 'yesterday' };
    o.dipCaught = 'lots';
    o.lettersKept = { fry: 'read', first_school: { at: 'x', vars: [1, 2] }, old_letter: { at: 0, vars: {} } };
    o.letters[0].vars = 'oops';
    o.tanks[0].items[0].since = 'old';
    o.tanks[0].toldTannin = 'yes';
    o.tanks[0].pests.hadSnails = 1;
  }],
  ['nulls and strays', (o) => {
    o.tanks.push(null);
    o.holding.push(null);
    o.tanks[0].animals.push({ sp: 'neon_tetra' });
    o.coins = null;
    o.time = 'x';
    o.nextUid = 1;
  }],
];

describe('loading old and partial saves', () => {
  it('round-trips a running shop', () => {
    const s = play(shop());
    expect(s.tanks[0].items[0].rot).toBe(15);
  });

  for (const [name, mut] of BROKEN) {
    it(`survives: ${name}`, () => {
      const o = JSON.parse(shop());
      mut(o);
      const s = play(JSON.stringify(o));
      expect(s.tanks.length).toBe(1);
      expect(Number.isFinite(s.coins)).toBe(true);
      // every uid is still unique after the repair
      const uids = [...s.tanks.flatMap((t) => [...t.items.map((p) => p.uid), ...t.animals.map((a) => a.uid)]), ...s.holding.map((a) => a.uid)];
      expect(new Set(uids).size).toBe(uids.length);
      expect(Math.max(...uids)).toBeLessThan(s.nextUid);
    });
  }

  it('repairs the fields added in 0.3 to their types, so the game can count on them', () => {
    const o = JSON.parse(shop());
    BROKEN.find(([n]) => n.includes('0.3'))![1](o);
    const s = play(JSON.stringify(o));
    expect(s.milestones).toEqual(expect.any(Array));
    expect(s.story).toEqual([]);
    expect(s.keepsakes).toEqual([]);
    expect(s.projects).toEqual({});
    expect(s.fished).toEqual({});
    expect(s.dipCaught).toBeUndefined();
    expect(Object.keys(s.lettersKept ?? {})).toEqual(['first_school']);
    expect(s.lettersKept!.first_school).toEqual({ at: 0, vars: {} });
    expect(s.tanks[0].toldTannin).toBeUndefined();
  });

  it('turns a 0.2 shop into 0.3: Conservation Fund levels into projects, soaking wood, cleared snails', () => {
    const s = newGame(21);
    s.tutorial.done = true;
    s.tier = 5;
    const t = showcaseTank(s);
    t.ageDays = 40;
    t.chem.tannin = 0.4;
    t.pests = { snails: 0, aiptasia: 0, bubble: 0, had: true };
    s.lettersDone = ['first_school', 'okafor_count'];
    const o = JSON.parse(serialize(s));
    o.version = 2;
    o.upgrades.conservation = 4;
    for (const k of ['projects', 'lettersKept', 'milestones', 'keepsakes']) delete o[k];
    for (const p of o.tanks[0].items) delete p.since;
    delete o.tanks[0].toldTannin;
    delete o.tanks[0].pests.hadSnails;
    const back = deserialize(JSON.stringify(o));
    expect(back.upgrades.conservation).toBeUndefined();
    expect(back.projects).toEqual({ river: 1, reef: 1, seahorse: 1, reserve: 1 });
    // the wood starts soaking on the day it loads, and the stain it already had is not news
    expect(back.tanks[0].items.every((p) => p.since === 40)).toBe(true);
    expect(back.tanks[0].toldTannin).toBe(true);
    expect(back.tanks[0].pests.hadSnails).toBe(true);
    // the old ask can be reread; the old reply is not kept (its names are gone)
    expect(Object.keys(back.lettersKept ?? {})).toEqual(['first_school']);
    // and it was answered before the update, not on day 1 (the Kept tab reads keptAt)
    expect(s.time).toBeGreaterThan(0);
    expect(keptAt(back.lettersKept!.first_school)).toBeUndefined();
    const g = new Game(back);
    // and no tea-colored notice fires for it
    g.tick(10);
    expect(g.events.some((e) => e.t === 'toast' && /tea-colored/.test(e.text))).toBe(false);
  });

  it('moves the animals of a tank whose shell is gone into holding', () => {
    const o = JSON.parse(shop());
    const fish = o.tanks[0].animals.length;
    const before = o.holding.length;
    o.tanks[0].shell = 'old_shell';
    const s = deserialize(JSON.stringify(o));
    expect(s.tanks.length).toBe(0);
    expect(s.holding.length).toBe(before + fish);
  });

  it('drops an epiphyte onto the sand when its rock is gone', () => {
    const s = newGame(3);
    const t = showcaseTank(s);
    const wood = t.items.find((p) => p.id === 'malaysian_driftwood')!;
    const fern = place(s, t, 'java_fern', 100, 1, { on: wood.uid, y: 12 });
    const o = JSON.parse(serialize(s));
    o.tanks[0].items.find((p: any) => p.uid === wood.uid).id = 'old_wood';
    const back = deserialize(JSON.stringify(o));
    const f = back.tanks[0].items.find((p) => p.uid === fern.uid)!;
    expect(f.on).toBeUndefined();
    expect(f.y).toBe(0);
  });
});

describe('the autosave slot', () => {
  const store = new Map<string, string>();
  const g = globalThis as { localStorage?: unknown };
  g.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  afterEach(() => store.clear());

  it('loads a good save', () => {
    store.set(SAVE_KEY, shop());
    const r = loadLocal();
    expect(r && 'state' in r).toBe(true);
  });

  it('keeps a save that will not load, and backs it up', () => {
    const bad = '{"version":2,"tanks":[{"shell":"std_20l"}], "oops"';
    store.set(SAVE_KEY, bad);
    const r = loadLocal();
    expect(r && 'error' in r).toBe(true);
    expect(store.get(SAVE_KEY)).toBe(bad);
    expect(store.get(BACKUP_KEY)).toBe(bad);
  });

  it('has nothing to load in an empty slot', () => {
    expect(loadLocal()).toBeNull();
  });
});
