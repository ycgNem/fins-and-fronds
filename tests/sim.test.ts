// Simulation behavior: the nitrogen cycle, archetype recognition, pest control, ratings, saves.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { newGame, emptyTank, place, showcaseTank } from '../src/sim/newgame';
import { newAnimal } from '../src/sim/life';
import { freeAmmoniaShare } from '../src/sim/wellbeing';
import * as act from '../src/sim/actions';
import { deserialize, serialize } from '../src/sim/save';
import type { GameState, Tank } from '../src/sim/state';
import { ARCHETYPES, EQUIPMENT, SHELLS, SPECIES } from '../src/data';
import type { ShellTag } from '../src/data/types';
import { facts } from '../src/sim/facts';
import { cycleProgress, equilibrium, tanninLook, targetTemp } from '../src/sim/water';

function tankWith(s: GameState, shell: string, water: 'fresh' | 'brackish' | 'marine', build: (t: Tank) => void): Tank {
  const t = emptyTank(s, s.tanks.length, shell, water);
  t.chem.bacA = 1;
  t.chem.bacB = 1;
  t.ageDays = 30;
  build(t);
  s.tanks.push(t);
  return t;
}

/** a new game plus the showcase community tank, as a known running aquarium */
function running(seed: number): GameState {
  const s = newGame(seed);
  s.tutorial.done = true;
  s.settings.speed = 1;
  showcaseTank(s);
  return s;
}

describe('new game', () => {
  it('starts in an empty shop with the guided first tank ahead', () => {
    const s = newGame(41);
    expect(s.tanks.length).toBe(0);
    expect(s.tutorial.done).toBe(false);
    expect(s.coins).toBeGreaterThanOrEqual(300);
  });

  it('the showcase tank is a recognized, decent community tank', () => {
    const g = new Game(running(42));
    const st = g.stats.get(g.state.tanks[0].id)!;
    expect(st.cls.best).not.toBeNull();
    expect(st.rating.stars).toBeGreaterThanOrEqual(2);
    expect(st.rating.stars).toBeLessThanOrEqual(4);
  });

  it('runs a full day without trouble and earns coins', () => {
    const g = new Game(running(7));
    const before = g.state.coins;
    g.tick(24 * 60);
    expect(g.state.coins).toBeGreaterThan(before);
    expect(g.state.tanks[0].animals.length).toBeGreaterThan(10);
    expect(g.state.letters.length).toBeGreaterThan(0);
  });
});

describe('nitrogen cycle', () => {
  it('a fishless cycle takes two to six weeks and shows the nitrite spike', () => {
    const s = newGame(1);
    const g = new Game(s);
    const t = emptyTank(s, 1, 'rimless_60', 'fresh');
    t.equip = ['hob_filter'];
    s.tanks.push(t);
    let peakNo2 = 0;
    let doneDay = 0;
    for (let h = 0; h < 24 * 42 && !doneDay; h++) {
      if (h % 24 === 0) t.chem.nh3 += 2;
      g.tick(60);
      peakNo2 = Math.max(peakNo2, t.chem.no2);
      if (cycleProgress(t.chem) > 0.9) doneDay = h / 24;
    }
    expect(doneDay).toBeGreaterThan(14);
    expect(doneDay).toBeLessThan(42);
    expect(peakNo2).toBeGreaterThan(0.3);
    expect(t.chem.no3).toBeGreaterThan(1);
  });

  it('media from a mature filter nearly cycles a new tank at once', () => {
    const s = running(7);
    const g = new Game(s);
    const t = emptyTank(s, 1, 'std_10', 'fresh');
    t.equip = ['sponge_filter'];
    s.tanks.push(t);
    expect(act.seedFilter(g, t)).toBe('');
    expect(cycleProgress(t.chem)).toBeGreaterThan(0.6);
  });

  it('free ammonia depends on pH: harmless-ish in blackwater, deadly in a rift lake', () => {
    expect(freeAmmoniaShare(6, 25)).toBeLessThan(0.001);
    expect(freeAmmoniaShare(8.2, 25)).toBeGreaterThan(0.05);
  });
});

