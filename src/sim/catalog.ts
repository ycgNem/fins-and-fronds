// What the supplier will sell right now. The supplier is never shown: you order from a catalog
// and the order arrives in a bag floating at the top of the tank.
import { EQUIPMENT, ITEMS, SHELLS, SPECIES, SUBSTRATES } from '../data';
import type { EquipDef, ItemDef, ShellDef, SpeciesDef, SubstrateDef, Water } from '../data/types';
import type { GameState } from './state';

export function speciesForSale(s: GameState, water?: Water): SpeciesDef[] {
  return SPECIES.filter((sp) => {
    if (sp.source === 'hitchhiker') return false;
    const unlocked = s.unlocked.species.includes(sp.id);
    if (!unlocked && (sp.source === 'expedition' || sp.tier > s.tier)) return false;
    if (water && sp.water !== water && !(sp.tags.includes('brackish_ok') && water !== 'marine' && sp.water !== 'marine')) return false;
    return true;
  });
}

export function itemsForSale(s: GameState, water?: Water): ItemDef[] {
  return ITEMS.filter((it) => {
    const unlocked = s.unlocked.items.includes(it.id);
    if (!unlocked && (it.source === 'expedition' || it.tier > s.tier)) return false;
    if (water && !it.water.includes(water)) return false;
    const set = it.tags?.find((t) => t.startsWith('set_'));
    if (set && !(s.upgrades[set] ?? 0) && it.tier > 0) return false;
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
