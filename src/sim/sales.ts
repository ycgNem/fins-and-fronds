// The shop counter. Display tanks draw people in; some of them are shoppers who buy fish from the
// stock tanks in the back room (healthy adults above each tank's breeding reserve) and cuttings
// and frags from storage. Breeding in a stock tank is how a fish shop pays for itself.
import { item, species } from '../data';
import type { Rng } from '../engine/rng';
import { BAL } from './balance';
import type { Game } from './Game';
import { type Animal, type GameState, type Tank } from './state';
import { isOpen } from './visitors';
import { weekShoppers } from './week';

export function isStock(t: Tank): boolean {
  return t.bay >= BAL.rackBay;
}

/** what one fish of this species sells for, by how well it looks (and how well it was bred:
 *  `quality` from breedQuality) */
export function retailPrice(sp: string, mood: number, quality = 1): number {
  return Math.max(1, Math.round(species(sp).price * BAL.retailMarkup * quality * (0.7 + 0.3 * Math.max(0, Math.min(1, mood)))));
}

/** what selective breeding is worth at the counter: a Neocaridina sells by its color grade, and a
 *  captive-bred saltwater fish (none taken from a reef) for more than a wild one */
export function breedQuality(a: Animal): number {
  const def = species(a.sp);
  let q = 1;
  if (def.tags.includes('neo_color')) q *= 1 + BAL.gradePrice * a.grade;
  if (a.bornHere && def.water === 'marine') q *= BAL.captiveBredPrice;
  return q;
}

/** whether an animal could go over the counter at all: a healthy adult, never a named pet (the
 *  rack card uses the same rule to say why some never sell) */
export function forSale(a: Animal): boolean {
  return !a.fry && a.health > 0.5 && !a.name;
}

/** the animals a stock tank can sell now: healthy adults, never a named pet, best first; the very
 *  best (the whole breeding reserve, reserveOf) stay back as the tank's breeders, so selective
 *  breeding keeps improving the line */
function sellable(t: Tank, sp: string): Animal[] {
  const ranked = t.animals.filter((a) => a.sp === sp && forSale(a)).sort((a, b) => breedQuality(b) - breedQuality(a) || b.health - a.health);
  return ranked.slice(reserveOf(t, sp));
}

export interface Offer {
  t: Tank;
  sp: string;
  /** how many can go (adults, healthy, above the breeding reserve) */
  n: number;
  each: number;
}

/** How many of a species a stock tank keeps back as breeders: what the player set (or the default),
 *  but never fewer than a breeding group (its school, or a pair), or a colony sold down to two
 *  would never breed again. */
export function reserveOf(t: Tank, sp: string): number {
  const s = species(sp);
  const keep = t.keep ?? BAL.keepDefault;
  if (s.breed.ease <= 0 || s.breed.type === 'none') return keep;
  const group = Math.max(2, Math.min(BAL.keepGroupMax, s.school, s.max ? Math.max(2, s.max) : Infinity));
  return Math.max(keep, group);
}

/** the breeders a stock tank holds back, species by species (its grown animals, and how many of
 *  them stay as the breeding group), for the rack's panel */
export function reserves(t: Tank): { sp: string; adults: number; keep: number }[] {
  const by = new Map<string, number>();
  for (const a of t.animals) if (!a.fry) by.set(a.sp, (by.get(a.sp) ?? 0) + 1);
  return [...by].map(([sp, adults]) => ({ sp, adults, keep: reserveOf(t, sp) }));
}

/** the fish for sale in one stock tank */
export function offers(t: Tank, moods?: Map<string, { mood: number }>): Offer[] {
  if (!isStock(t)) return [];
  const by = new Map<string, number>();
  // named animals are pets: they stay
  for (const a of t.animals) if (forSale(a)) by.set(a.sp, (by.get(a.sp) ?? 0) + 1);
  const out: Offer[] = [];
  for (const [sp, n] of by) {
    const free = n - reserveOf(t, sp);
    if (free <= 0) continue;
    const mood = moods?.get(sp)?.mood ?? 0.8;
    if (mood < 0.4) continue;
    // priced by the best of those for sale, which go first
    const best = sellable(t, sp)[0];
    out.push({ t, sp, n: free, each: retailPrice(sp, mood, best ? breedQuality(best) : 1) });
  }
  return out;
}

/** cuttings and frags waiting in storage, if the shelf is on */
export function cuttingsForSale(s: GameState): { id: string; n: number; each: number }[] {
  if (!s.settings.sellCuttings) return [];
  return Object.entries(s.inventory)
    .filter(([id, n]) => n > 0 && (item(id).cat === 'plant' || item(id).cat === 'coral'))
    .map(([id, n]) => ({ id, n, each: Math.max(1, Math.round(item(id).price * BAL.cuttingShare)) }));
}

