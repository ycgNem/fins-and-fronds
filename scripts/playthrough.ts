// Print a scripted playthrough (tests/bot.ts): tier milestones in game days and real minutes, the
// coin curve, letters answered and what expeditions returned. `npx vite-node scripts/playthrough.ts [seed] [days] [log]`
import { playthrough } from '../tests/bot';

const seed = Number(process.argv[2] ?? 1), days = Number(process.argv[3] ?? 60);
const run = playthrough(seed, days);
for (const m of run.milestones) console.log(`tier ${m.tier}: day ${m.day}, ${m.realMin} real min, ${m.coins} coins, ${m.tanks} tanks`);
console.log(`end: ${run.realMin} real min, coins ${Math.round(run.game.state.coins)}, rep ${Math.round(run.game.state.rep)}, tanks ${run.game.state.tanks.length}`);
console.log('coins by day:', run.coins.join(' '));
const ex = run.expeditions.filter((e) => e.value >= 0);
console.log(`letters: ${run.letters.length}; expeditions: ${ex.length}, cost ${ex.reduce((a, e) => a + e.cost, 0)}, sold for ${ex.reduce((a, e) => a + e.value, 0)}`);
console.log('tanks:', run.game.state.tanks.map((t) => t.name).join(', '));
if (process.argv[4]) console.log(run.log.join('\n'));
