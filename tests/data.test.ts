// Content integrity: unique ids, valid cross-references, sane ranges.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, CORRESPONDENTS, EQUIPMENT, ITEMS, REGIONS, REQUESTS, SHELLS, SPECIES, SUBSTRATES, SYMBIOSES, UPGRADES,
  hasEquip, hasItem, hasRegion, hasShell, hasSpecies, hasUpgrade,
} from '../src/data';
import { RAMP } from '../src/data/palette';

const REQUIRED = ['id', 'name', 'sci', 'kind', 'water', 'regions', 'temp', 'ph', 'cm', 'body', 'look', 'temper', 'zone', 'fact'] as const;

describe('content', () => {
  it('has a lot of it', () => {
    expect(SPECIES.length).toBeGreaterThan(150);
    expect(ITEMS.length).toBeGreaterThan(120);
    expect(ARCHETYPES.length).toBeGreaterThan(55);
    expect(REGIONS.length).toBeGreaterThan(25);
  });

  it('species are complete and sane', () => {
    for (const s of SPECIES) {
      for (const k of REQUIRED) expect(s[k], `${s.id}.${k}`).toBeDefined();
      expect(s.temp[0], s.id).toBeLessThan(s.temp[1]);
      expect(s.ph[0], s.id).toBeLessThan(s.ph[1]);
      if (s.water !== 'fresh') expect(s.sg, `${s.id} needs sg`).toBeDefined();
      for (const r of s.regions) expect(hasRegion(r), `${s.id} region ${r}`).toBe(true);
      for (const c of [s.look.body, s.look.belly, s.look.fin, s.look.accent]) if (c) expect(RAMP[c], `${s.id} color ${c}`).toBeDefined();
      expect(s.px).toBeGreaterThan(3);
      expect(s.fact.length, s.id).toBeLessThan(220);
    }
  });

  it('every region has native species', () => {
    for (const r of REGIONS) expect(SPECIES.some((s) => s.regions.includes(r.id)), r.id).toBe(true);
  });

  it('items, substrates, shells and equipment are sane', () => {
    for (const i of ITEMS) {
      for (const c of i.colors) expect(RAMP[c], `${i.id} color ${c}`).toBeDefined();
      if (i.regions) for (const r of i.regions) expect(hasRegion(r), `${i.id} region ${r}`).toBe(true);
      expect(i.w * i.h).toBeGreaterThan(0);
    }
    for (const s of SUBSTRATES) for (const c of s.colors) expect(RAMP[c]).toBeDefined();
    for (const s of SHELLS) expect(s.liters).toBeGreaterThan(0);
    expect(EQUIPMENT.length).toBeGreaterThan(30);
  });

  it('archetype rules reference real content', () => {
    for (const a of ARCHETYPES) {
      expect(a.rules.some((r) => r.hard), `${a.id} has a hard rule`).toBe(true);
      for (const { rule } of a.rules) {
        if (rule.t === 'has') for (const id of rule.ids) expect(hasSpecies(id), `${a.id}: ${id}`).toBe(true);
        if (rule.t === 'items' && rule.ids) for (const id of rule.ids) expect(hasItem(id), `${a.id}: ${id}`).toBe(true);
        if (rule.t === 'region') for (const id of rule.ids) expect(hasRegion(id), `${a.id}: ${id}`).toBe(true);
      }
    }
  });

  it('progression references real content', () => {
    const who = new Set(CORRESPONDENTS.map((c) => c.id));
    for (const r of REQUESTS) {
      expect(who.has(r.from), r.id).toBe(true);
      if (r.check.t === 'archetype' && r.check.id) expect(ARCHETYPES.some((a) => a.id === (r.check as { id: string }).id), r.id).toBe(true);
      if (r.check.t === 'species') expect(hasSpecies(r.check.id), r.id).toBe(true);
      if (r.reward.unlock) {
        const u = r.reward.unlock;
        expect(hasUpgrade(u) || hasItem(u) || hasShell(u) || hasSpecies(u) || hasEquip(u), `${r.id} unlock ${u}`).toBe(true);
      }
    }
    for (const y of SYMBIOSES) {
      expect(hasSpecies(y.a), y.id).toBe(true);
      if (y.b.startsWith('item:')) expect(hasItem(y.b.slice(5)), y.id).toBe(true);
      else if (!y.b.includes(':')) expect(hasSpecies(y.b), y.id).toBe(true);
    }
    expect(UPGRADES.length).toBeGreaterThan(15);
  });

  it('the requested favorites are in', () => {
    expect(hasSpecies('cherry_shrimp')).toBe(true);
    expect(hasSpecies('assassin_snail')).toBe(true);
    const woods = ITEMS.filter((i) => i.cat === 'wood');
    expect(woods.length).toBeGreaterThanOrEqual(10);
  });
});
