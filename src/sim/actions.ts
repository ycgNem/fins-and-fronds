// Player commands. Each validates, changes the state, refreshes the affected tank and returns a
// message for the UI ('' on success). The UI never edits the state directly.
import { equip, item, region, request, shell, species, substrate, TIERS, upgrade } from '../data';
import type { RegionId, Water } from '../data/types';
import { BAL } from './balance';
import { shellPrice, speciesForSale } from './catalog';
import { canExpedition, startExpedition } from './expeditions';
import { geom, groundY, litersOf } from './facts';
import type { Game } from './Game';
import { applyUnlock } from './letters';
import { newAnimal } from './life';
import { emptyTank, place } from './newgame';
import type { Placed, Tank, WaterSource } from './state';
import { SOURCES, waterChange } from './water';

const MULTI_SLOTS = new Set(['filter', 'flow', 'media', 'heater']);

function spend(g: Game, cost: number): boolean {
  if (g.state.coins < cost) {
    g.emit({ t: 'sfx', name: 'error' });
    return false;
  }
  g.state.coins -= cost;
  return true;
}

// ---------------------------------------------------------------- livestock

/** why this species cannot go into this tank at all, or '' (a poor fit is allowed, just unhappy) */
export function cannotHouse(t: Tank, sp: string): string {
  const s = species(sp);
  if (shell(t.shell).tags.includes('pico') && s.kind === 'fish') return 'A bowl is no home for a fish.';
  // brackish-tolerant species cross between fresh and brackish, never into the sea
  const okWater = s.water === t.water || (s.tags.includes('brackish_ok') && t.water !== 'marine' && s.water !== 'marine');
  if (!okWater) return `${s.name} needs ${s.water} water; it would not survive in ${t.water} water.`;
  if (litersOf(t) < s.minL * 0.25) return `${s.name} needs at least ${s.minL} L; this tank holds ${Math.round(litersOf(t))}.`;
  return '';
}

export function buyAnimals(g: Game, t: Tank, sp: string, n: number): string {
  const s = species(sp);
  if (!speciesForSale(g.state).some((x) => x.id === sp)) return 'The supplier does not list that yet.';
  const no = cannotHouse(t, sp);
  if (no) return no;
  if (!spend(g, s.price * n)) return 'Not enough coins.';
  // fish arrive in a bag and float for half an hour to match the temperature
  t.bags.push({ sp, n, until: g.state.time + 30 });
  g.emit({ t: 'sfx', name: 'splash' });
  return '';
}

export function placeFromHolding(g: Game, t: Tank, uids: number[]): string {
  const moving = g.state.holding.filter((a) => uids.includes(a.uid));
  if (!moving.length) return 'Not found.';
  const no = cannotHouse(t, moving[0].sp);
  if (no) return no;
  g.state.holding = g.state.holding.filter((a) => !moving.includes(a));
  t.bags.push({ sp: moving[0].sp, n: moving.length, until: g.state.time + 20, animals: moving });
  g.emit({ t: 'sfx', name: 'splash' });
  return '';
}

export function moveToHolding(g: Game, t: Tank, uids: number[]): string {
  const moving = t.animals.filter((a) => uids.includes(a.uid));
  if (!moving.length) return 'Not found.';
  g.state.holding.push(...moving);
  t.animals = t.animals.filter((a) => !moving.includes(a));
  g.refresh(t);
  return '';
}

/** Rehome animals from holding to local hobbyists for a little money. */
export function sellHolding(g: Game, uids: number[]): string {
  const going = g.state.holding.filter((a) => uids.includes(a.uid));
  if (!going.length) return 'Not found.';
  g.state.holding = g.state.holding.filter((a) => !going.includes(a));
  const club = (g.state.upgrades['fry_club'] ?? 0) > 0 ? 1 : 0.6;
  // wild-caught animals go to collectors at a premium; the rest are rehomed at a discount
  const coins = going.reduce((sum, a) => sum + Math.round(species(a.sp).price * (a.wild ? BAL.wildPremium : BAL.sellBack * club) * (a.fry ? 0.4 : 1)), 0);
  g.state.coins += coins;
  g.emit({ t: 'sfx', name: 'coin' });
  g.toast(`Rehomed ${going.length} ${species(going[0].sp).name.toLowerCase()} for ${coins} coins.`, 'info');
  return '';
}

// ---------------------------------------------------------------- scape

