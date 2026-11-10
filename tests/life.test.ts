// Life in the tanks: breeding stays within what the filter and the water can hold, crowding is
// felt, pairs do not spoil their own tank, stock racks keep a breeding group and sell at the same
// rate whatever the step size, hunger eases in, and removing things never silently loses them.
import { describe, expect, it } from 'vitest';
import { item, ITEMS, shell, species } from '../src/data';
import * as act from '../src/sim/actions';
import { BAL, bioloadOf } from '../src/sim/balance';
import { Game } from '../src/sim/Game';
import { facts, parAt, plantPar } from '../src/sim/facts';
import { breedingIdeas } from '../src/sim/ideas';
import { newAnimal, rehomeGrown, stepGrowth } from '../src/sim/life';
import { emptyTank, newGame, place } from '../src/sim/newgame';
import { breedQuality, offers, reserveOf, reserves, retailPrice, stepSales } from '../src/sim/sales';
import { type GameState, hourOf, type Tank } from '../src/sim/state';
import { Rng } from '../src/engine/rng';
import { stockCm } from '../src/sim/wellbeing';

function shop(seed = 1, tier = 5): GameState {
  const s = newGame(seed);
  s.tutorial.done = true;
  s.tier = tier;
  s.coins = 1e6;
  return s;
}

/** a cycled, heated tank with its gear, scape (item, x as a share of the width, layer) and animals */
function tank(s: GameState, bay: number, sh: string, gear: string[], items: [string, number, 0 | 1 | 2][], stock: [string, number][], water: 'fresh' | 'marine' = 'fresh'): Tank {
  const t = emptyTank(s, bay, sh, water);
  t.equip = [...gear];
  t.chem.bacA = 1;
  t.chem.bacB = 1;
  t.chem.temp = 25;
  t.ageDays = 30;
  for (const [id, fx, layer] of items) place(s, t, id, Math.round(fx * shell(sh).w), layer);
  for (const [sp, n] of stock) for (let i = 0; i < n; i++) t.animals.push(newAnimal(s, sp));
  s.tanks.push(t);
  return t;
}

/** play whole days, feeding at 8 and 18 and changing a quarter of the water every week */
function days(g: Game, n: number) {
  for (let h = 0; h < n * 24; h++) {
    g.tick(60);
    const hr = Math.floor(hourOf(g.state.time));
    for (const t of g.state.tanks) {
      if ((hr === 8 || hr === 18) && t.animals.length) act.feed(g, t);
      if (hr === 9) {
        act.scrape(g, t, 1);
        act.wipe(g, t, 1);
      }
      if (hr === 0 && h % (24 * 7) === 0) act.doWaterChange(g, t, 0.25);
    }
    g.events.length = 0;
  }
}

const grownLoad = (t: Tank) => t.animals.reduce((a, x) => a + bioloadOf(species(x.sp).cm, species(x.sp).body), 0);

