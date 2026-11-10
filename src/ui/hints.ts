// Plain-words help shared by the side panel and the windows: where a species comes from, the
// biotope a tank is heading for (and how native it is so far), where its water is heading, and how
// far a letter's ask has got.
import { ARCHETYPES, ITEMS, region, species, SYMBIOSES } from '../data';
import type { RegionId, RequestCheck, SpeciesDef } from '../data/types';
import { type ArchetypeResult, couldBecome as couldBecomeType } from '../sim/archetype';
import { BAL } from '../sim/balance';
import { type Facts, regionFrac } from '../sim/facts';
import type { TankStats } from '../sim/Game';
import { schoolOf } from '../sim/letters';
import { judgedScape } from '../sim/rating';
import { forSale, isStock } from '../sim/sales';
import type { GameState, Tank } from '../sim/state';
import { equilibrium, SOURCES, targetTemp } from '../sim/water';

/** a region's name short enough for a chip on a list row */
export const REGION_SHORT: Record<RegionId, string> = {
  rio_negro: 'Rio Negro', amazon: 'Amazon', central_america: 'C. America', mexico_karst: 'Mexico caves', xochimilco: 'Xochimilco',
  west_africa: 'W. Africa', lake_malawi: 'Malawi', lake_tanganyika: 'Tanganyika',
  se_asia_peat: 'Peat swamp', se_asia_river: 'SE Asia', hillstream: 'Hillstream', south_asia: 'S. Asia', sulawesi: 'Sulawesi', australia_png: 'Australia',
  east_asia: 'E. Asia', temperate_na: 'N. America', temperate_eu: 'Europe',
  mangrove: 'Mangrove',
  indo_pacific: 'Indo-Pacific', red_sea: 'Red Sea', caribbean: 'Caribbean', seagrass: 'Lagoon', kelp_forest: 'Kelp forest', rocky_shore: 'Rocky shore',
  open_ocean: 'Open ocean', deep_sea: 'Deep sea', cold_north: 'North seas',
};

/** A stock tank's grown animals of one species the way its counter sees them: the ones it sells
 *  from (healthy and unnamed: sellable() in src/sim/sales.ts), the sick ones (they sell once well)
 *  and the named ones (pets, never sold). */
export function rackCount(t: Tank, sp: string): { well: number; sick: number; pets: number } {
  const c = { well: 0, sick: 0, pets: 0 };
  for (const a of t.animals) {
    if (a.sp !== sp || a.fry) continue;
    if (a.name) c.pets++;
    else if (forSale(a)) c.well++;
    else c.sick++;
  }
  return c;
}

/** the rack's line for the grown animals of a species that are not on sale now, whatever it keeps
 *  back ('' when there are none). `kept`: the breeders it holds back (sales.ts reserveOf), which the
 *  sick join first once they are well. */
export function heldBack(c: { well: number; sick: number; pets: number }, kept = 0): string {
  if (c.sick && c.pets) return `${c.sick} sick and ${c.pets} pets are not for sale`;
  if (c.sick) {
    const later = Math.max(0, Math.min(c.sick, c.well + c.sick - kept));
    if (!later) return `${c.sick} sick: ${c.sick > 1 ? 'they join' : 'it joins'} the breeders once well`;
    if (later < c.sick) return `${c.sick} sick: ${later} of them sell once well`;
    return `${c.sick} sick: ${c.sick > 1 ? 'they sell' : 'it sells'} once well`;
  }
  if (c.pets) return `${c.pets} named: pets are never sold`;
  return '';
}

/** the chip for a species' home: its first region, '+' when it ranges wider */
export function homeChip(s: SpeciesDef): string {
  if (!s.regions.length) return 'bred';
  return REGION_SHORT[s.regions[0]] + (s.regions.length > 1 ? '+' : '');
}

/** "Home: Amazon Clearwater & Floodplain" for tooltips and the codex */
export function homeLine(s: SpeciesDef): string {
  return s.regions.length ? s.regions.map((r) => region(r).name).join(', ') : 'Bred for the hobby, not from one wild place';
}

export interface Biotope {
  ids: RegionId[];
  /** the region's name, and the tank type that asks for it (if one does) */
  name: string;
  type?: string;
  /** how native the stock is now, and how native the type needs it */
  frac: number;
  need: number;
}

/**
 * The biotope this tank is building toward: the region its recognized type (or a type it is close
 * to) asks for, else the home most of its animals share. Null for a tank with no clear place.
 */
