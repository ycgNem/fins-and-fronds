// The game: state + ordered systems + an event queue for the presentation layer. Pure: no DOM,
// canvas or audio, so it runs headless in tests (tests/*.test.ts).
//
// Each step (at most 2 game minutes):
//   clock -> bags & feeding -> water chemistry -> growth & pests -> (every 5 min) moods, archetype,
//   rating -> (every hour) breeding -> visitors & income -> expeditions -> letters -> tiers
import { ARCHETYPES, ITEMS, request, species, SPECIES, SYMBIOSES, TIERS } from '../data';
import { CODEX_MILESTONES } from '../data/progression';
import type { ItemTag } from '../data/types';
import type { Sfx } from '../engine/audio';
import { Rng } from '../engine/rng';
import { classify, type Classification } from './archetype';
import { BAL } from './balance';
import { resolveExpedition } from './expeditions';
import { type Facts, facts } from './facts';
import { answerVars, checkRequest, letterVars, MAX_LETTERS, nextRequest, pendingFirst } from './letters';
import { grazers, newAnimal, plantMass, rehomeGrown, stepBreeding, stepGrowth, stepPests, stepPredation } from './life';
import { judgedScape, rate, type Rating } from './rating';
import { projectVisitors } from './projects';
import { isStock, stepSales } from './sales';
import { dayOf, type GameState, type GuestEntry, hourOf, type Letter, type Tank } from './state';
import { upkeepPerDay } from './upkeep';
import { coinsPerVisitor, guestLine, isOpen, visitorRate } from './visitors';
import { stepWater, tanninNotice } from './water';
import { dayName, weekEffect, weekEvent } from './week';
import { partnerPresent, type SpeciesMood, speciesMoods, updateAnimals } from './wellbeing';

/** the decor sets, and the kind of tank each suits best (a full set there draws the most) */
const SETS: { tag: ItemTag; ids: string[]; fits: (c: Classification) => boolean }[] = (['set_galleon', 'set_ruins', 'set_zen', 'set_toybox'] as const).map((tag) => ({
  tag,
  ids: ITEMS.filter((i) => i.tags?.includes(tag)).map((i) => i.id),
  fits: tag === 'set_zen' ? (c) => c.best?.def.family === 'Coldwater' : (c) => c.best?.def.id === 'whimsy',
}));

/** a tank holding a whole decor set draws more visitors, more again in the kind of tank it suits */
export function setBonus(t: Tank, cls: Classification): number {
  let best = 0;
  for (const set of SETS) {
    if (!set.ids.every((id) => t.items.some((p) => p.id === id))) continue;
    best = Math.max(best, set.fits(cls) ? BAL.setBonus.fit : BAL.setBonus.any);
  }
  return best;
}

/** the families of tank types, each worth a plaque once every type in it is recognized */
const FAMILIES = [...new Set(ARCHETYPES.map((a) => a.family))];

