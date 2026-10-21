// The shop counter. Display tanks draw people in; some of them are shoppers who buy fish from the
// stock tanks in the back room (healthy adults above each tank's breeding reserve) and cuttings
// and frags from storage. Breeding in a stock tank is how a fish shop pays for itself.
import { item, species } from '../data';
import type { Rng } from '../engine/rng';
import { BAL } from './balance';
import type { Game } from './Game';
import { type GameState, type Tank } from './state';
import { isOpen } from './visitors';

export function isStock(t: Tank): boolean {
  return t.bay >= BAL.rackBay;
}

/** what one fish of this species sells for, by how well it looks */
export function retailPrice(sp: string, mood: number): number {
  return Math.max(1, Math.round(species(sp).price * BAL.retailMarkup * (0.7 + 0.3 * Math.max(0, Math.min(1, mood)))));
}

export interface Offer {
  t: Tank;
  sp: string;
  /** how many can go (adults, healthy, above the breeding reserve) */
  n: number;
  each: number;
}

/** the fish for sale in one stock tank */
export function offers(t: Tank, moods?: Map<string, { mood: number }>): Offer[] {
  if (!isStock(t)) return [];
  const keep = t.keep ?? BAL.keepDefault;
  const by = new Map<string, number>();
  for (const a of t.animals) if (!a.fry && a.health > 0.5) by.set(a.sp, (by.get(a.sp) ?? 0) + 1);
  const out: Offer[] = [];
  for (const [sp, n] of by) {
    const free = n - keep;
    if (free <= 0) continue;
    const mood = moods?.get(sp)?.mood ?? 0.8;
    if (mood < 0.4) continue;
    out.push({ t, sp, n: free, each: retailPrice(sp, mood) });
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
  let draw = 0;
  for (const t of s.tanks) draw += g.stats.get(t.id)?.visitorsPerHour ?? 0;
  const shoppers = (BAL.shopperBase + draw * BAL.shopperShare) * dtH;
  if (!rng.chance(Math.min(1, shoppers))) return;
  const fish = s.tanks.flatMap((t) => offers(t, g.stats.get(t.id)?.moods));
  const plants = cuttingsForSale(s);
  if (!fish.length && !plants.length) return;
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
    // take the healthiest adults
    const picks = o.t.animals.filter((a) => a.sp === o.sp && !a.fry).sort((a, b) => b.health - a.health).slice(0, n);
    o.t.animals = o.t.animals.filter((a) => !picks.includes(a));
    const coins = n * o.each;
    s.coins += coins;
    s.stats.coins += coins;
    s.stats.sold = (s.stats.sold ?? 0) + n;
    s.stats.salesToday = (s.stats.salesToday ?? 0) + coins;
    o.t.today += coins;
    g.emit({ t: 'coins', tank: o.t.id, amount: coins });
    g.emit({ t: 'sfx', name: 'coin' });
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
}

function plural(name: string): string {
  if (/(fish|shrimp|moss|corydoras|pleco)$/i.test(name)) return name;
  if (/s$/.test(name)) return name;
  return `${name}s`;
}
