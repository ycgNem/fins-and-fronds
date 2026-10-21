// Screenshots of the interface art: the title sign, and the codex, letters and expeditions windows
// (with a returned postcard) at 1280x720. Writes e2e/out/win-*.png. Run with `npx vite-node e2e/windows.ts`.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5196, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
const errors: string[] = [];
mkdirSync('e2e/out', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto('http://127.0.0.1:5196/');
  await page.waitForFunction(() => 'app' in window);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'e2e/out/win-title.png' });
  await page.evaluate(async () => {
    const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>;
    const ng = await imp('/src/sim/newgame.ts'), G = await imp('/src/sim/Game.ts'), data = await imp('/src/data/index.ts');
    const app = (window as any).app;
    const s = ng.newGame(3);
    s.tutorial.done = true;
    s.seen = ['intro', 'town'];
    ng.showcaseTank(s);
    s.tier = 2;
    s.time = 11 * 60;
    s.codex.archetypes = ['community', 'nature_aquarium'];
    s.letters = data.REQUESTS.slice(0, 3).map((r: any, i: number) => ({ id: r.id, ready: i === 0, read: true, arrived: 0 }));
    s.expeditions = [{ id: 1, region: 'rio_negro', start: 0, end: 60, finds: [{ kind: 'species', id: 'cardinal_tetra', n: 12 }], postcard: 'The river is the color of strong tea. We netted cardinals by lamplight under the roots.' }];
    const g = new G.Game(s);
    app.load(g);
    app.toasts.length = 0;
    app.panel.codexSel = 'community';
  });
  for (const w of ['codex', 'letters', 'trips']) {
    await page.evaluate((w) => {
      const app = (window as any).app;
      app.window = w;
    }, w);
    await page.waitForTimeout(400);
    await page.screenshot({ path: `e2e/out/win-${w}.png` });
  }
  // an expedition region's page, after filing the postcard
  await page.evaluate(() => {
    const app = (window as any).app;
    app.state.expeditions = [];
    app.panel.tripSel = 'lake_malawi';
    app.window = 'trips';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/out/win-trips-region.png' });
  await page.evaluate(() => ((window as any).app.window = null));
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'e2e/out/win-none.png' });
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK');
