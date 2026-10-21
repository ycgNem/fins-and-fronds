// Contact sheet for reviewing a batch: every PNG in a folder (named 0.png, 1.png, ...) scaled up
// on a water-colored backdrop, numbered, in a grid. Look at it before choosing or importing.
//
// Usage: npx vite-node scripts/art-sheet.ts <dir> [scale=4] [cols=8] [bg=#3a7f8a]
//   writes <dir>/_sheet.png
import fs from 'node:fs';
import path from 'node:path';
import { decodePNG, encodePNG, type Img } from './lib/png';

const [dir, kArg, colsArg, bgArg] = process.argv.slice(2);
if (!dir) {
  console.error('usage: vite-node scripts/art-sheet.ts <dir> [scale] [cols] [bg]');
  process.exit(2);
}
const k = +(kArg ?? 4), cols = +(colsArg ?? 8);
const bg = (bgArg ?? '#3a7f8a').replace('#', '');
const BG = [parseInt(bg.slice(0, 2), 16), parseInt(bg.slice(2, 4), 16), parseInt(bg.slice(4, 6), 16)];

const files = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b));
const imgs: [string, Img][] = files.map((f) => [f.replace('.png', ''), decodePNG(fs.readFileSync(path.join(dir, f)))]);
const cw = Math.max(...imgs.map(([, i]) => i.w)) * k + 8, ch = Math.max(...imgs.map(([, i]) => i.h)) * k + 16;
const rows = Math.ceil(imgs.length / cols);
const W = cols * cw, H = rows * ch;
const out = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) out.set([BG[0], BG[1], BG[2], 255], i * 4);

// 3x5 digits for the labels
const D = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];
function digit(n: string, x0: number, y0: number) {
  let x = x0;
  for (const c of n) {
    const d = D[+c];
    for (let y = 0; y < 5; y++) for (let xx = 0; xx < 3; xx++) if (d[y * 3 + xx] === '1')
      for (let sy = 0; sy < 2; sy++) for (let sx = 0; sx < 2; sx++) out.set([255, 255, 255, 255], ((y0 + y * 2 + sy) * W + x + xx * 2 + sx) * 4);
    x += 8;
  }
}

imgs.forEach(([name, img], i) => {
  const ox = (i % cols) * cw + 4, oy = Math.floor(i / cols) * ch + 14;
  // checker the cell lightly so transparent edges read
  for (let y = 0; y < img.h * k; y++) for (let x = 0; x < img.w * k; x++) {
    const s = (((y / k) | 0) * img.w + ((x / k) | 0)) * 4;
    const a = img.data[s + 3] / 255;
    const o = ((oy + y) * W + ox + x) * 4;
    const chk = ((((x / k) | 0) + ((y / k) | 0)) & 1) ? 8 : 0;
    for (let c = 0; c < 3; c++) out[o + c] = Math.round(img.data[s + c] * a + (BG[c] + chk) * (1 - a));
  }
  digit(name, ox, oy - 12);
});

const file = path.join(dir, '_sheet.png');
fs.writeFileSync(file, encodePNG(W, H, out));
console.log(`wrote ${file} (${W}x${H}, ${imgs.length} images)`);
