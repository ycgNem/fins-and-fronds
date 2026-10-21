// Helpers that keep the species tables short: every field a species leaves out gets a sensible
// default derived from its size and rarity.
import type { SpeciesDef } from '../types';

/**
 * Sprite length in pixels for an adult length in cm. Tanks are drawn at 4 px per cm. Small animals
 * get a head start (a 3 cm neon is 18 px, a 1 cm snail 11 px) so a shrimp or a tetra still reads
 * as itself; from 12 cm up big animals are compressed so a 1 m shark still fits an exhibit tank.
 * Imported art sets the final drawn length (creatureLength in src/render/art/sprites.ts).
 */
export function pxForCm(cm: number): number {
  if (cm <= 12) return Math.round(8 + cm * (40 / 12));
  if (cm <= 40) return Math.round(48 + (cm - 12) * 2.2);
  return Math.min(200, Math.round(110 + (cm - 40) * 0.9));
}

/** Rough minimum tank size for a species of this length (overridden where care sheets differ). */
export function minLitersFor(cm: number): number {
  return Math.max(10, Math.round(1.1 * Math.pow(cm, 1.7)));
}

type Required = 'id' | 'name' | 'sci' | 'kind' | 'water' | 'regions' | 'temp' | 'ph' | 'cm' | 'body' | 'look' | 'temper' | 'zone' | 'fact';
export type SpeciesIn = Pick<SpeciesDef, Required> & Partial<Omit<SpeciesDef, Required>>;

export function sp(d: SpeciesIn): SpeciesDef {
  const rarity = d.rarity ?? 1;
  return {
    px: pxForCm(d.cm),
    school: 1,
    minL: minLitersFor(d.cm),
    flow: [0, 2],
    diet: ['flake'],
    price: Math.round(2 + rarity * rarity * 3 + d.cm * 0.4 * rarity),
    appeal: 4,
    tags: [],
    needs: [],
    breed: { type: 'none', ease: 0 },
    source: 'supplier',
    tier: 0,
    ...d,
    rarity,
  };
}

/**
 * Defaults shared by a group of species (the water chemistry of a region, for example). Each entry
 * may leave out whatever the base provides; tests/data.test.ts checks nothing required is missing.
 */
export function group(base: Partial<SpeciesIn>, list: Partial<SpeciesIn>[]): SpeciesDef[] {
  return list.map((s) => sp({ ...base, ...s } as SpeciesIn));
}
