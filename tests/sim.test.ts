// Simulation behavior: the nitrogen cycle, archetype recognition, pest control, ratings, saves.
import { describe, expect, it } from 'vitest';
import { Game } from '../src/sim/Game';
import { newGame, emptyTank, place, showcaseTank } from '../src/sim/newgame';
import { newAnimal } from '../src/sim/life';
import { cycleProgress } from '../src/sim/water';
import { freeAmmoniaShare } from '../src/sim/wellbeing';
import * as act from '../src/sim/actions';
import { deserialize, serialize } from '../src/sim/save';
import type { GameState, Tank } from '../src/sim/state';

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
