// Living things that change slowly: plant and coral growth, coral stinging, pest populations
// (pest snails vs assassin snails, Aiptasia vs peppermint shrimp, bubble algae vs emerald crabs)
// and breeding, including Neocaridina color grades drifting back to wild brown when colors mix.
import { item, species } from '../data';
import type { SpeciesDef } from '../data/types';
import type { Rng } from '../engine/rng';
import { BAL } from './balance';
import { type Facts, parAt } from './facts';
import type { Animal, GameState, Tank } from './state';
import { fit, hunts, type SpeciesMood } from './wellbeing';

export interface LifeEvents {
  fry: { sp: string; n: number }[];
  pestsCleared: boolean;
}

export function plantMass(t: Tank): number {
  let m = 0;
  for (const p of t.items) {
    const it = item(p.id);
    if (it.plant) m += (it.w * it.h * p.size * p.size * p.health * it.plant.growth) / 400;
  }
  return m;
}

/** Algae grazing power of the cleanup crew (snails, shrimp, otos, plecos, tangs...). */
export function grazers(t: Tank): number {
  let g = 0;
  for (const a of t.animals) {
    const s = species(a.sp);
    if (s.tags.includes('algae')) g += Math.min(2, s.cm / 4) * (a.fry ? 0.3 : 1);
  }
  return g * 0.25 + t.pests.snails * 0.01;
}

export function stepGrowth(t: Tank, f: Facts, dtH: number) {
  const ch = t.chem;
  for (const p of t.items) {
    const it = item(p.id);
    if (it.plant) {
      const ps = it.plant;
      const need = ps.light === 1 ? 20 : ps.light === 2 ? 50 : 100;
      const light = ps.emersed ? 1 : Math.min(1.3, f.par / need);
      const co2 = ps.co2 === 2 ? (t.set.co2 && f.gear.co2 > 0 ? 1 : 0.35) : ps.co2 === 1 ? (t.set.co2 && f.gear.co2 > 0 ? 1.2 : 0.8) : 1;
      const rich = ps.rooted ? 0.7 + f.sub.rich * 0.15 : 1;
      const nutrient = Math.min(1, 0.4 + ch.no3 / 15 + ch.nh3 * 3);
      const temp = fit(ch.temp, ps.temp, 5);
      const salt = t.water !== 'fresh' && !ps.salt && it.water.indexOf(t.water) < 0 ? 0.2 : 1;
      const vigor = light * co2 * rich * nutrient * temp * salt;
      p.health += ((Math.min(1, vigor) - p.health) * 0.03 + (ch.algae > 0.6 ? -0.01 : 0)) * dtH;
      p.health = Math.max(0.05, Math.min(1, p.health));
      if (vigor > 0.6) p.size = Math.min(1.6, p.size + ps.growth * 0.0016 * vigor * dtH);
    } else if (it.coral) {
      const c = it.coral;
      const par = c.fed ? (c.par[0] + c.par[1]) / 2 : parAt(f, f.geom.h - p.y - it.h * 0.5);
      const light = fit(par, c.par, Math.max(30, c.par[0] * 0.6));
      const flow = f.flow >= c.flow[0] && f.flow <= c.flow[1] ? 1 : 0.6;
      const chem = fit(ch.temp, c.temp, 3) * fit(ch.sg, [1.023, 1.027], 0.004) * (ch.no3 > 25 ? 0.7 : 1) * (c.care >= 4 && t.ageDays < 14 ? 0.6 : 1);
      const vigor = light * flow * chem;
      p.health += (Math.min(1, vigor) - p.health) * 0.02 * dtH;
      p.health = Math.max(0.05, Math.min(1, p.health));
      if (vigor > 0.7) p.size = Math.min(1.6, p.size + c.growth * 0.0012 * vigor * dtH);
    }
  }
  // stinging: corals with sweepers hurt neighbors on the same layer
  for (const a of t.items) {
    const sa = item(a.id).coral;
    if (!sa || sa.sting <= 0) continue;
    for (const b of t.items) {
      if (a === b || b.layer !== a.layer) continue;
      const sb = item(b.id).coral;
      if (!sb) continue;
      if (Math.abs(a.x - b.x) < sa.sting * a.size * 0.5 + item(b.id).w * b.size * 0.5) b.health = Math.max(0.05, b.health - 0.01 * dtH);
    }
  }
  // aiptasia stings corals too
  if (t.pests.aiptasia > 3) for (const p of t.items) if (item(p.id).coral) p.health = Math.max(0.05, p.health - 0.0015 * t.pests.aiptasia * dtH);
}

