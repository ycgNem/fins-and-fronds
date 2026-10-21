// Collecting expeditions with Captain Wren. Pay, wait a few game hours, and a postcard arrives
// with whatever the crew found: species (into the holding tank), plants and stones (into the
// inventory), and from then on the supplier can order more of them.
import { itemsOf, region, speciesOf } from '../data';
import type { RegionId } from '../data/types';
import type { Rng } from '../engine/rng';
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
  if (s.tier < 1) return 'Expeditions open at the Corner Aquarium tier.';
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
  return e;
}

export function resolveExpedition(s: GameState, e: Expedition, rng: Rng) {
  const r = e.region as RegionId;
  const nets = s.upgrades['better_nets'] ?? 0;
  const animals = speciesOf(r).filter((sp) => sp.source !== 'hitchhiker' && sp.tier <= s.tier + 1);
  const items = itemsOf(r).filter((it) => it.tier <= s.tier + 1);
  const finds: NonNullable<Expedition['finds']> = [];
  const picks = rng.int(2, 3) + nets;
  for (let i = 0; i < picks && animals.length; i++) {
    const sp = rng.weighted(animals, (x) => 1 / Math.pow(x.rarity, 1.6 - nets * 0.4));
    const n = sp.school > 1 ? Math.min(sp.school, rng.int(3, 8)) : rng.int(1, 2);
    finds.push({ kind: 'species', id: sp.id, n });
    for (let k = 0; k < n; k++) s.holding.push(newAnimal(s, sp.id));
    if (!s.unlocked.species.includes(sp.id)) s.unlocked.species.push(sp.id);
  }
  for (let i = 0; i < 2 && items.length; i++) {
    const it = rng.pick(items);
    finds.push({ kind: 'item', id: it.id, n: 1 });
    s.inventory[it.id] = (s.inventory[it.id] ?? 0) + 1;
    if (!s.unlocked.items.includes(it.id)) s.unlocked.items.push(it.id);
  }
  e.finds = finds;
  e.postcard = postcard(r, rng);
  s.stats.expeditions++;
}

const OPENERS = [
  'Made port this morning after a rough crossing.',
  'Greetings from the far end of the map!',
  'The crew sends their love and their sunburns.',
  'Nets are drying on the deck as I write.',
  'You would not believe the light out here.',
];

function postcard(r: RegionId, rng: Rng): string {
  const def = region(r);
  return `${rng.pick(OPENERS)} ${def.blurb} We packed everything for the trip home with care. ${def.scape.split(',')[0]} - that is how it looks out here, if you want to do them justice.`;
}
