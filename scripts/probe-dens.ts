// Debug probe: builds the den tank from e2e/shots.ts and prints where each shy animal is after a
// few seconds (its den, how far in, and the caves it could use). `npx vite-node scripts/probe-dens.ts [hour]`
import { chromium } from 'playwright';
import { createServer } from 'vite';

const hour = Number(process.argv[2] ?? 13);
const server = await createServer({ server: { port: 5199, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.error(String(e)));
  await page.goto('http://127.0.0.1:5199/');
  await page.waitForFunction(() => 'app' in window);
  await page.waitForTimeout(600);
  await page.evaluate(async (hour) => {
    const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
    const ng = await imp('/src/sim/newgame.ts'), G = await imp('/src/sim/Game.ts'), life = await imp('/src/sim/life.ts');
    const app = (window as any).app;
    const s = ng.newGame(5);
    s.tutorial.done = true;
    s.seen = ['intro'];
    s.time = hour * 60;
    const t = ng.emptyTank(s, 0, 'std_29', 'fresh');
    s.tanks.push(t);
    t.equip = ['hob_filter', 'heater_150', 'led_planted'];
    t.chem.bacA = t.chem.bacB = 1;
    ng.place(s, t, 'malaysian_driftwood', 90, 1, { size: 1.2 });
    ng.place(s, t, 'coconut_cave', 220, 2);
    for (const [sp, n] of [['bristlenose_pleco', 1], ['kribensis', 2], ['kuhli_loach', 5]] as const) for (let i = 0; i < n; i++) t.animals.push(life.newAnimal(s, sp));
    const g = new G.Game(s);
    app.load(g);
    app.setTank(t.id);
    app.toasts.length = 0;
  }, hour);
  for (let k = 0; k < 3; k++) {
    await page.waitForTimeout(2500);
    const out = await page.evaluate(() => {
      const app = (window as any).app;
      const v = app.viewFor(app.tank);
      return v.agents.list.map((a: any) => `${a.sp} mode=${a.mode} den=${a.den} in=${a.inDen.toFixed(2)} peek=${a.peek.toFixed(2)} home=${a.home} x=${a.x.toFixed(0)} y=${a.y.toFixed(0)} len=${a.len}`).join('\n');
    });
    console.log(`--- ${k}\n${out}`);
  }
} finally {
  await browser.close();
  await server.close();
}
