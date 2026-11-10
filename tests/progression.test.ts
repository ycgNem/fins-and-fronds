// Balance and progression: scripted playthroughs (tests/bot.ts) must reach each tier in the planned
// time, keep coins meaningful, pay their way on expeditions and keep offline income capped; every
// letter must ask for something the game can actually provide by the letter's tier; and the story
// (thank-yous, replies, keepsakes, the finale letter), the coin sinks, the week and the
// expeditions must behave.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, CORRESPONDENTS, hasItem, hasShell, hasSpecies, hasUpgrade, ITEMS, REGIONS, request, REQUESTS, SHELLS, species, SPECIES, substrate, TIERS, UPGRADES } from '../src/data';
import { PROJECTS } from '../src/data/progression';
import type { RegionId } from '../src/data/types';
import { Rng } from '../src/engine/rng';
import { BAL, sizeFactor } from '../src/sim/balance';
import { itemsForSale, substratePrice } from '../src/sim/catalog';
import { catchable, freshness, orderable, resolveExpedition, startExpedition } from '../src/sim/expeditions';
import { Game } from '../src/sim/Game';
import { applyUnlock, checkRequest, letterText, nextRequest } from '../src/sim/letters';
import { newAnimal } from '../src/sim/life';
import { emptyTank, newGame, place, showcaseTank } from '../src/sim/newgame';
import { fundProject, projectCost, projectRep } from '../src/sim/projects';
import { dayOf, type Expedition, hourOf, type Letter } from '../src/sim/state';
import { dayName, weekEvent } from '../src/sim/week';
import * as act from '../src/sim/actions';
import { playthrough, type Run } from './bot';

const runs: Run[] = [1, 2, 3].map((seed) => playthrough(seed, 70));
const at = (r: Run, tier: number) => r.milestones.find((m) => m.tier === tier);

describe('time to tier (estimated real minutes of play)', () => {
  it('reaches the Neighborhood Fish Shop in about 30-45 minutes', () => {
    for (const r of runs) {
      const m = at(r, 1)!;
      expect(m, r.log.slice(-5).join('\n')).toBeDefined();
      // (rarer hitchhiking pest snails, 2026-10-21, made the bot about 3% quicker)
      expect(m.realMin).toBeGreaterThanOrEqual(26);
      expect(m.realMin).toBeLessThanOrEqual(50);
    }
  });

  it('reaches saltwater (Town Aquarium) in about 3-4 hours', () => {
    for (const r of runs) {
      const m = at(r, 3)!;
      expect(m).toBeDefined();
      expect(m.realMin).toBeGreaterThanOrEqual(160);
      expect(m.realMin).toBeLessThanOrEqual(250);
    }
  });

  it('climbs every tier in order and reaches the Grand Oceanarium within 70 game days', () => {
    for (const r of runs) {
      expect(r.milestones.map((m) => m.tier)).toEqual([0, 1, 2, 3, 4, 5]);
      for (let i = 1; i < r.milestones.length; i++) expect(r.milestones[i].day).toBeGreaterThan(r.milestones[i - 1].day);
    }
  });

  it('has no long empty waits: letters, discoveries and projects keep the climb moving', () => {
    // (before the projects, the replies and the thank-you letters, 2 -> 3 took about 92 minutes
    // and 4 -> 5 about 148, nearly all of it waiting for visitors)
    for (const r of runs) {
      expect(at(r, 3)!.realMin - at(r, 2)!.realMin).toBeLessThan(100);
      expect(at(r, 5)!.realMin - at(r, 4)!.realMin).toBeLessThan(130);
      expect(at(r, 5)!.realMin).toBeGreaterThan(270);
    }
  });
});

