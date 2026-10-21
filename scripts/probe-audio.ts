// Debug probe: measures the ambience mix in a real browser. Unlocks audio, then for each scene
// listens at the master output for a moment and prints the RMS and peak level. `npx vite-node scripts/probe-audio.ts`
import { chromium } from 'playwright';
import { createServer } from 'vite';

const server = await createServer({ server: { port: 5195, strictPort: true, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();
const args = ['--autoplay-policy=no-user-gesture-required'];
const browser = await chromium.launch({ args }).catch(() => chromium.launch({ args, channel: 'chrome' })).catch(() => chromium.launch({ args, channel: 'msedge' }));
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror', String(e)));
  await page.goto('http://127.0.0.1:5195/');
  await page.waitForFunction(() => 'app' in window);
  const res = await page.evaluate(async () => {
    const a = (window as any).app.audio;
    // the app sets its own scene every frame: take over the update
    const update = a.update.bind(a);
    a.update = () => {};
    a.unlock();
    const ctx: AudioContext = a.ctx;
    await ctx.resume();
    const an = ctx.createAnalyser();
    an.fftSize = 4096;
    a.master.connect(an);
    const base = { filter: 'none', air: 0, hum: 0, surge: 0, crowd: 0, rain: 0, night: false, near: 1 };
    const scenes: Record<string, any> = {
      room: base, hob: { ...base, filter: 'hob' }, sponge: { ...base, filter: 'sponge' }, reef: { ...base, filter: 'sump', hum: 1, surge: 0.55 },
      kelp: { ...base, filter: 'sump', hum: 0.8, surge: 1 }, crowd: { ...base, filter: 'hob', crowd: 1 }, rain: { ...base, rain: 1 }, everything: { filter: 'sump', air: 1, hum: 1, surge: 1, crowd: 1, rain: 1, night: false, near: 1 },
    };
    const out: Record<string, { rms: number; peak: number }> = {};
    const buf = new Float32Array(an.fftSize);
    for (const [k, sc] of Object.entries(scenes)) {
      const t0 = performance.now();
      let sum = 0, n = 0, peak = 0;
      while (performance.now() - t0 < 3500) {
        update(0.05, sc);
        await new Promise((r) => setTimeout(r, 50));
        if (performance.now() - t0 < 2000) continue;
        an.getFloatTimeDomainData(buf);
        for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); }
      }
      out[k] = { rms: Math.round(Math.sqrt(sum / n) * 1000) / 1000, peak: Math.round(peak * 1000) / 1000 };
    }
    // each effect alone, ambience muted
    a.setAmbience(0);
    await new Promise((r) => setTimeout(r, 1500));
    const fx: Record<string, number> = {};
    for (const s of ['click', 'coin', 'place', 'splash', 'bubble', 'letter', 'chime', 'error', 'scrape', 'feed', 'door']) {
      a.play(s);
      let peak = 0;
      const t0 = performance.now();
      while (performance.now() - t0 < 900) {
        await new Promise((r) => setTimeout(r, 20));
        an.getFloatTimeDomainData(buf);
        for (const v of buf) peak = Math.max(peak, Math.abs(v));
      }
      fx[s] = Math.round(peak * 1000) / 1000;
    }
    return { state: ctx.state, out, fx };
  });
  console.log(JSON.stringify(res, null, 1));
} finally {
  await browser.close();
  await server.close();
}