describe('breeding', () => {
  it('never breeds a display tank past its filter, counting fry as the adults they become', () => {
    const s = shop(3);
    s.upgrades['breeding_nets'] = 2;
    const t = tank(s, 0, 'std_55', ['canister_filter', 'heater_300', 'led_planted'],
      [['malaysian_driftwood', 0.3, 1], ['amazon_sword', 0.1, 0], ['amazon_sword', 0.9, 0], ['amazon_frogbit', 0.4, 1], ['crypt_wendtii', 0.6, 2]],
      [['angelfish', 3], ['panda_cory', 8]]);
    const g = new Game(s);
    days(g, 20);
    const f = g.stats.get(t.id)!.facts;
    expect(grownLoad(t)).toBeLessThanOrEqual(f.bioCap * BAL.breedLoad);
    expect(stockCm(t, true)).toBeLessThanOrEqual(f.liters * BAL.breedCm);
  });

  it('lets a shrimp colony fill a nano and then stop, happy', () => {
    const s = shop(4);
    const t = tank(s, 0, 'nano_cube', ['sponge_filter', 'heater_50', 'led_planted'], [['java_moss', 0.5, 2], ['java_fern', 0.3, 1]], [['cherry_shrimp', 10]]);
    const g = new Game(s);
    days(g, 20);
    const st = g.stats.get(t.id)!;
    expect(t.animals.length).toBeGreaterThan(20);
    expect(stockCm(t, true)).toBeLessThanOrEqual(st.facts.liters * BAL.breedCm);
    expect(st.moods.get('cherry_shrimp')!.mood).toBeGreaterThan(0.85);
    expect(st.rating.notes.habitat ?? '').not.toContain('Overcrowded');
  });

  it('stops a big, well-filtered tank at a crowd the eye can follow', () => {
    const s = shop(5);
    s.upgrades['breeding_nets'] = 2;
    const t = tank(s, 0, 'show_180', ['canister_pro', 'canister_pro', 'titanium_heater', 'led_planted'],
      [['java_moss', 0.3, 2], ['java_moss', 0.6, 2], ['amazon_sword', 0.2, 0], ['amazon_sword', 0.8, 0], ['hornwort', 0.5, 0]],
      [['cherry_shrimp', 10], ['guppy', 6]]);
    const g = new Game(s);
    days(g, 40);
    expect(t.animals.length).toBeLessThanOrEqual(BAL.breedCrowd);
  });

  it('makes crowded fish unhappy', () => {
    const s = shop(6);
    const t = tank(s, 0, 'std_20l', ['canister_pro', 'heater_150', 'led_planted'], [['amazon_sword', 0.2, 0]], [['guppy', 60]]);
    const m = new Game(s).stats.get(t.id)!.moods.get('guppy')!;
    expect(m.reasons.some((r) => r.text.startsWith('crowded'))).toBe(true);
    expect(m.mood).toBeLessThan(0.8);
  });

  it('does not count fry toward a pair species\' limit, and rehomes them once grown', () => {
    const s = shop(7);
    const t = tank(s, 0, 'std_75', ['canister_filter', 'protein_skimmer', 'powerhead', 'heater_300', 'led_reef'],
      [['live_rock', 0.3, 1], ['live_rock', 0.7, 1]], [['neon_goby', 2]], 'marine');
    t.chem.sg = 1.025;
    t.chem.ph = 8.2;
    for (let i = 0; i < 5; i++) t.animals.push(newAnimal(s, 'neon_goby', { fry: true, bornHere: true }));
    const g = new Game(s);
    const m = g.stats.get(t.id)!.moods.get('neon_goby')!;
    expect(m.reasons.some((r) => r.text === 'too many of its own kind')).toBe(false);
    days(g, BAL.growDays + 1);
    expect(t.animals.filter((a) => a.sp === 'neon_goby' && !a.fry).length).toBeLessThanOrEqual(2);
    expect(s.holding.filter((a) => a.sp === 'neon_goby').length).toBeGreaterThanOrEqual(5);
  });

  it('rehomes only the grown young beyond the limit: a tank under it keeps them all', () => {
    const s = shop(7);
    const t = tank(s, 0, 'std_29', ['canister_filter', 'heater_300', 'led_basic'], [['hollow_log', 0.5, 1]], []);
    for (let i = 0; i < 3; i++) t.animals.push(newAnimal(s, 'german_blue_ram', { bornHere: true, age: 20 + i }));
    expect(species('german_blue_ram').max).toBe(4);
    expect(rehomeGrown(s, t)).toEqual([]);
    expect(t.animals.length).toBe(3);
    // two more grown up: one over the limit goes, the youngest
    for (let i = 0; i < 2; i++) t.animals.push(newAnimal(s, 'german_blue_ram', { bornHere: true, age: 5 + i }));
    expect(rehomeGrown(s, t)).toEqual([{ sp: 'german_blue_ram', n: 1 }]);
    expect(t.animals.length).toBe(4);
    expect(s.holding.map((a) => a.age)).toEqual([5]);
  });

  it('tells a stock rack what really stops it breeding: no room, a hungry filter intake', () => {
    const s = shop(8, 0);
    const full = tank(s, BAL.rackBay, 'std_10', ['sponge_filter', 'heater_50', 'led_basic'], [['java_moss', 0.3, 2], ['java_fern', 0.6, 1], ['amazon_sword', 0.8, 0]], [['guppy', 16]]);
    const intake = tank(s, BAL.rackBay + 1, 'std_20l', ['hob_filter', 'heater_150', 'led_basic'], [['java_moss', 0.3, 2], ['hornwort', 0.6, 1], ['amazon_frogbit', 0.5, 1]], [['guppy', 4]]);
    const g = new Game(s);
    for (const t of [full, intake]) for (const a of t.animals) a.health = 1;
    g.refreshAll(false);
    const ideas = (t: Tank) => breedingIdeas(t, g.stats.get(t.id)!.facts, g.stats.get(t.id)!.moods);
    expect(ideas(full)[0]).toMatch(/full/);
    expect(ideas(full).some((x) => /cover/.test(x))).toBe(false);
    expect(ideas(intake).join(' ')).toMatch(/intake/);
  });
});