describe('archetypes', () => {
  it('recognizes an Iwagumi', () => {
    const s = newGame(2);
    const t = tankWith(s, 'rimless_60', 'fresh', (t) => {
      t.equip = ['hob_filter', 'led_planted'];
      place(s, t, 'seiryu_stone', 80, 1, { size: 1.2 });
      place(s, t, 'seiryu_stone', 130, 1, { size: 0.8 });
      place(s, t, 'seiryu_stone', 170, 2, { size: 0.5 });
      for (let x = 20; x < 240; x += 30) place(s, t, 'dwarf_hairgrass', x, 2);
      for (let i = 0; i < 12; i++) t.animals.push(newAnimal(s, 'harlequin_rasbora'));
    });
    const g = new Game(s);
    expect(g.stats.get(t.id)!.cls.best?.def.id).toBe('iwagumi');
  });

  it('recognizes a Rio Negro blackwater biotope over a generic community', () => {
    const s = newGame(3);
    const t = tankWith(s, 'rimless_60', 'fresh', (t) => {
      t.equip = ['hob_filter', 'led_basic', 'heater_150'];
      t.set.source = 'blackwater';
      t.chem.tannin = 0.5;
      t.chem.ph = 5.8;
      place(s, t, 'malaysian_driftwood', 120, 1);
      place(s, t, 'catappa_leaves', 60, 2);
      for (let i = 0; i < 12; i++) t.animals.push(newAnimal(s, 'cardinal_tetra'));
      for (let i = 0; i < 6; i++) t.animals.push(newAnimal(s, 'marbled_hatchetfish'));
      t.animals.push(newAnimal(s, 'agassizii'));
    });
    const g = new Game(s);
    expect(g.stats.get(t.id)!.cls.best?.def.id).toBe('rio_negro');
  });

  it('keeps a blackwater tank stained once its wood has soaked, from what the hints ask for', () => {
    // [shell, items]: heavy wood alone, and wood with a bed of leaves, months after setting up
    const builds: [string, [string, number][]][] = [
      ['std_29', [['malaysian_driftwood', 90], ['malaysian_driftwood', 210], ['mopani', 150]]],
      ['std_29', [['malaysian_driftwood', 100], ['catappa_leaves', 180]]],
      ['std_20l', [['sumatra_wood', 100], ['catappa_leaves', 180]]],
    ];
    for (const [sh, items] of builds) {
      const s = newGame(3);
      const t = tankWith(s, sh, 'fresh', (t) => {
        t.equip = ['canister_filter', 'led_basic', 'heater_300'];
        t.set.source = 'soft';
        for (const [id, x] of items) place(s, t, id, x, 1, { since: 0 });
        t.ageDays = 90;
      });
      expect(equilibrium(t, facts(t, 12)).tannin, `${sh} ${items.map((i) => i[0])}`).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('tints a small tank amber with one handful of leaves, which activated carbon clears; a bed of them is blackwater', () => {
    const look = (sh: string, leaves: number, gear: string[] = []) => {
      const s = newGame(3);
      const t = tankWith(s, sh, 'fresh', (t) => {
        t.equip = ['sponge_filter', 'led_planted', ...gear];
        for (let i = 0; i < leaves; i++) place(s, t, 'catappa_leaves', 40 + i * 50, 1, { since: 0 });
        t.ageDays = 120;
      });
      return tanninLook(equilibrium(t, facts(t, 12)).tannin);
    };
    for (const sh of ['std_5', 'nano_cube', 'std_10', 'std_20l']) {
      expect(look(sh, 1), sh).toBe('amber');
      expect(look(sh, 1, ['carbon_media']), `${sh} with carbon`).toBe('clear');
      // a peat swamp's two or three handfuls still stain it as deep as the biotope asks
      expect(look(sh, 2), `${sh} two handfuls`).toBe('blackwater');
    }
  });

  it('recognizes a jellyfish kreisel', () => {
    const s = newGame(4);
    s.tier = 4;
    const t = tankWith(s, 'kreisel_200', 'marine', (t) => {
      t.equip = ['kreisel_loop', 'chiller_small'];
      t.chem.temp = 18;
      for (let i = 0; i < 6; i++) t.animals.push(newAnimal(s, 'moon_jelly'));
    });
    const g = new Game(s);
    expect(g.stats.get(t.id)!.cls.best?.def.id).toBe('jelly_kreisel');
  });
});

describe('pests', () => {
  it('assassin snails clear pest snails', () => {
    const s = running(5);
    const t = s.tanks[0];
    t.pests.snails = 10;
    for (let i = 0; i < 4; i++) t.animals.push(newAnimal(s, 'assassin_snail'));
    const g = new Game(s);
    g.tick(60 * 72);
    expect(t.pests.snails).toBe(0);
  });
});

describe('wellbeing', () => {
  it('neons are hunted by an oscar', () => {
    const s = running(6);
    const t = s.tanks[0];
    t.animals.push(newAnimal(s, 'oscar'));
    const g = new Game(s);
    const m = g.stats.get(t.id)!.moods.get('neon_tetra')!;
    expect(m.reasons.some((r) => r.text.includes('hunted'))).toBe(true);
  });
});

describe('saves', () => {
  it('round-trips', () => {
    const g = new Game(running(8));
    g.tick(600);
    const copy = deserialize(serialize(g.state));
    expect(copy.tanks[0].animals.length).toBe(g.state.tanks[0].animals.length);
    expect(Math.round(copy.coins)).toBe(Math.round(g.state.coins));
  });
});

describe('keepable exhibits', () => {
  it('a default reef tank on live sand settles inside every reef animal\'s pH range', () => {
    const s = newGame(9);
    s.tier = 3;
    const t = tankWith(s, 'std_75', 'marine', (t) => {
      t.equip = ['canister_filter', 'heater_300', 'led_reef', 'ato'];
      for (let i = 0; i < 5; i++) t.animals.push(newAnimal(s, 'blue_chromis'));
    });
    expect(t.substrate).toBe('live_sand');
    new Game(s).tick(3 * 1440);
    expect(t.chem.ph).toBeGreaterThanOrEqual(8.0);
    expect(t.chem.ph).toBeLessThanOrEqual(8.3);
  });

  it('every tank type with a temperature rule can reach it at its own tier, with gear of that tier', () => {
    for (const a of ARCHETYPES) {
      const temps = a.rules.filter((r) => r.rule.t === 'temp').map((r) => r.rule as { min?: number; max?: number });
      if (!temps.length) continue;
      const s = newGame(10);
      s.tier = a.tier;
      const water = a.family === 'Reef' || a.family === 'Marine' || a.family === 'Public Exhibit' ? 'marine' : a.family === 'Brackish' ? 'brackish' : 'fresh';
      const needs = a.rules.filter((r) => r.hard && r.rule.t === 'shell').map((r) => r.rule as { tag: ShellTag; not?: boolean });
      const shells = SHELLS.filter((sh) => sh.tier <= a.tier && (!sh.water || sh.water.includes(water)) && needs.every((n) => sh.tags.includes(n.tag) !== !!n.not));
      const reach = shells.map((sh) => {
        const t = emptyTank(s, 0, sh.id, water);
        const gear = (slot: string) => EQUIPMENT.filter((e) => e.slot === slot && e.tier <= a.tier && (!e.needsShell || sh.tags.includes(e.needsShell)));
        let lo = 99, hi = -99;
        for (const c of [undefined, ...gear('chiller')]) {
          t.equip = c ? [c.id] : [];
          t.set.heater = 4;
          lo = Math.min(lo, targetTemp(t, facts(t, 12)));
        }
        for (const h of [undefined, ...gear('heater')]) {
          t.equip = h ? [h.id, h.id] : [];
          t.set.heater = 32;
          hi = Math.max(hi, targetTemp(t, facts(t, 3)));
        }
        return { lo, hi };
      });
      for (const r of temps) expect(reach.some((x) => (r.max === undefined || x.lo <= r.max) && (r.min === undefined || x.hi >= r.min)), `${a.id} ${JSON.stringify(r)}`).toBe(true);
    }
  });

  it('a thermostat set exactly on a rule\'s number counts', () => {
    const s = newGame(11);
    s.tier = 4;
    const t = tankWith(s, 'column_tall', 'marine', (t) => {
      t.equip = ['canister_filter', 'chiller_small', 'led_reef', 'ato'];
      t.set.heater = 20;
      place(s, t, 'giant_kelp', 50, 0);
      place(s, t, 'giant_kelp', 100, 0);
    });
    const g = new Game(s);
    g.tick(5 * 1440);
    expect(t.chem.temp).toBe(20);
    expect(g.stats.get(t.id)!.cls.matches.some((m) => m.def.id === 'kelp_forest')).toBe(true);
  });

  it('a kreisel keeps a proper group of moon jellies on its own spray loop', () => {
    const s = newGame(12);
    s.tier = 4;
    s.upgrades['auto_feeders'] = 1;
    const t = tankWith(s, 'kreisel_200', 'marine', (t) => {
      t.equip = ['kreisel_loop', 'led_reef', 'ato'];
      for (let i = 0; i < 8; i++) t.animals.push(newAnimal(s, 'moon_jelly'));
    });
    const g = new Game(s);
    g.tick(5 * 1440);
    const st = g.stats.get(t.id)!;
    expect(st.facts.bioload).toBeLessThan(st.facts.bioCap);
    expect(st.moods.get('moon_jelly')!.mood).toBeGreaterThan(0.85);
    expect(st.rating.parts.scape).toBeGreaterThan(80);
  });

  it('every species has a tank big enough by the tier the supplier lists it', () => {
    for (const sp of SPECIES) {
      if (sp.source !== 'supplier') continue;
      const fits = SHELLS.some((sh) => sh.tier <= sp.tier && (!sh.water || sh.water.includes(sp.water) || sp.tags.includes('brackish_ok')) && sh.liters * (sh.fill ?? 1) >= sp.minL);
      expect(fits, sp.id).toBe(true);
    }
  });
});