describe('coins', () => {
  it('stay tight early and never run away before the last tier', () => {
    for (const r of runs) {
      // the first week is spent building, not banking
      expect(Math.max(...r.coins.slice(0, 7))).toBeLessThan(1500);
      // arriving at the top tier with savings for a flagship exhibit, not a mountain (conservation
      // projects take the surplus: before them the bot reached tier 5 with about 77,000)
      expect(at(r, 5)!.coins).toBeLessThan(40000);
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

describe('the story', () => {
  it('a letter the shop already answers still arrives, as a thank-you ready to send', () => {
    const s = newGame(3);
    s.tutorial.done = true;
    s.tier = 3;
    showcaseTank(s);
    // everything answered but Tomás's pond (already built) and a goal the shop has not met
    s.lettersDone = REQUESTS.filter((r) => !['koi', 'tomas_names', 'touch'].includes(r.id)).map((r) => r.id);
    const g = new Game(s);
    const pond = emptyTank(s, 1, 'koi_pond', 'fresh');
    s.tanks.push(pond);
    pond.equip = ['pond_filter', 'air_pump', 'led_basic'];
    pond.chem.bacA = pond.chem.bacB = 1;
    pond.set.heater = 18;
    place(s, pond, 'river_boulder', 100, 1);
    place(s, pond, 'hardy_water_lily', 300, 1);
    place(s, pond, 'sacred_lotus', 500, 0);
    for (let i = 0; i < 4; i++) pond.animals.push(newAnimal(s, 'koi'));
    g.refreshAll(false);
    let arrived: Letter | undefined;
    for (let d = 0; d < 20 && !arrived; d++) {
      g.tick(1440);
      arrived = s.letters.find((l) => l.id === 'koi');
      for (const l of [...s.letters]) if (l.ready && l.id !== 'koi') act.claimLetter(g, l.id);
    }
    expect(arrived?.ready).toBe(true);
    expect(arrived?.met).toBe(true);
    expect(letterText(request('koi'), arrived!)).toBe(request('koi').met);
    // and Tomás writes back a day later, names the koi and leaves his keepsake
    expect(act.claimLetter(g, 'koi')).toBe('');
    for (let d = 0; d < 10 && !s.letters.some((l) => l.id === 'tomas_names'); d++) g.tick(720);
    const reply = s.letters.find((l) => l.id === 'tomas_names')!;
    expect(reply).toBeDefined();
    expect(reply.arrived - s.lettersKept!.koi.at).toBeGreaterThanOrEqual(BAL.replyDelay);
    expect(act.claimLetter(g, 'tomas_names')).toBe('');
    expect(pond.animals.filter((a) => a.name).length).toBe(3);
    expect(s.keepsakes).toContain('tomas');
  });

  it('every correspondent has a story that ends in a keepsake, and replies follow real letters', () => {
    for (const c of CORRESPONDENTS) expect(REQUESTS.some((r) => r.from === c.id && r.keepsake), c.id).toBe(true);
    for (const r of REQUESTS) {
      if (r.after) expect(REQUESTS.find((q) => q.id === r.after)?.from, r.id).toBe(r.from);
      if (r.check.t !== 'none') expect(r.met, `${r.id} needs a thank-you line`).toBeTruthy();
    }
  });

  it('letters keep coming to the end, and each pays a twentieth to a tenth of the climb to the next tier', () => {
    for (let tier = 2; tier <= 5; tier++) expect(REQUESTS.filter((r) => r.tier === tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(6);
    for (let tier = 1; tier <= 4; tier++) {
      const asks = REQUESTS.filter((r) => r.tier === tier && r.check.t !== 'none');
      const avg = asks.reduce((a, r) => a + r.reward.rep, 0) / asks.length;
      const gap = TIERS[tier + 1].rep - TIERS[tier].rep;
      expect(avg / gap, `tier ${tier}`).toBeGreaterThan(0.05);
      expect(avg / gap, `tier ${tier}`).toBeLessThan(0.15);
    }
  });

  it('Pip writes about pest snails, not Aiptasia, and the plant dip counts as keeping them out', () => {
    const s = newGame(4);
    s.tutorial.done = true;
    s.tier = 3;
    const g = new Game(s);
    const reef = emptyTank(s, 0, 'std_75', 'marine');
    s.tanks.push(reef);
    reef.pests.aiptasia = 2;
    reef.pests.had = true;
    g.refreshAll(false);
    expect(checkRequest({ t: 'pests_clear' }, s, g.stats)).toBe(false);
    expect(nextRequest({ ...s, lettersDone: REQUESTS.filter((r) => r.id !== 'assassins').map((r) => r.id) }, 0.5)).toBeNull();
    // with the dip bought first, snails are caught at the door, and go in the codex
    s.upgrades.quarantine = 1;
    s.coins = 1e6;
    const fresh = emptyTank(s, 1, 'std_20l', 'fresh');
    s.tanks.push(fresh);
    for (let i = 0; i < 80 && !s.dipCaught; i++) act.buyItem(g, fresh, 'java_fern', 100, 1);
    expect(s.dipCaught).toBeGreaterThan(0);
    expect(fresh.pests.snails).toBe(0);
    expect(s.codex.species).toContain('bladder_snail');
    expect(checkRequest({ t: 'pests_clear' }, s, g.stats)).toBe(true);
  });

  it('the plants-alone dare wants no animals at all, and the Frodo stones come only from the club', () => {
    const s = newGame(6);
    s.tier = 1;
    expect(itemsForSale(s).some((i) => i.id === 'frodo_stone')).toBe(false);
    expect(applyUnlock(s, 'frodo_stone')).toBe('Frodo Stone');
    expect(itemsForSale(s).some((i) => i.id === 'frodo_stone')).toBe(true);
    expect(request('no_fish').check.t).toBe('no_animals');
  });

  it('decor sets sell only with their upgrade, and a whole set draws more visitors', () => {
    const s = newGame(7);
    const toys = ['toy_castle', 'bubbling_clam'];
    expect(itemsForSale(s).filter((i) => toys.includes(i.id))).toEqual([]);
    s.upgrades.set_toybox = 1;
    expect(itemsForSale(s).filter((i) => toys.includes(i.id)).length).toBe(2);
  });

  it('Ida\'s last letter waits for the Grand Oceanarium finale', () => {
    const s = newGame(9);
    s.tier = 5;
    s.lettersDone = REQUESTS.filter((r) => r.id !== 'ida_last').map((r) => r.id);
    expect(nextRequest(s, 0.5)).toBeNull();
    s.seen.push('finale');
    expect(nextRequest(s, 0.5)).toBe('ida_last');
  });
});

describe('coins and days', () => {
  it('conservation projects take coins for reputation, a little dearer each time', () => {
    const s = newGame(10);
    s.tutorial.done = true;
    s.tier = 2;
    s.coins = 10000;
    showcaseTank(s);
    const g = new Game(s);
    const p = PROJECTS.find((q) => q.id === 'river')!;
    const vph = g.stats.get(s.tanks[0].id)!.visitorsPerHour;
    const [c1, r1] = [projectCost(s, p), projectRep(s, p)];
    const rep = s.rep;
    expect(fundProject(g, 'river')).toBe('');
    expect(s.rep - rep).toBe(r1);
    expect(s.coins).toBe(10000 - c1);
    expect(projectCost(s, p)).toBeGreaterThan(c1);
    expect(g.stats.get(s.tanks[0].id)!.visitorsPerHour).toBeGreaterThan(vph);
    expect(fundProject(g, 'reserve')).not.toBe('');
  });

  it('stock racks are behind the counter: no visitors, nose prints or guestbook lines of their own', () => {
    const s = newGame(9);
    s.tutorial.done = true;
    const g = new Game(s);
    for (const bay of [0, BAL.rackBay]) {
      const t = emptyTank(s, bay, 'std_20l', 'fresh');
      s.tanks.push(t);
      t.equip = ['hob_filter', 'heater_150', 'led_planted'];
      t.chem.bacA = t.chem.bacB = 1;
      place(s, t, 'java_fern', 100, 1);
      for (let i = 0; i < 8; i++) t.animals.push(newAnimal(s, 'guppy'));
    }
    g.refreshAll(false);
    g.tick(1440);
    const [shown, rack] = s.tanks;
    expect(g.stats.get(shown.id)!.visitorsPerHour).toBeGreaterThan(0);
    expect(g.stats.get(rack.id)!.visitorsPerHour).toBe(0);
    expect(rack.smudge).toBe(0);
    expect(s.guestbook.some((e) => e.tank === rack.id)).toBe(false);
  });

  it('substrate is priced by floor area, never far beyond the tank itself', () => {
    const s = newGame(1);
    for (const sh of SHELLS) {
      const t = emptyTank(s, 0, sh.id, 'marine');
      expect(substratePrice(t, substrate('live_sand')), sh.id).toBeLessThanOrEqual(Math.ceil(sh.price * BAL.substrateCap));
    }
  });

  it('saltwater animals cost more than freshwater ones of the same tier and size', () => {
    const median = (w: string, tier: number) => {
      const l = SPECIES.filter((x) => x.water === w && x.kind === 'fish' && x.tier === tier).map((x) => x.price).sort((a, b) => a - b);
      return l[Math.floor(l.length / 2)];
    };
    // the reef fish of the Town Aquarium cost at least what the Aquarium Store's freshwater ones do
    expect(median('marine', 3)).toBeGreaterThanOrEqual(median('fresh', 2) * 0.9);
    expect(species('ocellaris_clownfish').price).toBeGreaterThan(species('neon_tetra').price * 2);
  });

  it('the week has names and visiting days, and the closed night can be slept through', () => {
    expect(dayName(0)).toBe('Monday');
    expect(weekEvent(4 * 1440 + 600)?.id).toBe('school');
    const s = newGame(12);
    s.tutorial.done = true;
    showcaseTank(s);
    const g = new Game(s);
    g.tick(20 * 60 - s.time);
    const day = dayOf(s.time);
    expect(g.sleepUntilOpen()).toBeGreaterThan(0);
    expect(dayOf(s.time)).toBe(day + 1);
    expect(hourOf(s.time)).toBeCloseTo(BAL.openHour, 5);
    expect(g.sleepUntilOpen()).toBe(0);
  });

  it('the cleaning crew does the morning round on every tank', () => {
    const s = newGame(13);
    s.tutorial.done = true;
    showcaseTank(s);
    s.upgrades.cleaning_crew = 2;
    const g = new Game(s);
    const t = s.tanks[0];
    g.tick(23 * 60 - s.time);
    t.smudge = 0.9;
    t.chem.glass = 0.9;
    g.tick(10 * 60);
    expect(t.smudge).toBeLessThan(0.2);
    expect(t.chem.glass).toBeLessThan(0.2);
  });
});

describe('expeditions', () => {
  it('bring back something new, on one line per species, worth about what the trip cost', () => {
    for (const r of REGIONS) {
      let value = 0, cost = 0;
      for (let k = 0; k < 60; k++) {
        const s = newGame(300 + k);
        s.tier = Math.max(1, r.expedition.tier);
        const e = { id: 1, region: r.id, start: 0, end: 0 } as Expedition;
        resolveExpedition(s, e, new Rng(k + 7));
        const caught = e.finds!.filter((f) => f.kind === 'species');
        expect(new Set(caught.map((f) => f.id)).size, r.id).toBe(caught.length);
        // something the supplier does not sell, whenever the region has it
        const before = newGame(1);
        before.tier = s.tier;
        if (catchable(before, r.id as RegionId).animals.some((sp) => !orderable(before, sp))) expect(caught.some((f) => !orderable(before, species(f.id))), r.id).toBe(true);
        value += caught.reduce((a, f) => a + species(f.id).price * BAL.wildPremium * f.n, 0);
        cost += r.expedition.cost;
      }
      expect(value / cost, r.id).toBeGreaterThan(0.75);
      expect(value / cost, r.id).toBeLessThan(1.8);
    }
  });

  it('a region fished again too soon gives less until it recovers', () => {
    const s = newGame(14);
    s.tier = 1;
    s.coins = 1e5;
    expect(freshness(s, 'amazon')).toBe(1);
    startExpedition(s, 'amazon');
    s.expeditions = [];
    startExpedition(s, 'amazon');
    expect(freshness(s, 'amazon')).toBeLessThan(1);
  });
});
