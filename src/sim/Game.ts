// The game: state + ordered systems + an event queue for the presentation layer. Pure: no DOM,
// canvas or audio, so it runs headless in tests (tests/*.test.ts).
//
// Each step (at most 2 game minutes):
//   clock -> bags & feeding -> water chemistry -> growth & pests -> (every 5 min) moods, archetype,
//   rating -> (every hour) breeding -> visitors & income -> expeditions -> letters -> tiers
import { ARCHETYPES, request, species, SYMBIOSES, TIERS } from '../data';
import type { Sfx } from '../engine/audio';
import { Rng } from '../engine/rng';
import { classify, type Classification } from './archetype';
import { BAL } from './balance';
import { resolveExpedition } from './expeditions';
import { type Facts, facts } from './facts';
import { checkRequest, MAX_LETTERS, nextRequest } from './letters';
import { grazers, newAnimal, plantMass, stepBreeding, stepGrowth, stepPests, stepPredation } from './life';
import { rate, type Rating } from './rating';
import { stepSales } from './sales';
import { dayOf, type GameState, type GuestEntry, hourOf, type Tank } from './state';
import { coinsPerVisitor, guestLine, isOpen, visitorRate } from './visitors';
import { stepWater } from './water';
import { partnerPresent, type SpeciesMood, speciesMoods, updateAnimals } from './wellbeing';

export type GameEvent =
  | { t: 'toast'; text: string; tone?: 'good' | 'bad' | 'info' }
  | { t: 'sfx'; name: Sfx }
  | { t: 'coins'; tank: number; amount: number }
  | { t: 'guest'; entry: GuestEntry }
  | { t: 'letter'; id: string }
  | { t: 'tier'; level: number }
  | { t: 'codex'; kind: 'archetype' | 'species' | 'symbiosis'; id: string }
  | { t: 'fry'; tank: number; sp: string; n: number }
  | { t: 'expedition'; id: number }
  | { t: 'died'; tank: number; sp: string }
  | { t: 'feed'; tank: number }
  | { t: 'release'; tank: number; sp: string; n: number }
  | { t: 'tap'; tank: number };

export interface TankStats {
  facts: Facts;
  moods: Map<string, SpeciesMood>;
  cls: Classification;
  rating: Rating;
  visitorsPerHour: number;
  coinsPerHour: number;
}

export class Game {
  rng: Rng;
  events: GameEvent[] = [];
  stats = new Map<number, TankStats>();
  private sinceEval = 0;
  private sinceHour = 0;
  private sinceLetter = 0;
  private coinAcc = new Map<number, number>();

  constructor(public state: GameState) {
    this.rng = new Rng(state.seed ^ Math.floor(state.time));
    this.refreshAll(false);
  }

  emit(e: GameEvent) {
    this.events.push(e);
    if (this.events.length > 200) this.events.splice(0, this.events.length - 200);
  }

  toast(text: string, tone: 'good' | 'bad' | 'info' = 'info') {
    this.emit({ t: 'toast', text, tone });
  }

  tank(id: number): Tank | undefined {
    return this.state.tanks.find((t) => t.id === id);
  }

  fedRecently(t: Tank): boolean {
    return this.state.time - t.fedAt < 1440;
  }

  /** Advance the game by dtMin game minutes. */
  tick(dtMin: number) {
    let left = dtMin;
    while (left > 0) {
      const d = Math.min(2, left);
      this.step(d);
      left -= d;
    }
  }

