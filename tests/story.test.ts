// The story's seams: replies quote what really answered the letter before (even in saves from
// before letters were kept), counts read as words, schools are fish on show, the guestbook keeps to
// the week, Ida's last letter never waits behind a full box, the Grand Oceanarium's letters wait for
// its finale (even when the top is reached overnight), Pip's dip letter says what happened and
// brings its surprise, the Driftwood Club judges real scapes, plaques already earned are given when
// a shop loads, and the Trips window warns about the next catch, not the last.
import { describe, expect, it } from 'vitest';
import { request, REQUESTS, SPECIES, TIERS } from '../src/data';
import { Rng } from '../src/engine/rng';
import * as act from '../src/sim/actions';
import { BAL } from '../src/sim/balance';
import { freshness, startExpedition } from '../src/sim/expeditions';
import { Game } from '../src/sim/Game';
import { checkRequest, keptAt, letterText, letterVars, schoolOf } from '../src/sim/letters';
import { newAnimal } from '../src/sim/life';
import { emptyTank, newGame, place } from '../src/sim/newgame';
import { judgedScape } from '../src/sim/rating';
import { deserialize, serialize } from '../src/sim/save';
import type { GameState, Tank } from '../src/sim/state';
import { guestLine } from '../src/sim/visitors';

function shop(tier = 0): GameState {
  const s = newGame(5);
  s.tutorial.done = true;
  s.tier = tier;
  s.coins = 1e6;
  return s;
}

function display(s: GameState, bay: number, sh = 'std_20l', water: 'fresh' | 'marine' = 'fresh'): Tank {
  const t = emptyTank(s, bay, sh, water);
  t.equip = water === 'fresh' ? ['hob_filter', 'heater_150', 'led_basic'] : ['canister_filter', 'protein_skimmer', 'heater_300', 'led_reef'];
  t.chem.bacA = t.chem.bacB = 1;
  t.ageDays = 30;
  s.tanks.push(t);
  return t;
}

const fish = (s: GameState, t: Tank, sp: string, n: number, opt = {}) => {
  for (let i = 0; i < n; i++) t.animals.push(newAnimal(s, sp, opt));
};

