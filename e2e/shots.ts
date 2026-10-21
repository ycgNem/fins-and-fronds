// Screenshots for reviewing the look: a running shop (the showcase tank plus a stock tank of
// guppies) in the hall and the tank view, at 1280x720 and 1920x1080. Writes e2e/out/*.png.
// Run with `npx vite-node e2e/shots.ts [hour]`.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const hour = Number(process.argv[2] ?? 11);
const server = await createServer({ server: { port: 5198, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
const errors: string[] = [];
mkdirSync('e2e/out', { recursive: true });
try {
  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('http://127.0.0.1:5198/');
    await page.waitForFunction(() => 'app' in window);
    await page.waitForTimeout(600);
    await page.evaluate(async (hour) => {
      const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
      const ng = await imp('/src/sim/newgame.ts'), G = await imp('/src/sim/Game.ts'), act = await imp('/src/sim/actions.ts'), life = await imp('/src/sim/life.ts');
      const app = (window as any).app;
      const s = ng.newGame(5);
      s.tutorial.done = true;
      s.seen = ['intro'];
      ng.showcaseTank(s);
      s.time = hour * 60;
      s.coins = 2000;
      const g = new G.Game(s);
      app.load(g);
      act.buildTank(g, 100, 'std_10', 'fresh');
      const st = s.tanks[1];
      act.buyEquip(g, st, 'sponge_filter');
      st.chem.bacA = st.chem.bacB = 1;
      for (let i = 0; i < 8; i++) st.animals.push(life.newAnimal(s, 'guppy'));
      g.refreshAll();
      app.toasts.length = 0;
      app.view = 'hall';
    }, hour);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `e2e/out/hall-${w}.png` });
    await page.evaluate(() => {
      const app = (window as any).app;
      app.setTank(app.state.tanks[0].id);
      app.toasts.length = 0;
    });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `e2e/out/tank-${w}.png` });
    // a tank of shy fish with dens: a pleco, kribs and kuhli loaches in wood and a coconut cave
    await page.evaluate(async () => {
      const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
      const act = await imp('/src/sim/actions.ts'), life = await imp('/src/sim/life.ts'), ng = await imp('/src/sim/newgame.ts');
      const app = (window as any).app, g = app.game, s = g.state;
      s.tier = 2;
      const t = ng.emptyTank(s, 1, 'std_29', 'fresh');
      s.tanks.push(t);
      t.equip = ['hob_filter', 'heater_50', 'led_planted'];
      t.chem.bacA = t.chem.bacB = 1;
      ng.place(s, t, 'malaysian_driftwood', 90, 1, { size: 1.2 });
      ng.place(s, t, 'coconut_cave', 220, 2);
      ng.place(s, t, 'crypt_wendtii', 150, 2);
      ng.place(s, t, 'vallisneria', 30, 0);
      ng.place(s, t, 'vallisneria', 270, 0);
      for (const [sp, n] of [['bristlenose_pleco', 1], ['kribensis', 2], ['kuhli_loach', 5], ['neon_tetra', 10]] as const) for (let i = 0; i < n; i++) t.animals.push(life.newAnimal(s, sp));
      g.refreshAll(false);
      app.setTank(t.id);
      app.toasts.length = 0;
    });
    for (let k = 0; k < 3; k++) {
      await page.waitForTimeout(3000);
      await page.screenshot({ path: `e2e/out/den-${w}-${k}.png` });
    }
    await page.evaluate(() => (window as any).app.toggleWatch());
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `e2e/out/watch-${w}.png` });
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(errors.length ? 'errors:\n' + errors.join('\n') : 'ok');
