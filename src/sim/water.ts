// Water chemistry: temperature, pH and hardness, salinity, oxygen, tannins and the nitrogen
// cycle (ammonia -> nitrite -> nitrate via two bacteria populations). Simplified from the real
// processes in RESEARCH.md ("Water chemistry" and "The nitrogen cycle") so it stays readable:
// every value moves toward an equilibrium at its own rate.
import { item, species } from '../data';
import type { Water } from '../data/types';
import { BAL, bioloadOf } from './balance';
import type { Facts } from './facts';
import type { Chem, Tank, WaterSource } from './state';

export interface SourceDef {
  name: string;
  water: Water;
  ph: number;
  gh: number;
  kh: number;
  tannin: number;
  /** needs this equipment to make */
  needs?: string;
  blurb: string;
}

export const SOURCES: Record<WaterSource, SourceDef> = {
  tap: { name: 'Tap water', water: 'fresh', ph: 7.4, gh: 8, kh: 5, tannin: 0, blurb: 'Dechlorinated tap water: moderately hard, near neutral.' },
  soft: { name: 'Soft water', water: 'fresh', ph: 6.6, gh: 4, kh: 1, tannin: 0, needs: 'ro_unit',
    blurb: 'RO water remineralized with GH only: soft and slightly acidic, for Caridina, discus and blackwater fish.' },
  blackwater: { name: 'Blackwater', water: 'fresh', ph: 5.8, gh: 1, kh: 0, tannin: 0.3, needs: 'ro_unit',
    blurb: 'RO water filtered through peat: very soft, acidic and tea-colored.' },
  hard: { name: 'Hard water', water: 'fresh', ph: 8.1, gh: 14, kh: 10, tannin: 0, blurb: 'Tap water with Rift Lake buffer salts: hard and alkaline.' },
  brackish: { name: 'Brackish mix', water: 'brackish', ph: 8.0, gh: 12, kh: 8, tannin: 0, blurb: 'Fresh water with marine salt (never plain aquarium salt).' },
  marine: { name: 'Saltwater', water: 'marine', ph: 8.2, gh: 0, kh: 8, tannin: 0, blurb: 'Reef salt mixed into RO water to the target salinity.' },
};

export function defaultSource(w: Water): WaterSource {
  return w === 'fresh' ? 'tap' : w;
}

export function defaultSalt(w: Water): number {
  return w === 'marine' ? 1.025 : w === 'brackish' ? 1.008 : 1.0;
}

/** Equilibrium chemistry from the water source, substrate and hardscape. */
export function equilibrium(t: Tank, f: Facts): { ph: number; gh: number; kh: number; tannin: number } {
  const src = SOURCES[t.set.source];
  let ph = src.ph, gh = src.gh, kh = src.kh, tannin = src.tannin;
  const load = 100 / Math.max(5, f.liters);
  for (const p of t.items) {
    const it = item(p.id);
    if (!it.fx) continue;
    const w = Math.min(3, ((it.w * it.h * p.size * p.size) / BAL.fxArea) * load);
    ph += (it.fx.ph ?? 0) * w;
    gh += (it.fx.gh ?? 0) * w;
    kh += (it.fx.kh ?? 0) * w;
    tannin += (it.fx.tannin ?? 0) * w;
  }
  const sx = f.sub.fx;
  ph += sx.ph ?? 0;
  gh += sx.gh ?? 0;
  kh += sx.kh ?? 0;
  if (f.gear.ids.has('peat_media')) {
    tannin += 0.25;
    ph -= 0.3;
  }
  if (f.gear.ids.has('carbon_media')) tannin *= 0.3;
  gh = Math.max(0, gh);
  kh = Math.max(0, kh);
  // low carbonate hardness means a weakly buffered, more acidic tank
  ph += (Math.min(kh, 10) - src.kh) * 0.04;
  ph -= Math.min(tannin, 1) * 0.5;
  return { ph: Math.max(3.8, Math.min(9.2, ph)), gh, kh, tannin: Math.max(0, Math.min(1, tannin)) };
}

/** Dissolved oxygen saturation (mg/L) at a temperature, freshwater approximation. */
export function o2Saturation(temp: number): number {
  return 14.6 - 0.39 * temp + 0.007 * temp * temp;
}