/** how many of something that comes `mean` times on average turn up this time (Poisson) */
function arrivals(rng: Rng, mean: number): number {
  if (mean > 30) return Math.round(mean);
  const floor = Math.exp(-mean);
  let n = 0;
  for (let p = rng.next(); p > floor; p *= rng.next()) n++;
  return n;
}

/** One sim step of the counter (dtH hours). Returns nothing; changes coins, tanks and storage. */
export function stepSales(g: Game, dtH: number, rng: Rng) {
  const s = g.state;
  if (!isOpen(s, s.time)) return;
  // stock tanks double as plant farms: anything overgrown is cut back and the cuttings shelved
  for (const t of s.tanks) {
    if (!isStock(t)) continue;
    for (const p of t.items) {
      if (item(p.id).plant && p.size >= 1.3) {
        p.size = 0.8;
        s.inventory[p.id] = (s.inventory[p.id] ?? 0) + 1;
      }
    }
  }
  // the displays draw people in (racks draw no one of their own); market day brings more
  let draw = 0;
  for (const t of s.tanks) draw += g.stats.get(t.id)?.visitorsPerHour ?? 0;
  // shoppers come at random; counting them per step (not one at most) keeps a long step from
  // turning customers away
  for (let n = arrivals(rng, (BAL.shopperBase + draw * BAL.shopperShare) * weekShoppers(s.time) * dtH); n > 0; n--) if (!serveShopper(g, rng)) return;
}

/** One shopper at the counter buys fish or a cutting, if there is any for sale. */
function serveShopper(g: Game, rng: Rng): boolean {
  const s = g.state;
  const fish = s.tanks.flatMap((t) => offers(t, g.stats.get(t.id)?.moods));
  const plants = cuttingsForSale(s);
  if (!fish.length && !plants.length) return false;
  // shoppers like pretty, popular fish: weight by price (a proxy for demand) and how many there are
  const weights = [...fish.map((o) => Math.sqrt(species(o.sp).price) * Math.min(10, o.n)), ...plants.map((p) => Math.sqrt(item(p.id).price) * Math.min(6, p.n) * 0.8)];
  let r = rng.next() * weights.reduce((a, b) => a + b, 0);
  let i = 0;
  while (i < weights.length - 1 && r > weights[i]) r -= weights[i++];
  if (i < fish.length) {
    const o = fish[i];
    const def = species(o.sp);
    const want = def.school > 1 ? Math.max(2, Math.round(def.school * (0.6 + rng.next() * 0.6))) : rng.next() < 0.7 ? 1 : 2;
    const n = Math.min(o.n, want);
    // the best-bred, healthiest adults after the breeders go first
    const picks = sellable(o.t, o.sp).slice(0, n);
    o.t.animals = o.t.animals.filter((a) => !picks.includes(a));
    const coins = n * o.each;
    // every captive-bred saltwater fish sold is one not taken from a reef, and people notice
    const captive = picks.filter((a) => a.bornHere && def.water === 'marine').length;
    if (captive) s.rep += captive * BAL.captiveBredRep;
    s.coins += coins;
    s.stats.coins += coins;
    s.stats.sold = (s.stats.sold ?? 0) + n;
    s.stats.salesToday = (s.stats.salesToday ?? 0) + coins;
    o.t.today += coins;
    g.emit({ t: 'coins', tank: o.t.id, amount: coins });
    g.emit({ t: 'sfx', name: 'coin', tank: o.t.id });
    g.toast(`A customer bought ${n} ${n === 1 ? def.name : plural(def.name)} (+${coins}).`, 'good');
    g.refresh(o.t);
  } else {
    const p = plants[i - fish.length];
    s.inventory[p.id]--;
    if (s.inventory[p.id] <= 0) delete s.inventory[p.id];
    s.coins += p.each;
    s.stats.coins += p.each;
    s.stats.salesToday = (s.stats.salesToday ?? 0) + p.each;
    g.emit({ t: 'sfx', name: 'coin' });
    g.toast(`A customer bought a ${item(p.id).name.toLowerCase()} ${item(p.id).cat === 'coral' ? 'frag' : 'cutting'} (+${p.each}).`, 'good');
  }
  return true;
}

function plural(name: string): string {
  if (/(fish|shrimp|moss|corydoras|pleco)$/i.test(name)) return name;
  if (/s$/.test(name)) return name;
  return `${name}s`;
}
