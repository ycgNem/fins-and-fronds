// Animal wellbeing. Each species in a tank gets a mood from hard factors (water fit, toxins,
// oxygen) multiplied by a weighted average of soft ones (school size, space, tankmates, habitat
// needs, food). Individual health drifts toward the mood. Gentle mode never lets an animal die.
import { item, species, SYMBIOSES } from '../data';
import type { Need, Range, SpeciesDef } from '../data/types';
import { BAL } from './balance';
import type { Facts } from './facts';
import type { Tank } from './state';

export interface Reason {
  good: boolean;
  text: string;
}

export interface SpeciesMood {
  sp: string;
  count: number;
  mood: number;
  reasons: Reason[];
  /** acute harm 0..1 that damages health directly (toxins, heat, suffocation, starvation), whatever the mood */
  lethal: number;
}

export interface MoodCtx {
  fedRecently: boolean;
  gentle: boolean;
  /** hours since the last feeding (starvation sets in after a few days) */
  hungryH?: number;
}

/** The share of total ammonia (what a test kit reads) that is free, toxic NH3 rather than ammonium.
 *  pKa from Emerson et al. 1975: at 25 C about 0.06% at pH 6, 0.6% at pH 7 and 8% at pH 8.2. */
export function freeAmmoniaShare(ph: number, tempC: number): number {
  const pka = 0.09018 + 2729.92 / (tempC + 273.15);
  return 1 / (1 + Math.pow(10, pka - ph));
}

/** 1 inside the range, falling linearly to 0 at `slack` beyond either edge. */
export function fit(v: number, r: Range, slack: number): number {
  if (v >= r[0] && v <= r[1]) return 1;
  const d = v < r[0] ? r[0] - v : v - r[1];
  return Math.max(0, 1 - d / slack);
}

const NEED_TEXT: Record<Need, string> = {
  caves: 'wants caves to hide in', plants: 'wants more plants', sand: 'needs soft sand', wood: 'wants driftwood', leaves: 'misses leaf litter',
  lid: 'nervous without a lid', open_air: 'needs open air above the water', land: 'needs a land area', hitch: 'needs something to hold on to',
  host: 'misses a host anemone', shells: 'needs empty shells', rocks: 'wants rockwork', mature: 'needs a mature tank', algae: 'needs algae to graze',
  current: 'wants a current', dim: 'prefers dim light or shade', swim_space: 'needs open swimming space', floating: 'wants floating plants',
  mussel: 'needs a freshwater mussel', deep_sand: 'needs a deep sand bed', kreisel: 'is trapped against the walls (needs a kreisel)',
  chill: 'wants cold water', soft_water: 'wants soft water', hard_water: 'wants hard water', moss: 'wants moss to graze',
};

function needMet(n: Need, s: SpeciesDef, t: Tank, f: Facts): boolean {
  const ch = t.chem;
  switch (n) {
    case 'caves': return f.caves >= 1;
    case 'plants': return f.coverage >= 0.2;
    case 'sand': case 'deep_sand': return ['fine_sand', 'sand', 'mud'].includes(f.sub.grain);
    case 'wood': return (f.itemsByCat.get('wood') ?? 0) >= 1;
    case 'leaves': return (f.itemsByTag.get('leaf_litter') ?? 0) >= 1;
    case 'lid': return f.hasLid;
    case 'open_air': return !f.hasLid || f.openTop;
    case 'land': return f.land;
    case 'hitch': return f.hitch >= 1;
    case 'host': return t.items.some((p) => item(p.id).coral?.host);
    case 'shells': return (f.itemsByTag.get('shells') ?? 0) >= 1;
    case 'rocks': return f.stones.length >= 2;
    case 'mature': return t.ageDays >= 14 && (s.id !== 'mandarin_dragonet' || f.gear.slots.has('refugium'));
    case 'algae': return ch.algae > 0.08 || ch.glass > 0.12;
    case 'current': return f.flow >= 2;
    case 'dim': return f.parTop < 70 || f.caves >= 1 || f.floatCover > 0.3;
    case 'swim_space': return f.liters >= s.minL * 1.2 && f.coverage < 0.75;
    case 'floating': return f.floatCover > 0.08;
    case 'mussel': return f.bySpecies.has('swan_mussel');
    case 'kreisel': return f.geom.shell.tags.includes('kreisel');
    case 'chill': return ch.temp <= s.temp[1];
    case 'soft_water': return ch.gh <= 6;
    case 'hard_water': return ch.gh >= 10;
    case 'moss': return (f.plantKinds.get('moss') ?? 0) >= 1;
  }
}