export type GameEvent =
  | { t: 'toast'; text: string; tone?: 'good' | 'bad' | 'info' }
  /** a sound; one tied to a tank only plays while that tank is on screen */
  | { t: 'sfx'; name: Sfx; tank?: number }
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
  /** running costs per game day */
  upkeep: number;
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
    // a codex filled before the plaques existed (or before this load) earns them now, not at the
    // next discovery; the toasts wait in the event queue for the first frame
    this.checkMilestones();
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

  /** A little offline income for real hours away: the tanks wait (nothing grows, breeds or dies),
   *  but Ida keeps the counter and the window open, whatever the time of day you left. Capped. */
  offlineIncome(hoursAway: number): number {
    const s = this.state;
    const away = Math.min(BAL.offlineCapHours, hoursAway);
    if (!(away > 0.05) || !s.tutorial.done) return 0;
    const perHour = [...this.stats.values()].reduce((a, st) => a + st.coinsPerHour, 0);
    const earned = Math.round(perHour * away * BAL.offlineShare);
    s.coins += earned;
    s.stats.coins += earned;
    // and the guestbook fills a little: word of mouth keeps going while the shop rests
    const repPerHour = [...this.stats.values()].reduce((a, st) => a + st.visitorsPerHour * BAL.repPerVisitor * (st.cls.best ? 1.5 : 1), 0);
    const rep = Math.round(repPerHour * away * BAL.offlineRepShare);
    if (rep > 0) {
      s.rep += rep;
      this.toast(`Word of mouth kept going while you were away: +${rep} reputation.`, 'good');
    }
    return earned;
  }

  /** Close up and sleep through the night: the clock runs on to opening time (the tanks keep
   *  living through it, just as at 10x). Returns the game minutes slept. */
  sleepUntilOpen(): number {
    const s = this.state;
    if (isOpen(s, s.time) || !s.tutorial.done) return 0;
    const h = hourOf(s.time);
    const minutes = Math.round((h < BAL.openHour ? BAL.openHour - h : 24 - h + BAL.openHour) * 60);
    this.tick(minutes);
    this.toast(`Good morning! ${dayName(s.time)}, day ${dayOf(s.time)}.`, 'info');
    return minutes;
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
    // the clock passed this hour in this step (once: a step never spans midnight and an hour)
    const crossed = (at: number) => hour >= at && hour - dtH < at;
    // the cleaning crew's round before opening: nose prints (and with the full crew, glass algae)
    const crew = crossed(BAL.crewHour) ? s.upgrades['cleaning_crew'] ?? 0 : 0;

    if (newDay) {
      s.stats.salesToday = 0;
      // fished-out regions recover a little each day
      for (const [r, v] of Object.entries(s.fished ?? {})) {
        if (v > BAL.fishedRecover) s.fished![r] = v - BAL.fishedRecover;
        else delete s.fished![r];
      }
    }
    if (crossed(BAL.openHour)) {
      const e = weekEvent(s.time);
      if (e && s.tutorial.done) this.toast(e.text, 'info');
    }
    if (crossed(BAL.judgingHour) && weekEvent(s.time)?.id === 'judging') this.judge();
    const closing = (s.upgrades['night_openings'] ?? 0) > 0 ? BAL.nightClose : BAL.closeHour;
    if (crossed(closing) && s.tutorial.done && dayOf(s.time) <= BAL.sleepHintDays) this.toast('Closed for the night. Click the Closed sign at the top to sleep until morning.', 'info');
    for (const t of s.tanks) {
      if (newDay) t.today = 0;
      t.ageDays += dtH / 24;
      if (crew) {
        if (t.smudge > BAL.crewThreshold) t.smudge = 0;
        if (crew >= 2 && t.chem.glass > BAL.crewThreshold) t.chem.glass = 0;
      }
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
      const stained = tanninNotice(t, f);
      if (stained) this.toast(stained, 'info');
      stepGrowth(t, f, dtH);
      if (stepPests(t, f, dtH, this.fedRecently(t))) this.toast(`${t.name} is clear of pest snails!`, 'good');
      // hitchhikers count for the codex: bladder snails first, trumpet snails once they boom
      if (t.pests.snails >= 1) {
        t.pests.hadSnails = true;
        this.discoverSpecies('bladder_snail');
      }
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
          this.emit({ t: 'sfx', name: 'fry', tank: t.id });
        }
        const grown = rehomeGrown(s, t);
        for (const r of grown) this.toast(`${r.n} young ${species(r.sp).name.toLowerCase()} in ${t.name} grew up and their parents want the space: they wait in the holding tank.`, 'info');
        if (grown.length) this.refresh(t);
      }
    }

    this.stepVisitors(dtH);
    // running costs tick down with the clock (never below zero: the bank is patient)
    let upkeep = 0;
    for (const t of s.tanks) upkeep += (this.stats.get(t.id)?.upkeep ?? 0) * (dtH / 24);
    s.coins = Math.max(0, s.coins - upkeep);
    s.stats.upkeep = (s.stats.upkeep ?? 0) + upkeep;
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
      // the stock room is behind the counter: its fish are for sale, not on show
      if (!st || isStock(t)) continue;
      const vph = open === 'night' ? visitorRate(s, t, st.facts, st.rating, st.cls, 'night') * this.draw(t, st.cls) : st.visitorsPerHour;
      // what is on today: Room 4's trip, the market crowd, Reyes's bench, the Sunday judging
      const wk = weekEffect(s.time, st.rating);
      const v = vph * wk.visitors * dtH;
      const coins = v * coinsPerVisitor(s, st.rating) * wk.coins;
      s.coins += coins;
      s.stats.coins += coins;
      s.stats.visitors += v;
      t.today += coins;
      const mult = (st.cls.best ? 1.5 : 1) * ((s.upgrades['placards'] ?? 0) && st.cls.best ? 1.25 : 1);
      s.rep += v * BAL.repPerVisitor * mult * wk.rep;
      t.smudge = Math.min(1, t.smudge + v * 0.004);
      const acc = (this.coinAcc.get(t.id) ?? 0) + coins;
      const chunk = Math.max(1, st.coinsPerHour / 15);
      if (acc >= chunk) {
        this.emit({ t: 'coins', tank: t.id, amount: Math.floor(acc) });
        this.coinAcc.set(t.id, acc - Math.floor(acc));
      } else this.coinAcc.set(t.id, acc);
      if (this.rng.chance(v * 0.02)) {
        // animals new to the codex in the last day get talked about
        const fresh = [...st.facts.bySpecies.keys()].filter((id) => (s.codexAt?.[id] ?? -1e9) > s.time - 1440);
        const line = guestLine(this.rng, t, st.facts, st.rating, st.cls, st.moods, open === 'night', fresh, s.time);
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
    // old asks nobody could answer make room for new ones
    const stale = s.letters.filter((l) => !l.ready && !request(l.id).first && s.time - l.arrived > BAL.letterPatienceDays * 1440);
    if (stale.length) {
      s.letters = s.letters.filter((l) => !stale.includes(l));
      s.lettersResting = [...(s.lettersResting ?? []).filter((x) => x.until > s.time), ...stale.map((l) => ({ id: l.id, until: s.time + BAL.letterPatienceDays * 2 * 1440 }))];
    }
    const first = pendingFirst(s);
    const gap = first ? BAL.letterGapFirst : s.letters.length === 0 ? BAL.letterGapIdle : BAL.letterGapBusy;
    // Ida's notes (the last one comes right after the finale) never wait behind a full box: the
    // oldest ask nobody has answered yet goes back in the pile to make room
    if (first && s.letters.length >= MAX_LETTERS && this.sinceLetter >= gap) {
      const old = s.letters.filter((l) => !l.ready && !request(l.id).first).sort((a, b) => a.arrived - b.arrived)[0];
      if (old) {
        s.letters = s.letters.filter((l) => l !== old);
        s.lettersResting = [...(s.lettersResting ?? []).filter((x) => x.until > s.time), { id: old.id, until: s.time + BAL.letterPatienceDays * 1440 }];
      }
    }
    if (s.letters.length < MAX_LETTERS && this.sinceLetter >= gap) {
      this.sinceLetter = 0;
      const id = nextRequest(s, this.rng.next(), (rid) => !checkRequest(request(rid).check, s, this.stats), this.rng.next());
      if (id) {
        const r = request(id);
        // something the shop already does arrives as a thank-you, ready to answer
        const ready = checkRequest(r.check, s, this.stats);
        const l: Letter = { id, arrived: s.time, ready, read: false, vars: letterVars(r, s, this.stats) };
        if (ready && r.check.t !== 'none') {
          l.met = true;
          l.answer = answerVars(r.check, s, this.stats);
        }
        s.letters.push(l);
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
        // what answered it, for the reply: it stays true if that school is sold before you write back
        l.answer = answerVars(request(l.id).check, this.state, this.stats);
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
    // stock racks are behind the counter: they earn from sales, not from visitors
    const visitorsPerHour = isStock(t) ? 0 : visitorRate(s, t, f, rating, cls) * this.draw(t, cls);
    const st: TankStats = { facts: f, moods, cls, rating, visitorsPerHour, coinsPerHour: visitorsPerHour * coinsPerVisitor(s, rating), upkeep: upkeepPerDay(t) };
    this.stats.set(t.id, st);
    if (discover) {
      for (const m of cls.matches) this.discoverArchetype(m.def.id);
      for (const y of SYMBIOSES) {
        if (f.bySpecies.has(y.a) && partnerPresent(y.b, t, f) && !s.codex.symbioses.includes(y.id)) {
          s.codex.symbioses.push(y.id);
          s.rep += BAL.repNewPartnership;
          this.emit({ t: 'codex', kind: 'symbiosis', id: y.id });
          this.toast(`Partnership discovered: ${y.name}! +${BAL.repNewPartnership} reputation`, 'good');
          this.checkMilestones();
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

  /** how much more a display tank draws than its own size and rating: the conservation projects,
   *  the museum's visitor guide, a whole decor set */
  draw(t: Tank, cls: Classification): number {
    const s = this.state;
    const town = 1 + projectVisitors(s) + ((s.story ?? []).includes('guide') ? BAL.guideVisitors : 0);
    return town * (1 + setBonus(t, cls));
  }

  /** the Sunday rosette: the Driftwood Club picks the best scape in the hall (a real scape: not the
   *  open water of a kreisel or the ocean window) */
  private judge() {
    const s = this.state;
    const best = s.tanks
      .filter((t) => !isStock(t) && judgedScape(t))
      .map((t) => ({ t, scape: this.stats.get(t.id)?.rating.parts.scape ?? 0 }))
      .sort((a, b) => b.scape - a.scape)[0];
    if (!best || best.scape < BAL.rosetteMinScape) return;
    const coins = BAL.rosetteCoins[s.tier], rep = BAL.rosetteRep[s.tier];
    s.coins += coins;
    s.rep += rep;
    const entry: GuestEntry = { time: s.time, text: `Best in show today: ${best.t.name}. A rosette for its stand.`, who: 'The Driftwood Club, judging', tank: best.t.id };
    s.guestbook.unshift(entry);
    if (s.guestbook.length > 60) s.guestbook.pop();
    this.emit({ t: 'guest', entry });
    this.toast(`The Driftwood Club's rosette goes to ${best.t.name}! +${coins} coins, +${rep} reputation`, 'good');
  }

  discoverArchetype(id: string) {
    const s = this.state;
    if (s.codex.archetypes.includes(id)) return;
    s.codex.archetypes.push(id);
    const def = ARCHETYPES.find((a) => a.id === id)!;
    // prestigious and late types are worth more: a koi pond moves the needle, a goldfish tank less
    const rep = Math.round((BAL.repNewArchetype + BAL.repArchetypePerTier * def.tier) * def.appeal);
    s.rep += rep;
    this.emit({ t: 'codex', kind: 'archetype', id });
    this.emit({ t: 'sfx', name: 'chime' });
    this.toast(`New tank type recognized: ${def.name}! +${rep} reputation`, 'good');
    this.checkMilestones();
  }

  discoverSpecies(id: string) {
    const s = this.state;
    if (s.codex.species.includes(id)) return;
    s.codex.species.push(id);
    s.codexAt = { ...(s.codexAt ?? {}), [id]: s.time };
    s.rep += BAL.repNewSpecies;
    this.emit({ t: 'codex', kind: 'species', id });
    this.checkMilestones();
  }

  /** codex milestones and family plaques: a reward, once each, for filling the codex */
  checkMilestones() {
    const s = this.state;
    const got = (s.milestones ??= []);
    const total = { archetypes: ARCHETYPES.length, species: SPECIES.length, symbioses: SYMBIOSES.length };
    for (const m of CODEX_MILESTONES) {
      if (got.includes(m.id) || s.codex[m.kind].length < (m.n || total[m.kind])) continue;
      got.push(m.id);
      s.coins += m.coins;
      s.rep += m.rep;
      this.emit({ t: 'sfx', name: 'chime' });
      this.toast(`A plaque for the codex: ${m.name}! +${m.coins} coins, +${m.rep} reputation`, 'good');
    }
    for (const fam of FAMILIES) {
      const id = `fam:${fam}`;
      const list = ARCHETYPES.filter((a) => a.family === fam);
      if (got.includes(id) || !list.every((a) => s.codex.archetypes.includes(a.id))) continue;
      got.push(id);
      const rep = BAL.familyPlaqueRep * list.length;
      s.rep += rep;
      this.toast(`A plaque for the codex: every ${fam} tank! +${rep} reputation`, 'good');
    }
  }
}