export function canPlace(t: Tank, id: string): string {
  const it = item(id);
  if (!it.water.includes(t.water)) return `${it.name} is not for ${t.water} water.`;
  if (it.place === 'land' && !shell(t.shell).land) return 'This tank has no land area.';
  if (it.place === 'hang' && !shell(t.shell).tags.includes('open_top')) return 'Hanging planters need an open-top tank.';
  if (shell(t.shell).tags.includes('kreisel')) return 'Nothing goes in a kreisel: jellies would snag on it.';
  return '';
}

/** Where an item would sit if dropped at x: on the substrate, on a stone or wood, at the surface or on the land. */
export function dropSpot(t: Tank, id: string, x: number, layer: 0 | 1 | 2, hostUid?: number): { x: number; y: number; on?: number } {
  const it = item(id);
  const g = geom(t);
  let cx = Math.max(4, Math.min(g.w - 4, Math.round(x)));
  if (it.place === 'land') cx = Math.max(g.landX + 8, Math.min(g.w - 8, cx));
  else if (g.landX < g.w && it.place !== 'hang') cx = Math.min(cx, g.landX - 4);
  if ((it.place === 'attach' || it.place === 'rock') && hostUid !== undefined) {
    const host = t.items.find((p) => p.uid === hostUid);
    if (host) {
      const hi = item(host.id);
      return { x: cx, y: Math.round(host.y + hi.h * host.size * 0.7), on: host.uid };
    }
  }
  return { x: cx, y: 0 };
}

export function buyItem(g: Game, t: Tank, id: string, x: number, layer: 0 | 1 | 2, hostUid?: number, fromInventory = false): string {
  const why = canPlace(t, id);
  if (why) return why;
  const it = item(id);
  if (fromInventory) {
    if (!(g.state.inventory[id] > 0)) return 'None left in storage.';
    g.state.inventory[id]--;
    if (g.state.inventory[id] <= 0) delete g.state.inventory[id];
  } else if (!spend(g, it.price)) return 'Not enough coins.';
  const spot = dropSpot(t, id, x, layer, hostUid);
  const p = place(g.state, t, id, spot.x, layer, { y: spot.y, on: spot.on, flip: g.rng.chance(0.5), size: it.plant ? 0.7 : 1 });
  // hitchhikers: pest snail eggs on plants, Aiptasia on live rock
  const dipped = (g.state.upgrades['quarantine'] ?? 0) > 0;
  if (!dipped && !fromInventory) {
    if (it.cat === 'plant' && t.water !== 'marine' && g.rng.chance(BAL.hitchhikeChance)) {
      t.pests.snails += 3;
      t.pests.had = true;
      g.toast(`Pest snails hitchhiked in on the ${it.name.toLowerCase()}.`, 'info');
    }
    if (it.fx?.pests && g.rng.chance(it.fx.pests)) {
      t.pests.aiptasia += 2;
      t.pests.had = true;
      g.toast('An Aiptasia anemone came in on the live rock.', 'info');
    }
  }
  void p;
  g.emit({ t: 'sfx', name: 'place' });
  g.refresh(t);
  return '';
}

export function moveItem(g: Game, t: Tank, uid: number, x: number, layer: 0 | 1 | 2, moved = Math.round(x) !== t.items.find((q) => q.uid === uid)?.x || layer !== t.items.find((q) => q.uid === uid)?.layer): string {
  const p = t.items.find((q) => q.uid === uid);
  if (!p) return 'Not found.';
  const dx = Math.round(x) - p.x;
  p.x = Math.max(4, Math.min(geom(t).w - 4, Math.round(x)));
  p.layer = layer;
  // things growing on it move with it
  for (const q of t.items) if (q.on === uid) {
    q.x += dx;
    q.layer = layer;
  }
  // moving a crypt makes it melt (it grows back)
  if (moved && item(p.id).plant?.kind === 'crypt') p.health = Math.min(p.health, 0.4);
  g.refresh(t);
  return '';
}

export function removeItem(g: Game, t: Tank, uid: number): string {
  const p = t.items.find((q) => q.uid === uid);
  if (!p) return 'Not found.';
  const it = item(p.id);
  const gone = new Set([uid, ...t.items.filter((q) => q.on === uid).map((q) => q.uid)]);
  t.items = t.items.filter((q) => !gone.has(q.uid));
  // stones and wood go back to storage; plants and corals are rehomed for a little money
  if (it.cat === 'plant' || it.cat === 'coral') g.state.coins += Math.round(it.price * 0.3);
  else g.state.inventory[p.id] = (g.state.inventory[p.id] ?? 0) + 1;
  g.refresh(t);
  return '';
}