  private step(dtMin: number) {
    const s = this.state;
    const dtH = dtMin / 60;
    const dayBefore = dayOf(s.time);
    s.time += dtMin;
    const newDay = dayOf(s.time) !== dayBefore;
    const hour = hourOf(s.time);
    const autoFeed = (s.upgrades['auto_feeders'] ?? 0) > 0;
    const autoWater = s.upgrades['auto_water'] ?? 0;

    if (newDay) s.stats.salesToday = 0;
    for (const t of s.tanks) {
      if (newDay) t.today = 0;
      t.ageDays += dtH / 24;
      // fish acclimating in their bags
      for (const b of t.bags) {
        if (b.until <= s.time) {
          // animals from holding keep who they are (age, grade, born here); new ones are made up
          if (b.animals) t.animals.push(...b.animals);
          else for (let i = 0; i < b.n; i++) t.animals.push(newAnimal(s, b.sp));
          this.emit({ t: 'release', tank: t.id, sp: b.sp, n: b.n });
          this.discoverSpecies(b.sp);
        }
      }
      if (t.bags.some((b) => b.until <= s.time)) {
        t.bags = t.bags.filter((b) => b.until > s.time);
        this.refresh(t);
      }
      if ((autoFeed || t.equip.includes('auto_feeder')) && hour >= 8 && hour < 8 + dtH + 0.01) t.fedAt = s.time;
      const f = facts(t, hour);
      stepWater(t, f, {
        dtH, autoChangePerDay: autoWater ? 0.05 * autoWater : 0, autoTopOff: autoWater >= 2, plantMass: plantMass(t), grazers: grazers(t),
        fedRecently: this.fedRecently(t),
      });
      stepGrowth(t, f, dtH);
      if (stepPests(t, f, dtH, this.fedRecently(t))) this.toast(`${t.name} is clear of pest snails!`, 'good');
      // hitchhikers count for the codex: bladder snails first, trumpet snails once they boom
      if (t.pests.snails >= 1) this.discoverSpecies('bladder_snail');
      if (t.pests.snails >= 6) this.discoverSpecies('malaysian_trumpet_snail');
    }

    this.sinceEval += dtMin;
    if (this.sinceEval >= 5) {
      const h = this.sinceEval / 60;
      this.sinceEval = 0;
      for (const t of s.tanks) {
        const st = this.refresh(t);
        const died = updateAnimals(t, st.moods, h, s.settings.gentle);
        for (const sp of died) {
          this.emit({ t: 'died', tank: t.id, sp });
          this.toast(`A ${species(sp).name} in ${t.name} has died.`, 'bad');
        }
      }
    }

    this.sinceHour += dtMin;
    if (this.sinceHour >= 60) {
      this.sinceHour -= 60;
      for (const t of s.tanks) {
        const st = this.stats.get(t.id);
        if (!st) continue;
        if (!s.settings.gentle) {
          const eaten = stepPredation(t, st.facts, this.rng);
          for (const sp of eaten) {
            this.emit({ t: 'died', tank: t.id, sp });
            this.toast(`A ${species(sp).name.toLowerCase()} in ${t.name} was eaten.`, 'bad');
          }
          if (eaten.length) this.refresh(t);
        }
        for (const b of stepBreeding(s, t, st.facts, st.moods, this.rng)) {
          this.emit({ t: 'fry', tank: t.id, sp: b.sp, n: b.n });
          this.toast(`${b.n} baby ${species(b.sp).name.toLowerCase()} in ${t.name}!`, 'good');
          this.emit({ t: 'sfx', name: 'chime' });
        }
      }
    }

    this.stepVisitors(dtH);
    stepSales(this, dtH, this.rng);
    for (const e of s.expeditions) {
      if (!e.finds && e.end <= s.time) {
        resolveExpedition(s, e, this.rng);
        this.emit({ t: 'expedition', id: e.id });
        this.emit({ t: 'sfx', name: 'letter' });
        this.toast('A postcard from Captain Wren: the expedition is back!', 'good');
      }
    }
    this.stepLetters(dtMin);
    this.checkTier();
  }

  private stepVisitors(dtH: number) {
    const s = this.state;
    const open = isOpen(s, s.time);
    if (!open) return;
    for (const t of s.tanks) {
      const st = this.stats.get(t.id);
      if (!st) continue;
      const vph = open === 'night' ? visitorRate(s, t, st.facts, st.rating, st.cls, 'night') : st.visitorsPerHour;
      const v = vph * dtH;
      const coins = v * coinsPerVisitor(s, st.rating);
      s.coins += coins;
      s.stats.coins += coins;
      s.stats.visitors += v;
      t.today += coins;
      const mult = (st.cls.best ? 1.5 : 1) * ((s.upgrades['placards'] ?? 0) && st.cls.best ? 1.25 : 1);
      s.rep += v * BAL.repPerVisitor * mult;
      t.smudge = Math.min(1, t.smudge + v * 0.004);
      const acc = (this.coinAcc.get(t.id) ?? 0) + coins;
      const chunk = Math.max(1, st.coinsPerHour / 15);
      if (acc >= chunk) {
        this.emit({ t: 'coins', tank: t.id, amount: Math.floor(acc) });
        this.coinAcc.set(t.id, acc - Math.floor(acc));
      } else this.coinAcc.set(t.id, acc);
      if (this.rng.chance(v * 0.02)) {
        const line = guestLine(this.rng, t, st.facts, st.rating, st.cls, st.moods, open === 'night');
        const entry: GuestEntry = { time: s.time, text: line.text, who: line.who, tank: t.id };
        s.guestbook.unshift(entry);
        if (s.guestbook.length > 60) s.guestbook.pop();
        this.emit({ t: 'guest', entry });
      }
      if (this.rng.chance(v * 0.01)) this.emit({ t: 'tap', tank: t.id });
    }
  }

