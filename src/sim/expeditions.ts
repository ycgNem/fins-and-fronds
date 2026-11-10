// Collecting expeditions with Captain Wren. Pay, wait a few game hours, and a postcard arrives
// with whatever the crew found: species (into the holding tank), plants and stones (into the
// inventory), and from then on the supplier can order them. A haul sells to collectors for about
// what the trip cost (a little more with Better Nets), so trips are for finds, not for farming: a
// region fished again too soon gives less until it recovers, and each trip tries to bring back
// something the supplier does not sell.
import { itemsOf, region, species, speciesOf } from '../data';
import type { ItemDef, RegionId, SpeciesDef } from '../data/types';
import type { Rng } from '../engine/rng';
import { BAL } from './balance';
import type { Expedition, GameState } from './state';
import { newAnimal } from './life';

export function expeditionSlots(s: GameState): number {
  return 1 + (s.upgrades['second_crew'] ?? 0);
}

export function expeditionHours(s: GameState, r: RegionId): number {
  const boat = s.upgrades['faster_boat'] ?? 0;
  return region(r).expedition.hours * (1 - boat * 0.25);
}

export function canExpedition(s: GameState, r: RegionId): string | null {
  const def = region(r);
  if (s.tier < 1) return 'Expeditions open at the Neighborhood Fish Shop tier.';
  if (def.expedition.tier > s.tier) return `Needs tier ${def.expedition.tier}.`;
  if (s.expeditions.filter((e) => !e.finds).length >= expeditionSlots(s)) return 'The crew is already out.';
  if (s.coins < def.expedition.cost) return 'Not enough coins.';
  return null;
}

export function startExpedition(s: GameState, r: RegionId): Expedition | null {
  if (canExpedition(s, r)) return null;
  const def = region(r);
  s.coins -= def.expedition.cost;
  const e: Expedition = { id: s.nextUid++, region: r, start: s.time, end: s.time + expeditionHours(s, r) * 60 };
  s.expeditions.push(e);
  // the region is fished from the day the boat leaves
  s.fished = { ...(s.fished ?? {}), [r]: (s.fished?.[r] ?? 0) + 1 };
  return e;
}

/** how much of a full catch the next trip to a region would bring (fished recently: less); what
 *  the Trips window warns about before the boat leaves */
export function freshness(s: GameState, r: RegionId): number {
  return catchShare(s.fished?.[r] ?? 0);
}

/** the share of a full catch after `trips` recent trips there (the one sailing now not counted) */
function catchShare(trips: number): number {
  return Math.max(BAL.fishedFloor, 1 - BAL.overfished * Math.max(0, trips));
}

/** the animals and items a trip to this region can bring back at the shop's tier */
export function catchable(s: GameState, r: RegionId): { animals: SpeciesDef[]; items: ItemDef[] } {
  return {
    animals: speciesOf(r).filter((sp) => sp.source !== 'hitchhiker' && sp.tier <= s.tier + 1),
    items: itemsOf(r).filter((it) => it.tier <= s.tier + 1),
  };
}

/** the supplier would sell it already (so a trip for it is no discovery) */
export function orderable(s: GameState, sp: SpeciesDef): boolean {
  return s.unlocked.species.includes(sp.id) || (sp.source !== 'expedition' && sp.tier <= s.tier);
}