/** Trim an overgrown plant: it shrinks back and the cuttings go to storage for replanting. */
export function trimPlant(g: Game, t: Tank, uid: number): string {
  const p = t.items.find((q) => q.uid === uid);
  if (!p || !item(p.id).plant) return 'Not a plant.';
  if (p.size < 0.9) return 'Nothing to trim yet.';
  const cuttings = Math.floor((p.size - 0.6) / 0.3);
  p.size = 0.7;
  if (cuttings > 0) g.state.inventory[p.id] = (g.state.inventory[p.id] ?? 0) + cuttings;
  g.emit({ t: 'sfx', name: 'scrape' });
  g.refresh(t);
  return cuttings > 0 ? `Trimmed. ${cuttings} cutting${cuttings > 1 ? 's' : ''} saved for replanting.` : 'Trimmed.';
}

export function fragCoral(g: Game, t: Tank, uid: number): string {
  if (!(g.state.upgrades['fragging'] ?? 0)) return 'Learn coral fragging first.';
  const p = t.items.find((q) => q.uid === uid);
  if (!p || !item(p.id).coral) return 'Not a coral.';
  if (p.size < 1.2) return 'Let it grow a little more first.';
  p.size -= 0.4;
  g.state.inventory[p.id] = (g.state.inventory[p.id] ?? 0) + 1;
  g.refresh(t);
  return 'Fragged! The new colony is in storage.';
}

export function setSubstrate(g: Game, t: Tank, id: string): string {
  const sub = substrate(id);
  if (!sub.water.includes(t.water)) return 'Wrong substrate for this water.';
  if (!spend(g, Math.round(sub.price * (litersOf(t) / 60)))) return 'Not enough coins.';
  t.substrate = id;
  g.refresh(t);
  return '';
}

export function setProfile(g: Game, t: Tank, i: number, v: number) {
  if (i < 0 || i >= t.profile.length) return;
  t.profile[i] = Math.max(0, Math.min(1, v));
}

export function setSlope(g: Game, t: Tank, v: number) {
  t.slope = Math.max(0, Math.min(1, v));
  g.refresh(t);
}

// ---------------------------------------------------------------- equipment and settings

export function buyEquip(g: Game, t: Tank, id: string): string {
  const e = equip(id);
  if (e.water && !e.water.includes(t.water)) return `${e.name} is for ${e.water.join(' or ')} tanks.`;
  if (e.needsShell && !shell(t.shell).tags.includes(e.needsShell)) return `${e.name} needs a ${e.needsShell} tank.`;
  if (t.equip.includes(id) && !MULTI_SLOTS.has(e.slot)) return 'Already installed.';
  const count = t.equip.filter((x) => equip(x).slot === e.slot).length;
  // a full slot trades in the oldest piece there (at the usual sell-back price)
  const old = count >= (MULTI_SLOTS.has(e.slot) ? 2 : 1) ? t.equip.find((x) => equip(x).slot === e.slot) : undefined;
  const credit = old ? Math.round(equip(old).price * BAL.sellBack) : 0;
  if (!spend(g, Math.max(0, e.price - credit))) return 'Not enough coins.';
  if (old) {
    t.equip.splice(t.equip.indexOf(old), 1);
    g.toast(`Traded in the ${equip(old).name} for ${credit} coins.`, 'info');
  }
  t.equip.push(id);
  g.emit({ t: 'sfx', name: 'place' });
  g.refresh(t);
  return '';
}

export function removeEquip(g: Game, t: Tank, id: string): string {
  const i = t.equip.indexOf(id);
  if (i < 0) return 'Not installed.';
  t.equip.splice(i, 1);
  g.state.coins += Math.round(equip(id).price * BAL.sellBack);
  g.refresh(t);
  return '';
}

export function setHeater(g: Game, t: Tank, c: number) {
  t.set.heater = Math.max(4, Math.min(32, Math.round(c)));
}

export function setLights(g: Game, t: Tank, on: number, off: number) {
  t.set.lightOn = Math.max(5, Math.min(14, on));
  t.set.lightOff = Math.max(t.set.lightOn + 4, Math.min(23, off));
}

