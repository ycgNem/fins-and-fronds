// Letters from the correspondents. Up to three are open at once; each one checks the whole
// aquarium and becomes "ready" when any tank satisfies it, then the player sends a reply to claim.
// A letter whose ask the shop already meets arrives as a thank-you, ready at once; answering some
// letters brings a reply a day later, and the last letter of each story leaves a keepsake.
import { ITEMS, REQUESTS, request, species, SYMBIOSES, region, hasUpgrade, hasItem, hasShell, hasSpecies, item, shell, TIERS, upgrade } from '../data';
import type { RequestCheck, RequestDef } from '../data/types';
import { BAL } from './balance';
import { regionFrac } from './facts';
import { judgedScape } from './rating';
import { isStock } from './sales';
import type { GameState, Letter, Tank } from './state';
import { partnerPresent } from './wellbeing';
import type { TankStats } from './Game';

export const MAX_LETTERS = 3;

type Seen = { t: Tank; s: TankStats };

/** the Grand Oceanarium: its opening night is the finale scene */
const TOP_TIER = TIERS[TIERS.length - 1].level;

/** could this letter be sent now: its tier is reached, it is not done, open or resting, and what
 *  it waits for has happened (pest snails, the finale, the letter it answers a day ago). Every
 *  letter of the Grand Oceanarium waits for the finale (state.seen, written when the scene ends):
 *  the top can be reached while you sleep, and the town should not write before it has opened. A
 *  shop already at the top when it loads is shown the finale then (app.continueSave), saves from
 *  before 0.3 too, and the letters it already has are never held back. */
function eligible(state: GameState, r: RequestDef, open: Set<string>, resting: Set<string>): boolean {
  if (r.tier > state.tier || state.lettersDone.includes(r.id) || open.has(r.id) || resting.has(r.id)) return false;
  if (r.when === 'pests' && !state.tanks.some((t) => t.pests.hadSnails) && !(state.dipCaught ?? 0)) return false;
  if ((r.when === 'finale' || r.tier >= TOP_TIER) && !state.seen.includes('finale')) return false;
  if (r.after) {
    if (!state.lettersDone.includes(r.after)) return false;
    // (saves from before letters were kept count as answered long ago)
    const kept = state.lettersKept?.[r.after];
    const at = kept && keptAt(kept);
    if (at !== undefined && state.time - at < BAL.replyDelay) return false;
  }
  return true;
}

/** When a kept letter was answered, or undefined for one answered before 0.3 kept letters: the
 *  save migration files those at 0 (the game's clock starts at 8:00 on day 1, so no letter is
 *  answered then). The Kept tab says "before the update" for those, never "day 1". */
export function keptAt(k: { at: number }): number | undefined {
  return k.at > 0 ? k.at : undefined;
}

function sets(state: GameState) {
  return {
    open: new Set(state.letters.map((l) => l.id)),
    resting: new Set((state.lettersResting ?? []).filter((x) => x.until > state.time).map((x) => x.id)),
  };
}

/** one of Ida's letters (or another `first` one) is waiting to be sent */
export function pendingFirst(state: GameState): boolean {
  const { open, resting } = sets(state);
  return REQUESTS.some((r) => r.first && eligible(state, r, open, resting));
}

/** the next letter to send: Ida's notes before anything, then a correspondent writing back, then
 *  letters of the aquarium's own tier more often than older ones. With `unmet` given, most letters
 *  ask for something the aquarium does not already do (a letter is a little goal), but now and
 *  then (`rnd2` under BAL.letterMetShare) one it already does arrives as a thank-you, so building
 *  a pond before Tomás asks for one never loses his letter. Letters put back unanswered rest a while. */
export function nextRequest(state: GameState, rnd: number, unmet?: (id: string) => boolean, rnd2 = rnd): string | null {
  const { open, resting } = sets(state);
  const pool = REQUESTS.filter((r) => eligible(state, r, open, resting));
  if (!pool.length) return null;
  const firsts = pool.filter((r) => r.first);
  if (firsts.length) return firsts[Math.floor(rnd * firsts.length)].id;
  // a reply (asking nothing) comes before anyone new; a story's next ask joins the others
  const replies = pool.filter((r) => r.after && r.check.t === 'none');
  if (replies.length) return weighted(state, replies, rnd);
  if (!unmet) return weighted(state, pool, rnd);
  const goals = pool.filter((r) => unmet(r.id));
  const met = pool.filter((r) => !unmet(r.id));
  // one thank-you waits at a time: the goals stay the main thing
  const thanking = state.letters.some((l) => l.met);
  if (met.length && (!goals.length || (!thanking && rnd2 < BAL.letterMetShare))) return weighted(state, met, rnd);
  return weighted(state, goals.length ? goals : pool, rnd);
}

