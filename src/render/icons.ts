// Interface art from the icons, plates and postcards sheets (ui:<name>, st:<stamp>, pl:<archetype>,
// pc:<region>). Icons are drawn 32 px; buttons want 16, so a half-size copy is made once by keeping
// the most common color of each 2x2 block (darker wins a tie, which keeps the outline), instead of
// letting the browser drop every other pixel.
import { type Frame, importedFrame } from './art/sprites';

const halves = new Map<string, Frame>();

function halfOf(name: string, fr: Frame): Frame {
  let h = halves.get(name);
  if (h) return h;
  const src = document.createElement('canvas');
  src.width = fr.w;
  src.height = fr.h;
  const sx = src.getContext('2d')!;
  sx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, 0, 0, fr.w, fr.h);
  const d = sx.getImageData(0, 0, fr.w, fr.h).data;
  const w = Math.ceil(fr.w / 2), hh = Math.ceil(fr.h / 2);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = hh;
  const ox = out.getContext('2d')!;
  const img = ox.createImageData(w, hh);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const counts = new Map<number, number>();
      let opaque = 0;
      for (let k = 0; k < 4; k++) {
        const px = x * 2 + (k & 1), py = y * 2 + (k >> 1);
        if (px >= fr.w || py >= fr.h) continue;
        const i = (py * fr.w + px) * 4;
        if (d[i + 3] < 128) continue;
        opaque++;
        const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
      if (opaque < 2) continue;
      let best = -1, bestN = 0, bestL = Infinity;
      for (const [c, n] of counts) {
        const l = ((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
        if (n > bestN || (n === bestN && l < bestL)) [best, bestN, bestL] = [c, n, l];
      }
      const o = (y * w + x) * 4;
      img.data[o] = (best >> 16) & 255;
      img.data[o + 1] = (best >> 8) & 255;
      img.data[o + 2] = best & 255;
      img.data[o + 3] = 255;
    }
  }
  ox.putImageData(img, 0, 0);
  h = { img: out, sx: 0, sy: 0, w, h: hh, ax: Math.round(w / 2), ay: hh - 1 };
  halves.set(name, h);
  return h;
}

export function hasArt(name: string) {
  return !!importedFrame(name);
}

/** draw a piece of interface art centered in a size x size box (16 uses the half-size copy); false if there is none */
export function drawIcon(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, size: number, alpha = 1): boolean {
  const full = importedFrame(name);
  if (!full) return false;
  const fr = size < Math.max(full.w, full.h) * 0.75 ? halfOf(name, full) : full;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, Math.round(x + (size - fr.w) / 2), Math.round(y + (size - fr.h) / 2), fr.w, fr.h);
  ctx.globalAlpha = a0;
  return true;
}

/** draw a plate or postcard at a whole-number scale that fits the box, centered; returns the drawn height (0 if none) */
export function drawPicture(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number, alpha = 1): number {
  const fr = importedFrame(name);
  if (!fr) return 0;
  const s = Math.max(1, Math.min(3, Math.floor(Math.min(w / fr.w, h / fr.h))));
  const dw = fr.w * s, dh = fr.h * s;
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  const a0 = ctx.globalAlpha;
  ctx.globalAlpha = a0 * alpha;
  ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, Math.round(x + (w - dw) / 2), Math.round(y), dw, dh);
  ctx.globalAlpha = a0;
  ctx.imageSmoothingEnabled = smooth;
  return dh;
}
