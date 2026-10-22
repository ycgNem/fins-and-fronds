// Tank geometry and "facts": the measured description of a tank that archetype rules, the rating,
// compatibility checks and wellbeing all read. Pure functions of the tank and the content data.
import { equip, item, shell, species, substrate } from '../data';
import type { CoralType, ItemCat, ItemDef, ItemTag, Kind, PlantKind, RegionId, ShellDef, Slot, SubstrateDef, Tag } from '../data/types';
import { BAL, bioloadOf } from './balance';
import type { Placed, Tank } from './state';

// ---------------------------------------------------------------- geometry

export interface Geom {
  shell: ShellDef;
  w: number;
  h: number;
  /** y of the water surface (pixels from the top of the interior) */
  surface: number;
  /** x where the land shelf starts (w if none) */
  landX: number;
  maxDepth: number;
}

export function geom(t: Tank): Geom {
  const s = shell(t.shell);
  const fill = s.fill ?? 1;
  const surface = fill < 1 ? Math.round(s.h * (1 - fill)) : 6;
  const landX = s.land ? Math.round(s.w * (1 - s.land)) : s.w;
  return { shell: s, w: s.w, h: s.h, surface, landX, maxDepth: Math.round(s.h * 0.26) };
}

/** how high a sculpted substrate may rise, as a share of maxDepth (above 1: heaped up past the usual bed) */
export const PROFILE_MAX = 1.45;

/** y of the substrate surface at x for a depth layer (back sits a little higher: the slope). */
export function groundY(t: Tank, g: Geom, x: number, layer = 2): number {
  const p = t.profile;
  const f = Math.max(0, Math.min(p.length - 1.001, (x / g.w) * (p.length - 1)));
  const i = Math.floor(f);
  const a = p[i], b = p[i + 1];
  const k = f - i;
  const v = a + (b - a) * (k * k * (3 - 2 * k));
  const base = g.h - 5 - v * g.maxDepth;
  const lift = (2 - layer) * t.slope * g.maxDepth * 0.35;
  return Math.round(base - lift);
}

export function litersOf(t: Tank): number {
  const s = shell(t.shell);
  let l = s.liters * (s.fill ?? 1);
  if (t.equip.includes('sump')) l *= 1.2;
  return l;
}

export function itemArea(it: ItemDef, p: Placed): number {
  return it.w * it.h * p.size * p.size;
}

// ---------------------------------------------------------------- equipment readings

export interface Gear {
  bio: number;
  lph: number;
  heatW: number;
  chillW: number;
  par: number;
  tint: string;
  lightHeat: number;
  co2: number;
  co2Steady: number;
  air: number;
  export: number;
  slots: Map<Slot, number>;
  ids: Set<string>;
  gentle: boolean;
}

export function gear(t: Tank): Gear {
  const g: Gear = { bio: 0, lph: 0, heatW: 0, chillW: 0, par: 0, tint: 'neutral', lightHeat: 0, co2: 0, co2Steady: 1, air: 0, export: 0, slots: new Map(), ids: new Set(), gentle: true };
  for (const id of t.equip) {
    const e = equip(id);
    g.ids.add(id);
    g.slots.set(e.slot, (g.slots.get(e.slot) ?? 0) + 1);
    if (e.slot === 'filter') {
      g.bio += e.bio ?? 0;
      if (!e.gentle) g.gentle = false;
    }
    g.lph += e.lph ?? 0;
    if (e.slot === 'heater') g.heatW += e.watts ?? 0;
    if (e.slot === 'chiller') g.chillW += e.watts ?? 0;
    if (e.slot === 'light' && (e.par ?? 0) > g.par) {
      g.par = e.par ?? 0;
      g.tint = e.tint ?? 'neutral';
      g.lightHeat = e.heat ?? 0;
    }
    if (e.slot === 'co2') {
      g.co2 = Math.max(g.co2, e.co2 ?? 0);
      g.co2Steady = Math.min(g.co2Steady, e.steady ?? 1);
    }
    g.air += e.air ?? 0;
    g.export += e.export ?? 0;
  }
  return g;
}

export function flowLevel(lph: number, liters: number): number {
  const turnover = lph / Math.max(1, liters);
  return turnover < 2 ? 0 : turnover < 5 ? 1 : turnover < 10 ? 2 : turnover < 20 ? 3 : 4;
}

export const FLOW_NAMES = ['still', 'gentle', 'moderate', 'strong', 'torrent'];

// ---------------------------------------------------------------- facts

export interface Facts {
  tank: Tank;
  geom: Geom;
  liters: number;
  gear: Gear;
  sub: SubstrateDef;
  flow: number;
  /** light reaching the substrate */
  par: number;
  /** light at the surface */
  parTop: number;
  animals: number;
  adults: number;
  bySpecies: Map<string, number>;
  byKind: Map<Kind, number>;
  byTag: Map<Tag, number>;
  itemsById: Map<string, number>;
  itemsByCat: Map<ItemCat, number>;
  itemsByTag: Map<ItemTag, number>;
  plantKinds: Map<PlantKind, number>;
  plantSpecies: number;
  plantCount: number;
  coverage: number;
  floatCover: number;
  corals: Map<CoralType, number>;
  coralTotal: number;
  stones: Placed[];
  bioload: number;
  bioCap: number;
  hitch: number;
  caves: number;
  hasLid: boolean;
  openTop: boolean;
  land: boolean;
  lightsOn: boolean;
}

