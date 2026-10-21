// The visitors: implied, never drawn. They exist as numbers (visitors per hour, coins), as
// fingerprints on the glass, as coins dropping into the box and as lines in the guestbook.
import { species } from '../data';
import { GUEST_LINES, GUEST_NAMES, GUEST_PLACES, type GuestTrigger } from '../data/guestbook';
import type { Rng } from '../engine/rng';
import { BAL, sizeFactor } from './balance';
import type { Classification } from './archetype';
import { type Facts, litersOf } from './facts';
import type { Rating } from './rating';
import { type GameState, hourOf, type Tank } from './state';
import type { SpeciesMood } from './wellbeing';

export function isOpen(state: GameState, time: number): 'day' | 'night' | false {
  const h = hourOf(time);
  if (h >= BAL.openHour && h < BAL.closeHour) return 'day';
  if ((state.upgrades['night_openings'] ?? 0) > 0 && h >= BAL.closeHour && h < BAL.nightClose) return 'night';
  return false;
}

/** Visitors per hour this tank draws while the aquarium is open (day rates). */
export function visitorRate(state: GameState, t: Tank, f: Facts, rating: Rating, cls: Classification, mode: 'day' | 'night' = 'day'): number {
  if (!t.animals.length && !t.items.length) return 0;
  // bigger tanks draw more people, and a bigger name brings in more of the town
  const town = BAL.townByTier[Math.min(state.tier, BAL.townByTier.length - 1)];
  const base = BAL.visitorsPerTank * sizeFactor(litersOf(t)) * town;
  let q = Math.pow(rating.total / 100, 1.4) * (cls.best?.def.appeal ?? 1);
  if (mode === 'night') {
    const night = (f.byTag.get('nocturnal') ?? 0) + (f.byTag.get('glow') ?? 0) * 1.5 + (f.byKind.get('jelly') ?? 0);
    q *= (f.gear.slots.has('moon') ? 0.5 : 0.2) + Math.min(1, night / 6);
  }
  return base * q;
}

export function coinsPerVisitor(state: GameState, rating: Rating): number {
  const benches = state.upgrades['benches'] ?? 0;
  const donation = state.upgrades['donation_box'] ?? 0;
  const shop = state.upgrades['gift_shop'] ?? 0;
  return BAL.coinsPerVisitor * (1 + benches * 0.1) + (rating.total / 100) * [0, 0.25, 0.5][donation] + shop * 0.15;
}

function fill(s: string, vars: Record<string, string>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}

/** Pick a guestbook line that fits what visitors saw in this tank. */
export function guestLine(rng: Rng, t: Tank, f: Facts, rating: Rating, cls: Classification, moods: Map<string, SpeciesMood>, night: boolean): { text: string; who: string } {
  const triggers: GuestTrigger[] = [];
  const ids = [...f.bySpecies.keys()];
  const vars: Record<string, string> = { tank: t.name, type: cls.best?.def.name ?? 'tank' };
  if (night) triggers.push('night');
  if (cls.best) triggers.push('archetype', 'archetype');
  let school = '', schoolN = 0;
  for (const [id, n] of f.bySpecies) if (n > schoolN && species(id).school > 1) { school = id; schoolN = n; }
  if (schoolN >= 8) {
    triggers.push('school');
    vars.n = String(schoolN);
    vars.sp = species(school).name.toLowerCase();
  }
  const big = ids.map((id) => species(id)).filter((s) => s.cm >= 25).sort((a, b) => b.cm - a.cm)[0];
  if (big) triggers.push('big');
  if (f.byTag.get('glow')) triggers.push('glow');
  if (f.byKind.get('jelly')) triggers.push('jelly', 'jelly');
  if (f.byKind.get('cephalopod')) triggers.push('octopus', 'octopus');
  if (ids.some((id) => species(id).body === 'shark')) triggers.push('shark', 'shark');
  if (f.bySpecies.get('axolotl')) triggers.push('axolotl', 'axolotl');
  if (ids.some((id) => species(id).body === 'seahorse')) triggers.push('seahorse');
  if (f.byKind.get('shrimp')) triggers.push('shrimp');
  if (f.byKind.get('snail')) triggers.push('snail');
  if (f.byTag.get('cleaner')) triggers.push('cleaner');
  if (t.animals.some((a) => a.fry)) triggers.push('fry', 'fry');
  if ((f.itemsByTag.get('whimsy') ?? 0) >= 2) triggers.push('whimsy');
  if (f.coverage > 0.5) triggers.push('planted');
  if (t.chem.tannin > 0.3) triggers.push('tannin');
  if (t.chem.cloud > 0.3) triggers.push('cloudy');
  if (t.chem.algae > 0.4 || t.chem.glass > 0.5) triggers.push('algae');
  if (t.smudge > 0.5) triggers.push('smudged');
  if (t.pests.snails > 15) triggers.push('pests');
  const sad = [...moods.values()].find((m) => m.mood < 0.45);
  if (sad) triggers.push('stressed', 'stressed');
  const r = rating.total;
  triggers.push(r >= 75 ? 'great' : r >= 55 ? 'good' : r >= 35 ? 'ok' : 'poor');
  const trig = rng.pick(triggers);
  if (trig === 'big' && big) vars.sp = big.name.toLowerCase();
  if (trig === 'stressed' && sad) vars.sp = species(sad.sp).name.toLowerCase();
  if (trig === 'new_species' && ids.length) vars.sp = species(rng.pick(ids)).name;
  const text = fill(rng.pick(GUEST_LINES[trig]), vars);
  return { text, who: `${rng.pick(GUEST_NAMES)}, ${rng.pick(GUEST_PLACES)}` };
}
