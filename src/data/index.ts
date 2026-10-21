// One registry for all content, with id lookups. Sim, render and UI import from here.
import { FRESHWATER } from './species/freshwater';
import { BRACKISH } from './species/brackish';
import { MARINE } from './species/marine';
import { PLANTS } from './plants';
import { CORALS } from './corals';
import { HARDSCAPE } from './hardscape';
import { SUBSTRATES } from './substrates';
import { SHELLS } from './shells';
import { EQUIPMENT } from './equipment';
import { REGIONS } from './regions';
import { ARCHETYPES } from './archetypes';
import { TIERS, UPGRADES, CORRESPONDENTS, REQUESTS, SYMBIOSES } from './progression';
import type {
  ArchetypeDef, CorrespondentDef, EquipDef, ItemDef, RegionDef, RegionId, RequestDef, ShellDef, SpeciesDef, SubstrateDef, UpgradeDef,
} from './types';

export const SPECIES: SpeciesDef[] = [...FRESHWATER, ...BRACKISH, ...MARINE];
export const ITEMS: ItemDef[] = [...PLANTS, ...CORALS, ...HARDSCAPE];
export { SUBSTRATES, SHELLS, EQUIPMENT, REGIONS, ARCHETYPES, TIERS, UPGRADES, CORRESPONDENTS, REQUESTS, SYMBIOSES };

function index<T extends { id: string }>(list: T[], what: string): Map<string, T> {
  const m = new Map<string, T>();
  for (const x of list) {
    if (m.has(x.id)) throw new Error(`duplicate ${what} id: ${x.id}`);
    m.set(x.id, x);
  }
  return m;
}

const speciesById = index(SPECIES, 'species');
const itemById = index(ITEMS, 'item');
const substrateById = index(SUBSTRATES, 'substrate');
const shellById = index(SHELLS, 'shell');
const equipById = index(EQUIPMENT, 'equipment');
const regionById = index(REGIONS, 'region');
const archetypeById = index(ARCHETYPES, 'archetype');
const upgradeById = index(UPGRADES, 'upgrade');
const correspondentById = index(CORRESPONDENTS, 'correspondent');
const requestById = index(REQUESTS, 'request');

function get<T>(m: Map<string, T>, id: string, what: string): T {
  const v = m.get(id);
  if (!v) throw new Error(`unknown ${what}: ${id}`);
  return v;
}

export const species = (id: string): SpeciesDef => get(speciesById, id, 'species');
export const item = (id: string): ItemDef => get(itemById, id, 'item');
export const substrate = (id: string): SubstrateDef => get(substrateById, id, 'substrate');
export const shell = (id: string): ShellDef => get(shellById, id, 'shell');
export const equip = (id: string): EquipDef => get(equipById, id, 'equipment');
export const region = (id: RegionId | string): RegionDef => get(regionById, id, 'region');
export const archetype = (id: string): ArchetypeDef => get(archetypeById, id, 'archetype');
export const upgrade = (id: string): UpgradeDef => get(upgradeById, id, 'upgrade');
export const correspondent = (id: string): CorrespondentDef => get(correspondentById, id, 'correspondent');
export const request = (id: string): RequestDef => get(requestById, id, 'request');

export const hasSpecies = (id: string) => speciesById.has(id);
export const hasItem = (id: string) => itemById.has(id);
export const hasShell = (id: string) => shellById.has(id);
export const hasEquip = (id: string) => equipById.has(id);
export const hasUpgrade = (id: string) => upgradeById.has(id);
export const hasRegion = (id: string) => regionById.has(id);

/** Species native to a region (expedition loot tables, biotope hints). */
export function speciesOf(r: RegionId): SpeciesDef[] {
  return SPECIES.filter((s) => s.regions.includes(r));
}
export function itemsOf(r: RegionId): ItemDef[] {
  return ITEMS.filter((i) => i.regions?.includes(r));
}
