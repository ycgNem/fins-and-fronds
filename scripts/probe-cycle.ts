// Probe: a fishless cycle day by day (bacteria, ammonia, nitrite), a debugging aid.
import { Game } from '../src/sim/Game';
import { emptyTank, newGame } from '../src/sim/newgame';

const s = newGame(1);
const g = new Game(s);
const t = emptyTank(s, 1, process.argv[2] ?? 'rimless_60', 'fresh');
t.equip = ['hob_filter'];
s.tanks.push(t);
for (let d = 0; d < 42; d++) {
  t.chem.nh3 += 2;
  g.tick(24 * 60);
  if (d % 3 === 0) console.log(d, "cyc", (await import("../src/sim/water")).cycleProgress(t.chem).toFixed(2), 'A', t.chem.bacA.toFixed(3), 'B', t.chem.bacB.toFixed(3), 'nh3', t.chem.nh3.toFixed(2), 'no2', t.chem.no2.toFixed(2), 'no3', t.chem.no3.toFixed(1));
}
