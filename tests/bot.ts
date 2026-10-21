// A scripted player for balance runs (tests/progression.test.ts, scripts/playthrough.ts). It builds
// the tanks a sensible player would, keeps them fed and clean, answers letters, buys upgrades,
// stocks a breeding tank and sends expeditions, and logs when each tier arrives in game days and
// in estimated real minutes of play: 3x speed while the shop is open, 10x while it is closed, plus
// a few minutes for the tour and for each tank scaped.
import { equip, item, region, REGIONS, shell, species, TIERS, upgrade } from '../src/data';
import type { RegionId, Water } from '../src/data/types';
import * as act from '../src/sim/actions';
import { BAL } from '../src/sim/balance';
import { baysUnlocked, shellPrice } from '../src/sim/catalog';
import { canExpedition } from '../src/sim/expeditions';
import { Game } from '../src/sim/Game';
import { newGame } from '../src/sim/newgame';
import { isStock } from '../src/sim/sales';
import { dayOf, hourOf, type Tank } from '../src/sim/state';
import { cycleProgress } from '../src/sim/water';
import { isOpen } from '../src/sim/visitors';

interface Template {
  name: string;
  tier: number;
  water: Water;
  shell: string;
  gear: string[];
  /** item, x as a share of the tank's width, depth layer */
  items: [string, number, 0 | 1 | 2][];
  stock: [string, number][];
  /** thermostat target, for cold tanks with a chiller */
  temp?: number;
}

