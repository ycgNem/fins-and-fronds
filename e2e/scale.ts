// Scale check: a late-game shop with every display bay and stock rack filled and stocked. Shoots
// the hall and a tank at 1280x720 and 1920x1080, times frames in both views and simulates a game
// week, failing on console errors or a slow frame. Run with `npx vite-node e2e/scale.ts`.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5197, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
const errors: string[] = [];
mkdirSync('e2e/out', { recursive: true });
try {
  for (const [w, h] of [[1280, 720], [1920, 1080]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    await page.goto('http://127.0.0.1:5197/');
    await page.waitForFunction(() => 'app' in window);
    await page.waitForTimeout(600);
    const res = await page.evaluate(async () => {
      const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
      const ng = await imp('/src/sim/newgame.ts'), G = await imp('/src/sim/Game.ts'), life = await imp('/src/sim/life.ts'), data = await imp('/src/data/index.ts');
      const app = (window as any).app;
      const s = ng.newGame(9);
      s.tutorial.done = true;
      s.seen = ['intro', 'town'];
      s.tier = 5;
      s.rep = 11500;
      s.coins = 50000;
      s.time = 11 * 60;
      const tier = data.TIERS[5];
      const shells = ['std_55', 'std_29', 'std_20l', 'std_75', 'std_40b', 'std_125', 'std_10', 'std_55', 'std_29', 'std_20l'];
      const fish = [['neon_tetra', 14], ['harlequin_rasbora', 12], ['guppy', 10], ['bronze_cory', 6], ['kribensis', 2], ['bristlenose_pleco', 1], ['cherry_shrimp', 20], ['zebra_danio', 10]] as const;
      const fill = (bay: number, sh: string, k: number) => {
        const t = ng.emptyTank(s, bay, sh, 'fresh');
        t.name = bay >= 100 ? `Stock ${bay - 99}` : `Bay ${bay + 1}`;
        t.equip = ['canister_filter', 'heater_150', 'led_planted'];
        t.chem.bacA = t.chem.bacB = 1;
        ng.place(s, t, 'malaysian_driftwood', 80, 1);
        ng.place(s, t, 'vallisneria', 30, 0);
        ng.place(s, t, 'crypt_wendtii', 150, 2);
        for (let j = 0; j < 3; j++) {
          const [sp, n] = fish[(k + j) % fish.length];
          for (let i = 0; i < n; i++) t.animals.push(life.newAnimal(s, sp));
        }
        s.tanks.push(t);
      };
      for (let i = 0; i < tier.bays; i++) fill(i, shells[i % shells.length], i);
      for (let i = 0; i < tier.racks; i++) fill(100 + i, 'std_20l', i + 3);
      const g = new G.Game(s);
      app.load(g);
      app.toasts.length = 0;
      app.view = 'hall';
      const time = async (n: number) => {
        let worst = 0;
        const t0 = performance.now();
        for (let i = 0; i < n; i++) {
          const a = performance.now();
          app.frame(1 / 60);
          worst = Math.max(worst, performance.now() - a);
        }
        return { avg: (performance.now() - t0) / n, worst };
      };
      await time(10);
      const hall = await time(60);
      app.setTank(s.tanks[0].id);
      await time(10);
      const tank = await time(60);
      // a game week at full speed: every tank keeps living
      const t1 = performance.now();
      g.tick(7 * 24 * 60);
      const weekMs = performance.now() - t1;
      app.view = 'hall';
      app.toasts.length = 0;
      return { tanks: s.tanks.length, animals: s.tanks.reduce((a: number, t: any) => a + t.animals.length, 0), hall, tank, weekMs, coins: Math.round(s.coins) };
    });
    console.log(`${w}x${h}`, JSON.stringify(res));
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/out/scale-hall-${w}.png` });
    if (res.hall.avg > 16 || res.tank.avg > 16) errors.push(`slow frames at ${w}: hall ${res.hall.avg.toFixed(1)} ms, tank ${res.tank.avg.toFixed(1)} ms`);
    await page.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK');