/** The temperature the tank is heading for with its gear and lights. */
export function targetTemp(t: Tank, f: Facts): number {
  const room = BAL.roomTemp + (f.lightsOn ? f.gear.lightHeat : 0);
  let target = room;
  const set = t.set.heater;
  if (set > room && f.gear.heatW > 0) target = Math.min(set, room + (BAL.heatPerWattPerL * f.gear.heatW) / f.liters);
  if (set < room && f.gear.chillW > 0) target = Math.max(set, room - (BAL.chillPerWattPerL * f.gear.chillW) / f.liters);
  return target;
}

export interface WaterCtx {
  dtH: number;
  /** water changes, auto top-off etc. from upgrades */
  autoChangePerDay: number;
  autoTopOff: boolean;
  plantMass: number;
  grazers: number;
  /** fed within the last day */
  fedRecently: boolean;
}

function approach(v: number, target: number, rate: number, dtH: number): number {
  return v + (target - v) * Math.min(1, rate * dtH);
}

export function stepWater(t: Tank, f: Facts, c: WaterCtx) {
  const ch = t.chem;
  const dtH = c.dtH;
  const eq = equilibrium(t, f);
  const co2 = f.lightsOn && t.set.co2 ? f.gear.co2 : 0;
  ch.co2 = approach(ch.co2, 3 + co2, 0.8, dtH);
  const buffer = Math.max(0.2, Math.min(2, ch.kh / 4));
  ch.ph = approach(ch.ph, eq.ph - (ch.co2 - 3) / 25 * 0.5, 0.25 / (0.5 + buffer), dtH);
  ch.gh = approach(ch.gh, eq.gh, 0.05, dtH);
  ch.kh = approach(ch.kh, eq.kh, 0.05, dtH);
  ch.tannin = approach(ch.tannin, eq.tannin, 0.03, dtH);
  ch.temp = approach(ch.temp, targetTemp(t, f), BAL.tempRate, dtH);

  // salinity creeps up as fresh water evaporates
  if (t.water !== 'fresh') {
    if (c.autoTopOff || f.gear.slots.has('ato')) ch.sg = approach(ch.sg, t.set.salt, 0.5, dtH);
    else {
      const evapPerDay = f.openTop ? 0.012 : f.hasLid ? 0.003 : 0.006;
      ch.sg += (ch.sg - 1) * evapPerDay * (dtH / 24);
    }
  } else ch.sg = 1.0;

  // oxygen
  const sat = o2Saturation(ch.temp);
  const photo = f.lightsOn ? f.coverage * 0.15 : -f.coverage * 0.08;
  const aer = 0.65 + 0.1 * Math.min(3, f.flow) + f.gear.air + photo + (f.openTop ? 0.05 : 0);
  const use = Math.min(0.5, (f.bioload / Math.max(1, f.liters)) * 0.6);
  ch.o2 = approach(ch.o2, sat * Math.max(0.3, Math.min(1.05, aer - use)), 0.6, dtH);

  // ---- nitrogen cycle
  let waste = 0;
  for (const a of t.animals) waste += bioloadOf(species(a.sp).cm) * (a.fry ? 0.25 : 1);
  const fed = c.fedRecently ? 1 : 0.6;
  const nh3In = ((waste * fed * BAL.wastePerBio) / Math.max(1, f.liters)) * dtH;
  ch.nh3 += nh3In;
  // capacity in ppm/h that a fully colonized biofilter can process
  const cap = ((f.bioCap * BAL.wastePerBio) / Math.max(1, f.liters)) * 1.6;
  const convA = Math.min(ch.nh3, ch.bacA * cap * dtH);
  ch.nh3 -= convA;
  ch.no2 += convA;
  const convB = Math.min(ch.no2, ch.bacB * cap * dtH);
  ch.no2 -= convB;
  ch.no3 += convB;
  // bacteria grow while they have food, and slowly starve without it
  const foodA = Math.min(1, (ch.nh3 + nh3In) / 0.05);
  const foodB = Math.min(1, (ch.no2 + convA) / 0.05);
  ch.bacA += (BAL.bacGrowA * ch.bacA * (1 - ch.bacA) * foodA - (foodA < 0.05 && waste < 0.5 ? BAL.bacStarve * ch.bacA : 0)) * dtH;
  ch.bacB += (BAL.bacGrowB * ch.bacB * (1 - ch.bacB) * foodB - (foodB < 0.05 && waste < 0.5 ? BAL.bacStarve * ch.bacB : 0)) * dtH;
  ch.bacA = Math.max(0.01, Math.min(1, ch.bacA));
  ch.bacB = Math.max(0.01, Math.min(1, ch.bacB));
  // plants take up ammonia first, then nitrate; skimmers, refugiums and sumps export
  const uptake = c.plantMass * 0.004 * dtH * (f.lightsOn ? 1 : 0.3);
  const takeNh3 = Math.min(ch.nh3, uptake);
  ch.nh3 -= takeNh3;
  ch.no3 = Math.max(0, ch.no3 - (uptake - takeNh3) * 2.5);
  const exportFrac = Math.min(0.5, f.gear.export) * (dtH / 24);
  ch.no3 *= 1 - exportFrac;
  ch.nh3 *= 1 - exportFrac * 0.5;

  // bacterial bloom in young tanks, cleared by time and UV
  const bloomDrive = t.ageDays < 4 && ch.nh3 > 0.15 ? 0.04 : -0.02;
  ch.cloud = Math.max(0, Math.min(1, ch.cloud + bloomDrive * dtH - (f.gear.slots.has('uv') ? 0.05 * dtH : 0)));

  // algae: light and leftover nutrients feed it, healthy plants and grazers starve it
  const lightF = f.lightsOn ? Math.min(2.5, f.parTop / 120) : 0;
  const nutrients = ch.no3 / 20 + ch.nh3 * 4;
  const unsteadyCo2 = t.set.co2 && f.gear.co2 > 0 ? (1 - f.gear.co2Steady) * 0.6 : 0;
  const compete = f.coverage * (t.set.co2 && f.gear.co2Steady > 0.8 ? 1.6 : 1.1);
  const drive = lightF * (0.3 + nutrients + unsteadyCo2) - compete;
  ch.algae = Math.max(0, Math.min(1, ch.algae + (drive * 0.012 - c.grazers * 0.01) * dtH));
  ch.glass = Math.max(0, Math.min(1, ch.glass + (lightF * (0.006 + Math.max(0, drive) * 0.006) - c.grazers * 0.006) * dtH));

  // automatic water changes from upgrades
  if (c.autoChangePerDay > 0) waterChange(t, c.autoChangePerDay * (dtH / 24), f);
}

