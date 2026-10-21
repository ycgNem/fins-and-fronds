// Browser smoke test: start the dev server, open the game, start a new aquarium, exercise a few
// actions and fail on any console error. Run with `npm run e2e` (needs a Playwright Chromium:
// `npx playwright install chromium`). Writes a screenshot to e2e/out/smoke.png.
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5199, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const errors: string[] = [];
// Playwright's own Chromium if installed, else the system Chrome or Edge
const browser = await chromium.launch().catch(() => chromium.launch({ channel: 'chrome' })).catch(() => chromium.launch({ channel: 'msedge' }));
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('http://127.0.0.1:5199/');
  await page.waitForFunction(() => 'app' in window);
  const result = await page.evaluate(async () => {
    const app = (window as any).app;
    app.startNew();
    const frames = (n: number) => new Promise<void>((r) => {
      let i = 0;
      const step = () => (++i >= n ? r() : requestAnimationFrame(step));
      requestAnimationFrame(step);
    });
    await frames(30);
    for (const m of ['scape', 'stock', 'gear', 'water', 'care', 'look']) {
      app.setMode(m);
      await frames(5);
    }
    for (const w of ['letters', 'codex', 'trips', 'upgrades', 'guestbook', 'menu']) {
      app.window = w;
      await frames(5);
    }
    app.window = null;
    app.view = 'hall';
    await frames(5);
    app.view = 'tank';
    app.state.settings.speed = 10;
    await frames(120);
    return { screen: app.screen, tanks: app.state.tanks.length, time: app.state.time, coins: Math.round(app.state.coins) };
  });
  mkdirSync('e2e/out', { recursive: true });
  await page.screenshot({ path: 'e2e/out/smoke.png' });
  console.log('smoke:', JSON.stringify(result));
  if (result.screen !== 'game' || result.tanks < 1) errors.push('game did not start');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK');
