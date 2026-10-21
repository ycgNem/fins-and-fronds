// Review an imported sheet: frame 0 of every sprite, scaled up on water, labelled with its name
// in the game's text font. Everything should face right; check that here before shipping.
//
// Usage: npx vite-node scripts/art-review.ts <sheet> [scale=4] [cols=6]   -> art/raw/<sheet>-review.png
import fs from 'node:fs';
import path from 'node:path';
import { GLYPHS, META } from '../src/ui/fonts/text16';
import { decodePNG, encodePNG } from './lib/png';

const [sheet, kArg, colsArg] = process.argv.slice(2);
const k = +(kArg ?? 4), cols = +(colsArg ?? 6);
const img = decodePNG(fs.readFileSync(path.resolve('src/art', `${sheet}.png`)));
const meta = JSON.parse(fs.readFileSync(path.resolve('src/art', `${sheet}.json`), 'utf8')) as { frames: Record<string, { x: number; y: number; w: number; h: number }> };
const names = Object.keys(meta.frames).filter((n) => !/:[1-3]$/.test(n));
const fr = (n: string) => meta.frames[n];
const cw = Math.max(...names.map((n) => fr(n).w)) * k + 12, ch = Math.max(...names.map((n) => fr(n).h)) * k + META.height + 10;
const W = Math.max(cols * cw, 200), rows = Math.ceil(names.length / cols), H = rows * ch;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([58, 127, 138, 255], i * 4);

function text(s: string, x: number, y: number) {
  for (const c of s) {
    const g = GLYPHS[c];
    if (!g) { x += META.space + 1; continue; }
    const rows = g.split('|');
    rows.forEach((r, yy) => { for (let xx = 0; xx < r.length; xx++) if (r[xx] === '#' && x + xx < W) out.set([255, 255, 255, 255], ((y + yy) * W + x + xx) * 4); });
    x += rows[0].length + 1;
  }
}

names.forEach((n, i) => {
  const f = fr(n), ox = (i % cols) * cw + 6, oy = Math.floor(i / cols) * ch + 4;
  for (let y = 0; y < f.h * k; y++) for (let x = 0; x < f.w * k; x++) {
    const s = ((f.y + ((y / k) | 0)) * img.w + f.x + ((x / k) | 0)) * 4;
    const a = img.data[s + 3] / 255;
    if (!a) continue;
    const o = ((oy + y) * W + ox + x) * 4;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(img.data[s + c] * a + out[o + c] * (1 - a));
  }
  text(n.replace(/^(sp|it):/, '').replace(/:0$/, '').replace(/_/g, ' '), ox, oy + ch - META.height - 8);
});
const file = path.resolve('art/raw', `${sheet}-review.png`);
fs.writeFileSync(file, encodePNG(W, H, out));
console.log('wrote', file);