describe('stock racks', () => {
  it('keep a breeding group back, so a sold-down colony still breeds', () => {
    const s = shop(8, 0);
    const t = tank(s, BAL.rackBay, 'std_10', ['sponge_filter', 'heater_50', 'led_basic'], [['java_moss', 0.5, 2]], [['cherry_shrimp', 10], ['guppy', 3]]);
    expect(reserveOf(t, 'cherry_shrimp')).toBe(10);
    expect(reserveOf(t, 'guppy')).toBe(3);
    expect(offers(t)).toEqual([]);
    tank(s, 0, 'std_20l', ['hob_filter', 'heater_150', 'led_planted'], [['amazon_sword', 0.2, 0]], [['neon_tetra', 10]]);
    const g = new Game(s);
    days(g, 20);
    expect(s.stats.sold ?? 0).toBeGreaterThan(20);
    expect(t.animals.filter((a) => a.sp === 'cherry_shrimp' && !a.fry).length).toBeGreaterThanOrEqual(10);
  });

  it('keep their best as breeders and sell the next best, priced by what is sold', () => {
    const s = shop(8, 0);
    const t = tank(s, BAL.rackBay, 'std_20l', ['sponge_filter', 'heater_150', 'led_basic'], [['java_moss', 0.5, 2]], []);
    for (let i = 0; i < 30; i++) t.animals.push(newAnimal(s, 'cherry_shrimp', { grade: i < 8 ? 3 : 0 }));
    expect(reserves(t)).toEqual([{ sp: 'cherry_shrimp', adults: 30, keep: 10 }]);
    // the eight solid-red shrimp are all in the reserve, so the offer is priced as a pale one
    expect(offers(t)).toMatchObject([{ sp: 'cherry_shrimp', n: 20, each: retailPrice('cherry_shrimp', 0.8, 1) }]);
    const d = tank(s, 0, 'std_20l', ['hob_filter', 'heater_150', 'led_planted'], [['amazon_sword', 0.2, 0]], [['neon_tetra', 10]]);
    const g = new Game(s);
    s.time = 9 * 60;
    const rng = new Rng(3);
    for (let m = 0; m < 600 && offers(t).length; m += 2) {
      s.time += 2;
      g.stats.get(d.id)!.visitorsPerHour = 200;
      stepSales(g, 2 / 60, rng);
    }
    const left = t.animals.filter((a) => a.sp === 'cherry_shrimp');
    expect(left.length).toBe(10);
    expect(left.filter((a) => a.grade === 3).length).toBe(8);
    expect(Math.max(...left.map(breedQuality))).toBe(1 + BAL.gradePrice * 3);
  });

  it('sell as many fish in long steps as in short ones', () => {
    const sold = (dt: number) => {
      let n = 0;
      for (const seed of [1, 2, 3]) {
        const s = shop(seed, 3);
        tank(s, BAL.rackBay, 'std_75', ['canister_pro', 'canister_pro', 'heater_300', 'led_basic'], [['java_moss', 0.5, 2]], [['cherry_shrimp', 2000]]);
        const d = tank(s, 0, 'show_180', ['canister_pro', 'titanium_heater', 'led_planted'], [['amazon_sword', 0.2, 0]], [['neon_tetra', 20]]);
        const g = new Game(s);
        s.time = 9 * 60;
        const rng = new Rng(seed);
        for (let m = 0; m < 300; m += dt) {
          s.time += dt;
          g.stats.get(d.id)!.visitorsPerHour = 270;
          stepSales(g, dt / 60, rng);
          g.events.length = 0;
        }
        n += s.stats.sold ?? 0;
      }
      return n;
    };
    const long = sold(2), short = sold(1 / 6);
    expect(Math.abs(long - short) / short).toBeLessThan(0.15);
  });
});