export function stepPests(t: Tank, f: Facts, dtH: number, fedRecently: boolean): boolean {
  const ps = t.pests;
  const before = ps.snails;
  // pest snails breed on leftover food and algae
  if (ps.snails > 0) {
    const food = (fedRecently ? 0.6 : 0.2) + t.chem.algae * 0.5;
    ps.snails += ps.snails * 0.012 * food * dtH * (1 - ps.snails / Math.max(20, f.liters * 0.6));
  }
  let hunters = 0;
  for (const a of t.animals) {
    const s = species(a.sp);
    if (s.id === 'assassin_snail') hunters += 0.08;
    else if (s.tags.includes('eats_snails')) hunters += 0.25;
  }
  ps.snails = Math.max(0, ps.snails - hunters * dtH);
  if (ps.snails < 0.5) ps.snails = 0;
  // aiptasia arrives on live rock; peppermint shrimp and copperbands eat it
  if (ps.aiptasia > 0) ps.aiptasia += ps.aiptasia * 0.008 * dtH * (1 - ps.aiptasia / 40);
  const aipEaters = (f.byTag.get('aiptasia_eater') ?? 0) * 0.06;
  ps.aiptasia = Math.max(0, ps.aiptasia - aipEaters * dtH);
  if (ps.aiptasia < 0.5) ps.aiptasia = 0;
  if (ps.bubble > 0) ps.bubble += ps.bubble * 0.006 * dtH * (1 - ps.bubble / 30);
  ps.bubble = Math.max(0, ps.bubble - (f.bySpecies.get('emerald_crab') ?? 0) * 0.05 * dtH);
  if (ps.bubble < 0.5) ps.bubble = 0;
  if (ps.snails + ps.aiptasia + ps.bubble > 0) ps.had = true;
  return before > 0 && ps.snails === 0 && ps.had;
}

/** Predators eat what fits in their mouths, checked once per game hour. Cover, caves and a big
 *  school make each hunt less likely to succeed. Returns the species eaten. */
export function stepPredation(t: Tank, f: Facts, rng: Rng): string[] {
  const eaten: string[] = [];
  const present = [...f.bySpecies.keys()].map((id) => species(id));
  for (const prey of present) {
    let hunters = 0;
    for (const o of present) if (o.id !== prey.id && hunts(o, prey)) hunters += f.bySpecies.get(o.id) ?? 0;
    if (!hunters) continue;
    const shelter = Math.min(0.75, f.coverage * 0.5 + f.caves * 0.06 + ((f.plantKinds.get('moss') ?? 0) > 0 && prey.kind === 'shrimp' ? 0.25 : 0));
    if (!rng.chance(Math.min(0.6, 0.035 * hunters * (1 - shelter)))) continue;
    // the smallest and youngest go first
    const victims = t.animals.filter((a) => a.sp === prey.id).sort((a, b) => Number(b.fry) - Number(a.fry) || a.health - b.health);
    const v = victims[0];
    if (!v) continue;
    t.animals = t.animals.filter((a) => a !== v);
    eaten.push(prey.id);
  }
  return eaten;
}

