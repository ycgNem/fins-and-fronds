// Import chosen PixelLab art into a game sprite sheet: src/art/<sheet>.png + .json (format in
// src/art/README.md). Every pixel is snapped to Resurrect 64, alpha is made hard, the sprite is
// trimmed and anchored, and still art gets its animation frames derived here (tail beat, leg
// shuffle, bell pulse, plant sway) so a single PixelLab still is enough for a living sprite.
//
// Usage: npx vite-node scripts/sprites-import.ts <batch>
//   reads art/batches/<batch>.json:
//   { "sheet": "creatures-1", "flip": true,
//     "sprites": { "sp:neon_tetra": "art/raw/creatures-1/neon_tetra.png",
//                  "sp:guppy": { "src": "...", "flip": true, "anim": "swim", "alpha": 0.5 } } }
//   anim: swim | crawl | pulse | sway | none (default from the species kind or item category)
//   flip: mirror a sprite drawn facing left (everything faces right)
//   alpha: multiply opacity (see-through animals); crop: [x, y, w, h] of the source to use
//   clean: drop captions and slivers of neighboring cells (keeps the main blob and what touches it)
import fs from 'node:fs';
import path from 'node:path';
import { hasItem, hasSpecies, item, species } from '../src/data';
import { PALETTE_RGB } from '../src/data/palette';
import { decodePNG, encodePNG, type Img, upscale } from './lib/png';

type Anim = 'swim' | 'crawl' | 'pulse' | 'sway' | 'none';
interface Spec { src: string; flip?: boolean; anim?: Anim; alpha?: number; crop?: [number, number, number, number]; clean?: boolean }
/** flip and clean at the top are batch defaults: PixelLab tends to draw side views facing left */
interface Batch { sheet: string; flip?: boolean; clean?: boolean; sprites: Record<string, string | Spec> }

const FRAMES = 4;
const batchName = process.argv[2];
if (!batchName) {
  console.error('usage: vite-node scripts/sprites-import.ts <batch>   (art/batches/<batch>.json)');
  process.exit(2);
}
const batch = JSON.parse(fs.readFileSync(path.resolve('art/batches', `${batchName}.json`), 'utf8')) as Batch;

// ---------------------------------------------------------------- pixels

class Pix {
  data: Uint8Array;
  constructor(public w: number, public h: number, data?: Uint8Array) {
    this.data = data ?? new Uint8Array(w * h * 4);
  }
  a(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.data[(y * this.w + x) * 4 + 3]; }
  get(x: number, y: number) { const o = (y * this.w + x) * 4; return this.data.subarray(o, o + 4); }
  set(x: number, y: number, p: ArrayLike<number>) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data.set(p, (y * this.w + x) * 4);
  }
}

const near = new Map<number, number>();
/** nearest palette color, weighted toward how the eye sees it */
function snap(r: number, g: number, b: number): [number, number, number] {
  const key = (r << 16) | (g << 8) | b;
  let i = near.get(key);
  if (i === undefined) {
    let best = Infinity;
    i = 0;
    PALETTE_RGB.forEach(([pr, pg, pb], j) => {
      const dr = r - pr, dg = g - pg, db = b - pb, rm = (r + pr) / 2;
      const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
      if (d < best) [best, i] = [d, j];
    });
    near.set(key, i);
  }
  return PALETTE_RGB[i];
}

/**
 * Batch candidates sometimes carry a caption or a sliver of the next cell. Keep the biggest blob
 * of pixels and anything touching its box (antennae, fins, tentacles); drop the rest.
 */
function keepMain(p: Pix) {
  const comp = new Int32Array(p.w * p.h).fill(-1);
  const boxes: { n: number; x0: number; y0: number; x1: number; y1: number }[] = [];
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    if (!p.a(x, y) || comp[y * p.w + x] >= 0) continue;
    const id = boxes.length, b = { n: 0, x0: x, y0: y, x1: x, y1: y };
    const stack = [x, y];
    comp[y * p.w + x] = id;
    while (stack.length) {
      const cy = stack.pop()!, cx = stack.pop()!;
      b.n++;
      b.x0 = Math.min(b.x0, cx); b.x1 = Math.max(b.x1, cx); b.y0 = Math.min(b.y0, cy); b.y1 = Math.max(b.y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (p.a(nx, ny) && comp[ny * p.w + nx] < 0) {
          comp[ny * p.w + nx] = id;
          stack.push(nx, ny);
        }
      }
    }
    boxes.push(b);
  }
  if (boxes.length < 2) return;
  const main = boxes.reduce((a, b) => (b.n > a.n ? b : a));
  const m = 3;
  const keep = boxes.map((b) => b === main || (b.x1 >= main.x0 - m && b.x0 <= main.x1 + m && b.y1 >= main.y0 - m && b.y0 <= main.y1 + m));
  for (let i = 0; i < comp.length; i++) if (comp[i] >= 0 && !keep[comp[i]]) p.data.fill(0, i * 4, i * 4 + 4);
}