/** display tanks in the order the bot builds them, one per free bay */
export const DISPLAYS: Template[] = [
  {
    name: 'Amazon 20', tier: 0, water: 'fresh', shell: 'std_20l', gear: ['hob_filter', 'heater_150', 'led_planted'],
    items: [['malaysian_driftwood', 0.35, 1], ['amazon_sword', 0.15, 0], ['amazon_sword', 0.82, 0], ['crypt_wendtii', 0.65, 2], ['amazon_frogbit', 0.5, 1], ['vallisneria', 0.05, 0]],
    stock: [['neon_tetra', 10], ['bronze_cory', 6], ['otocinclus', 3]],
  },
  {
    name: 'Livebearers 29', tier: 0, water: 'fresh', shell: 'std_29', gear: ['hob_filter', 'heater_150', 'led_planted'],
    items: [['water_wisteria', 0.2, 0], ['hornwort', 0.8, 0], ['vallisneria', 0.05, 0], ['java_fern', 0.5, 2], ['anubias_barteri', 0.65, 2], ['spider_wood', 0.4, 1]],
    stock: [['guppy', 6], ['platy', 6], ['swordtail', 4], ['black_molly', 4]],
  },
  {
    name: 'Amazon 55', tier: 1, water: 'fresh', shell: 'std_55', gear: ['canister_filter', 'heater_300', 'led_planted'],
    items: [['malaysian_driftwood', 0.3, 1], ['malaysian_driftwood', 0.7, 1], ['amazon_sword', 0.1, 0], ['amazon_sword', 0.9, 0], ['ozelot_sword', 0.5, 0], ['amazon_frogbit', 0.4, 1], ['crypt_wendtii', 0.6, 2]],
    stock: [['rummynose_tetra', 12], ['angelfish', 3], ['panda_cory', 8], ['bristlenose_pleco', 1]],
  },
  {
    name: 'Goldfish 40B', tier: 1, water: 'fresh', shell: 'std_40b', gear: ['canister_filter', 'led_basic', 'air_pump'],
    items: [['river_boulder', 0.3, 1], ['river_boulder', 0.75, 2], ['vallisneria', 0.1, 0], ['anubias_barteri', 0.5, 2], ['java_fern', 0.6, 1]],
    stock: [['oranda', 3]],
  },
  {
    name: 'Reef rock 75', tier: 3, water: 'marine', shell: 'std_75', gear: ['canister_filter', 'protein_skimmer', 'powerhead', 'heater_300', 'led_reef'],
    items: [['live_rock', 0.3, 1], ['live_rock', 0.7, 1], ['dry_reef_rock', 0.5, 2]],
    stock: [['ocellaris_clownfish', 2], ['royal_gramma', 1], ['blue_chromis', 5], ['yellow_watchman_goby', 1], ['yellow_tang', 1]],
  },
  {
    name: 'Soft corals 75', tier: 3, water: 'marine', shell: 'std_75', gear: ['canister_filter', 'protein_skimmer', 'powerhead', 'heater_300', 'led_reef'],
    items: [['live_rock', 0.25, 1], ['live_rock', 0.6, 1], ['dry_reef_rock', 0.85, 2], ['zoanthids', 0.3, 2], ['toadstool_leather', 0.6, 1], ['green_star_polyps', 0.45, 2], ['mushroom_coral', 0.75, 2], ['kenya_tree', 0.2, 0]],
    stock: [['ocellaris_clownfish', 2], ['banggai_cardinal', 3], ['firefish', 1], ['neon_goby', 2]],
  },
  {
    name: 'Koi pond', tier: 3, water: 'fresh', shell: 'koi_pond', gear: ['pond_filter', 'air_pump', 'led_basic'],
    items: [['river_boulder', 0.15, 1], ['river_boulder', 0.85, 2], ['hardy_water_lily', 0.35, 1], ['hardy_water_lily', 0.65, 1], ['sacred_lotus', 0.5, 0]],
    stock: [['koi', 4]],
  },
  {
    name: 'Touch pool', tier: 3, water: 'marine', shell: 'touch_pool', gear: ['canister_pro', 'chiller_small', 'protein_skimmer', 'led_basic'],
    items: [['granite_boulder', 0.3, 1], ['barnacle_rock', 0.7, 1], ['granite_boulder', 0.5, 2]],
    stock: [['ochre_star', 2], ['purple_urchin', 3], ['blueband_hermit', 5], ['tidepool_sculpin', 2]], temp: 15,
  },
  {
    name: 'Kreisel', tier: 4, water: 'marine', shell: 'kreisel_200', gear: ['kreisel_loop', 'chiller_small', 'led_reef'],
    items: [], stock: [['moon_jelly', 6]], temp: 18,
  },
  {
    name: 'Kelp tower', tier: 4, water: 'marine', shell: 'kelp_tower', gear: ['life_support', 'chiller_large', 'surge_device', 'metal_halide'],
    items: [['giant_kelp', 0.2, 0], ['giant_kelp', 0.5, 0], ['giant_kelp', 0.8, 0], ['bull_kelp', 0.35, 1], ['granite_boulder', 0.6, 2]],
    stock: [['garibaldi', 3], ['blue_rockfish', 2], ['ochre_star', 3], ['purple_urchin', 4]], temp: 15,
  },
  {
    name: 'Ocean window', tier: 5, water: 'marine', shell: 'ocean_window', gear: ['life_support', 'chiller_exhibit', 'surge_device', 'exhibit_skylight'],
    items: [['granite_boulder', 0.3, 2], ['live_rock', 0.7, 2]],
    stock: [['pacific_sardine', 40], ['leopard_shark', 2]], temp: 17,
  },
];

const SHRIMP_STOCK: Template = {
  name: 'Shrimp stock', tier: 0, water: 'fresh', shell: 'std_20l', gear: ['sponge_filter', 'heater_150', 'led_basic'],
  items: [['java_moss', 0.5, 2], ['christmas_moss', 0.2, 1]],
  stock: [['cherry_shrimp', 12]],
};

const STOCK_TANK: Template = {
  name: 'Guppy stock', tier: 0, water: 'fresh', shell: 'std_20l', gear: ['sponge_filter', 'heater_150', 'led_basic'],
  items: [['java_moss', 0.5, 2], ['hornwort', 0.2, 0]],
  stock: [['guppy', 8]],
};

/** what a careful player buys, in order, once the coins are there: upgrade and the level to reach */
const UPGRADE_ORDER: [string, number][] = [
  ['test_kits', 1], ['benches', 1], ['auto_feeders', 1], ['quarantine', 1], ['placards', 1], ['seeded_media', 1], ['extra_bays', 1], ['donation_box', 1],
  ['glazier', 1], ['auto_water', 1], ['better_nets', 1], ['benches', 2], ['night_openings', 1], ['gift_shop', 1], ['seeded_media', 2], ['extra_bays', 2], ['donation_box', 2],
  ['conservation', 1], ['extra_bays', 3], ['faster_boat', 1], ['conservation', 2], ['benches', 3], ['gift_shop', 2], ['extra_bays', 4], ['conservation', 3], ['extra_bays', 5], ['conservation', 4],
];

