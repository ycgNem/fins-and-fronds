// Balance and progression: scripted playthroughs (tests/bot.ts) must reach each tier in the planned
// time, keep coins meaningful, pay their way on expeditions and keep offline income capped; and
// every letter must ask for something the game can actually provide by the letter's tier.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, hasItem, hasShell, hasSpecies, hasUpgrade, ITEMS, REGIONS, REQUESTS, SPECIES, UPGRADES } from '../src/data';
import { BAL, sizeFactor } from '../src/sim/balance';
import { Game } from '../src/sim/Game';
import { newGame, showcaseTank } from '../src/sim/newgame';
import * as act from '../src/sim/actions';
import { playthrough, type Run } from './bot';

const runs: Run[] = [1, 2, 3].map((seed) => playthrough(seed, 70));
const at = (r: Run, tier: number) => r.milestones.find((m) => m.tier === tier);

describe('time to tier (estimated real minutes of play)', () => {
  it('reaches the Neighborhood Fish Shop in about 30-45 minutes', () => {
    for (const r of runs) {
      const m = at(r, 1)!;
      expect(m, r.log.slice(-5).join('\n')).toBeDefined();
      expect(m.realMin).toBeGreaterThanOrEqual(28);
      expect(m.realMin).toBeLessThanOrEqual(50);
    }
  });

  it('reaches saltwater (Town Aquarium) in about 3-4 hours', () => {
    for (const r of runs) {
      const m = at(r, 3)!;
      expect(m).toBeDefined();
      expect(m.realMin).toBeGreaterThanOrEqual(165);
      expect(m.realMin).toBeLessThanOrEqual(250);
    }
  });

  it('climbs every tier in order and reaches the Grand Oceanarium within 70 game days', () => {
    for (const r of runs) {
      expect(r.milestones.map((m) => m.tier)).toEqual([0, 1, 2, 3, 4, 5]);
      for (let i = 1; i < r.milestones.length; i++) expect(r.milestones[i].day).toBeGreaterThan(r.milestones[i - 1].day);
    }
  });
});

describe('coins', () => {
  it('stay tight early and never run away before the last tier', () => {
    for (const r of runs) {
      // the first week is spent building, not banking
      expect(Math.max(...r.coins.slice(0, 7))).toBeLessThan(1500);
      // arriving at the top tier with savings for a flagship exhibit, not a mountain
      expect(at(r, 5)!.coins).toBeLessThan(150000);
      expect(at(r, 3)!.coins).toBeLessThan(30000);
    }
  });

  it('upkeep is charged and stays a modest share of income', () => {
    const g = runs[0].game;
    const st = g.state.stats;
    expect(st.upkeep ?? 0).toBeGreaterThan(0);
    expect((st.upkeep ?? 0) / st.coins).toBeLessThan(0.2);
  });

  it('bigger tanks draw more, but an exhibit is not worth hundreds of small tanks', () => {
    expect(sizeFactor(76)).toBeCloseTo(1, 5);
    expect(sizeFactor(284)).toBeGreaterThan(1.5);
    expect(sizeFactor(4000)).toBeLessThan(4);
    expect(sizeFactor(200000)).toBeLessThan(7);
  });

  it('expeditions roughly pay for themselves when the catch is sold', () => {
    const all = runs.flatMap((r) => r.expeditions.filter((e) => e.value >= 0));
    expect(all.length).toBeGreaterThan(10);
    const cost = all.reduce((a, e) => a + e.cost, 0), value = all.reduce((a, e) => a + e.value, 0);
    expect(value / cost).toBeGreaterThan(0.9);
  });

  it('offline income is half an open hour per real hour, capped', () => {
    const s = newGame(5);
    s.tutorial.done = true;
    showcaseTank(s);
    const g = new Game(s);
    const perHour = [...g.stats.values()].reduce((a, st) => a + st.coinsPerHour, 0);
    const before = s.coins;
    const earned = g.offlineIncome(100);
    expect(earned).toBe(Math.round(perHour * BAL.offlineCapHours * BAL.offlineShare));
    expect(s.coins - before).toBe(earned);
    expect(g.offlineIncome(0.01)).toBe(0);
  });
});

describe('letters', () => {
  const speciesBy = (tier: number) => SPECIES.filter((s) => s.tier <= tier);
  it('every letter asks for something available by its tier, and every unlock exists', () => {
    for (const r of REQUESTS) {
      const c = r.check;
      const avail = speciesBy(r.tier + 1);
      const why = `${r.id}: ${JSON.stringify(c)}`;
      switch (c.t) {
        case 'archetype':
          if (c.id) expect(ARCHETYPES.find((a) => a.id === c.id)?.tier ?? 99, why).toBeLessThanOrEqual(r.tier);
          if (c.family) expect(ARCHETYPES.some((a) => a.family === c.family && a.tier <= r.tier), why).toBe(true);
          break;
        case 'species':
          expect(hasSpecies(c.id), why).toBe(true);
          expect(SPECIES.find((s) => s.id === c.id)!.tier, why).toBeLessThanOrEqual(r.tier + 1);
          break;
        case 'tag': expect(avail.filter((s) => s.tags.includes(c.tag)).length, why).toBeGreaterThan(0); break;
        case 'kind': expect(avail.some((s) => s.kind === c.kind), why).toBe(true); break;
        case 'big_fish': expect(avail.some((s) => s.cm >= c.cm), why).toBe(true); break;
        case 'region_tank': expect(REGIONS.some((g) => g.continent === c.continent), why).toBe(true); break;
        case 'decor_set': {
          expect(ITEMS.some((i) => i.tags?.includes(c.tag)), why).toBe(true);
          const set = UPGRADES.find((u) => u.id === c.tag);
          if (set) expect(set.levels[0].tier, why).toBeLessThanOrEqual(r.tier);
          break;
        }
        case 'corals': expect(ITEMS.filter((i) => i.cat === 'coral' && i.tier <= r.tier).length, why).toBeGreaterThanOrEqual(c.min); break;
        default: break;
      }
      const u = r.reward.unlock;
      if (u) expect(hasUpgrade(u) || hasItem(u) || hasSpecies(u) || hasShell(u), `${r.id} unlock ${u}`).toBe(true);
    }
  });

  it('keep coming: asks nobody can answer make room, so a player who never builds more still gets new letters', () => {
    const s = newGame(8);
    s.tutorial.done = true;
    showcaseTank(s);
    const g = new Game(s);
    const seen = new Set<string>();
    for (let d = 0; d < 40; d++) {
      g.tick(1440);
      for (const l of s.letters) {
        seen.add(l.id);
        if (l.ready) act.claimLetter(g, l.id);
      }
    }
    expect(seen.size).toBeGreaterThan(8);
  });
});