function weighted(state: GameState, from: RequestDef[], rnd: number): string {
  const weight = (tier: number) => (tier === state.tier ? 3 : tier === state.tier - 1 ? 1.5 : 1);
  let r = rnd * from.reduce((a, q) => a + weight(q.tier), 0);
  for (const q of from) {
    r -= weight(q.tier);
    if (r <= 0) return q.id;
  }
  return from[from.length - 1].id;
}

/** The biggest school of grown fish on show in one tank. Stock racks are behind the counter (no
 *  visitor counts them), and shrimp and fry are no school. */
export function schoolOf(t: Tank): { sp: string; n: number } | undefined {
  if (isStock(t)) return undefined;
  const by = new Map<string, number>();
  for (const a of t.animals) if (!a.fry && species(a.sp).kind === 'fish') by.set(a.sp, (by.get(a.sp) ?? 0) + 1);
  let best: { sp: string; n: number } | undefined;
  for (const [sp, n] of by) if (!best || n > best.n) best = { sp, n };
  return best;
}

/** does this one tank answer the ask (undefined for asks about the whole aquarium). Stars, schools
 *  and scapes are judged by visitors, so only the display tanks count for those (the plants-alone
 *  dare is rated on stars: a back-room plant farm does not answer it). */
function tankMeets(c: RequestCheck, x: Seen): boolean | undefined {
  switch (c.t) {
    case 'rating': return !isStock(x.t) && x.s.rating.stars >= c.stars;
    case 'archetype': return x.s.cls.matches.some((m) => (!c.id || m.def.id === c.id) && (!c.family || m.def.family === c.family));
    case 'school': return (schoolOf(x.t)?.n ?? 0) >= c.size;
    case 'tag': return (x.s.facts.byTag.get(c.tag) ?? 0) >= c.min;
    case 'kind': return (x.s.facts.byKind.get(c.kind) ?? 0) >= c.min;
    case 'species': return (x.s.facts.bySpecies.get(c.id) ?? 0) >= c.min;
    case 'plant_species': return x.s.facts.plantSpecies >= c.min;
    case 'no_fish': return !isStock(x.t) && !x.s.facts.byKind.get('fish') && x.s.facts.plantCount >= 3 && x.s.rating.stars >= 2;
    // plants and stones alone: not a fish, not a shrimp, not a snail
    case 'no_animals': return !isStock(x.t) && !x.t.animals.length && !x.t.bags.length && x.s.facts.plantCount >= 3 && x.s.rating.stars >= c.stars;
    case 'big_fish': return [...x.s.facts.bySpecies.keys()].some((id) => species(id).kind === 'fish' && species(id).cm >= c.cm);
    case 'region_tank': {
      const regions = new Set<string>();
      for (const id of x.s.facts.bySpecies.keys()) for (const r of species(id).regions) if (region(r).continent === c.continent) regions.add(r);
      return [...regions].some((r) => regionFrac(x.s.facts, [r as never]) >= 0.8);
    }
    case 'fry': return x.t.animals.some((a) => a.fry);
    case 'water': return !isStock(x.t) && x.t.water === c.is && x.s.rating.stars >= c.stars;
    case 'corals': return x.s.facts.coralTotal >= c.min;
    case 'symbiosis': return SYMBIOSES.some((y) => x.s.facts.bySpecies.has(y.a) && partnerPresent(y.b, x.t, x.s.facts));
    case 'night': return x.s.facts.gear.slots.has('moon') && ((x.s.facts.byTag.get('nocturnal') ?? 0) + (x.s.facts.byTag.get('glow') ?? 0)) >= 2;
    case 'decor_set': {
      const set = ITEMS.filter((i) => i.tags?.includes(c.tag)).map((i) => i.id);
      return set.every((id) => x.t.items.some((p) => p.id === id));
    }
    // pest snails, not Aiptasia: a tank that had them and is clear now
    case 'pests_clear': return !!x.t.pests.hadSnails && x.t.pests.snails === 0;
    // the club judges a real scape: not the open water of a kreisel or the ocean window
    case 'part': return !isStock(x.t) && (c.part !== 'scape' || judgedScape(x.t)) && x.s.rating.parts[c.part] >= c.min;
    default: return undefined;
  }
}

