// The tank rating: the central progression gate. Five parts, each 0..100:
//   wellbeing (happy, healthy animals), habitat (clean, stable water and fitting gear),
//   scape (composition), authenticity (how true it is to its archetype) and spectacle (appeal).
import { item, species, SYMBIOSES } from '../data';
import type { Classification } from './archetype';
import { type Facts, itemArea, parAt } from './facts';
import type { Tank } from './state';
import { partnerPresent, type SpeciesMood } from './wellbeing';

export interface RatingParts {
  wellbeing: number;
  habitat: number;
  scape: number;
  authenticity: number;
  spectacle: number;
}

export interface Rating {
  total: number;
  stars: number;
  parts: RatingParts;
  /** the most useful thing to fix, per part */
  notes: Partial<Record<keyof RatingParts, string>>;
}

export const PART_NAMES: Record<keyof RatingParts, string> = {
  wellbeing: 'Wellbeing', habitat: 'Habitat', scape: 'Scape', authenticity: 'Authenticity', spectacle: 'Spectacle',
};

const W = { wellbeing: 0.27, habitat: 0.2, scape: 0.2, authenticity: 0.13, spectacle: 0.2 };

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export function rate(t: Tank, f: Facts, moods: Map<string, SpeciesMood>, cls: Classification): Rating {
  const notes: Rating['notes'] = {};
  const ch = t.chem;

  // ---- wellbeing
  let wellbeing: number;
  const plantHealth = avg(t.items.filter((p) => item(p.id).plant || item(p.id).coral).map((p) => p.health));
  if (t.animals.length) {
    wellbeing = avg(t.animals.map((a) => (a.mood * 0.6 + a.health * 0.4))) * 100;
    const worst = [...moods.values()].sort((a, b) => a.mood - b.mood)[0];
    if (worst && worst.mood < 0.7) notes.wellbeing = `${species(worst.sp).name}: ${worst.reasons.find((r) => !r.good)?.text ?? 'unsettled'}`;
  } else {
    wellbeing = plantHealth * 80;
    notes.wellbeing = t.items.length ? 'Plants only: animals would bring it to life.' : 'An empty tank.';
  }

  // ---- habitat
  let habitat = 100;
  const pen = (v: number, note: string) => {
    if (v > 0.5) {
      habitat -= v;
      if (!notes.habitat || v > 8) notes.habitat = note;
    }
  };
  pen(Math.min(40, Math.max(0, ch.nh3 - 0.02) * 80), 'Ammonia is present: is the tank cycled?');
  pen(Math.min(30, Math.max(0, ch.no2 - 0.02) * 60), 'Nitrite is present: the cycle is not finished.');
  pen(Math.min(30, Math.max(0, ch.no3 - 15) * 1.2), 'Nitrate is building up: change some water.');
  pen(ch.cloud * 30, 'The water is cloudy.');
  pen(ch.algae * 30, 'Algae is spreading on the scape.');
  pen(ch.glass * 25, 'The glass needs scraping.');
  pen(t.smudge * 12, 'Fingerprints on the glass.');
  pen(Math.min(12, t.pests.snails * 0.4 + t.pests.aiptasia * 1.5 + t.pests.bubble), 'Pests are multiplying.');
  const load = f.bioload / Math.max(0.5, f.bioCap);
  pen(Math.max(0, load - 1) * 40, 'Overstocked for the filter.');
  pen(Math.max(0, 5 - ch.o2) * 10, 'Oxygen is low: add aeration.');
  if (t.animals.length && f.bioCap <= 0) pen(30, 'No filter!');
  let lightMiss = 0;
  for (const p of t.items) {
    const it = item(p.id);
    if (it.plant && !it.plant.emersed) {
      const need = it.plant.light === 1 ? 20 : it.plant.light === 2 ? 50 : 100;
      if (f.par < need * 0.7) lightMiss++;
    }
    if (it.coral && !it.coral.fed) {
      const par = parAt(f, f.geom.h - p.y - 10);
      if (par < it.coral.par[0] * 0.7 || par > it.coral.par[1] * 1.4) lightMiss++;
    }
  }
  pen(Math.min(20, lightMiss * 4), 'Some plants or corals want different light.');
  habitat = clamp(habitat);

  // ---- scape
  const sc = scapeScore(t, f);
  const scape = clamp(sc.score + (cls.best ? 8 : 0));
  if (sc.note) notes.scape = sc.note;

  // ---- authenticity
  // a generic community tank is easy to be "authentic" to; a biotope is not, so it counts for more
  const prestige = cls.best ? 0.5 + Math.min(10, cls.best.def.priority) / 20 : 0;
  const authenticity = cls.best ? clamp((20 + cls.best.score * 80) * prestige) : 0;
  if (cls.best && cls.best.hints.length) notes.authenticity = cls.best.hints[0];
  else if (!cls.best) notes.authenticity = cls.near[0] ? `Close to ${cls.near[0].def.name}: ${cls.near[0].hints[0]}` : 'Build toward a recognized tank type.';

  // ---- spectacle
  let spectacle = 0;
  for (const [id, n] of f.bySpecies) {
    const s = species(id);
    const m = moods.get(id)?.mood ?? 0.5;
    const grade = s.tags.includes('neo_color') ? avg(t.animals.filter((a) => a.sp === id).map((a) => a.grade)) / 3 : 0.5;
    spectacle += s.appeal * (1 + Math.log2(n) / 3) * (0.5 + m * 0.5) * (0.85 + grade * 0.3) * 1.2;
  }
  let largest = 0;
  for (const n of f.bySpecies.values()) largest = Math.max(largest, n);
  if (largest >= 10) spectacle += 6;
  if (largest >= 20) spectacle += 6;
  for (const y of SYMBIOSES) if (f.bySpecies.has(y.a) && partnerPresent(y.b, t, f)) spectacle += 8;
  if (t.animals.some((a) => a.fry)) spectacle += 5;
  for (const p of t.items) {
    const it = item(p.id);
    if (it.coral) spectacle += 3 + (it.coral.glow ? 1.5 : 0);
  }
  spectacle += f.coverage * 15 + Math.min(10, f.plantSpecies * 1.5);
  if (f.gear.slots.has('mister') && f.land) spectacle += 6;
  spectacle = clamp(spectacle);
  if (spectacle < 50) notes.spectacle = largest < 8 ? 'A big school or a showpiece animal would draw a crowd.' : 'Rarer or more colorful species would draw a crowd.';

  const parts = { wellbeing, habitat, scape, authenticity, spectacle };
  let total = 0;
  for (const k of Object.keys(W) as (keyof RatingParts)[]) total += parts[k] * W[k];
  if (t.animals.length === 0 && t.items.length === 0) total = 0;
  return { total, stars: starsFor(total), parts, notes };
}