export function resolveExpedition(s: GameState, e: Expedition, rng: Rng) {
  const r = e.region as RegionId;
  const nets = s.upgrades['better_nets'] ?? 0;
  const { animals, items } = catchable(s, r);
  const finds: NonNullable<Expedition['finds']> = [];
  // the haul is worth about the trip's cost to collectors, give or take a quarter (less where the
  // nets went down lately: this trip was counted when the boat left, so it does not count itself)
  const fresh = catchShare((s.fished?.[r] ?? 0) - 1);
  let budget = region(r).expedition.cost * (BAL.tripReturn + nets * BAL.netsReturn) * fresh * (0.75 + rng.next() * 0.5);
  // better nets reach the rarer animals
  const weight = (x: SpeciesDef) => 1 / Math.pow(x.rarity, 1.6 - nets * 0.4);
  // something new first, when the region has it: an animal the supplier does not sell
  const novel = animals.filter((sp) => !orderable(s, sp));
  const left = [...animals];
  const full = budget;
  const unit = (sp: SpeciesDef) => sp.price * BAL.wildPremium;
  const picks = Math.min(left.length, 3 + (rng.chance(0.3) ? 1 : 0));
  // a few kinds, then more while the hold has room for them (a region of cheap fish sends more)
  for (let i = 0; left.length && (i < picks || (i < 5 && budget > full * 0.25)); i++) {
    const share = budget / Math.max(1, picks - i);
    const pool = i === 0 && novel.length ? novel : left;
    // what the share can pay for (the cheapest, if nothing fits)
    const fits = pool.filter((sp) => unit(sp) <= share * 1.2);
    const sp = fits.length ? rng.weighted(fits, weight) : pool.reduce((a, b) => (unit(b) < unit(a) ? b : a));
    left.splice(left.indexOf(sp), 1);
    // a fair share of what is left of the budget, in whole animals; a school comes as a group
    // when it can, and the last kind in a small region fills the hold a little more
    const cap = left.length ? (sp.school > 1 ? sp.school + 2 : 3) : sp.school > 1 ? sp.school * 2 : 4;
    let n = Math.max(1, Math.min(cap, Math.round(share / unit(sp))));
    if (sp.school > 1 && n < 3 && unit(sp) * 3 <= share * 1.6) n = 3;
    budget -= n * unit(sp);
    const first = !s.codex.species.includes(sp.id) && !s.unlocked.species.includes(sp.id);
    finds.push({ kind: 'species', id: sp.id, n, ...(first ? { first } : {}) });
    for (let k = 0; k < n; k++) s.holding.push(newAnimal(s, sp.id, { wild: true }));
    if (!s.unlocked.species.includes(sp.id)) s.unlocked.species.push(sp.id);
    // the first of a species anyone at the shop has seen: the town hears about it
    if (first) s.rep += BAL.repFirstCatch * Math.max(1, sp.tier);
  }
  // a stone or a plant or two, an expedition-only one first if the region has one not yet found
  const rareItems = items.filter((it) => it.source === 'expedition' && !s.unlocked.items.includes(it.id));
  const itemPool = [...items];
  for (let i = 0; i < 2 && itemPool.length; i++) {
    const it = i === 0 && rareItems.length ? rng.pick(rareItems) : rng.pick(itemPool);
    itemPool.splice(itemPool.indexOf(it), 1);
    finds.push({ kind: 'item', id: it.id, n: 1 });
    s.inventory[it.id] = (s.inventory[it.id] ?? 0) + 1;
    if (!s.unlocked.items.includes(it.id)) s.unlocked.items.push(it.id);
  }
  e.finds = finds;
  e.postcard = postcard(r, finds, fresh, rng);
  s.stats.expeditions++;
}

const OPENERS = [
  'Made port this morning after a rough crossing.',
  'Greetings from the far end of the map!',
  'The crew sends their love and their sunburns.',
  'Nets are drying on the deck as I write.',
  'You would not believe the light out here.',
  'Rain all week, and the fish did not mind one bit.',
  'Writing this by lamplight in a harbor café.',
  'Three days upriver and the mosquitoes have found me.',
];

/** a line about one animal in the hold */
const ANECDOTES = [
  'The {sp} took three of us and a bucket to land.',
  'We found the {sp} right where an old fisherman said they would be.',
  'Our cook asked if the {sp} were for dinner. They are not.',
  'The {sp} came up in the very last net of the day.',
  'The bosun swears one of the {sp} winked at him.',
  'The {sp} sulked for an hour in the bucket, then ate like kings.',
];

function postcard(r: RegionId, finds: NonNullable<Expedition['finds']>, fresh: number, rng: Rng): string {
  const def = region(r);
  const lines = [rng.pick(OPENERS), def.blurb];
  const animals = finds.filter((f) => f.kind === 'species');
  const novel = animals.find((f) => f.first);
  if (novel) lines.push(`Something for your codex: the ${species(novel.id).name.toLowerCase()}. I had never seen one either.`);
  else if (animals.length) lines.push(rng.pick(ANECDOTES).replace('{sp}', species(rng.pick(animals).id).name.toLowerCase()));
  if (fresh < 0.75) lines.push('The locals say we have been fishing here a lot lately. Give these waters a few days and the nets will come up fuller.');
  const scape = def.scape.charAt(0).toLowerCase() + def.scape.slice(1);
  lines.push(`To keep them the way they live out here: ${scape}`);
  return lines.join(' ');
}