export function checkRequest(c: RequestCheck, state: GameState, stats: Map<number, TankStats>): boolean {
  switch (c.t) {
    case 'none': return true;
    case 'trips': return state.stats.expeditions >= c.min;
    case 'wild': return state.tanks.filter((t) => !isStock(t)).reduce((a, t) => a + t.animals.filter((q) => q.wild).length, 0) >= c.min;
    case 'codex': return state.codex[c.kind].length >= c.min;
    case 'project': return c.id ? (state.projects?.[c.id] ?? 0) >= c.min : Object.values(state.projects ?? {}).reduce((a, n) => a + n, 0) >= c.min;
    // the dip catching snails on a new plant counts as keeping them out
    case 'pests_clear': if ((state.dipCaught ?? 0) > 0) return true; break;
    default: break;
  }
  return seen(state, stats).some((x) => tankMeets(c, x));
}

function seen(state: GameState, stats: Map<number, TankStats>): Seen[] {
  return state.tanks.map((t) => ({ t, s: stats.get(t.id) })).filter((x) => x.s) as Seen[];
}

/** what answered a letter, for the reply to quote: the tank, and the animal it was about (noted
 *  when the letter becomes ready, so it stays true when the reply comes) */
export function answerVars(c: RequestCheck, state: GameState, stats: Map<number, TankStats>): Record<string, string> {
  const x = seen(state, stats).find((q) => tankMeets(c, q));
  if (!x) return {};
  const by = [...x.s.facts.bySpecies.entries()];
  const of = (ok: (id: string) => boolean) => by.filter(([id]) => ok(id)).sort((a, b) => b[1] - a[1])[0];
  const school = c.t === 'school' ? schoolOf(x.t) : undefined;
  const pick: [string, number] | undefined =
    c.t === 'tag' ? of((id) => species(id).tags.includes(c.tag))
    : c.t === 'night' ? of((id) => species(id).tags.includes('nocturnal') || species(id).tags.includes('glow'))
    : school ? [school.sp, school.n]
    : undefined;
  const top = pick ?? of((id) => species(id).kind === 'fish') ?? of(() => true);
  const vars: Record<string, string> = { tank: x.t.name };
  if (top) {
    vars.sp = species(top[0]).name.toLowerCase();
    vars.n = String(top[1]);
  }
  return vars;
}

const KOI_NAMES = ['Rosita', 'El Capitán', 'Mochi', 'Don Gordo', 'Chispa', 'Luna', 'Pepe', 'Abuela', 'Sol', 'Canela'];

/** What answered the letter a reply follows: noted when that letter was answered, or (a letter
 *  answered before 0.3 kept them, or one nothing was noted for) what meets its ask today. */
function answerOf(id: string, state: GameState, stats: Map<number, TankStats>): Record<string, string> {
  const kept = state.lettersKept?.[id];
  const noted = kept?.answer ?? (kept?.vars.sp ? kept.vars : undefined);
  if (noted && Object.keys(noted).length) return noted;
  return answerVars(request(id).check, state, stats);
}

/** the number an ask was about (a school of eight), for a reply that cannot count them any more */
function askedFor(c: RequestCheck): number | undefined {
  return c.t === 'school' ? c.size : 'min' in c && typeof c.min === 'number' ? c.min : undefined;
}

