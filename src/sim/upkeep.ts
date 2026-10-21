// Running costs: what each tank costs per game day to keep going (power and water for its size,
// wear on its gear, food for its animals). Charged as the clock runs, shown on the report card.
import { equip } from '../data';
import { BAL, sizeFactor } from './balance';
import { litersOf } from './facts';
import type { Tank } from './state';

export function upkeepPerDay(t: Tank): number {
  const water = BAL.upkeepWater[t.water] * Math.pow(sizeFactor(litersOf(t)), 1.3);
  const gear = t.equip.reduce((a, e) => a + equip(e).price, 0) * BAL.upkeepGear;
  return water + gear + t.animals.length * BAL.upkeepFood;
}
