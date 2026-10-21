// A small pixel buffer for generating sprites with direct writes (palette indices only), plus
// canvas helpers. Every procedural sprite in src/render/art/ is drawn through this.
import { PALETTE_RGB } from '../../data/palette';
import { hash2 } from '../../engine/rng';

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

export function ctx2d(c: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export class Pix {
  readonly data: Uint8ClampedArray;
  constructor(readonly w: number, readonly h: number) {
    this.data = new Uint8ClampedArray(Math.max(1, w * h * 4));
  }

  set(x: number, y: number, c: number, a = 255) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || c < 0) return;
    const i = (y * this.w + x) * 4;
    const rgb = PALETTE_RGB[c];
    this.data[i] = rgb[0];
    this.data[i + 1] = rgb[1];
    this.data[i + 2] = rgb[2];
    this.data[i + 3] = a;
  }

  has(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    return this.data[(y * this.w + x) * 4 + 3] > 0;
  }

  alpha(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }

  clear(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: number, a = 255) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, c, a);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: number, a = 255) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / Math.max(0.5, rx), dy = (y + 0.5 - cy) / Math.max(0.5, ry);
        if (dx * dx + dy * dy <= 1) this.set(x, y, c, a);
      }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number, a = 255) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (let n = 0; n < 2000; n++) {
      this.set(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** a thick line (round brush) for branches and stems */
  stroke(x0: number, y0: number, x1: number, y1: number, r0: number, r1: number, c: number) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const r = r0 + (r1 - r0) * t;
      if (r < 0.75) this.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c);
      else this.ellipse(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, c);
    }
  }

  /** 1px outline in color c around opaque pixels; `sel` darkens only the bottom-right edges */
  outline(c = 0, sel = false) {
    const mask = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.w * this.h; i++) mask[i] = this.data[i * 4 + 3] > 40 ? 1 : 0;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (mask[i]) continue;
        const l = x > 0 && mask[i - 1], r = x < this.w - 1 && mask[i + 1], u = y > 0 && mask[i - this.w], d = y < this.h - 1 && mask[i + this.w];
        if (sel ? r || d || (l && !u) : l || r || u || d) this.set(x, y, c);
      }
  }

  /** shade: pixels whose upper-left neighbor is empty get the light color, bottom-right the dark */
  rim(light: number, dark: number) {
    const src = new Uint8Array(this.w * this.h);
    for (let i = 0; i < this.w * this.h; i++) src[i] = this.data[i * 4 + 3] > 40 ? 1 : 0;
    const at = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && src[y * this.w + x] === 1;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (!at(x, y)) continue;
        if (!at(x - 1, y - 1) || !at(x, y - 1)) this.set(x, y, light, this.alpha(x, y));
        else if (!at(x + 1, y + 1) || !at(x, y + 1)) this.set(x, y, dark, this.alpha(x, y));
      }
  }

  noise(x: number, y: number, seed: number): number {
    return hash2(x, y, seed);
  }

  toCanvas(): HTMLCanvasElement {
    const c = makeCanvas(this.w, this.h);
    const ctx = ctx2d(c);
    const img = ctx.createImageData(this.w, this.h);
    img.data.set(this.data);
    ctx.putImageData(img, 0, 0);
    return c;
  }
}

/** 4x4 Bayer threshold in 0..1 for ordered dithering */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

/** pick a ramp step for a 0..1 lightness with dithering */
export function shadeOf(ramp: readonly number[], v: number, x: number, y: number): number {
  const f = Math.max(0, Math.min(0.999, v)) * (ramp.length - 1);
  const i = Math.floor(f);
  const k = f - i;
  return ramp[Math.min(ramp.length - 1, i + (k > bayer(x, y) ? 1 : 0))];
}
