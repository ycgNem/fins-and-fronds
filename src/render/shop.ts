// The shop around the tanks: a street window that follows the time of day (and the weather), the
// OPEN sign, a wall clock, and PixelLab props (sh:<name>: counter, cat, shelf, plants, poster,
// buckets, chalkboard, supplies, notice board). Everything here draws in UI pixels into the
// current transform; a missing prop is simply skipped.
import { PALETTE, rgba } from '../data/palette';
import { importedFrame, type Frame } from './art/sprites';

/** the town's weather: about one day in five it rains (the street window and the sound agree) */
export function isRainy(day: number): boolean {
  return (day * 7919) % 5 === 2;
}

/** the props are drawn a little larger than their art, so the shop around the tanks reads at a glance */
export const PROP_SCALE = 1.25;

/** draw a prop with its bottom-left corner at (x, y); returns its size, or null if there is no art */
export function prop(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, opts: { dim?: number; flip?: boolean } = {}): { w: number; h: number } | null {
  const fr = importedFrame(name);
  if (!fr) return null;
  const img = opts.dim ? dimmed(fr, name, opts.dim) : fr;
  const { w, h } = propSize(name)!;
  const dx = Math.round(x), dy = Math.round(y - h);
  const smooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  if (opts.flip) {
    ctx.save();
    ctx.translate(dx + w, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img.img, img.sx, img.sy, fr.w, fr.h, 0, 0, w, h);
    ctx.restore();
  } else ctx.drawImage(img.img, img.sx, img.sy, fr.w, fr.h, dx, dy, w, h);
  ctx.imageSmoothingEnabled = smooth;
  return { w, h };
}

/** a prop's drawn size in UI pixels */
export function propSize(name: string): { w: number; h: number } | null {
  const fr = importedFrame(name);
  return fr ? { w: Math.round(fr.w * PROP_SCALE), h: Math.round(fr.h * PROP_SCALE) } : null;
}

const dimCache = new Map<string, Frame>();

/** the same art with its colors darkened (an unlit neon sign, a prop in shadow) */
function dimmed(fr: Frame, key: string, k: number): Frame {
  const id = `${key}:${k}`;
  let d = dimCache.get(id);
  if (d) return d;
  const c = document.createElement('canvas');
  c.width = fr.w;
  c.height = fr.h;
  const cx = c.getContext('2d')!;
  cx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, 0, 0, fr.w, fr.h);
  const px = cx.getImageData(0, 0, fr.w, fr.h);
  for (let i = 0; i < px.data.length; i += 4) {
    // toward a cool grey-plum, keeping a little of the color
    const l = (px.data[i] + px.data[i + 1] + px.data[i + 2]) / 3;
    px.data[i] = Math.round((px.data[i] * 0.3 + l * 0.7) * k + 46 * (1 - k));
    px.data[i + 1] = Math.round((px.data[i + 1] * 0.3 + l * 0.7) * k + 34 * (1 - k));
    px.data[i + 2] = Math.round((px.data[i + 2] * 0.3 + l * 0.7) * k + 47 * (1 - k));
  }
  cx.putImageData(px, 0, 0);
  d = { img: c, sx: 0, sy: 0, w: fr.w, h: fr.h, ax: fr.ax, ay: fr.ay };
  dimCache.set(id, d);
  return d;
}

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const f = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  return `rgb(${f(r1, r2)},${f(g1, g2)},${f(b1, b2)})`;
}

/** sky colors (top, horizon) through the day */
function sky(hour: number): [string, string] {
  const night: [string, string] = [PALETTE[44], PALETTE[45]];
  const dawn: [string, string] = [PALETTE[57], PALETTE[23]];
  const day: [string, string] = [PALETTE[47], PALETTE[48]];
  const dusk: [string, string] = [PALETTE[51], PALETTE[22]];
  const lerp = (a: [string, string], b: [string, string], t: number): [string, string] => [mix(a[0], b[0], t), mix(a[1], b[1], t)];
  if (hour < 5) return night;
  if (hour < 7) return lerp(night, dawn, (hour - 5) / 2);
  if (hour < 9) return lerp(dawn, day, (hour - 7) / 2);
  if (hour < 17) return day;
  if (hour < 19.5) return lerp(day, dusk, (hour - 17) / 2.5);
  if (hour < 21.5) return lerp(dusk, night, (hour - 19.5) / 2);
  return night;
}

/**
 * The shop window onto the street, in UI pixels: sky, the houses across the road (their windows
 * light up at dusk), rain on some days, and a wooden frame with a sill. `day` seeds the weather.
 */