/** names and numbers a letter's text needs, fixed when it is sent */
export function letterVars(r: RequestDef, state: GameState, stats: Map<number, TankStats>): Record<string, string> {
  const vars: Record<string, string> = {};
  if (r.after) {
    const a = answerOf(r.after, state, stats);
    for (const k of ['tank', 'sp', 'n']) if (a[k]) vars[k] = a[k];
    const n = askedFor(request(r.after).check);
    if (!vars.n && n !== undefined) vars.n = String(n);
  }
  const shown = state.tanks.filter((t) => !isStock(t));
  vars.tanks = String(shown.length);
  vars.types = String(state.codex.archetypes.length);
  const best = shown.map((t) => ({ t, v: stats.get(t.id)?.visitorsPerHour ?? 0 })).sort((a, b) => b.v - a.v)[0];
  vars.best = best?.t.name ?? 'the window';
  vars.tank ??= best?.t.name ?? 'the window';
  // Pip's snail letter when the plant dip kept them out of every tank: it says so
  if (r.when === 'pests' && !state.tanks.some((t) => t.pests.hadSnails) && (state.dipCaught ?? 0) > 0) vars.via = 'dip';
  if (r.effect === 'name_koi') {
    const k = state.seed % KOI_NAMES.length;
    [vars.k1, vars.k2, vars.k3] = [0, 3, 7].map((i) => KOI_NAMES[(k + i) % KOI_NAMES.length]);
  }
  return vars;
}

/** what a letter says where a name or number it needs is missing (a damaged or very old save) */
const UNKNOWN: Record<string, string> = { tank: 'the window', best: 'the window', sp: 'fish', n: 'all of them' };

/** A letter as it reads: the thank-you line when it arrived already answered (Pip's own line when
 *  the plant dip caught the snails). {k} is a name or number from its vars; {k:one|many} is a count
 *  with its noun ("1 tank", "3 tanks"). */
export function letterText(r: RequestDef, l: { vars?: Record<string, string>; met?: boolean }): string {
  const met = l.vars?.via === 'dip' && r.metDip ? r.metDip : r.met;
  const text = l.met && met ? met : r.text;
  return text.replace(/\{(\w+)(?::([^|}]*)\|([^}]*))?\}/g, (_, k: string, one?: string, many?: string) => {
    const v = l.vars?.[k];
    if (one === undefined || many === undefined) return v ?? UNKNOWN[k] ?? '';
    const n = Number(v);
    return v !== undefined && Number.isFinite(n) ? `${v} ${n === 1 ? one : many}` : `all your ${many}`;
  });
}

/** What answering a letter does for the shop for good (besides its reward): Tomás names the koi,
 *  the museum's guide sends visitors, Reyes's notebooks show where the missing species live. */
export function applyLetterEffect(state: GameState, r: RequestDef, l: Letter): string {
  if (!r.effect) return '';
  if (r.effect === 'name_koi') {
    // the koi in the pond he sat by: the first three without names
    const pond = [...state.tanks].sort((a, b) => count(b, 'koi') - count(a, 'koi'))[0];
    const koi = pond?.animals.filter((a) => a.sp === 'koi' && !a.fry && !a.name) ?? [];
    ['k1', 'k2', 'k3'].forEach((k, i) => {
      if (koi[i] && l.vars?.[k]) koi[i].name = l.vars[k];
    });
    return koi.length ? `Your koi have names now` : '';
  }
  state.story = [...new Set([...(state.story ?? []), r.effect])];
  return r.effect === 'guide' ? 'The museum guide sends visitors your way' : 'The codex shows where the missing animals live';
}

function count(t: Tank, sp: string): number {
  return t.animals.filter((a) => a.sp === sp).length;
}

/** Apply a letter's unlock: an upgrade (granted at level 1), an item, a shell or a species. Returns
 *  its name, or '' when the shop already had it (Pip's secret, once the dip is bought). */
export function applyUnlock(state: GameState, id: string): string {
  if (hasUpgrade(id)) {
    if ((state.upgrades[id] ?? 0) >= 1) return '';
    state.upgrades[id] = 1;
    return upgrade(id).name;
  }
  if (hasItem(id)) {
    if (state.unlocked.items.includes(id)) return '';
    state.unlocked.items.push(id);
    return item(id).name;
  }
  if (hasSpecies(id)) {
    if (state.unlocked.species.includes(id)) return '';
    state.unlocked.species.push(id);
    return species(id).name;
  }
  if (hasShell(id)) return shell(id).name;
  return id;
}

export function letterTitle(id: string): string {
  return request(id).title;
}