describe('replies', () => {
  it('quote the school that answered, even when it was sold before the reply was sent', () => {
    const s = shop();
    const t = display(s, 0);
    t.name = 'The Front Window';
    fish(s, t, 'neon_tetra', 10);
    s.letters.push({ id: 'first_school', arrived: 0, ready: false, read: true });
    const g = new Game(s);
    g.refreshAll();
    expect(s.letters[0].ready).toBe(true);
    // the school goes before the reply is sent
    t.animals = [];
    g.refreshAll(false);
    expect(act.claimLetter(g, 'first_school')).toBe('');
    // a letter answered now is kept with the time it was answered
    expect(keptAt(s.lettersKept!.first_school)).toBe(s.time);
    const r = request('okafor_count');
    const text = letterText(r, { vars: letterVars(r, s, g.stats) });
    expect(text).toContain('counted the neon tetra in The Front Window');
    expect(text).toContain('Amara got 10');
    expect(text).not.toMatch(/your tank|undefined|\{/);
  });

  it('in a save from before letters were kept, name what meets the old ask today, or read naturally', () => {
    const s = shop(2);
    const t = display(s, 0);
    t.name = 'The Front Window';
    const night = display(s, 1);
    night.name = 'Moon Tank';
    s.lettersDone = ['first_school', 'night', 'glow'];
    fish(s, t, 'cardinal_tetra', 9);
    fish(s, night, 'neon_tetra', 4);
    const g = new Game(s);
    const okafor = letterText(request('okafor_count'), { vars: letterVars(request('okafor_count'), s, g.stats) });
    expect(okafor).toContain('counted the cardinal tetra in The Front Window');
    // nothing meets an ask any more: a neutral word and the number asked for, never "your tank"
    t.animals = [];
    night.animals = [];
    g.refreshAll(false);
    const blank = letterText(request('okafor_count'), { vars: letterVars(request('okafor_count'), s, g.stats) });
    expect(blank).toContain('counted the fish in');
    expect(blank).toContain('Amara got 8');
    const abe = letterText(request('abe_rounds'), { vars: letterVars(request('abe_rounds'), s, g.stats) });
    for (const x of [blank, abe]) expect(x).not.toMatch(/your tank|undefined|\{/);
    // and an old letter with nothing at all reads naturally too
    expect(letterText(request('okafor_count'), {})).not.toMatch(/your tank|undefined|\{/);
  });

  it('count in words: one tank, three tanks', () => {
    const s = shop(5);
    display(s, 0);
    const g = new Game(s);
    const visit = letterText(request('ida_visit'), { vars: letterVars(request('ida_visit'), s, g.stats) });
    expect(visit).toContain('1 tank,');
    display(s, 1);
    display(s, 2);
    s.codex.archetypes = ['community'];
    g.refreshAll(false);
    const last = letterText(request('ida_last'), { vars: letterVars(request('ida_last'), s, g.stats) });
    expect(last).toContain('3 tanks and 1 kind of tank');
    // a letter sent before 0.3 kept the bare number
    expect(letterText(request('ida_visit'), { vars: { tanks: '4', best: 'X' } })).toContain('4 tanks,');
  });
});

describe('letters about what visitors see', () => {
  it('count only grown fish on show for a school: not a back-room shrimp rack, not fry', () => {
    const s = shop(3);
    const rack = display(s, BAL.rackBay, 'std_29');
    fish(s, rack, 'cherry_shrimp', 51);
    fish(s, rack, 'neon_tetra', 40);
    const t = display(s, 0);
    fish(s, t, 'neon_tetra', 5);
    fish(s, t, 'neon_tetra', 20, { fry: true, bornHere: true });
    const g = new Game(s);
    expect(schoolOf(rack)).toBeUndefined();
    expect(schoolOf(t)).toEqual({ sp: 'neon_tetra', n: 5 });
    expect(checkRequest(request('first_school').check, s, g.stats)).toBe(false);
    fish(s, t, 'neon_tetra', 3);
    g.refreshAll(false);
    expect(checkRequest(request('first_school').check, s, g.stats)).toBe(true);
  });

  it('take the plants-alone dare from a display, not from a back-room plant farm', () => {
    const s = shop(1);
    const dare = request('no_fish').check;
    const farm = (bay: number) => {
      const t = display(s, bay);
      t.equip = ['sponge_filter', 'heater_150', 'led_planted'];
      const plants = [['amazon_sword', 45, 0], ['vallisneria', 15, 0], ['crypt_wendtii', 180, 2], ['java_fern', 120, 1], ['amazon_frogbit', 150, 1], ['seiryu_stone', 105, 1]] as const;
      for (const [id, x, layer] of plants) place(s, t, id, x, layer);
      return t;
    };
    const rack = farm(BAL.rackBay);
    const g = new Game(s);
    expect(g.stats.get(rack.id)!.rating.stars).toBeGreaterThanOrEqual(2);
    expect(checkRequest(dare, s, g.stats)).toBe(false);
    expect(checkRequest({ t: 'no_fish' }, s, g.stats)).toBe(false);
    const shown = farm(0);
    g.refreshAll(false);
    expect(g.stats.get(shown.id)!.rating.stars).toBeGreaterThanOrEqual(2);
    expect(checkRequest(dare, s, g.stats)).toBe(true);
    expect(checkRequest({ t: 'no_fish' }, s, g.stats)).toBe(true);
  });

  it('give the club\'s rosette and trophy to a real scape, not open water', () => {
    const s = shop(4);
    const kreisel = display(s, 0, 'kreisel_200', 'marine');
    kreisel.equip = ['kreisel_loop', 'chiller_small'];
    fish(s, kreisel, 'moon_jelly', 6);
    const scape = display(s, 1);
    for (const [id, x] of [['seiryu_stone', 80], ['seiryu_stone', 150], ['java_fern', 200], ['amazon_sword', 40]] as const) place(s, scape, id, x, 1);
    fish(s, scape, 'neon_tetra', 10);
    const bare = display(s, 2);
    place(s, bare, 'seiryu_stone', 100, 1);
    place(s, bare, 'seiryu_stone', 180, 1);
    fish(s, bare, 'neon_tetra', 10);
    expect([kreisel, scape, bare].map(judgedScape)).toEqual([false, true, false]);
    const g = new Game(s);
    const cup = request('driftwood_cup').check;
    for (const t of [kreisel, bare]) g.stats.get(t.id)!.rating.parts.scape = 96;
    g.stats.get(scape.id)!.rating.parts.scape = 60;
    expect(checkRequest(cup, s, g.stats)).toBe(false);
    g.stats.get(scape.id)!.rating.parts.scape = 90;
    expect(checkRequest(cup, s, g.stats)).toBe(true);
  });
});

describe('the guestbook', () => {
  it('signs a school trip only on Friday', () => {
    const s = shop(1);
    const t = display(s, 0);
    fish(s, t, 'neon_tetra', 10);
    const g = new Game(s);
    const st = g.stats.get(t.id)!;
    const rng = new Rng(2);
    const who = (day: number) => Array.from({ length: 300 }, () => guestLine(rng, t, st.facts, st.rating, st.cls, st.moods, false, [], (day - 1) * 1440 + 600).who);
    // day 1 is a Monday, day 5 a Friday
    expect(who(1).some((w) => /school trip/.test(w))).toBe(false);
    expect(who(5).some((w) => /school trip/.test(w))).toBe(true);
  });
});

describe('the end of the story', () => {
  it('Ida\'s last letter comes right after the finale, even with three asks open', () => {
    const s = shop(5);
    display(s, 0);
    s.lettersDone = ['ida_window', 'ida_plants'];
    s.seen.push('finale');
    for (const id of ['deep', 'ocean', 'codex_40']) s.letters.push({ id, arrived: s.time, ready: false, read: true });
    const g = new Game(s);
    g.tick(60);
    expect(s.letters.map((l) => l.id)).toContain('ida_last');
    expect(s.letters.length).toBeLessThanOrEqual(3);
    // the ask it pushed out rests and comes back later
    expect((s.lettersResting ?? []).some((x) => ['deep', 'ocean', 'codex_40'].includes(x.id))).toBe(true);
  });

  const TOP = TIERS[TIERS.length - 1].level;
  const oceanarium = (s: GameState) => s.letters.filter((l) => request(l.id).tier >= TOP).map((l) => l.id);

  it('the Grand Oceanarium\'s letters wait for its finale when the top is reached overnight', () => {
    const s = shop(TOP - 1);
    display(s, 0);
    // everything below the top answered: any letter that comes now is one of the Oceanarium's
    s.lettersDone = REQUESTS.filter((r) => r.tier < TOP).map((r) => r.id);
    const g = new Game(s);
    g.tick(20 * 60 - s.time);
    expect(s.tier).toBe(TOP - 1);
    // the reputation is there at closing time, so the shop goes up a tier in its sleep
    s.rep = TIERS[TOP].rep;
    g.events.length = 0;
    expect(g.sleepUntilOpen()).toBeGreaterThan(10 * 60);
    expect(s.tier).toBe(TOP);
    expect(g.events.some((e) => e.t === 'tier' && e.level === TOP)).toBe(true);
    expect(oceanarium(s)).toEqual([]);
    // the app plays the finale on that tier event (marking it seen); Ida writes first, then the rest
    s.seen.push('finale');
    g.tick(60);
    expect(oceanarium(s)).toEqual(['ida_last']);
    g.tick(24 * 60);
    expect(oceanarium(s).length).toBeGreaterThan(1);
  });

  it('a shop that reached the top before 0.3 keeps its Oceanarium letters, and hears the rest after the finale', () => {
    const s = shop(TOP);
    display(s, 0);
    s.lettersDone = REQUESTS.filter((r) => r.tier < TOP).map((r) => r.id);
    s.letters.push({ id: 'wren_reserve', arrived: s.time, ready: false, read: true });
    const o = JSON.parse(serialize(s));
    // a 0.2 save: no finale had been written, and the reserve was the Conservation Fund's last level
    o.version = 2;
    o.seen = ['intro'];
    o.upgrades.conservation = 4;
    for (const k of ['projects', 'lettersKept', 'milestones', 'keepsakes']) delete o[k];
    const old = deserialize(JSON.stringify(o));
    expect(old.seen).not.toContain('finale');
    const g = new Game(old);
    g.tick(10);
    // the letter it already had still comes good and can be answered before the finale plays
    expect(old.letters.find((l) => l.id === 'wren_reserve')?.ready).toBe(true);
    expect(act.claimLetter(g, 'wren_reserve')).toBe('');
    // continuing a shop already at the top plays the finale (app.continueSave); after it, the rest
    old.seen.push('finale');
    g.tick(60);
    expect(oceanarium(old)).toEqual(['ida_last']);
    g.tick(24 * 60);
    expect(oceanarium(old).length).toBeGreaterThan(1);
  });

  it('Pip\'s letter after the dip says the dip stopped the snails, and sends a surprise all the same', () => {
    const s = shop(0);
    display(s, 0);
    s.upgrades.quarantine = 1;
    s.dipCaught = 1;
    const g = new Game(s);
    const r = request('assassins');
    const vars = letterVars(r, s, g.stats);
    expect(letterText(r, { vars, met: true })).toBe(r.metDip);
    s.letters.push({ id: 'assassins', arrived: s.time, ready: true, read: true, met: true, vars });
    const coins = s.coins;
    expect(act.claimLetter(g, 'assassins')).toBe('');
    expect(s.coins).toBe(coins + r.reward.coins);
    expect(s.holding.filter((a) => a.sp === 'assassin_snail').length).toBe(3);
    expect(g.events.some((e) => e.t === 'toast' && /assassin snails in the holding tank/.test(e.text))).toBe(true);
  });

  it('a keepsake joins the codex\'s keepsakes', () => {
    const s = shop(3);
    display(s, 0);
    s.lettersDone = ['three_stars'];
    s.letters.push({ id: 'reyes_1979', arrived: s.time, ready: true, read: true });
    const g = new Game(s);
    act.claimLetter(g, 'reyes_1979');
    expect(s.keepsakes).toContain('reyes');
    expect(g.events.some((e) => e.t === 'toast' && /joins your keepsakes/.test(e.text))).toBe(true);
  });
});

describe('returning players', () => {
  it('get the plaques their codex already earned when the shop loads', () => {
    const s = shop(3);
    display(s, 0);
    s.codex.species = SPECIES.slice(0, 26).map((x) => x.id);
    delete s.milestones;
    const coins = s.coins;
    const g = new Game(s);
    expect(s.milestones).toContain('sp25');
    expect(s.coins).toBeGreaterThan(coins);
    expect(g.events.some((e) => e.t === 'toast' && /Twenty-five species/.test(e.text))).toBe(true);
  });

  it('see how lightly the next trip would come back, before it sails', () => {
    const s = shop(1);
    expect(freshness(s, 'amazon')).toBe(1);
    startExpedition(s, 'amazon');
    // the trip at sea was counted when it left: the next one would come back lighter
    expect(freshness(s, 'amazon')).toBeCloseTo(1 - BAL.overfished);
  });
});