export function streetWindow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, hour: number, day: number, time: number) {
  x = Math.round(x);
  y = Math.round(y);
  const rainy = isRainy(day);
  const [top, low] = sky(hour);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, rainy ? mix(top.startsWith('rgb') ? '#7f708a' : top, '#7f708a', 0.6) : top);
  g.addColorStop(1, rainy ? '#9babb2' : low);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const dark = hour < 6.5 || hour >= 20;
  // the sun or the moon, low and soft
  if (!rainy) {
    const sx = x + w * (0.15 + 0.7 * ((hour + 18) % 24) / 24), sy = y + h * 0.28;
    ctx.fillStyle = dark ? rgba(8, 0.9) : rgba(28, 0.85);
    ctx.fillRect(Math.round(sx) - 3, Math.round(sy) - 3, 6, 6);
    ctx.fillRect(Math.round(sx) - 2, Math.round(sy) - 4, 4, 8);
    ctx.fillRect(Math.round(sx) - 4, Math.round(sy) - 2, 8, 4);
  }
  // houses across the road
  const houses = [[0.0, 0.58, 0.28], [0.26, 0.5, 0.24], [0.48, 0.64, 0.3], [0.76, 0.54, 0.3]];
  for (const [hx, hy, hw] of houses) {
    const bx = x + Math.round(w * hx), by = y + Math.round(h * hy), bw = Math.round(w * hw);
    ctx.fillStyle = PALETTE[dark ? 1 : 5];
    ctx.fillRect(bx, by, bw, y + h - by);
    ctx.fillStyle = PALETTE[dark ? 0 : 2];
    ctx.fillRect(bx, by, bw, 2);
    // windows
    for (let wy = by + 6; wy < y + h - 14; wy += 10) {
      for (let wx = bx + 3; wx < bx + bw - 5; wx += 8) {
        const lit = dark ? (wx * 13 + wy * 7 + day) % 3 !== 0 : false;
        ctx.fillStyle = lit ? PALETTE[23] : PALETTE[dark ? 44 : 6];
        ctx.fillRect(wx, wy, 4, 5);
      }
    }
  }
  // the pavement and a street lamp
  ctx.fillStyle = PALETTE[dark ? 0 : 2];
  ctx.fillRect(x, y + h - 8, w, 8);
  const lx = x + Math.round(w * 0.7);
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(lx, y + h - 34, 2, 26);
  ctx.fillRect(lx - 2, y + h - 36, 6, 3);
  if (dark || rainy) {
    ctx.fillStyle = rgba(23, 0.22);
    ctx.beginPath();
    ctx.arc(lx + 1, y + h - 33, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE[23];
    ctx.fillRect(lx - 1, y + h - 33, 4, 2);
  }
  // rain on the glass
  if (rainy) {
    ctx.fillStyle = rgba(8, 0.45);
    for (let i = 0; i < 26; i++) {
      const rx = x + ((i * 37.7) % w);
      const ry = y + (((time * (40 + (i % 5) * 9)) + i * 23) % h);
      ctx.fillRect(Math.round(rx), Math.round(ry), 1, 3);
    }
  }
  // reflections on the glass
  ctx.fillStyle = rgba(9, 0.12);
  ctx.fillRect(x + 4, y + 4, Math.round(w * 0.18), 2);
  ctx.fillRect(x + 4, y + 8, Math.round(w * 0.1), 1);
  // the frame: mullions, a sill, the painted wood
  const wood = PALETTE[36], woodDark = PALETTE[35], woodHi = PALETTE[37];
  ctx.fillStyle = woodDark;
  ctx.fillRect(x - 5, y - 5, w + 10, 5);
  ctx.fillRect(x - 5, y, 5, h);
  ctx.fillRect(x + w, y, 5, h);
  ctx.fillStyle = wood;
  ctx.fillRect(x - 4, y - 4, w + 8, 3);
  ctx.fillRect(x - 4, y, 3, h);
  ctx.fillRect(x + w + 1, y, 3, h);
  ctx.fillRect(x + Math.floor(w / 2) - 1, y, 3, h);
  ctx.fillRect(x, y + Math.floor(h * 0.45), w, 3);
  ctx.fillStyle = woodHi;
  ctx.fillRect(x - 4, y - 4, w + 8, 1);
  // the sill
  ctx.fillStyle = woodDark;
  ctx.fillRect(x - 9, y + h, w + 18, 7);
  ctx.fillStyle = wood;
  ctx.fillRect(x - 8, y + h, w + 16, 4);
  ctx.fillStyle = woodHi;
  ctx.fillRect(x - 8, y + h, w + 16, 1);
}

/** a round wall clock that keeps the game's time */
export function wallClock(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, minutes: number) {
  cx = Math.round(cx);
  cy = Math.round(cy);
  const disc = (rr: number, c: string) => {
    for (let y = -rr; y <= rr; y++) {
      const half = Math.floor(Math.sqrt(rr * rr - y * y));
      ctx.fillStyle = c;
      ctx.fillRect(cx - half, cy + y, half * 2 + 1, 1);
    }
  };
  disc(r + 2, PALETTE[0]);
  disc(r + 1, PALETTE[20]);
  disc(r, PALETTE[63]);
  ctx.fillStyle = PALETTE[2];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.sin(a) * (r - 2)), Math.round(cy - Math.cos(a) * (r - 2)), 1, 1);
  }
  const hand = (frac: number, len: number, c: string) => {
    const a = frac * Math.PI * 2;
    ctx.fillStyle = c;
    for (let s = 0; s <= len; s += 0.5) ctx.fillRect(Math.round(cx + Math.sin(a) * s), Math.round(cy - Math.cos(a) * s), 1, 1);
  };
  const h = (minutes / 60) % 12, m = minutes % 60;
  hand(h / 12, r * 0.5, PALETTE[0]);
  hand(m / 60, r * 0.8, PALETTE[0]);
  ctx.fillStyle = PALETTE[11];
  ctx.fillRect(cx, cy, 1, 1);
}
