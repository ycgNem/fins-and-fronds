// The week. Day 1 is a Monday, and some days have something on, each tied to someone who writes:
// Dr. Reyes's Tuesday bench (word follows the healthiest tanks), Room 4's Friday school trip
// (children crowd the spectacle and spend pocket money), Saturday's market crowd with Grandpa
// Tomás in it (more visitors and shoppers) and the Driftwood Club's Sunday judging (word follows
// the best scapes, and a rosette at four). Nothing can be failed: it is a reason to tidy a tank.
import { WEEK, WEEKDAYS } from '../data/progression';
import type { WeekEventDef } from '../data/types';
import { BAL } from './balance';
import type { Rating } from './rating';
import { dayOf } from './state';

/** 0 Monday .. 6 Sunday */
export function weekday(time: number): number {
  return (dayOf(time) - 1) % 7;
}

export function dayName(time: number): string {
  return WEEKDAYS[weekday(time)];
}

/** what is on today, if anything */
export function weekEvent(time: number): WeekEventDef | undefined {
  return WEEK.find((e) => e.day === weekday(time));
}

/** today's effect on one tank: how many visitors come, what each spends and how much they talk */
export function weekEffect(time: number, rating: Rating): { visitors: number; coins: number; rep: number } {
  switch (weekEvent(time)?.id) {
    case 'bench': return { visitors: 1, coins: 1, rep: BAL.judgedRep.base + BAL.judgedRep.part * (rating.parts.wellbeing / 100) };
    case 'school': return { visitors: BAL.schoolTrip.base + BAL.schoolTrip.spectacle * (rating.parts.spectacle / 100), coins: BAL.schoolTrip.coins, rep: BAL.schoolTrip.rep };
    case 'market': return { visitors: BAL.market.visitors, coins: 1, rep: 1 };
    case 'judging': return { visitors: 1, coins: 1, rep: BAL.judgedRep.base + BAL.judgedRep.part * (rating.parts.scape / 100) };
    default: return { visitors: 1, coins: 1, rep: 1 };
  }
}

/** shoppers for the stock room come in this much more today */
export function weekShoppers(time: number): number {
  return weekEvent(time)?.id === 'market' ? BAL.market.shoppers : 1;
}