/** Snails an assassin (or another snail hunter) will eat. */
export function isPreySnail(prey: SpeciesDef, hunter: SpeciesDef): boolean {
  if (prey.kind !== 'snail' || prey.id === hunter.id) return false;
  if (hunter.id === 'assassin_snail') return prey.tags.includes('pest') || prey.id === 'red_ramshorn';
  return hunter.tags.includes('eats_snails') && prey.cm <= 3;
}

/** the hunter eats the prey when they share a tank (it fits in its mouth) */
export function hunts(o: SpeciesDef, s: SpeciesDef): boolean {
  const eatsFish = (o.temper === 'predator' || o.tags.includes('eats_small')) && s.kind === 'fish' && o.cm >= s.cm * 3;
  const eatsInvert = o.tags.includes('eats_inverts') && ['shrimp', 'crab', 'crayfish', 'star', 'urchin', 'slug'].includes(s.kind) && o.cm >= s.cm * 1.5;
  return eatsFish || eatsInvert || isPreySnail(s, o);
}

export function speciesMoods(t: Tank, f: Facts, ctx: MoodCtx): Map<string, SpeciesMood> {
  const out = new Map<string, SpeciesMood>();
  const ch = t.chem;
  const present = [...f.bySpecies.keys()].map((id) => species(id));
  for (const s of present) {
    const n = f.bySpecies.get(s.id) ?? 0;
    const reasons: Reason[] = [];
    const bad = (text: string) => reasons.push({ good: false, text });
    const good = (text: string) => reasons.push({ good: true, text });
    // ---- hard factors
    let hard = 1;
    const okWater =
      s.water === t.water ||
      (s.tags.includes('brackish_ok') && ((s.water === 'fresh' && t.water === 'brackish' && ch.sg <= 1.006) || (s.water === 'brackish' && t.water === 'fresh')));
    if (!okWater) {
      hard *= 0.1;
      bad(`needs ${s.water} water`);
    }
    const tf = fit(ch.temp, s.temp, 4);
    if (tf < 1) bad(ch.temp < s.temp[0] ? 'too cold' : 'too warm');
    const pf = fit(ch.ph, s.ph, 0.8);
    if (pf < 1) bad(ch.ph < s.ph[0] ? 'water too acidic' : 'water too alkaline');
    let hf = 1;
    if (s.gh && t.water !== 'marine') {
      hf = fit(ch.gh, s.gh, 6);
      if (hf < 1) bad(ch.gh < s.gh[0] ? 'water too soft' : 'water too hard');
    }
    let sf = 1;
    if (t.water !== 'fresh' || s.sg) {
      const r = s.sg ?? ([1.0, 1.002] as const);
      sf = fit(ch.sg, r, 0.006);
      if (sf < 1) bad(ch.sg < r[0] ? 'not salty enough' : 'too salty');
    }
    // free NH3 is what burns gills: stress from about 0.005 mg/L, lethal by about 0.1-0.2
    const free = ch.nh3 * freeAmmoniaShare(ch.ph, ch.temp);
    const tox = Math.max(0, 1 - Math.max(0, free - 0.005) * 9 - Math.max(0, ch.no2 - 0.1) * 1.6 - Math.max(0, ch.no3 - (t.water === 'marine' ? 30 : 50)) / 80);
    if (free > 0.005) bad(free > 0.05 ? 'ammonia burns' : 'a trace of toxic ammonia');
    if (ch.no2 > 0.15) bad('nitrite in the water');
    if (ch.no3 > (t.water === 'marine' ? 30 : 50)) bad('nitrate is high');
    const o2f = ch.o2 >= 5 ? 1 : Math.max(0, (ch.o2 - 2) / 3);
    if (o2f < 1) bad('gasping for oxygen');
    hard *= Math.max(0.05, tf) * Math.max(0.05, pf) * Math.max(0.05, hf) * Math.max(0.05, sf) * Math.max(0.05, tox) * Math.max(0.05, o2f);
    if (tf === 1 && pf === 1 && hf === 1 && sf === 1 && tox >= 1 && o2f >= 1) good('water is just right');
    // acute harm: far outside its range, poisoned, suffocating or starving damages health directly
    const days = (ctx.hungryH ?? 0) / 24;
    const grazes = s.diet.includes('algae') && (ch.algae > 0.05 || ch.glass > 0.08);
    const starving = grazes ? 0 : Math.max(0, Math.min(1, (days - 5) / 6));
    if (starving > 0) bad('starving');
    const acute = (v: number) => Math.max(0, Math.min(1, (0.35 - v) / 0.35));
    const lethal = Math.max(okWater ? 0 : 0.7, acute(tf), acute(sf), acute(tox), acute(o2f), acute(pf) * 0.6, starving);

    // ---- soft factors
    const soft: [number, number][] = [];
    const add = (v: number, w = 1) => soft.push([v, w]);
    if (s.school > 1) {
      if (n >= s.school) {
        add(1, 1.5);
        if (n >= 8) good(`a proper group of ${n}`);
      } else {
        add(0.45 + (0.55 * n) / s.school, 1.5);
        bad(`only ${n} of a group of ${s.school}+`);
      }
    }
    if (s.max && n > s.max) {
      add(0.5);
      bad('too many of its own kind');
    }
    if (f.liters < s.minL) {
      add(Math.max(0.3, Math.pow(f.liters / s.minL, 0.6)), 1.5);
      bad(`cramped (needs ${s.minL} L)`);
    }
    const load = f.bioload / Math.max(0.5, f.bioCap);
    if (load > 1) {
      add(Math.max(0.3, 1 - (load - 1) * 0.5));
      bad('the filter cannot keep up');
    }
    if (f.flow < s.flow[0] || f.flow > s.flow[1]) {
      const d = f.flow < s.flow[0] ? s.flow[0] - f.flow : f.flow - s.flow[1];
      add(d === 1 ? 0.7 : 0.4);
      bad(f.flow < s.flow[0] ? 'wants more current' : 'current is too strong');
    }
    // tankmates
    let pressure = 0;
    for (const o of present) {
      if (o.id === s.id) continue;
      const on = f.bySpecies.get(o.id) ?? 0;
      if (o.temper === 'aggressive' && s.kind === 'fish') pressure += (o.cm >= s.cm * 0.7 ? 0.25 : 0.1) * Math.min(1, on / 3);
      if (hunts(o, s)) {
        add(0.35, 2);
        bad(`hunted by the ${o.name.toLowerCase()}`);
      }
      if (s.tags.includes('long_fin') && o.tags.includes('fin_nipper')) {
        add(on >= 8 ? 0.8 : 0.55);
        bad(`fins nipped by the ${o.name.toLowerCase()}`);
      }
      if ((s.kind === 'jelly' || s.body === 'seahorse') && (o.tags.includes('fin_nipper') || o.temper !== 'peaceful')) {
        add(0.5);
        bad(`harassed by the ${o.name.toLowerCase()}`);
      }
    }
    if ((s.tags.includes('territorial') || s.temper === 'aggressive') && n > f.caves + 1 && s.school < 10) pressure += 0.15;
    if (s.school >= 10 && n >= s.school) pressure *= 0.5;
    if (pressure > 0) {
      add(Math.max(0.3, 1 - pressure), 1.5);
      bad(pressure > 0.2 ? 'bullied by tankmates' : 'a little squabbling');
    }
    // habitat needs
    for (const need of s.needs) {
      if (needMet(need, s, t, f)) continue;
      const sev = need === 'kreisel' ? 0.15 : need === 'land' && s.tags.includes('amphibious') ? 0.4 : need === 'host' ? 0.9 : 0.75;
      add(sev);
      bad(NEED_TEXT[need]);
    }
    // food
    if (!ctx.fedRecently) {
      add(0.6, 1.5);
      bad('hungry');
    }
    if (!ctx.fedRecently && s.diet.length === 1 && s.diet[0] === 'algae' && ch.algae < 0.05 && ch.glass < 0.08) {
      add(0.8);
      bad('not enough algae to graze');
    }
    if (s.diet.includes('stars') && !present.some((o) => o.kind === 'star')) {
      add(0.5, 2);
      bad('has no sea stars to eat');
    }
    if (s.diet.includes('snails') && !present.some((o) => o.kind === 'snail') && t.pests.snails < 1) {
      add(0.85);
      bad('misses crunchy snails');
    }
    if ((s.tags.includes('nocturnal') || s.needs.includes('dim')) && f.parTop > 150 && f.caves === 0) {
      add(0.85);
      bad('the light is glaring');
    }
    const partner = SYMBIOSES.find((y) => (y.a === s.id && partnerPresent(y.b, t, f)) || (y.b === s.id && f.bySpecies.has(y.a)));
    if (partner) good(`with its partner: ${partner.name.toLowerCase()}`);

    let num = 0, den = 0;
    for (const [v, w] of soft) {
      num += v * w;
      den += w;
    }
    const softAvg = den > 0 ? num / den : 1;
    let mood = hard * (soft.length ? Math.min(...soft.map((x) => x[0])) * 0.4 + softAvg * 0.6 : 1) * (partner ? 1.08 : 1);
    mood = Math.max(ctx.gentle ? 0.15 : 0, Math.min(1, mood));
    if (mood > 0.85 && reasons.every((r) => r.good)) good('thriving');
    out.set(s.id, { sp: s.id, count: n, mood, reasons, lethal });
  }
  return out;
}