/** Breeding, checked once per game hour per tank. */
export function stepBreeding(state: GameState, t: Tank, f: Facts, moods: Map<string, SpeciesMood>, rng: Rng): { sp: string; n: number }[] {
  const out: { sp: string; n: number }[] = [];
  const overloaded = f.bioload > f.bioCap * 1.15;
  if (overloaded) return out;
  const nets = state.upgrades['breeding_nets'] ?? 0;
  const neoSpecies = [...f.bySpecies.keys()].filter((id) => species(id).tags.includes('neo_color'));
  for (const [id, n] of f.bySpecies) {
    const s = species(id);
    if (s.breed.ease <= 0 || s.breed.type === 'none') continue;
    const adults = t.animals.filter((a) => a.sp === id && !a.fry).length;
    if (adults < 2) continue;
    const m = moods.get(id);
    const mood = m?.mood ?? 0;
    if (mood < 0.7 || (m?.lethal ?? 0) > 0) continue;
    if (!breedingSiteOk(s, t, f)) continue;
    // a fresh tank with ammonia or nitrite in it is no place to spawn
    if (t.chem.nh3 > 0.25 || t.chem.no2 > 0.2) continue;
    // any fry in a tank with something that hunts them are eaten before they are seen
    if (present(f).some((o) => o.id !== id && hunts(o, s))) continue;
    // two adults are a pair only half the time; a group almost always holds both sexes
    const pair = 1 - Math.pow(0.5, adults - 1);
    const chance = s.breed.ease * 0.004 * mood * mood * Math.min(3, adults / 2) * pair;
    if (!rng.chance(chance)) continue;
    let brood = broodSize(s, rng);
    // eggs and fry get eaten in busy tanks unless there is cover
    const cover = f.coverage + ((f.plantKinds.get('moss') ?? 0) > 0 ? 0.3 : 0) + nets * 0.25;
    const others = f.animals - n;
    if (s.breed.type === 'scatter' || s.breed.type === 'livebearer') brood = Math.round(brood * Math.min(1, 0.25 + cover) * (others > 6 ? 0.5 : 1));
    // egg scatterers eat their own eggs: without dense moss almost none survive, and fewer with tankmates
    if (s.breed.type === 'scatter' && rng.chance((f.plantKinds.get('moss') ?? 0) > 0 ? 0.4 : 0.8)) brood = 0;
    if (brood <= 0) continue;
    let fryId = id;
    // mixed Neocaridina colors revert toward wild-type brown
    if (s.tags.includes('neo_color') && neoSpecies.length > 1 && rng.chance(0.5)) fryId = 'wild_neocaridina';
    const parentGrade = avgGrade(t, id);
    const sel = state.upgrades['selective_breeding'] ?? 0;
    for (let i = 0; i < brood; i++) {
      const grade = Math.max(0, Math.min(3, parentGrade + (sel && rng.chance(0.25) ? 0.5 : 0) - (rng.chance(0.2) ? 0.5 : 0)));
      t.animals.push(newAnimal(state, fryId, { fry: true, bornHere: true, grade }));
    }
    state.stats.fry += brood;
    out.push({ sp: fryId, n: brood });
  }
  return out;
}

function present(f: Facts): SpeciesDef[] {
  return [...f.bySpecies.keys()].map((id) => species(id));
}

function avgGrade(t: Tank, id: string): number {
  const xs = t.animals.filter((a) => a.sp === id && !a.fry);
  return xs.length ? xs.reduce((s, a) => s + a.grade, 0) / xs.length : 1;
}

function breedingSiteOk(s: SpeciesDef, t: Tank, f: Facts): boolean {
  switch (s.breed.type) {
    case 'cave': return f.caves >= 1;
    case 'shell': return (f.itemsByTag.get('shells') ?? 0) >= 1;
    case 'bubblenest': return f.floatCover > 0.05 && f.flow <= 1;
    case 'mussel': return f.bySpecies.has('swan_mussel');
    case 'nest': return f.coverage > 0.2 || f.stones.length > 1;
    case 'colony': return s.kind !== 'shrimp' || f.coverage > 0.1 || (f.plantKinds.get('moss') ?? 0) > 0;
    default: return true;
  }
}

function broodSize(s: SpeciesDef, rng: Rng): number {
  switch (s.breed.type) {
    case 'livebearer': return rng.int(3, 8);
    case 'scatter': return rng.int(2, 8);
    case 'cave': case 'pair': return rng.int(4, 9);
    case 'mouthbrooder': return rng.int(3, 8);
    case 'bubblenest': return rng.int(4, 9);
    case 'shell': return rng.int(2, 5);
    case 'nest': return rng.int(3, 6);
    case 'mussel': return rng.int(2, 5);
    case 'colony': return s.kind === 'shrimp' ? rng.int(4, 10) : s.id === 'assassin_snail' ? 1 : rng.int(2, 5);
    default: return 0;
  }
}

export function newAnimal(state: GameState, sp: string, opt: Partial<Animal> = {}): Animal {
  return {
    uid: state.nextUid++, sp, age: opt.fry ? 0 : BAL.growDays + 10, health: 0.85, mood: 0.8, fry: false, bornHere: false,
    grade: species(sp).tags.includes('neo_color') ? 1 : 0, ...opt,
  };
}
