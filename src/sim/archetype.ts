// Archetype recognition: which kind of aquarium a tank is. Hard rules must all pass; soft rules
// make up the authenticity score and the hints shown on the plaque and in the codex.
import { ARCHETYPES, item } from '../data';
import type { ArchetypeDef, Rule } from '../data/types';
import { type Facts, focalThirds, oddStones, oneRockType, regionFrac, schoolsOf } from './facts';

function within(v: number, min?: number, max?: number): boolean {
  return (min === undefined || v >= min) && (max === undefined || v <= max);
}

export function checkRule(r: Rule, f: Facts): boolean {
  const t = f.tank;
  const ch = t.chem;
  switch (r.t) {
    case 'water': return t.water === r.is;
    case 'temp': return within(ch.temp, r.min, r.max);
    case 'ph': return within(ch.ph, r.min, r.max);
    case 'gh': return within(ch.gh, r.min, r.max);
    case 'sg': return within(ch.sg, r.min, r.max);
    case 'liters': return within(f.liters, r.min, r.max);
    case 'shell': return f.geom.shell.tags.includes(r.tag) !== !!r.not;
    case 'animals': return within(f.animals, r.min, r.max);
    case 'species': return within(f.bySpecies.size, r.min, r.max);
    case 'kind': {
      let n = 0;
      for (const k of r.kinds) n += f.byKind.get(k) ?? 0;
      return within(n, r.min, r.max);
    }
    case 'has': {
      let n = 0;
      for (const id of r.ids) n += f.bySpecies.get(id) ?? 0;
      return within(n, r.min, r.max);
    }
    case 'tag': return within(f.byTag.get(r.tag) ?? 0, r.min, r.max);
    case 'region': return f.animals > 0 && regionFrac(f, r.ids) >= r.frac;
    case 'items': {
      let n = 0;
      if (r.tag === 'hitch') n = f.hitch;
      else
        for (const p of t.items) {
          const it = item(p.id);
          if (r.cat && it.cat !== r.cat) continue;
          if (r.tag && !it.tags?.includes(r.tag)) continue;
          if (r.ids && !r.ids.includes(p.id)) continue;
          n++;
        }
      return within(n, r.min, r.max);
    }
    case 'plants': {
      if (r.species) {
        const ids = new Set<string>();
        for (const p of t.items) {
          const it = item(p.id);
          if (it.plant && (!r.kinds || r.kinds.includes(it.plant.kind))) ids.add(p.id);
        }
        return within(ids.size, r.min, r.max);
      }
      let n = 0;
      if (r.kinds) for (const k of r.kinds) n += f.plantKinds.get(k) ?? 0;
      else n = f.plantCount;
      return within(n, r.min, r.max);
    }
    case 'coverage': return within(f.coverage, r.min, r.max);
    case 'corals': {
      let n = 0;
      if (r.types) for (const k of r.types) n += f.corals.get(k) ?? 0;
      else n = f.coralTotal;
      return within(n, r.min, r.max);
    }
    case 'substrate': return (!r.grains || r.grains.includes(f.sub.grain)) && (!r.ids || r.ids.includes(f.sub.id));
    case 'equip': return within(f.gear.slots.get(r.slot) ?? 0, r.min, r.max);
    case 'tannin': return within(ch.tannin, r.min, r.max);
    case 'par': return within(f.par, r.min, r.max);
    case 'flow': return within(f.flow, r.min, r.max);
    case 'odd_stones': return oddStones(f);
    case 'one_rock_type': return f.stones.length > 0 && oneRockType(f);
    case 'focal_thirds': return focalThirds(f);
    case 'slope': return t.slope >= 0.4;
    case 'schools': return schoolsOf(f, r.size) >= (r.min ?? 1);
    case 'age': return t.ageDays >= r.days;
  }
}

export interface ArchetypeResult {
  def: ArchetypeDef;
  /** soft-rule score 0..1 */
  score: number;
  hardPassed: number;
  hardTotal: number;
  /** hints for every failing rule, hard ones first */
  hints: string[];
}

export function evaluate(def: ArchetypeDef, f: Facts): ArchetypeResult {
  let hardPassed = 0, hardTotal = 0, num = 0, den = 0;
  const hardHints: string[] = [];
  const softHints: string[] = [];
  for (const r of def.rules) {
    const ok = checkRule(r.rule, f);
    if (r.hard) {
      hardTotal++;
      if (ok) hardPassed++;
      else hardHints.push(r.hint);
    } else {
      const w = r.w ?? 1;
      den += w;
      if (ok) num += w;
      else softHints.push(r.hint);
    }
  }
  return { def, score: den ? num / den : 1, hardPassed, hardTotal, hints: [...hardHints, ...softHints] };
}

export interface Classification {
  best: ArchetypeResult | null;
  /** every recognized archetype, best first */
  matches: ArchetypeResult[];
  /** archetypes this tank is close to (most hard rules pass), for hints */
  near: ArchetypeResult[];
}

export function classify(f: Facts): Classification {
  const matches: ArchetypeResult[] = [];
  const near: ArchetypeResult[] = [];
  if (f.animals === 0 && f.tank.items.length === 0) return { best: null, matches, near };
  for (const def of ARCHETYPES) {
    const r = evaluate(def, f);
    if (r.hardPassed === r.hardTotal) matches.push(r);
    else if (r.hardTotal > 1 && r.hardPassed >= r.hardTotal - 1) near.push(r);
  }
  const rank = (r: ArchetypeResult) => r.def.priority + r.score * 3;
  matches.sort((a, b) => rank(b) - rank(a));
  near.sort((a, b) => b.def.priority - a.def.priority);
  return { best: matches[0] ?? null, matches, near: near.slice(0, 4) };
}