export function biotopeOf(st: TankStats): Biotope | null {
  const f = st.facts;
  const ranked: ArchetypeResult[] = [...st.cls.matches, ...nearFor(st)];
  for (const r of ranked) {
    const rule = r.def.rules.find((q) => q.rule.t === 'region')?.rule;
    // (a near miss for the wrong water is no help: a marine tank is never a Malawi biotope)
    if (rule?.t !== 'region' || r.def.rules.some((q) => q.rule.t === 'water' && q.rule.is !== f.tank.water)) continue;
    return { ids: rule.ids, name: region(rule.ids[0]).name, type: r.def.name, frac: regionFrac(f, rule.ids), need: rule.frac };
  }
  // no type asks for a region: the home the most species share, once there are a few
  const votes = new Map<RegionId, number>();
  for (const id of f.bySpecies.keys()) for (const r of species(id).regions) votes.set(r, (votes.get(r) ?? 0) + 1);
  let top: RegionId | null = null, n = 0;
  for (const [r, c] of votes) if (c > n) [top, n] = [r, c];
  if (!top || n < 2) return null;
  return { ids: [top], name: region(top).name, frac: regionFrac(f, [top]), need: 0.8 };
}

/** does this species count toward the biotope? */
export function fitsBiotope(s: SpeciesDef, b: Biotope): boolean {
  return s.regions.some((r) => b.ids.includes(r));
}

// ---------------------------------------------------------------- where the water is heading

export interface Heading {
  temp: number;
  ph: number;
  gh: number;
  kh: number;
  tannin: number;
  /** what sets each one, in words: "the stones will push pH to ~8.2" */
  tempWhy: string;
  phWhy: string;
  ghWhy: string;
}

/**
 * The water a tank settles into: the source, substrate, stone and wood chemistry (equilibrium, as
 * the sim pulls toward it) and the temperature its heater or chiller holds. A tank set up a minute
 * ago still reads like its tap water; this is what the fish will live in a day later.
 */
export function heading(t: Tank, f: Facts): Heading {
  const eq = equilibrium(t, f);
  // CO2 by day pulls the pH down within the hour, as in stepWater
  const ph = Math.max(3.8, Math.min(9.2, eq.ph - Math.log10(Math.max(1, t.chem.co2) / 3)));
  const temp = targetTemp(t, f);
  // who is doing it: the chemistry without the hardscape, and without the substrate
  const bare = equilibrium({ ...t, items: [] }, f), noSub = equilibrium(t, { ...f, sub: { ...f.sub, fx: {} } });
  const cause = (now: number, a: number, b: number, at: string, up: string, down: string, unit: string) => {
    const dItems = now - a, dSub = now - b;
    if (Math.abs(dItems) >= 0.15 && Math.abs(dItems) >= Math.abs(dSub)) return dItems > 0 ? `the stones will ${up} ${at}` : `the wood and leaves will ${down} ${at}`;
    if (Math.abs(dSub) >= 0.15) return `the ${f.sub.name.toLowerCase()} will ${dSub > 0 ? up : down} ${at}`;
    return `${SOURCES[t.set.source].name.toLowerCase()} settles at ${unit} ${at}`;
  };
  const deg = `${temp.toFixed(0)}C`;
  const room = BAL.roomTemp;
  const tempWhy = f.gear.heatL > 0 && t.set.heater > temp + 0.3 ? `the heater tops out at ~${deg}`
    : f.gear.heatL > 0 && t.set.heater > room ? `the heater will hold ${deg}`
    : f.gear.chillL > 0 && t.set.heater < room ? `the chiller will hold ${deg}`
    : f.gear.heatL > 0 || f.gear.chillL > 0 ? `the hall keeps it at ~${deg}` : `with no heater it settles at ~${deg}`;
  return {
    temp, ph, gh: eq.gh, kh: eq.kh, tannin: eq.tannin, tempWhy,
    // (who moved it is judged without the CO2, which only comes and goes with the lights)
    phWhy: cause(eq.ph, bare.ph, noSub.ph, `~${ph.toFixed(1)}`, 'push pH to', 'pull pH to', 'pH'),
    ghWhy: cause(eq.gh, bare.gh, noSub.gh, `~${eq.gh.toFixed(0)}`, 'harden the water to GH', 'soften the water to GH', 'GH'),
  };
}

/** the mood model's reason, with what will cause it when the water is still on its way there */
export function explain(reason: string, h: Heading): string {
  if (reason === 'too cold' || reason === 'too warm') return `${reason}: ${h.tempWhy}`;
  if (reason === 'water too acidic' || reason === 'water too alkaline') return `${reason}: ${h.phWhy}`;
  if (reason === 'water too soft' || reason === 'water too hard') return `${reason}: ${h.ghWhy}`;
  return reason;
}