export function starsFor(total: number): number {
  // half stars: about 63 is three stars, 78 four, 92 five
  return Math.max(0, Math.min(5, Math.round(((total - 20) / 14.4) * 2) / 2));
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Composition: fill, layering, focal point, variety, slope, open water, tidiness. */
export function scapeScore(t: Tank, f: Facts): { score: number; note?: string } {
  if (!t.items.length) return { score: 10, note: 'Add stones, wood or plants.' };
  const g = f.geom;
  const waterArea = g.w * (g.h - g.surface);
  let area = 0, whimsy = 0, overgrown = 0;
  const layers = [0, 0, 0];
  const heights = [0, 0, 0];
  const ids = new Set<string>();
  let midOpen = 0;
  for (const p of t.items) {
    const it = item(p.id);
    const a = itemArea(it, p);
    area += a;
    layers[p.layer]++;
    heights[p.layer] = Math.max(heights[p.layer], it.h * p.size + p.y);
    ids.add(p.id);
    if (it.tags?.includes('whimsy')) whimsy++;
    if (p.size > 1.35 && it.plant) overgrown++;
    if (it.h * p.size + p.y > (g.h - g.surface) * 0.75 && it.plant?.kind !== 'ribbon' && it.plant?.kind !== 'kelp') midOpen++;
  }
  let score = 0;
  let note: string | undefined;
  const fill = area / waterArea;
  const fillScore = fill < 0.2 ? fill / 0.2 : fill <= 0.6 ? 1 : Math.max(0.2, 1 - (fill - 0.6) * 1.6);
  score += fillScore * 22;
  if (fill < 0.15) note = 'The scape looks sparse: add more stones, wood or plants.';
  else if (fill > 0.8) note = 'The scape is crowded: leave some open water.';
  const layered = layers.filter((n) => n >= 2).length;
  score += (layered / 3) * 12 + (heights[0] >= heights[1] && heights[1] >= heights[2] ? 8 : heights[0] >= heights[2] ? 4 : 0);
  if (layered < 2 && !note) note = 'Build depth: two or more pieces in each of the back, middle and front.';
  // focal point near a third
  let best = 0, bestX = 0;
  for (const p of t.items) {
    const it = item(p.id);
    if (it.cat === 'rock' || it.cat === 'wood' || it.cat === 'decor') {
      const a = itemArea(it, p);
      if (a > best) {
        best = a;
        bestX = p.x / g.w;
      }
    }
  }
  const thirds = Math.min(Math.abs(bestX - 1 / 3), Math.abs(bestX - 2 / 3));
  score += best > 0 ? Math.max(0, 1 - thirds / 0.12) * 14 : 3;
  if (best > 0 && thirds > 0.08 && !note) note = 'Move the biggest piece about a third of the way across.';
  // variety without clutter, and a calm palette of hardscape materials
  score += ids.size <= 2 ? 4 : ids.size <= 10 ? 10 : Math.max(0, 10 - (ids.size - 10) * 1.5);
  const materials = new Set(t.items.filter((p) => ['rock', 'wood'].includes(item(p.id).cat)).map((p) => p.id)).size;
  if (materials > 2) {
    score -= (materials - 2) * 5;
    if (!note) note = 'Too many kinds of stone and wood: pick one or two materials.';
  }
  score += Math.min(1, t.slope / 0.5) * 8;
  score += midOpen <= 2 ? 6 : 1;
  const ph = t.items.filter((p) => item(p.id).plant);
  score += ph.length ? avg(ph.map((p) => p.health)) * 12 : 6;
  if (ph.length && avg(ph.map((p) => p.health)) < 0.6 && !note) note = 'The plants look unhappy: check light, CO2 and nutrients.';
  score += Math.min(8, f.plantSpecies * 1.5);
  score -= Math.max(0, whimsy - 2) * 8;
  score -= overgrown * 3;
  if (overgrown > 1 && !note) note = 'Some plants are overgrown: trim them.';
  return { score: Math.max(0, Math.min(100, score)), note };
}