/** Replace a fraction of the water: solutes dilute, chemistry moves toward the fresh water. */
export function waterChange(t: Tank, frac: number, f: Facts) {
  const ch = t.chem;
  const k = Math.max(0, Math.min(0.9, frac));
  ch.nh3 *= 1 - k;
  ch.no2 *= 1 - k;
  ch.no3 *= 1 - k;
  ch.tannin *= 1 - k * 0.7;
  ch.cloud *= 1 - k * 0.6;
  const eq = equilibrium(t, f);
  ch.ph += (eq.ph - ch.ph) * k;
  ch.gh += (eq.gh - ch.gh) * k;
  ch.kh += (eq.kh - ch.kh) * k;
  if (t.water !== 'fresh') ch.sg += (t.set.salt - ch.sg) * k;
  ch.temp += (BAL.roomTemp + (t.set.heater - BAL.roomTemp) * 0.8 - ch.temp) * k * 0.3;
}

/** Fresh water straight from the source, for a new tank. */
export function freshChem(source: WaterSource, salt: number, cycled: number): Chem {
  const s = SOURCES[source];
  return {
    temp: BAL.roomTemp, ph: s.ph, gh: s.gh, kh: s.kh, sg: salt, nh3: 0, no2: 0, no3: 0, o2: 8, co2: 3,
    tannin: s.tannin, cloud: 0, algae: 0, glass: 0, bacA: Math.max(0.01, cycled), bacB: Math.max(0.01, cycled),
  };
}

/** How far along the nitrogen cycle the tank is, 0..1 (the second bacteria population lags). */
export function cycleProgress(ch: Chem): number {
  return Math.min(ch.bacA, ch.bacB * 1.05);
}
