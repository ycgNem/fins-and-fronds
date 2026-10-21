// Letters from the correspondents. Up to three are open at once; each one checks the whole
// aquarium and becomes "ready" when any tank satisfies it, then the player sends a reply to claim.
import { ITEMS, REQUESTS, request, species, SYMBIOSES, region, hasUpgrade, hasItem, hasShell, hasSpecies, item, shell, upgrade } from '../data';
import type { RequestCheck } from '../data/types';
import { regionFrac } from './facts';
import type { GameState } from './state';
import { partnerPresent } from './wellbeing';
import type { TankStats } from './Game';

export const MAX_LETTERS = 3;

/** the next letter to send: Ida's first notes before anything, then letters of the aquarium's
 *  own tier more often than older ones, and when `unmet` is given, something the aquarium does
 *  not already do (a letter is a little goal). Letters put back unanswered rest a while first. */
export function nextRequest(state: GameState, rnd: number, unmet?: (id: string) => boolean): string | null {
  const open = new Set(state.letters.map((l) => l.id));
  const resting = new Set((state.lettersResting ?? []).filter((x) => x.until > state.time).map((x) => x.id));
  const pests = state.tanks.some((t) => t.pests.had);
  const pool = REQUESTS.filter((r) => r.tier <= state.tier && !state.lettersDone.includes(r.id) && !open.has(r.id) && !resting.has(r.id) && (r.when !== 'pests' || pests));
  if (!pool.length) return null;
  const firsts = pool.filter((r) => r.first);
  if (firsts.length) return firsts[Math.floor(rnd * firsts.length)].id;
  const goals = unmet ? pool.filter((r) => unmet(r.id)) : pool;
  const from = goals.length ? goals : pool;
  const weight = (tier: number) => (tier === state.tier ? 3 : tier === state.tier - 1 ? 1.5 : 1);
  let r = rnd * from.reduce((a, q) => a + weight(q.tier), 0);
  for (const q of from) {
    r -= weight(q.tier);
    if (r <= 0) return q.id;
  }
  return from[from.length - 1].id;
}

export function checkRequest(c: RequestCheck, state: GameState, stats: Map<number, TankStats>): boolean {
  const tanks = state.tanks.map((t) => ({ t, s: stats.get(t.id) })).filter((x) => x.s) as { t: GameState['tanks'][number]; s: TankStats }[];
  switch (c.t) {
    case 'rating': return tanks.some((x) => x.s.rating.stars >= c.stars);
    case 'archetype': return tanks.some((x) => x.s.cls.matches.some((m) => (!c.id || m.def.id === c.id) && (!c.family || m.def.family === c.family)));
    case 'school': return tanks.some((x) => [...x.s.facts.bySpecies.values()].some((n) => n >= c.size));
    case 'tag': return tanks.some((x) => (x.s.facts.byTag.get(c.tag) ?? 0) >= c.min);
    case 'kind': return tanks.some((x) => (x.s.facts.byKind.get(c.kind) ?? 0) >= c.min);
    case 'species': return tanks.some((x) => (x.s.facts.bySpecies.get(c.id) ?? 0) >= c.min);
    case 'plant_species': return tanks.some((x) => x.s.facts.plantSpecies >= c.min);
    case 'no_fish': return tanks.some((x) => !x.s.facts.byKind.get('fish') && x.s.facts.plantCount >= 3 && x.s.rating.stars >= 2);
    case 'big_fish': return tanks.some((x) => [...x.s.facts.bySpecies.keys()].some((id) => species(id).kind === 'fish' && species(id).cm >= c.cm));
    case 'region_tank':
      return tanks.some((x) => {
        const regions = new Set<string>();
        for (const id of x.s.facts.bySpecies.keys()) for (const r of species(id).regions) if (region(r).continent === c.continent) regions.add(r);
        return [...regions].some((r) => regionFrac(x.s.facts, [r as never]) >= 0.8);
      });
    case 'fry': return tanks.some((x) => x.t.animals.some((a) => a.fry));
    case 'water': return tanks.some((x) => x.t.water === c.is && x.s.rating.stars >= c.stars);
    case 'corals': return tanks.some((x) => x.s.facts.coralTotal >= c.min);
    case 'symbiosis': return tanks.some((x) => SYMBIOSES.some((y) => x.s.facts.bySpecies.has(y.a) && partnerPresent(y.b, x.t, x.s.facts)));
    case 'night': return tanks.some((x) => x.s.facts.gear.slots.has('moon') && ((x.s.facts.byTag.get('nocturnal') ?? 0) + (x.s.facts.byTag.get('glow') ?? 0)) >= 2);
    case 'decor_set': {
      const set = ITEMS.filter((i) => i.tags?.includes(c.tag)).map((i) => i.id);
      return tanks.some((x) => set.every((id) => x.t.items.some((p) => p.id === id)));
    }
    case 'pests_clear': return tanks.some((x) => x.t.pests.had && x.t.pests.snails === 0);
  }
}

/** Apply a letter's unlock: an upgrade (granted at level 1), an item, a shell or a species. */
export function applyUnlock(state: GameState, id: string): string {
  if (hasUpgrade(id)) {
    state.upgrades[id] = Math.max(1, state.upgrades[id] ?? 0);
    return upgrade(id).name;
  }
  if (hasItem(id) && !state.unlocked.items.includes(id)) state.unlocked.items.push(id);
  if (hasSpecies(id) && !state.unlocked.species.includes(id)) state.unlocked.species.push(id);
  if (hasItem(id)) return item(id).name;
  if (hasSpecies(id)) return species(id).name;
  if (hasShell(id)) return shell(id).name;
  return id;
}

export function letterTitle(id: string): string {
  return request(id).title;
}
