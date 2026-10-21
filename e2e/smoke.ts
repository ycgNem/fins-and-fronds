// Browser smoke test: start the dev server, open the game, start a new shop (the intro plays and
// is skipped), build, scape and stock the first tank and a stock tank, open every mode and window,
// scrape the glass, save, reload the page and continue, and fail on any console error. Run with `npm run e2e` (needs a Playwright Chromium:
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
    const introPlayed = !!app.cutscene;
    app.cutscene?.end();
    await frames(60);
    // the first tank, the way the tour builds it
    // (a page-side import: vite-node would rewrite a plain import() in this file)
    const act = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)('/src/sim/actions.ts');
    const g = app.game;
    act.buildTank(g, 0, 'std_20l', 'fresh');
    const t = g.state.tanks[0];
    app.setTank(t.id);
    for (const e of ['hob_filter', 'heater_50', 'led_basic']) act.buyEquip(g, t, e);
    act.buyItem(g, t, 'malaysian_driftwood', 110, 1, undefined, false);
    act.buyItem(g, t, 'crypt_wendtii', 220, 2, undefined, false);
    t.chem.bacA = t.chem.bacB = 0.96;
    act.buyAnimals(g, t, 'neon_tetra', 8);
    act.buildTank(g, 100, 'std_10', 'fresh');
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
    app.playScene('intro', true);
    await frames(20);
    const replay = !!app.cutscene;
    app.cutscene?.end();
    await frames(60);
    t.chem.glass = 0.5;
    act.scrape(g, t, 1);
    const scraped = t.chem.glass === 0;
    app.save();
    return { screen: app.screen, tanks: app.state.tanks.length, time: app.state.time, coins: Math.round(app.state.coins), introPlayed, replay, animals: t.animals.length + t.bags.length, items: t.items.length, scraped };
  });
  // reload the page and continue the saved shop
  await page.reload();
  await page.waitForFunction(() => 'app' in window);
  const back = await page.evaluate(async () => {
    const app = (window as any).app;
    if (!app.hasSave()) return null;
    app.continueSave();
    await new Promise((r) => setTimeout(r, 300));
    const t = app.state.tanks[0];
    return { tanks: app.state.tanks.length, items: t.items.length, animals: t.animals.length + t.bags.length, equip: t.equip.length };
  });
  console.log('reload:', JSON.stringify(back));
  if (!back || back.tanks !== result.tanks || back.items !== result.items || back.animals < 1 || back.equip < 3) errors.push('the save did not come back after a reload');
  if (!result.scraped) errors.push('scraping did not clean the glass');
  mkdirSync('e2e/out', { recursive: true });
  await page.screenshot({ path: 'e2e/out/smoke.png' });
  console.log('smoke:', JSON.stringify(result));
  if (result.screen !== 'game' || result.tanks < 2) errors.push('game did not start');
  if (!result.introPlayed || !result.replay) errors.push('the intro did not play');
  if (!result.animals) errors.push('the first tank was not stocked');
} finally {
  await browser.close();
  await server.close();
}
if (errors.length) {
  console.error('FAIL\n' + errors.join('\n'));
  process.exit(1);
}
console.log('OK');