export function setSource(g: Game, t: Tank, src: WaterSource): string {
  const d = SOURCES[src];
  if (d.water !== t.water) return 'That source is for a different kind of tank.';
  if (d.needs && !t.equip.includes(d.needs) && !g.state.tanks.some((x) => x.equip.includes(d.needs!))) return `Needs an ${equip(d.needs).name} somewhere in the aquarium.`;
  t.set.source = src;
  g.toast(`${t.name} will change over to ${d.name.toLowerCase()} with each water change.`);
  return '';
}

export function setSalt(g: Game, t: Tank, sg: number) {
  if (t.water === 'brackish') t.set.salt = Math.max(1.002, Math.min(1.02, sg));
  else if (t.water === 'marine') t.set.salt = Math.max(1.02, Math.min(1.028, sg));
}

export function toggleCo2(g: Game, t: Tank) {
  t.set.co2 = !t.set.co2;
  g.refresh(t);
}

// ---------------------------------------------------------------- care

export function doWaterChange(g: Game, t: Tank, frac: number): string {
  const l = litersOf(t) * frac;
  const cost = Math.round(l * (BAL.waterChangeCostPerL + (t.water === 'fresh' ? 0 : BAL.saltCostPerL)));
  if (!spend(g, cost)) return 'Not enough coins.';
  const st = g.stats.get(t.id) ?? g.refresh(t);
  waterChange(t, frac, st.facts);
  g.emit({ t: 'sfx', name: 'splash' });
  g.refresh(t);
  return '';
}

export function topOff(g: Game, t: Tank) {
  t.chem.sg = t.set.salt;
  g.emit({ t: 'sfx', name: 'splash' });
  g.refresh(t);
}

export function feed(g: Game, t: Tank): string {
  const overfed = g.state.time - t.fedAt < 240;
  t.fedAt = g.state.time;
  if (overfed) {
    t.chem.nh3 += 0.08;
    t.chem.cloud = Math.min(1, t.chem.cloud + 0.08);
    g.toast('They were already fed: the leftovers will rot. Feed once or twice a day.', 'info');
  }
  g.emit({ t: 'feed', tank: t.id });
  g.refresh(t);
  return '';
}

export function scrape(g: Game, t: Tank, amount: number) {
  t.chem.glass = Math.max(0, t.chem.glass - amount);
}

export function wipe(g: Game, t: Tank, amount: number) {
  t.smudge = Math.max(0, t.smudge - amount);
}

/** the most mature filter in another tank, to borrow media from */
export function seedSource(g: Game, t: Tank): Tank | undefined {
  return g.state.tanks
    .filter((o) => o !== t && o.water === t.water && o.equip.some((e) => equip(e).slot === 'filter') && Math.min(o.chem.bacA, o.chem.bacB) >= 0.7)
    .sort((a, b) => Math.min(b.chem.bacA, b.chem.bacB) - Math.min(a.chem.bacA, a.chem.bacB))[0];
}

/** Squeeze a sponge from a mature filter into this one: the oldest trick in the hobby. */
export function seedFilter(g: Game, t: Tank): string {
  const from = seedSource(g, t);
  if (!from) return 'No other tank has a mature filter to borrow from yet.';
  if (!t.equip.some((e) => equip(e).slot === 'filter')) return 'Add a filter first: the bacteria need somewhere to live.';
  t.chem.bacA = Math.max(t.chem.bacA, 0.7);
  t.chem.bacB = Math.max(t.chem.bacB, 0.65);
  g.toast(`Seeded with media from ${from.name}: this tank is nearly cycled. Stock it lightly at first.`, 'good');
  g.refresh(t);
  return '';
}

export function dose(g: Game, t: Tank, what: 'bacteria' | 'ammonia'): string {
  if (what === 'bacteria') {
    // bottled bacteria help a little; they are no substitute for time or seeded media
    if (Math.min(t.chem.bacA, t.chem.bacB) >= 0.6) return 'A bottle cannot help any more: the colony has to grow on its own now.';
    if (!spend(g, 15)) return 'Not enough coins.';
    t.chem.bacA = Math.min(0.6, t.chem.bacA + 0.15);
    t.chem.bacB = Math.min(0.6, t.chem.bacB + 0.12);
    g.toast('Bottled bacteria added: the cycle gets a head start.', 'good');
  } else {
    if (t.animals.length || t.bags.length) return 'Not with animals in the tank: dosing ammonia is for a fishless cycle.';
    if (!spend(g, 3)) return 'Not enough coins.';
    t.chem.nh3 += 1.5;
    g.toast('Ammonia dosed: a fishless cycle feeds the bacteria with no fish at risk.', 'info');
  }
  g.refresh(t);
  return '';
}