// ---------------------------------------------------------------- letters

export interface Progress {
  /** how close the aquarium is, in a line */
  text: string;
  /** the codex page that explains how (tab 0 tank types, 1 species, 2 partners) */
  codex?: { tab: number; sel: string };
}

/** could this tank become that type at all (the sim's rule, sim/archetype.ts couldBecome) */
export function couldBecome(r: ArchetypeResult, t: Tank): boolean {
  return couldBecomeType(r.def, t.water);
}

/** the tank types a tank is close to and could really become, nearest first */
export function nearFor(st: TankStats): ArchetypeResult[] {
  return st.cls.near.filter((r) => couldBecome(r, st.facts.tank));
}

/** How far the aquarium has got toward a letter's ask, from the tank that comes closest. */
export function letterProgress(c: RequestCheck, s: GameState, stats: Map<number, TankStats>): Progress {
  const tanks = s.tanks.map((t) => ({ t, st: stats.get(t.id) })).filter((x): x is { t: Tank; st: TankStats } => !!x.st);
  const best = (score:(x: { t: Tank; st: TankStats }) => number, say: (x: { t: Tank; st: TankStats }, v: number) => string, none: string): string => {
    let top: { t: Tank; st: TankStats } | null = null, v = -Infinity;
    for (const x of tanks) {
      const q = score(x);
      if (q > v) [top, v] = [x, q];
    }
    return top && v > 0 ? say(top, v) : none;
  };
  switch (c.t) {
    case 'rating':
    case 'water': {
      // racks are behind the counter: only displays answer these (as in sim/letters.ts)
      const pool = tanks.filter((x) => !isStock(x.t) && (c.t !== 'water' || x.t.water === c.is));
      const top = [...pool].sort((a, b) => b.st.rating.total - a.st.rating.total)[0];
      // the score that rounds up to the stars asked for (starsFor works in half stars)
      const need = Math.ceil(20 + 14.4 * (c.stars - 0.25));
      return { text: top ? `Your best: ${top.t.name}, ${top.st.rating.stars} stars (${Math.round(top.st.rating.total)}/100; ${c.stars} stars takes about ${need})` : c.t === 'water' ? `No ${c.is} display tank yet.` : 'No display tanks yet.' };
    }
    case 'archetype': {
      const def = c.id ? ARCHETYPES.find((a) => a.id === c.id) : ARCHETYPES.find((a) => a.family === c.family && a.tier <= s.tier);
      const codex = def ? { tab: 0, sel: def.id } : undefined;
      // the tank closest to it: most hard rules passed, then its first missing step
      let close: { t: Tank; r: ArchetypeResult } | null = null;
      for (const x of tanks) for (const r of nearFor(x.st)) {
        if ((c.id && r.def.id !== c.id) || (c.family && r.def.family !== c.family)) continue;
        if (!close || r.hardPassed > close.r.hardPassed) close = { t: x.t, r };
      }
      if (close) return { text: `${close.t.name} is close. Next: ${close.r.hints[0]}`, codex };
      return { text: def ? 'No tank is close yet. The codex lists what it takes.' : 'No tank is close yet.', codex };
    }
    case 'school':
      return { text: best((x) => schoolOf(x.t)?.n ?? 0, (x, v) => `Your biggest school: ${v} in ${x.t.name}`, 'No grown school in a display tank yet.') };
    case 'tag':
      return { text: best((x) => x.st.facts.byTag.get(c.tag) ?? 0, (x, v) => `So far: ${v} of ${c.min} in ${x.t.name}`, `None yet. The codex says which species are ${c.tag.replace('_', ' ')}.`) };
    case 'kind':
      return { text: best((x) => x.st.facts.byKind.get(c.kind) ?? 0, (x, v) => `So far: ${v} of ${c.min} in ${x.t.name}`, 'None yet.') };
    case 'species':
      return { text: best((x) => x.st.facts.bySpecies.get(c.id) ?? 0, (x, v) => `So far: ${v} of ${c.min} in ${x.t.name}`, 'None yet.'), codex: s.codex.species.includes(c.id) ? { tab: 1, sel: c.id } : undefined };
    case 'plant_species':
      return { text: best((x) => x.st.facts.plantSpecies, (x, v) => `So far: ${v} of ${c.min} kinds in ${x.t.name}`, 'No plants yet.') };
    case 'no_fish':
      return { text: best((x) => (isStock(x.t) || x.st.facts.byKind.get('fish') ? 0 : x.st.facts.plantCount), (x, v) => `${x.t.name}: no fish, ${v} plants, ${x.st.rating.stars} stars`, 'Every display tank has fish in it.') };
    case 'big_fish':
      return { text: best((x) => Math.max(0, ...[...x.st.facts.bySpecies.keys()].map((id) => (species(id).kind === 'fish' ? species(id).cm : 0))), (x, v) => `Your biggest: ${v} cm, in ${x.t.name} (needs ${c.cm})`, 'No fish yet.') };
    case 'region_tank': {
      const biotope = ARCHETYPES.find((a) => a.tier <= s.tier && a.rules.some((r) => r.rule.t === 'region' && r.rule.ids.some((id) => region(id).continent === c.continent)));
      const text = best((x) => {
        let top = 0;
        const regions = new Set<RegionId>();
        for (const id of x.st.facts.bySpecies.keys()) for (const r of species(id).regions) if (region(r).continent === c.continent) regions.add(r);
        for (const r of regions) top = Math.max(top, regionFrac(x.st.facts, [r]));
        return top;
      }, (x, v) => `${x.t.name}: ${Math.round(v * 100)}% from one habitat in ${c.continent} (needs 80%)`, `No tank has species from ${c.continent} yet.`);
      return { text, codex: biotope ? { tab: 0, sel: biotope.id } : undefined };
    }
    case 'fry':
      return { text: 'No fry yet. Livebearers like guppies breed most easily.' };
    case 'corals':
      return { text: best((x) => x.st.facts.coralTotal, (x, v) => `So far: ${v} of ${c.min} in ${x.t.name}`, 'No corals yet.') };
    case 'symbiosis':
      return { text: `Partnerships found: ${s.codex.symbioses.length} of ${SYMBIOSES.length}. The codex has hints.`, codex: { tab: 2, sel: '' } };
    case 'night':
      return { text: best((x) => (x.st.facts.byTag.get('nocturnal') ?? 0) + (x.st.facts.byTag.get('glow') ?? 0), (x, v) => `${x.t.name}: ${v} night animals${x.st.facts.gear.slots.has('moon') ? '' : ', no moonlight yet'}`, 'No night animals yet.') };
    case 'decor_set': {
      const set = ITEMS.filter((i) => i.tags?.includes(c.tag)).map((i) => i.id);
      return { text: best((x) => set.filter((id) => x.t.items.some((p) => p.id === id)).length, (x, v) => `So far: ${v} of ${set.length} pieces in ${x.t.name}`, `None of the ${set.length} pieces placed yet.`) };
    }
    case 'pests_clear':
      return { text: best((x) => (x.t.pests.had ? Math.ceil(x.t.pests.snails) + 1 : 0), (x, v) => `${x.t.name}: ${v - 1} pest snails left`, 'No pest snails to clear yet.') };
    case 'none':
      return { text: 'Nothing to do: it is ready as soon as it arrives.' };
    case 'no_animals':
      // (as in sim/letters.ts: no animals, none in bags, three plants or more)
      return { text: best((x) => (isStock(x.t) || x.t.animals.length || x.t.bags.length ? 0 : x.st.rating.stars + 1), (x, v) => `${x.t.name}: ${v - 1} stars with no animals, ${x.st.facts.plantCount} plants (it takes 3)`, 'Every display tank has animals in it so far.') };
    case 'trips':
      return { text: `Expeditions home so far: ${s.stats.expeditions} of ${c.min}.` };
    case 'wild': {
      const n = s.tanks.reduce((a, t) => a + (t.bay >= BAL.rackBay ? 0 : t.animals.filter((q) => q.wild).length), 0);
      return { text: `Wild-caught animals in the displays: ${n} of ${c.min}.` };
    }
    case 'part':
      return { text: best((x) => (isStock(x.t) || (c.part === 'scape' && !judgedScape(x.t)) ? 0 : x.st.rating.parts[c.part]), (x, v) => `Best so far: ${x.t.name} at ${Math.round(v)} of ${c.min}`, c.part === 'scape' ? 'No display tank has a scape to judge yet.' : 'No rated display tank yet.') };
    case 'codex':
      return { text: `In the codex: ${s.codex[c.kind].length} of ${c.min}.`, codex: { tab: c.kind === 'archetypes' ? 0 : 1, sel: '' } };
    case 'project': {
      const n = c.id ? (s.projects?.[c.id] ?? 0) : Object.values(s.projects ?? {}).reduce((a, k) => a + k, 0);
      return { text: `Projects funded: ${n} of ${c.min}.` };
    }
  }
}