  private stepLetters(dtMin: number) {
    const s = this.state;
    this.sinceLetter += dtMin;
    const open = s.letters.length;
    const gap = open === 0 ? 20 : 150;
    if (open < MAX_LETTERS && this.sinceLetter >= gap) {
      this.sinceLetter = 0;
      const id = nextRequest(s, this.rng.next());
      if (id) {
        s.letters.push({ id, arrived: s.time, ready: false, read: false });
        this.emit({ t: 'letter', id });
        this.emit({ t: 'sfx', name: 'letter' });
      }
    }
  }

  checkLetters() {
    for (const l of this.state.letters) {
      if (l.ready) continue;
      if (checkRequest(request(l.id).check, this.state, this.stats)) {
        l.ready = true;
        this.toast(`You can answer "${request(l.id).title}".`, 'good');
        this.emit({ t: 'sfx', name: 'chime' });
      }
    }
  }

  private checkTier() {
    const s = this.state;
    const next = TIERS[s.tier + 1];
    if (next && s.rep >= next.rep) {
      s.tier = next.level;
      this.emit({ t: 'tier', level: next.level });
      this.emit({ t: 'sfx', name: 'chime' });
      this.toast(`Your aquarium is now a ${next.name}! ${next.unlocks}`, 'good');
    }
  }

  /** Recompute a tank's derived stats (call after any change to it). */
  refresh(t: Tank, discover = true): TankStats {
    const s = this.state;
    const f = facts(t, hourOf(s.time));
    const moods = speciesMoods(t, f, { fedRecently: this.fedRecently(t), gentle: s.settings.gentle, hungryH: (s.time - t.fedAt) / 60 });
    const cls = classify(f);
    const rating = rate(t, f, moods, cls);
    const visitorsPerHour = visitorRate(s, t, f, rating, cls);
    const st: TankStats = { facts: f, moods, cls, rating, visitorsPerHour, coinsPerHour: visitorsPerHour * coinsPerVisitor(s, rating) };
    this.stats.set(t.id, st);
    if (discover) {
      for (const m of cls.matches) this.discoverArchetype(m.def.id);
      for (const y of SYMBIOSES) {
        if (f.bySpecies.has(y.a) && partnerPresent(y.b, t, f) && !s.codex.symbioses.includes(y.id)) {
          s.codex.symbioses.push(y.id);
          this.emit({ t: 'codex', kind: 'symbiosis', id: y.id });
          this.toast(`Partnership discovered: ${y.name}`, 'good');
        }
      }
      for (const id of f.bySpecies.keys()) this.discoverSpecies(id);
      this.checkLetters();
    }
    return st;
  }

  refreshAll(discover = true) {
    for (const t of this.state.tanks) this.refresh(t, discover);
  }

  discoverArchetype(id: string) {
    const s = this.state;
    if (s.codex.archetypes.includes(id)) return;
    s.codex.archetypes.push(id);
    s.rep += BAL.repNewArchetype;
    const def = ARCHETYPES.find((a) => a.id === id)!;
    this.emit({ t: 'codex', kind: 'archetype', id });
    this.emit({ t: 'sfx', name: 'chime' });
    this.toast(`New tank type recognized: ${def.name}!`, 'good');
  }

  discoverSpecies(id: string) {
    const s = this.state;
    if (s.codex.species.includes(id)) return;
    s.codex.species.push(id);
    s.rep += BAL.repNewSpecies;
    this.emit({ t: 'codex', kind: 'species', id });
  }
}