export function facts(t: Tank, hour = 12): Facts {
  const g = geom(t);
  const liters = litersOf(t);
  const gr = gear(t);
  const sub = substrate(t.substrate);
  const bySpecies = new Map<string, number>();
  const byKind = new Map<Kind, number>();
  const byTag = new Map<Tag, number>();
  let bioload = 0, adults = 0;
  for (const a of t.animals) {
    const s = species(a.sp);
    bySpecies.set(a.sp, (bySpecies.get(a.sp) ?? 0) + 1);
    byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
    for (const tag of s.tags) byTag.set(tag, (byTag.get(tag) ?? 0) + 1);
    bioload += bioloadOf(s.cm, s.body) * (a.fry ? 0.25 : 1);
    if (!a.fry) adults++;
  }
  const itemsById = new Map<string, number>();
  const itemsByCat = new Map<ItemCat, number>();
  const itemsByTag = new Map<ItemTag, number>();
  const plantKinds = new Map<PlantKind, number>();
  const plantIds = new Set<string>();
  const corals = new Map<CoralType, number>();
  const stones: Placed[] = [];
  let plantArea = 0, floatW = 0, hitch = 0, caves = 0, plantCount = 0, coralTotal = 0, bioItems = 0;
  for (const p of t.items) {
    const it = item(p.id);
    itemsById.set(p.id, (itemsById.get(p.id) ?? 0) + 1);
    itemsByCat.set(it.cat, (itemsByCat.get(it.cat) ?? 0) + 1);
    for (const tag of it.tags ?? []) itemsByTag.set(tag, (itemsByTag.get(tag) ?? 0) + 1);
    if (it.tags?.includes('hitch')) hitch++;
    if (it.tags?.includes('cave')) caves++;
    // a scatter of pebbles is gravel, not a stone in the composition
    if (it.tags?.includes('stone') && it.shape !== 'pebbles') stones.push(p);
    bioItems += it.fx?.bio ?? 0;
    if (it.plant) {
      plantCount++;
      plantIds.add(p.id);
      plantKinds.set(it.plant.kind, (plantKinds.get(it.plant.kind) ?? 0) + 1);
      plantArea += itemArea(it, p) * (it.plant.kind === 'carpet' ? 2.5 : 1);
      if (it.plant.kind === 'floating') floatW += it.w * p.size;
      if (it.plant.kind === 'seagrass' || it.plant.kind === 'macroalgae' || it.plant.kind === 'kelp' || it.plant.kind === 'ribbon') hitch++;
    }
    if (it.coral) {
      coralTotal++;
      corals.set(it.coral.type, (corals.get(it.coral.type) ?? 0) + 1);
    }
  }
  const waterArea = g.w * Math.max(20, g.h - g.surface);
  const coverage = Math.min(1, plantArea / (waterArea * 0.45));
  const floatCover = Math.min(1, floatW / g.w);
  const lightsOn = hour >= t.set.lightOn && hour < t.set.lightOff;
  const depthCm = g.shell.cm[2] * (g.shell.fill ?? 1);
  const shade = (1 - t.chem.tannin * 0.5) * (1 - Math.min(0.6, floatCover * 0.7));
  const parTop = gr.par * shade;
  const par = gr.par * Math.pow(40 / Math.max(10, depthCm), 1.1) * shade;
  return {
    tank: t, geom: g, liters, gear: gr, sub, flow: flowLevel(gr.lph, liters), par, parTop,
    animals: t.animals.length, adults, bySpecies, byKind, byTag, itemsById, itemsByCat, itemsByTag,
    plantKinds, plantSpecies: plantIds.size, plantCount, coverage, floatCover, corals, coralTotal, stones,
    bioload, bioCap: (gr.bio + bioItems + (sub.fx.bio ?? 0)) * BAL.bioPerFilterL,
    hitch, caves, hasLid: gr.slots.has('lid'), openTop: g.shell.tags.includes('open_top'), land: !!g.shell.land, lightsOn,
  };
}

/** PAR at a height in the tank (corals high on the rock get more light). */
export function parAt(f: Facts, y: number): number {
  const frac = 1 - Math.max(0, Math.min(1, (y - f.geom.surface) / Math.max(1, f.geom.h - f.geom.surface)));
  return f.par + (f.parTop - f.par) * frac;
}

/** How native a tank is to some regions: each animal species counts once (a big school of the
 *  right fish cannot hide one wrong one), and each plant species counts half. */
export function regionFrac(f: Facts, ids: RegionId[]): number {
  let n = 0, native = 0;
  for (const id of f.bySpecies.keys()) {
    const s = species(id);
    if (s.source === 'hitchhiker') continue;
    n++;
    if (s.regions.some((r) => ids.includes(r))) native++;
  }
  const plants = new Set(f.tank.items.filter((p) => item(p.id).plant).map((p) => p.id));
  for (const id of plants) {
    n += 0.5;
    if (item(id).regions?.some((r) => ids.includes(r))) native += 0.5;
  }
  return n === 0 ? 0 : native / n;
}

export function schoolsOf(f: Facts, size: number): number {
  let n = 0;
  for (const c of f.bySpecies.values()) if (c >= size) n++;
  return n;
}

/** Largest stone or wood piece is about a third or two thirds across (golden-section-ish). */
export function focalThirds(f: Facts): boolean {
  let best: Placed | null = null, bestA = 0;
  for (const p of f.tank.items) {
    const it = item(p.id);
    if (it.cat !== 'rock' && it.cat !== 'wood') continue;
    const a = itemArea(it, p);
    if (a > bestA) {
      bestA = a;
      best = p;
    }
  }
  if (!best) return false;
  const r = best.x / f.geom.w;
  return Math.abs(r - 1 / 3) < 0.1 || Math.abs(r - 2 / 3) < 0.1;
}

export function oddStones(f: Facts): boolean {
  const n = f.stones.length;
  return n >= 3 && n % 2 === 1;
}

export function oneRockType(f: Facts): boolean {
  const ids = new Set(f.stones.map((s) => s.id));
  return ids.size === 1;
}