export interface Milestone { tier: number; day: number; realMin: number; coins: number; tanks: number }

export interface Run {
  milestones: Milestone[];
  log: string[];
  /** coins at the start of each game day */
  coins: number[];
  letters: string[];
  expeditions: { region: string; cost: number; value: number }[];
  game: Game;
  realMin: number;
}

function templateCost(g: Game, tp: Template): number {
  const s = g.state;
  return shellPrice(s, shell(tp.shell)) + tp.gear.reduce((a, e) => a + equip(e).price, 0) + tp.items.reduce((a, [id]) => a + item(id).price, 0) + tp.stock.reduce((a, [sp, n]) => a + species(sp).price * n, 0);
}

/** play for `days` game days (or until `untilTier` is reached) and report */
export function playthrough(seed: number, days: number, untilTier = 99): Run {
  const s = newGame(seed);
  s.tutorial.done = true;
  s.seen = ['intro', 'town'];
  const g = new Game(s);
  const run: Run = { milestones: [{ tier: 0, day: 0, realMin: 0, coins: s.coins, tanks: 0 }], log: [], coins: [], letters: [], expeditions: [], game: g, realMin: 0 };
  // the tour: about six minutes to build, scape and stock the first tank
  let realSec = 6 * 60;
  const pending = new Map<number, [string, number][]>();
  let builtDisplays = 0;
  let lastFeed = -1, lastCare = -1;
  const changedAt = new Map<number, number>();
  const say = (m: string) => run.log.push(`d${dayOf(s.time)} ${String(hourOf(s.time)).padStart(2, '0')}h ${Math.round(s.coins)}c ${Math.round(s.rep)}r: ${m}`);

  const build = (tp: Template, bay: number, seedWithSponge: boolean): Tank | undefined => {
    if (act.buildTank(g, bay, tp.shell, tp.water)) return undefined;
    const t = s.tanks[s.tanks.length - 1];
    for (const e of tp.gear) act.buyEquip(g, t, e);
    const w = shell(tp.shell).w;
    for (const [id, fx, layer] of tp.items) act.buyItem(g, t, id, Math.round(fx * w), layer);
    if (tp.temp !== undefined) act.setHeater(g, t, tp.temp);
    if (seedWithSponge) {
      // Ida's sponge in the tour
      t.chem.bacA = Math.max(t.chem.bacA, 0.96);
      t.chem.bacB = Math.max(t.chem.bacB, 0.96);
    } else if (act.seedSource(g, t)) act.seedFilter(g, t);
    else act.dose(g, t, 'bacteria');
    g.refresh(t);
    pending.set(t.id, [...tp.stock]);
    realSec += 3 * 60;
    say(`built ${tp.name} in bay ${bay}`);
    return t;
  };

  build(DISPLAYS[0], 0, true);
  builtDisplays = 1;

  const endMin = s.time + days * 1440;
  while (s.time < endMin && s.tier < untilTier) {
    const step = 30;
    const open = isOpen(s, s.time);
    g.tick(step);
    realSec += step / (open ? 3 : 10);
    const day = dayOf(s.time), hour = hourOf(s.time);
    if (run.coins.length < day) run.coins.push(Math.round(s.coins));
    const last = run.milestones[run.milestones.length - 1];
    if (s.tier > last.tier) {
      run.milestones.push({ tier: s.tier, day: Math.round(((s.time - 480) / 1440) * 10) / 10, realMin: Math.round(realSec / 6) / 10, coins: Math.round(s.coins), tanks: s.tanks.length });
      say(`TIER ${s.tier} ${TIERS[s.tier].name}`);
    }

    // feeding at 8 and 18, unless the rota does it
    const feedSlot = day * 2 + (hour >= 18 ? 1 : 0);
    if ((hour === 8 || hour === 18) && feedSlot !== lastFeed && !(s.upgrades['auto_feeders'] ?? 0)) {
      lastFeed = feedSlot;
      for (const t of s.tanks) if (t.animals.length) act.feed(g, t);
    }
    // the morning round: glass, smudges, salt, and a weekly water change
    if (hour === 9 && day !== lastCare) {
      lastCare = day;
      for (const t of s.tanks) {
        if (t.chem.glass > 0.3) act.scrape(g, t, 1);
        if (t.smudge > 0.4) act.wipe(g, t, 1);
        if (t.water !== 'fresh') act.topOff(g, t);
        const since = day - (changedAt.get(t.id) ?? 0);
        if (t.animals.length && (since >= 7 || t.chem.no3 > 30) && !act.doWaterChange(g, t, 0.25)) changedAt.set(t.id, day);
      }
      realSec += 30;
    }
    // letters and postcards
    for (const l of [...s.letters]) {
      if (l.ready && !act.claimLetter(g, l.id)) {
        run.letters.push(l.id);
        say(`answered ${l.id}`);
        realSec += 10;
      }
    }
    for (const e of [...s.expeditions]) {
      if (!e.finds) continue;
      const before = s.coins;
      act.sellHolding(g, s.holding.map((a) => a.uid));
      const rec = run.expeditions.find((x) => x.region === e.region && x.value < 0);
      if (rec) rec.value = Math.round(s.coins - before);
      act.dismissExpedition(g, e.id);
      say(`expedition back from ${e.region}, holding sold for ${Math.round(s.coins - before)}`);
    }
    if (hour < 8 || hour >= 22) continue;

    // stock the tanks that are ready for it
    for (const t of s.tanks) {
      const left = pending.get(t.id);
      // "nearly cycled" is enough for a light first stocking; the bacteria grow with the fish
      if (!left?.length || cycleProgress(t.chem) < 0.8) continue;
      const [sp, n] = left[0];
      if (s.coins < species(sp).price * n) continue;
      const why = act.buyAnimals(g, t, sp, n);
      if (why && why !== 'Not enough coins.') say(`could not stock ${sp}: ${why}`);
      if (why !== 'Not enough coins.') left.shift();
      realSec += 20;
    }
    const stocking = [...pending.values()].some((l) => l.length);

    // a new display tank when a bay is free
    const tier = TIERS[s.tier];
    const displays = s.tanks.filter((t) => !isStock(t)).length;
    const next = DISPLAYS[builtDisplays];
    if (!stocking && next && next.tier <= s.tier && displays < baysUnlocked(s, tier.bays) && s.coins >= templateCost(g, next) + 60) {
      build(next, s.tanks.filter((t) => !isStock(t)).reduce((m, t) => Math.max(m, t.bay + 1), 0), false);
      builtDisplays++;
      continue;
    }
    // a breeding stock tank in the back
    const racks = s.tanks.filter(isStock).length;
    const rack = [STOCK_TANK, SHRIMP_STOCK][racks];
    if (!stocking && rack && racks < tier.racks && s.coins >= templateCost(g, rack) + 80) {
      build(rack, BAL.rackBay + racks, false);
      continue;
    }
    // upgrades: the first one on the list the tier allows, keeping a cushion for upkeep and, when a
    // bay is waiting, the price of the next tank
    const saving = next && next.tier <= s.tier && displays < baysUnlocked(s, tier.bays) ? templateCost(g, next) : 0;
    for (const [id, lvl] of UPGRADE_ORDER) {
      const have = s.upgrades[id] ?? 0;
      const nextLvl = upgrade(id).levels[have];
      if (have >= lvl || !nextLvl || nextLvl.tier > s.tier) continue;
      if (s.coins >= nextLvl.cost + 100 + saving && !act.buyUpgrade(g, id)) {
        say(`upgrade ${id} ${have + 1}`);
        realSec += 10;
      }
      break;
    }
    // expeditions: the cheapest open region, when it leaves a cushion
    if (s.tier >= 1 && s.expeditions.every((e) => e.finds)) {
      const open = REGIONS.filter((r) => !canExpedition(s, r.id as RegionId)).sort((a, b) => a.expedition.cost - b.expedition.cost);
      const r = open[(day * 7) % Math.max(1, Math.min(4, open.length))];
      if (r && s.coins >= r.expedition.cost + 250 + saving) {
        const cost = r.expedition.cost;
        if (!act.sendExpedition(g, r.id as RegionId)) {
          run.expeditions.push({ region: r.id, cost, value: -1 });
          say(`expedition to ${region(r.id).name} for ${cost}`);
          realSec += 15;
        }
      }
    }
  }
  run.realMin = Math.round(realSec / 6) / 10;
  return run;
}