function prepare(img: Img, spec: Spec): Pix {
  let src = new Pix(img.w, img.h, img.data);
  if (spec.crop) {
    const [cx, cy, cw, chh] = spec.crop, c = new Pix(cw, chh);
    for (let y = 0; y < chh; y++) for (let x = 0; x < cw; x++) c.set(x, y, src.get(cx + x, cy + y));
    src = c;
  }
  // snap colors, harden alpha
  const p = new Pix(src.w, src.h);
  for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) {
    const [r, g, b, a] = src.get(x, y);
    if (a < 128) continue;
    const [sr, sg, sb] = snap(r, g, b);
    p.set(x, y, [sr, sg, sb, Math.round(255 * Math.min(1, spec.alpha ?? 1))]);
  }
  if (spec.clean) keepMain(p);
  // trim
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.a(x, y)) {
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  if (x1 < 0) throw new Error(`${spec.src}: empty image`);
  const t = new Pix(x1 - x0 + 1, y1 - y0 + 1);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) t.set(spec.flip ? t.w - 1 - x : x, y, p.get(x0 + x, y0 + y));
  return t;
}

// ---------------------------------------------------------------- derived animation

const WAVE = [0, 1, 0, -1];

/** fish: the rear of the body beats; the head holds still (the sprite faces right) */
function swim(p: Pix, k: number): Pix {
  // long, thin bodies (kuhlis, eels, pipefish) ripple along their whole length instead
  if (p.w >= p.h * 3.5) return ripple(p, k);
  const out = new Pix(p.w, p.h + 2);
  const amp = p.h >= 20 ? 2 : 1, rear = Math.max(3, Math.round(p.w * 0.45));
  for (let x = 0; x < p.w; x++) {
    const t = x < rear ? Math.pow((rear - x) / rear, 1.4) : 0;
    const dy = Math.round(WAVE[k] * amp * t);
    for (let y = 0; y < p.h; y++) if (p.a(x, y)) out.set(x, y + 1 + dy, p.get(x, y));
  }
  return out;
}

/** eel-like swimming: a wave travels from head to tail, larger toward the tail */
function ripple(p: Pix, k: number): Pix {
  const out = new Pix(p.w, p.h + 2);
  for (let x = 0; x < p.w; x++) {
    const along = 1 - x / p.w; // 0 at the head (right), 1 at the tail
    const dy = Math.round(Math.sin(along * Math.PI * 2.2 + (k * Math.PI) / 2) * (0.35 + 0.65 * along));
    for (let y = 0; y < p.h; y++) if (p.a(x, y)) out.set(x, y + 1 + dy, p.get(x, y));
  }
  return out;
}

/** shrimp, crabs: the lowest third (legs) shuffles a pixel */
function crawl(p: Pix, k: number): Pix {
  const out = new Pix(p.w + 2, p.h);
  const legs = Math.floor(p.h * 0.68);
  for (let y = 0; y < p.h; y++) {
    const dx = y >= legs ? WAVE[k] * (y % 2 ? 1 : -1) : 0;
    for (let x = 0; x < p.w; x++) if (p.a(x, y)) out.set(x + 1 + dx, y, p.get(x, y));
  }
  return out;
}

/** jellies: the bell squashes and springs back */
function pulse(p: Pix, k: number): Pix {
  const s = [1, 0.92, 0.86, 0.92][k];
  const out = new Pix(p.w, p.h);
  const nh = Math.max(1, Math.round(p.h * s)), off = p.h - nh;
  for (let y = 0; y < nh; y++) {
    const sy = Math.min(p.h - 1, Math.floor(y / s));
    for (let x = 0; x < p.w; x++) if (p.a(x, sy)) out.set(x, off + y, p.get(x, sy));
  }
  return out;
}

/** plants, soft corals: the tips lean with the current, the base stays put */
function sway(p: Pix, k: number, hangs: boolean): Pix {
  const amp = Math.max(1, Math.min(3, Math.round(p.h / 22)));
  const out = new Pix(p.w + amp * 2, p.h);
  for (let y = 0; y < p.h; y++) {
    const t = hangs ? y / p.h : (p.h - 1 - y) / p.h;
    const dx = Math.round(WAVE[k] * amp * Math.pow(t, 1.3));
    for (let x = 0; x < p.w; x++) if (p.a(x, y)) out.set(x + amp + dx, y, p.get(x, y));
  }
  return out;
}

