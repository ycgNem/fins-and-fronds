// Sprite cache. Every sprite has a name; an imported PixelLab sheet (src/art/*.png + .json, see
// src/art/README.md) that defines the name wins, otherwise the procedural generator draws it once
// and the result is cached.
//
// Names: sp:<species>:<frame> (creatures, facing right), it:<item> or it:<item>:<frame> (scape),
// bg:<water look> (backdrops), ui:<name> (interface). Imported art is drawn at 1:1.
import { item, species } from '../../data';
import { PALETTE, RAMP } from '../../data/palette';
import { CREATURE_FRAMES, drawCreature } from './creatures';
import { drawItem, type ItemSprite, SWAY_FRAMES } from './scenery';

export interface Frame {
  img: CanvasImageSource;
  sx: number;
  sy: number;
  w: number;
  h: number;
  ax: number;
  ay: number;
}

interface SheetFrame {
  x: number;
  y: number;
  w: number;
  h: number;
  ax?: number;
  ay?: number;
}

const imported = new Map<string, Frame>();

/** Load every imported sheet that ships with the build. Missing art just falls back. */
export function loadImportedArt() {
  const metas = import.meta.glob('../../art/*.json', { eager: true, import: 'default' }) as Record<string, { frames: Record<string, SheetFrame> }>;
  const pngs = import.meta.glob('../../art/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
  for (const [path, meta] of Object.entries(metas)) {
    const url = pngs[path.replace(/\.json$/, '.png')];
    if (!url || !meta?.frames) continue;
    const img = new Image();
    img.onload = () => {
      for (const [name, f] of Object.entries(meta.frames)) {
        imported.set(name, { img, sx: f.x, sy: f.y, w: f.w, h: f.h, ax: f.ax ?? Math.round(f.w / 2), ay: f.ay ?? f.h - 1 });
      }
    };
    img.src = url;
  }
}

export function importedFrame(name: string): Frame | undefined {
  return imported.get(name);
}

const cache = new Map<string, Frame>();

function wrap(c: HTMLCanvasElement, ax: number, ay: number): Frame {
  return { img: c, sx: 0, sy: 0, w: c.width, h: c.height, ax, ay };
}

/**
 * Imported art at another scale (nearest neighbor), cached. wilt > 0 turns that share of the
 * pixels olive-brown in a fixed scatter, the way procedural plants brown as health falls.
 */
function scaled(imp: Frame, k: number, wilt: number, key: string): Frame {
  let fr = cache.get(key);
  if (fr) return fr;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(imp.w * k));
  c.height = Math.max(1, Math.round(imp.h * k));
  const cx = c.getContext('2d')!;
  cx.imageSmoothingEnabled = false;
  cx.drawImage(imp.img, imp.sx, imp.sy, imp.w, imp.h, 0, 0, c.width, c.height);
  if (wilt > 0) {
    const d = cx.getImageData(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (d.data[i + 3] < 128 || (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 >= wilt * 700) continue;
      const lum = (d.data[i] * 3 + d.data[i + 1] * 6 + d.data[i + 2]) / 10;
      const rgb = PALETTE[RAMP.olive[Math.min(3, Math.floor(lum / 64))]];
      d.data[i] = parseInt(rgb.slice(1, 3), 16);
      d.data[i + 1] = parseInt(rgb.slice(3, 5), 16);
      d.data[i + 2] = parseInt(rgb.slice(5, 7), 16);
    }
    cx.putImageData(d, 0, 0);
  }
  fr = wrap(c, Math.round(imp.ax * k), Math.round(imp.ay * k));
  cache.set(key, fr);
  return fr;
}

function importedCreature(sp: string, f: number): Frame | undefined {
  return imported.get(`sp:${sp}:${f}`) ?? imported.get(`sp:${sp}`);
}

/** How long a species is drawn as an adult: its imported art sets it, else its data. */
export function creatureLength(sp: string): number {
  return importedCreature(sp, 0)?.w ?? species(sp).px;
}

/** A creature frame. len is the drawn length in pixels (fry are half size). */
export function creatureFrame(sp: string, frame: number, len?: number): Frame {
  const f = frame % CREATURE_FRAMES;
  const def = species(sp);
  const imp = importedCreature(sp, f);
  const L = Math.round(len ?? imp?.w ?? def.px);
  // fry and other sizes: the imported art scaled, nearest neighbor
  if (imp) return L === imp.w ? imp : scaled(imp, L / imp.w, 0, `spi|${sp}|${L}|${f}`);
  const key = `sp|${sp}|${L}|${f}`;
  let fr = cache.get(key);
  if (!fr) {
    const c = drawCreature(def, L, f);
    fr = wrap(c, Math.round(c.width / 2), Math.round(c.height / 2));
    cache.set(key, fr);
  }
  return fr;
}

/** A scape item at a growth size (bucketed to 0.1) and sway frame, browned by poor health. */
export function itemFrame(id: string, size: number, seed: number, frame: number, health = 1): Frame {
  const it = item(id);
  const sways = it.cat === 'plant' || it.cat === 'coral' || it.shape === 'clamshell';
  const f = sways ? frame % SWAY_FRAMES : 0;
  const s = Math.max(0.3, Math.round(size * 10) / 10);
  const hb = health < 0.35 ? 0.3 : health < 0.6 ? 0.6 : 1;
  const imp = imported.get(`it:${id}:${f}`) ?? imported.get(`it:${id}`);
  if (imp) return s === 1 && hb === 1 ? imp : scaled(imp, s, it.cat === 'plant' ? 1 - hb : 0, `iti|${id}|${s}|${f}|${hb}`);
  const variant = seed % 3;
  const key = `it|${id}|${s}|${variant}|${f}|${hb}`;
  let fr = cache.get(key);
  if (!fr) {
    const spr: ItemSprite = drawItem(it, s, 1000 + variant * 7919 + id.length * 31, f, hb);
    fr = wrap(spr.img, spr.ax, spr.ay);
    cache.set(key, fr);
  }
  return fr;
}

/** Draw a frame with its anchor at (x, y), optionally mirrored. */
export function drawFrame(ctx: CanvasRenderingContext2D, fr: Frame, x: number, y: number, flip = false, alpha = 1) {
  x = Math.round(x);
  y = Math.round(y);
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, -(fr.w - fr.ax), -fr.ay, fr.w, fr.h);
    ctx.restore();
  } else ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, x - fr.ax, y - fr.ay, fr.w, fr.h);
  if (alpha < 1) ctx.globalAlpha = 1;
}

/** Draw a frame scaled to fit a box (icons in lists), centered. */
export function drawFit(ctx: CanvasRenderingContext2D, fr: Frame, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / fr.w, h / fr.h);
  const s = k >= 1 ? Math.min(3, Math.floor(k)) : k;
  const dw = fr.w * s, dh = fr.h * s;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = s < 1;
  ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, Math.round(x + (w - dw) / 2), Math.round(y + (h - dh) / 2), Math.round(dw), Math.round(dh));
  ctx.imageSmoothingEnabled = smooth;
}

export function clearSpriteCache() {
  cache.clear();
}