describe('care', () => {
  it('lets hunger ease in: no cliff at a day, and twice a day is best', () => {
    const s = shop(9, 0);
    const t = tank(s, 0, 'std_20l', ['hob_filter', 'heater_150', 'led_planted'], [['amazon_sword', 0.2, 0], ['java_fern', 0.6, 2]], [['neon_tetra', 10]]);
    const g = new Game(s);
    act.feed(g, t);
    const mood = () => g.refresh(t, false).moods.get('neon_tetra')!.mood;
    g.tick(12 * 60);
    const twice = mood();
    g.tick(11.8 * 60);
    const before = mood();
    g.tick(0.4 * 60);
    const after = mood();
    expect(twice).toBeGreaterThan(after);
    expect(before - after).toBeLessThan(0.03);
    expect(after).toBeGreaterThan(0.85);
  });

  it('puts the plants on a removed rock or log into storage, and a dismantled tank\'s too', () => {
    const s = shop(10, 1);
    const t = tank(s, 0, 'std_20l', ['hob_filter'], [], []);
    const wood = place(s, t, 'malaysian_driftwood', 100, 1);
    place(s, t, 'java_fern', 96, 1, { on: wood.uid, y: 14 });
    place(s, t, 'anubias_barteri', 104, 1, { on: wood.uid, y: 10 });
    place(s, t, 'amazon_sword', 40, 0);
    const g = new Game(s);
    expect(act.removeItem(g, t, wood.uid)).toBe('');
    expect(s.inventory).toMatchObject({ malaysian_driftwood: 1, java_fern: 1, anubias_barteri: 1 });
    expect(act.dismantleTank(g, t)).toBe('');
    expect(s.inventory['amazon_sword']).toBe(1);
  });

  it('keeps animals safe whatever the caller: bags block dismantling, every species is checked', () => {
    const s = shop(11, 3);
    const t = tank(s, 0, 'std_20l', ['hob_filter'], [], []);
    t.bags.push({ sp: 'neon_tetra', n: 10, until: s.time + 30 });
    const marine = tank(s, 1, 'std_20l', ['hob_filter'], [], [], 'marine');
    s.holding.push(newAnimal(s, 'ocellaris_clownfish'), newAnimal(s, 'neon_tetra'));
    const g = new Game(s);
    expect(act.dismantleTank(g, t)).not.toBe('');
    expect(s.tanks).toContain(t);
    expect(act.placeFromHolding(g, marine, s.holding.map((a) => a.uid))).not.toBe('');
    expect(s.holding.length).toBe(2);
    expect(marine.bags.length).toBe(0);
  });

  it('loses most of the cycle with the last filter', () => {
    const s = shop(12, 0);
    const t = tank(s, 0, 'std_20l', ['sponge_filter', 'hob_filter'], [], []);
    const g = new Game(s);
    act.removeEquip(g, t, 'sponge_filter');
    expect(t.chem.bacA).toBe(1);
    act.removeEquip(g, t, 'hob_filter');
    expect(t.chem.bacA).toBeLessThanOrEqual(BAL.bacNoFilter);
  });

  it('lets urchins graze sea lettuce, but not the kelp of a kelp forest', () => {
    const grow = (urchins: number) => {
      const s = shop(14, 4);
      const t = tank(s, 0, 'kelp_tower', ['life_support', 'chiller_exhibit', 'surge_device', 'metal_halide'],
        [['giant_kelp', 0.3, 0], ['sea_lettuce', 0.7, 2], ['granite_boulder', 0.6, 2]], [['purple_urchin', urchins]], 'marine');
      t.chem.temp = 15;
      t.chem.sg = 1.025;
      for (let h = 0; h < 200; h++) stepGrowth(t, facts(t, 12), 1);
      return t.items.map((p) => p.health);
    };
    const [kelp0, lettuce0] = grow(0), [kelp4, lettuce4] = grow(4);
    expect(kelp4).toBeCloseTo(kelp0, 6);
    expect(lettuce4).toBeLessThan(lettuce0 - 0.1);
  });

  it('grows both kelps in a lit kelp tower, from the size they are sold at', () => {
    for (const light of ['metal_halide', 'exhibit_skylight']) {
      const s = shop(15, 4);
      const t = tank(s, 0, 'kelp_tower', ['life_support', 'chiller_exhibit', 'surge_device', light], [['granite_boulder', 0.6, 2]], [], 'marine');
      t.chem.temp = 15;
      t.chem.sg = 1.025;
      // nothing in it yet to feed them: the surge's nutrients alone
      t.chem.no3 = 0;
      const g = new Game(s);
      const w = shell('kelp_tower').w;
      for (const [id, fx, layer] of [['giant_kelp', 0.2, 0], ['bull_kelp', 0.35, 1], ['giant_kelp', 0.8, 0]] as const) expect(act.buyItem(g, t, id, Math.round(fx * w), layer)).toBe('');
      const kelps = t.items.filter((p) => item(p.id).plant?.kind === 'kelp');
      expect(kelps.map((p) => p.size)).toEqual([0.7, 0.7, 0.7]);
      // the floats hold the blades up near the light, though the holdfast sits in the dim water
      const f = facts(t, 12);
      expect(f.par).toBeLessThan(25);
      for (const p of kelps) expect(plantPar(f, p)).toBeGreaterThan(100);
      for (let h = 0; h < 300; h++) stepGrowth(t, facts(t, 12), 1);
      for (const p of kelps) {
        expect(p.health, `${p.id} under ${light}`).toBeGreaterThan(0.9);
        expect(p.size, `${p.id} under ${light}`).toBeGreaterThan(1);
      }
      expect(g.refresh(t).rating.notes.habitat ?? '').not.toMatch(/want different light/);
    }
  });

  it('still reads the light halfway up every other plant, so tall plants in ordinary tanks are as they were', () => {
    const s = shop(16, 5);
    const fresh = tank(s, 0, 'std_55', ['canister_filter', 'heater_300', 'led_planted'], [], []);
    const reef = tank(s, 1, 'std_75', ['canister_filter', 'heater_300', 'led_reef'], [], [], 'marine');
    const others = ITEMS.filter((i) => i.plant && i.plant.kind !== 'kelp' && i.place !== 'surface' && i.place !== 'land' && i.place !== 'hang');
    expect(others.length).toBeGreaterThan(20);
    for (const it of others) {
      const t = it.water.includes('fresh') ? fresh : reef;
      const p = place(s, t, it.id, 100, 0, { size: 1.3 });
      const f = facts(t, 12);
      expect(plantPar(f, p), it.id).toBeCloseTo(parAt(f, f.geom.h - p.y - it.h * p.size * 0.5), 9);
    }
  });

  it('lets plant eaters graze soft plants but leave anubias alone', () => {
    const s = shop(13, 3);
    const t = tank(s, 0, 'std_75', ['canister_filter', 'heater_300', 'led_planted'], [['amazon_sword', 0.3, 0], ['anubias_barteri', 0.7, 2]], [['silver_dollar', 5]]);
    const g = new Game(s);
    days(g, 6);
    const sword = t.items.find((p) => p.id === 'amazon_sword')!, anubias = t.items.find((p) => p.id === 'anubias_barteri')!;
    expect(sword.health).toBeLessThan(anubias.health);
  });
});
