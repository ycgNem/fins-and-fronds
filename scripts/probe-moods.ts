// Probe: print each species' mood and reasons in a sample tank of shy fish (a debugging aid).
import { Game } from '../src/sim/Game';
import { newAnimal } from '../src/sim/life';
import { emptyTank, newGame, place } from '../src/sim/newgame';

const s = newGame(3);
s.tutorial.done = true;
s.tier = 2;
const t = emptyTank(s, 0, 'std_29', 'fresh');
s.tanks.push(t);
t.equip = ['hob_filter', 'heater_150', 'led_planted'];
t.chem.bacA = t.chem.bacB = 1;
place(s, t, 'malaysian_driftwood', 90, 1, { size: 1.2 });
place(s, t, 'coconut_cave', 220, 2);
for (const [sp, n] of [['bristlenose_pleco', 1], ['kribensis', 2], ['kuhli_loach', 5], ['neon_tetra', 10]] as const) for (let i = 0; i < n; i++) t.animals.push(newAnimal(s, sp));
const g = new Game(s);
g.tick(60 * 24 * 3);
for (const [sp, m] of g.stats.get(t.id)!.moods) console.log(sp, m.mood.toFixed(2), m.lethal.toFixed(2), m.reasons.map((r) => (r.good ? '+' : '-') + r.text).join('; '));
const f = g.stats.get(t.id)!.facts; console.log("chem", JSON.stringify(t.chem), "bioload", f.bioload.toFixed(2), "cap", f.bioCap.toFixed(2), "flow", f.flow, "L", f.liters);