export function partnerPresent(b: string, t: Tank, f: Facts): boolean {
  if (b.startsWith('item:')) return t.items.some((p) => p.id === b.slice(5));
  if (b.startsWith('kind:')) return (f.byKind.get(b.slice(5) as never) ?? 0) > 0;
  if (b.startsWith('tag:')) return (f.byTag.get(b.slice(4) as never) ?? 0) > 0;
  return f.bySpecies.has(b);
}

/**
 * Health follows mood. Returns the animals that died (never in gentle mode, where the floor is
 * a sulky but safe 0.25).
 */
export function updateAnimals(t: Tank, moods: Map<string, SpeciesMood>, dtH: number, gentle: boolean): string[] {
  const died: string[] = [];
  for (const a of t.animals) {
    const m = moods.get(a.sp);
    if (!m) continue;
    a.mood = m.mood;
    const rate = a.mood < a.health ? 0.05 : 0.03;
    a.health += (a.mood - a.health) * Math.min(1, rate * dtH);
    // lethal conditions kill within about half a day at worst; fry and small animals go first
    if (m.lethal > 0) a.health -= m.lethal * (a.fry ? 0.12 : 0.07) * dtH;
    a.age += dtH / 24;
    if (a.fry && a.age >= BAL.growDays) a.fry = false;
    if (gentle) a.health = Math.max(0.25, a.health);
  }
  if (!gentle) {
    t.animals = t.animals.filter((a) => {
      if (a.health > 0.04) return true;
      died.push(a.sp);
      return false;
    });
  }
  return died;
}
