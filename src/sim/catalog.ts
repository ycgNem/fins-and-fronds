// What the supplier will sell right now. The supplier is never shown: you order from a catalog
// and the order arrives in a bag floating at the top of the tank.
import { EQUIPMENT, ITEMS, region, shell, SHELLS, SPECIES, SUBSTRATES, TIERS } from '../data';
import type { EquipDef, ItemDef, ShellDef, SpeciesDef, SubstrateDef, Water } from '../data/types';
import { BAL } from './balance';
import type { GameState, Tank } from './state';

export function speciesForSale(s: GameState, water?: Water): SpeciesDef[] {
  return SPECIES.filter((sp) => {
    if (sp.source === 'hitchhiker') return false;
    const unlocked = s.unlocked.species.includes(sp.id);
    if (!unlocked && (sp.source === 'expedition' || sp.tier > s.tier)) return false;
    if (water && sp.water !== water && !(sp.tags.includes('brackish_ok') && water !== 'marine' && sp.water !== 'marine')) return false;
    return true;
  });
}

/** How a species turns up, for its codex page: in on new plants, only on an expedition, bred in
 *  the shop, or from the supplier at some tier (and where it lives wild). */
export function codexHow(sp: SpeciesDef): string {
  if (sp.found) return sp.found;
  const where = sp.regions.map((r) => region(r).name).join(', ');
  if (sp.source === 'hitchhiker') return 'Rides in on new plants.';
  if (sp.source === 'expedition') return `Only from an expedition: ${where}.`;
  return `${TIERS[sp.tier].name} supplier list${where ? `; wild in ${where}` : ''}.`;
}

export function itemsForSale(s: GameState, water?: Water): ItemDef[] {
  return ITEMS.filter((it) => {
    const unlocked = s.unlocked.items.includes(it.id);
    if (!unlocked && (it.source === 'expedition' || it.tier > s.tier)) return false;
    if (water && !it.water.includes(water)) return false;
    // a decor set's pieces come only with the set
    const set = it.tags?.find((t) => t.startsWith('set_'));
    if (set && !(s.upgrades[set] ?? 0)) return false;
    return true;
  });
}

export function shellsForSale(s: GameState): ShellDef[] {
  return SHELLS.filter((sh) => sh.tier <= s.tier);
}

export function equipForSale(s: GameState, water?: Water): EquipDef[] {
  return EQUIPMENT.filter((e) => e.tier <= s.tier && (!water || !e.water || e.water.includes(water)));
}

export function substratesForSale(s: GameState, water?: Water): SubstrateDef[] {
  return SUBSTRATES.filter((x) => x.tier <= s.tier && (!water || x.water.includes(water)));
}

/** a substrate covers the floor, so it is priced by floor area (a 20 gallon long's worth costs about
 *  1.3x the list price), and never more than a share of what the tank itself costs */
export function substratePrice(t: Tank, sub: SubstrateDef): number {
  const sh = shell(t.shell);
  return Math.max(1, Math.round(Math.min(sub.price * ((sh.cm[0] * sh.cm[1]) / BAL.substrateArea), sh.price * BAL.substrateCap)));
}

export function shellPrice(s: GameState, sh: ShellDef): number {
  const g = s.upgrades['glazier'] ?? 0;
  return Math.round(sh.price * (1 - g * 0.15));
}

/** waters the player can choose for a new tank at this tier */
export function watersAvailable(s: GameState): Water[] {
  const w: Water[] = ['fresh'];
  if (s.tier >= 2) w.push('brackish');
  if (s.tier >= 3) w.push('marine');
  return w;
}

export function baysUnlocked(s: GameState, tierBays: number): number {
  return tierBays + (s.upgrades['extra_bays'] ?? 0);
}
