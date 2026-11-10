// The Ideas on a tank's report card: the few things that would help it most, each said once. A
// display tank hears about its weakest parts and its tank type (or the nearest type it could
// become). A stock tank in the back room is a breeding rack, not a display: it hears what keeps
// its animals from breeding instead of advice on its type, scape and spectacle.
import { species } from '../data';
import type { BreedType } from '../data/types';
import { BAL } from './balance';
import type { Facts } from './facts';
import { breedBlock, breedingRoom, intakeEatsYoung, roomForYoung } from './life';
import type { Rating } from './rating';
import { isStock } from './sales';
import type { Tank } from './state';
import { hunts, type SpeciesMood } from './wellbeing';

/** where a species that breeds a particular way lays its eggs or raises its young */
const SITE: Partial<Record<BreedType, string>> = {
  cave: 'wants a cave or a hollow log to spawn in.',
  shell: 'spawns in empty snail shells: add a few.',
  bubblenest: 'builds a bubble nest, which needs floating plants and still water.',
  mussel: 'lays its eggs in a living swan mussel.',
  nest: 'needs plants or stones to nest among.',
  colony: 'the young need moss or plants to hide in.',
};

/** What keeps a stock tank's animals from breeding: the blocks stepBreeding checks (life.ts:
 *  breedingRoom, breedBlock, roomForYoung, intakeEatsYoung), then what loses most of a brood. */
export function breedingIdeas(t: Tank, f: Facts, moods: Map<string, SpeciesMood>): string[] {
  const out: string[] = [];
  const moss = (f.plantKinds.get('moss') ?? 0) > 0;
  // a full rack breeds nothing at all, whatever else is right
  const room = breedingRoom(t, f);
  if (room.crowded) out.push(`The rack holds ${BAL.breedCrowd} animals, as many as it can: sell or net some out before more are born.`);
  else if (room.cm <= 0) out.push('The rack is full: sell or net some out so the young have room to grow.');
  else if (room.load <= 0) out.push('The filter has no room for more young: a bigger filter, or sell some.');
  if (out.length) return out;
  for (const id of f.bySpecies.keys()) {
    const s = species(id);
    const adults = t.animals.filter((a) => a.sp === id && !a.fry).length;
    // only fry so far: they are growing up
    if (!adults) continue;
    const m = moods.get(id);
    const block = breedBlock(t, f, moods, id);
    if (block === 'never') out.push(`${s.name}: rarely breeds in a home tank; a stock tank wants an easy breeder.`);
    else if (block === 'mate') out.push(`${s.name}: needs a mate to breed.`);
    else if (block === 'guarding') out.push(`${s.name}: the parents are guarding a brood; the next comes once these grow up.`);
    else if (block === 'unsettled') out.push(`${s.name}: not settled enough to spawn (${m?.reasons.find((r) => !r.good)?.text ?? 'unsettled'}).`);
    else if (block === 'site') out.push(`${s.name}: ${SITE[s.breed.type] ?? 'has nowhere to spawn.'}`);
    else if (block === 'toxins') out.push(`${s.name}: will not spawn while there is ammonia or nitrite in the water.`);
    else if (block === 'hunted') {
      const pred = [...f.bySpecies.keys()].map((o) => species(o)).find((o) => o.id !== id && hunts(o, s));
      out.push(`${s.name}: the ${pred?.name.toLowerCase() ?? 'tankmates'} eat${pred ? 's' : ''} the fry.`);
    } else if (!roomForYoung(s, room, t.animals.length)) out.push(`${s.name}: no room left for young this size: sell some, or breed them in a bigger tank.`);
    else if (intakeEatsYoung(s, f)) out.push(`${s.name}: the filter intake swallows the fry: a sponge filter is gentle on them.`);
    else if (s.breed.type === 'scatter' && !moss) out.push(`${s.name}: eats its own eggs; dense moss saves some.`);
    else if ((s.breed.type === 'scatter' || s.breed.type === 'livebearer') && f.coverage + (moss ? 0.3 : 0) < 0.5) out.push(`${s.name}: the fry need cover: dense plants or moss.`);
  }
  return out;
}

/**
 * The report card's ideas, from the notes for its weakest parts and the hints of its tank type
 * (or of the nearest types), with nothing said twice. A stock tank drops the notes about type,
 * scape and spectacle and hears about breeding instead.
 */
export function reportIdeas(t: Tank, st: { facts: Facts; moods: Map<string, SpeciesMood>; rating: Rating }, notes: string[], hints: string[]): string[] {
  if (!isStock(t)) return [...new Set([...notes, ...hints])];
  const display = [st.rating.notes.scape, st.rating.notes.authenticity, st.rating.notes.spectacle];
  return [...new Set([...notes.filter((n) => !display.includes(n)), ...breedingIdeas(t, st.facts, st.moods).slice(0, 3)])];
}