// ---------------------------------------------------------------- tanks

export function buildTank(g: Game, bay: number, shellId: string, water: Water, source?: WaterSource): string {
  const sh = shell(shellId);
  if (sh.water && !sh.water.includes(water)) return `${sh.name} is only for ${sh.water.join(' or ')} water.`;
  if (g.state.tanks.some((t) => t.bay === bay)) return 'That bay already has a tank.';
  if (!spend(g, shellPrice(g.state, sh))) return 'Not enough coins.';
  const t = emptyTank(g.state, bay, shellId, water, source);
  t.name = bay >= BAL.rackBay ? `Stock ${bay - BAL.rackBay + 1}` : `${sh.name}`;
  g.state.tanks.push(t);
  g.emit({ t: 'sfx', name: 'splash' });
  g.toast(`${sh.name} filled. Add a filter, then let it cycle before adding fish.`, 'info');
  g.refresh(t);
  return '';
}

export function dismantleTank(g: Game, t: Tank): string {
  if (t.animals.length) return 'Move the animals to holding first.';
  g.state.coins += Math.round(shell(t.shell).price * BAL.sellBack);
  for (const p of t.items) if (item(p.id).cat !== 'plant' && item(p.id).cat !== 'coral') g.state.inventory[p.id] = (g.state.inventory[p.id] ?? 0) + 1;
  for (const e of t.equip) g.state.coins += Math.round(equip(e).price * BAL.sellBack);
  g.state.tanks = g.state.tanks.filter((x) => x !== t);
  g.stats.delete(t.id);
  return '';
}

/** a stock tank keeps this many of each species back as breeders */
export function setKeep(g: Game, t: Tank, n: number) {
  t.keep = Math.max(0, Math.min(20, Math.round(n)));
}

export function rename(g: Game, t: Tank, name: string) {
  t.name = name.slice(0, 24) || t.name;
}

// ---------------------------------------------------------------- progression

export function buyUpgrade(g: Game, id: string): string {
  const u = upgrade(id);
  const lvl = g.state.upgrades[id] ?? 0;
  const next = u.levels[lvl];
  if (!next) return 'Already at the top level.';
  if (next.tier > g.state.tier) return `Needs the ${TIERS[next.tier].name} tier.`;
  if (!spend(g, next.cost)) return 'Not enough coins.';
  g.state.upgrades[id] = lvl + 1;
  if (next.rep) g.state.rep += next.rep;
  g.emit({ t: 'sfx', name: 'chime' });
  g.toast(`${u.name}: ${next.text}`, 'good');
  g.refreshAll();
  return '';
}

export function claimLetter(g: Game, id: string): string {
  const s = g.state;
  const l = s.letters.find((x) => x.id === id);
  if (!l || !l.ready) return 'Not yet.';
  const r = request(id);
  s.coins += r.reward.coins;
  s.rep += r.reward.rep;
  let msg = `+${r.reward.coins} coins, +${r.reward.rep} reputation`;
  if (r.reward.unlock) msg += `, and ${applyUnlock(s, r.reward.unlock)}`;
  s.letters = s.letters.filter((x) => x.id !== id);
  s.lettersDone.push(id);
  g.emit({ t: 'sfx', name: 'coin' });
  g.toast(msg, 'good');
  return '';
}

export function sendExpedition(g: Game, r: RegionId): string {
  const why = canExpedition(g.state, r);
  if (why) return why;
  startExpedition(g.state, r);
  g.toast(`Captain Wren sets sail for the ${region(r).name}.`, 'info');
  return '';
}

export function dismissExpedition(g: Game, id: number) {
  g.state.expeditions = g.state.expeditions.filter((e) => e.id !== id);
}

/** Where a placed item's base sits in tank pixels (used by the renderer and picking). */
export function itemBase(t: Tank, p: Placed): { x: number; y: number } {
  const g = geom(t);
  const it = item(p.id);
  if (it.place === 'surface') return { x: p.x, y: g.surface + 2 };
  if (it.place === 'hang') return { x: p.x, y: g.surface + 4 };
  if (it.place === 'land') return { x: p.x, y: g.surface - 2 };
  return { x: p.x, y: groundY(t, g, p.x, p.layer) - p.y };
}

export { newAnimal };