function defaultAnim(name: string): Anim {
  const [kind, id] = name.split(':');
  if (kind === 'sp' && hasSpecies(id)) {
    const k = species(id).kind;
    if (k === 'fish' || k === 'amphibian' || k === 'cephalopod') return 'swim';
    if (k === 'shrimp' || k === 'crab' || k === 'crayfish' || k === 'isopod') return 'crawl';
    if (k === 'jelly') return 'pulse';
    return 'none';
  }
  if (kind === 'it' && hasItem(id)) {
    const it = item(id);
    if (it.cat === 'plant' || (it.cat === 'coral' && it.shape !== 'dome' && it.shape !== 'plate' && it.shape !== 'branching')) return 'sway';
  }
  return 'none';
}

function hangsOf(name: string) {
  const [kind, id] = name.split(':');
  if (kind !== 'it' || !hasItem(id)) return false;
  const it = item(id);
  return it.place === 'surface' || it.place === 'hang';
}

// ---------------------------------------------------------------- pack and write

interface Out { name: string; p: Pix; ax: number; ay: number }
const outs: Out[] = [];
for (const [name, v] of Object.entries(batch.sprites)) {
  const spec: Spec = { flip: batch.flip, clean: batch.clean, ...(typeof v === 'string' ? { src: v } : v) };
  const base = prepare(decodePNG(fs.readFileSync(path.resolve(spec.src))), spec);
  const anim = spec.anim ?? defaultAnim(name);
  const hangs = hangsOf(name);
  const anchor = (p: Pix) => name.startsWith('sp:') ? { ax: Math.round(p.w / 2), ay: Math.round(p.h / 2) } : { ax: Math.round(p.w / 2), ay: hangs ? 0 : p.h - 1 };
  if (anim === 'none') {
    outs.push({ name, p: base, ...anchor(base) });
    continue;
  }
  for (let k = 0; k < FRAMES; k++) {
    const p = anim === 'swim' ? swim(base, k) : anim === 'crawl' ? crawl(base, k) : anim === 'pulse' ? pulse(base, k) : sway(base, k, hangs);
    outs.push({ name: `${name}:${k}`, p, ...anchor(p) });
  }
}

// shelf packing, tallest first, 1 px gutter
const MAXW = 1024;
const order = [...outs].sort((a, b) => b.p.h - a.p.h || b.p.w - a.p.w);
let x = 0, y = 0, shelf = 0, sheetW = 0;
const at = new Map<Out, [number, number]>();
for (const o of order) {
  if (x + o.p.w > MAXW) {
    x = 0;
    y += shelf + 1;
    shelf = 0;
  }
  at.set(o, [x, y]);
  x += o.p.w + 1;
  shelf = Math.max(shelf, o.p.h);
  sheetW = Math.max(sheetW, x);
}
const sheetH = y + shelf;
const sheet = new Pix(sheetW, sheetH);
const frames: Record<string, { x: number; y: number; w: number; h: number; ax: number; ay: number }> = {};
for (const o of outs) {
  const [ox, oy] = at.get(o)!;
  for (let yy = 0; yy < o.p.h; yy++) for (let xx = 0; xx < o.p.w; xx++) if (o.p.a(xx, yy)) sheet.set(ox + xx, oy + yy, o.p.get(xx, yy));
  frames[o.name] = { x: ox, y: oy, w: o.p.w, h: o.p.h, ax: o.ax, ay: o.ay };
}

fs.writeFileSync(path.resolve('src/art', `${batch.sheet}.png`), encodePNG(sheetW, sheetH, sheet.data));
fs.writeFileSync(path.resolve('src/art', `${batch.sheet}.json`), JSON.stringify({ frames }, null, 1) + '\n');
const prev = upscale({ w: sheetW, h: sheetH, data: sheet.data }, 3);
fs.mkdirSync(path.resolve('art/raw'), { recursive: true });
fs.writeFileSync(path.resolve('art/raw', `${batch.sheet}-sheet-3x.png`), encodePNG(prev.w, prev.h, prev.data));
console.log(`wrote src/art/${batch.sheet}.png (${sheetW}x${sheetH}) + .json: ${Object.keys(batch.sprites).length} sprites, ${outs.length} frames`);
