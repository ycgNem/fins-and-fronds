// Procedural scape sprites: stones, driftwood, plants, corals, botanicals, decor and land, drawn
// from each item's shape and color ramps. Placeholders until PixelLab art lands (art/README.md);
// an imported sprite named `it:<id>` always wins (see sprites.ts).
//
// Every sprite is anchored at its bottom center, except floaters and hanging planters, which hang
// from their top center. Plants and soft corals have SWAY_FRAMES frames of gentle motion.
import { RAMP, type RampName } from '../../data/palette';
import type { ItemDef } from '../../data/types';
import { Rng } from '../../engine/rng';
import { Pix, shadeOf } from './pix';

export const SWAY_FRAMES = 4;

export interface ItemSprite {
  img: HTMLCanvasElement;
  /** anchor (bottom center, or top center for hanging things) in sprite pixels */
  ax: number;
  ay: number;
}

type Ramp = readonly number[];
const lt = (r: Ramp) => r[r.length - 1];
const md = (r: Ramp) => r[Math.floor((r.length - 1) / 2)];
const dk = (r: Ramp) => r[Math.min(1, r.length - 1)];
const deep = (r: Ramp) => r[0];

interface Ctx {
  px: Pix;
  rng: Rng;
  W: number;
  H: number;
  a: Ramp;
  b: Ramp;
  c: Ramp;
  frame: number;
  wilt: number;
  /** horizontal sway (px) at a height fraction 0 (base) .. 1 (top) */
  sway: (k: number, phase?: number) => number;
}

/** an organic blob lit from the upper left */
function blob(cx: Ctx, x0: number, y0: number, rx: number, ry: number, ramp: Ramp, rough = 0.18, flatBottom = true, seed = 0) {
  const { px, rng } = cx;
  const ph = [rng.range(0, 6), rng.range(0, 6), rng.range(0, 6)];
  const r = (ang: number) => 1 + rough * (Math.sin(ang * 3 + ph[0]) * 0.5 + Math.sin(ang * 5 + ph[1]) * 0.3 + Math.sin(ang * 9 + ph[2]) * 0.2);
  for (let y = Math.floor(y0 - ry * 1.3); y <= Math.ceil(y0 + ry * 1.3); y++)
    for (let x = Math.floor(x0 - rx * 1.3); x <= Math.ceil(x0 + rx * 1.3); x++) {
      const dx = (x + 0.5 - x0) / rx, dy = (y + 0.5 - y0) / ry;
      if (flatBottom && dy > 0.75) continue;
      const d = Math.hypot(dx, dy);
      if (d > r(Math.atan2(dy, dx))) continue;
      const v = 0.6 - dx * 0.28 - dy * 0.42 + (px.noise(x, y, seed) - 0.5) * 0.18;
      px.set(x, y, shadeOf(ramp, v, x, y));
    }
}

/** fill a closed polygon (even-odd) with a callback color */
function poly(px: Pix, pts: [number, number][], color: (x: number, y: number) => number) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of pts) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= y + 0.5 && y2 > y + 0.5) || (y2 <= y + 0.5 && y1 > y + 0.5)) xs.push(x1 + ((y + 0.5 - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++) px.set(x, y, color(x, y));
  }
}

/** a leaf blade from a base point along an angle, tapering, with a light midrib side */
function leaf(cx: Ctx, x: number, y: number, ang: number, len: number, wid: number, ramp: Ramp, phase = 0) {
  const { px } = cx;
  const n = Math.max(2, Math.ceil(len));
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const bend = cx.sway(k * (len / cx.H), phase);
    const lx = x + Math.cos(ang) * len * k + bend;
    const ly = y + Math.sin(ang) * len * k;
    const w = Math.max(0.5, wid * Math.sin(Math.min(1, k * 1.15) * Math.PI) * (1 - k * 0.2));
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let s = -w; s <= w; s += 0.5) {
      const v = s < 0 ? 0.75 : 0.4;
      px.set(lx + nx * s, ly + ny * s, shadeOf(ramp, v + (k - 0.5) * 0.2, Math.round(lx + nx * s), Math.round(ly + ny * s)));
    }
  }
}

function wiltRamp(cx: Ctx, r: Ramp, x: number, y: number): Ramp {
  return cx.wilt > 0.2 && cx.px.noise(x, y, 77) < cx.wilt * 0.7 ? RAMP.olive : r;
}

// ---------------------------------------------------------------- stones

function stone(cx: Ctx, shape: string) {
  const { px, rng, W, H, a, b } = cx;
  const base = H - 1;
  switch (shape) {
    case 'boulder':
      blob(cx, W / 2, base - H * 0.42, W * 0.46, H * 0.55, a, 0.1);
      break;
    case 'pebbles': {
      const n = Math.max(3, Math.round(W / 6));
      for (let i = 0; i < n; i++) {
        const r = rng.range(2, Math.max(2.5, H * 0.45));
        blob(cx, rng.range(r, W - r), base - r * 0.7, r * rng.range(1, 1.5), r, i % 2 ? b : a, 0.05);
      }
      break;
    }
    case 'jagged': case 'veined': case 'spire': {
      // a tilted mountain: one peak, a steep face and a long back, lit on the left facets
      const peak = shape === 'spire' ? 0.5 : rng.range(0.32, 0.62);
      const pts: [number, number][] = [[1, base + 1]];
      const steps = 9;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const d = Math.abs(t - peak) / Math.max(peak, 1 - peak);
        const top = H * (shape === 'spire' ? 1 - Math.pow(d, 0.7) : 1 - d * d * 0.85) * rng.range(0.85, 1);
        pts.push([1 + t * (W - 2), base - Math.max(2, top) + 1]);
      }
      pts.push([W - 1, base + 1]);
      const px0 = 1 + peak * (W - 2);
      poly(px, pts, (x, y) => {
        const side = x < px0 ? 0.68 : 0.3;
        const crack = Math.abs(((x - px0) * 0.35 + y * 0.2 + rng.range(0, 0.001)) % 7) < 0.7 ? -0.25 : 0;
        return shadeOf(a, side + crack + (px.noise(x, y, 3) - 0.5) * 0.2 - (y / H) * 0.15, x, y);
      });
      if (shape === 'veined') for (let i = 0; i < 3; i++) {
        let x = rng.range(W * 0.2, W * 0.8), y = base - rng.range(H * 0.1, H * 0.6);
        for (let k = 0; k < W * 0.5; k++) {
          x += 1;
          y += rng.range(-1, 1);
          if (px.has(x, y)) px.set(x, y, lt(b));
        }
      }
      break;
    }
    case 'holey': case 'porous': {
      blob(cx, W / 2, base - H * 0.42, W * 0.47, H * 0.58, a, 0.25);
      const holes = shape === 'porous' ? Math.round(W * H / 30) : Math.round(W * H / 90);
      for (let i = 0; i < holes; i++) {
        const x = rng.range(3, W - 3), y = rng.range(3, base - 2);
        if (!px.has(x, y)) continue;
        const r = shape === 'porous' ? 1 : rng.range(1.2, 2.6);
        px.ellipse(x, y, r, r * 0.8, deep(a));
        if (r > 1.5) px.set(x - 1, y - 1, lt(b));
      }
      break;
    }
    case 'slab': {
      for (let i = 0; i < 3; i++) {
        const w = W * (1 - i * 0.18) * rng.range(0.9, 1);
        const y = base - i * (H / 3);
        const x0 = (W - w) / 2 + rng.range(-2, 2);
        poly(px, [[x0, y], [x0 + 2, y - H / 3 + 1], [x0 + w - 2, y - H / 3 + 1], [x0 + w, y]], (x, yy) => shadeOf(a, yy < y - H / 3 + 3 ? 0.85 : 0.45 + (px.noise(x, yy, 4) - 0.5) * 0.2, x, yy));
      }
      break;
    }
    case 'strata': {
      blob(cx, W / 2, base - H * 0.45, W * 0.45, H * 0.58, a, 0.18);
      for (let y = 0; y < H; y++) if (Math.floor(y / 3) % 2 === 0) for (let x = 0; x < W; x++) if (px.has(x, y) && px.noise(x, y, 8) > 0.15) px.set(x, y, shadeOf(b, 0.5 + (px.noise(x, y, 9) - 0.5) * 0.4, x, y));
      break;
    }
    case 'banded': {
      blob(cx, W / 2, base - H * 0.42, W * 0.46, H * 0.56, a, 0.12);
      for (let y = 0; y < H; y++) {
        const band = Math.sin(y * 0.8 + Math.sin(y * 0.3) * 2);
        if (band > 0.55) for (let x = 0; x < W; x++) if (px.has(x, y)) px.set(x, y, shadeOf(b, 0.6 - (x / W) * 0.3, x, y));
      }
      break;
    }
    default:
      blob(cx, W / 2, base - H * 0.42, W * 0.46, H * 0.55, a, 0.15);
  }
  px.outline(0, true);
}

// ---------------------------------------------------------------- driftwood

function branch(cx: Ctx, x: number, y: number, ang: number, len: number, r: number, depth: number, spread: number, droop = 0) {
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  cx.px.stroke(x, y, ex, ey, r, Math.max(0.5, r * 0.6), md(cx.a));
  if (depth <= 0 || r < 0.6) return;
  const kids = cx.rng.int(1, 3);
  for (let i = 0; i < kids; i++) {
    const na = ang + cx.rng.range(-spread, spread) + droop;
    branch(cx, ex, ey, na, len * cx.rng.range(0.55, 0.8), r * 0.62, depth - 1, spread, droop);
  }
}

function wood(cx: Ctx, shape: string) {
  const { px, rng, W, H, a, b } = cx;
  const base = H - 1;
  switch (shape) {
    case 'branchy': case 'twiggy': {
      // spider wood and ghost wood: a root crown that splits into many thin, reaching branches
      const thick = shape === 'branchy' ? 2.2 : 1.6;
      const n = shape === 'branchy' ? 3 : 4;
      for (let i = 0; i < n; i++) branch(cx, W * rng.range(0.35, 0.6), base, -Math.PI / 2 + rng.range(-0.9, 0.9), H * rng.range(0.35, 0.5), thick, 3, 0.7);
      blob(cx, W / 2, base - 2, W * 0.14, 3, a, 0.2);
      break;
    }
    case 'chunk': case 'gnarl': {
      // mopani, Malaysian and bog oak: a heavy two-tone trunk lying down, with a branch or two
      const pts: [number, number][] = [];
      const n = 14;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push([2 + t * (W - 4), base - (H * 0.35 + Math.sin(t * Math.PI) * H * 0.35) * rng.range(0.85, 1.05)]);
      }
      pts.push([W - 2, base + 1], [2, base + 1]);
      poly(px, pts, (x, y) => shadeOf(a, 0.35 + (1 - y / H) * 0.45 + (px.noise(x >> 1, y, 5) - 0.5) * 0.25, x, y));
      if (shape === 'chunk') for (let i = 0; i < 6; i++) blob(cx, rng.range(W * 0.15, W * 0.85), rng.range(H * 0.4, base - 2), rng.range(2, 5), rng.range(1.5, 3), b, 0.3, false);
      else {
        branch(cx, W * 0.7, base - H * 0.5, -Math.PI / 2 + 0.5, H * 0.55, 2.4, 2, 0.5);
        branch(cx, W * 0.3, base - H * 0.5, -Math.PI / 2 - 0.4, H * 0.45, 2, 1, 0.5);
      }
      for (let i = 0; i < 4; i++) {
        const x = rng.range(W * 0.2, W * 0.8), y = rng.range(H * 0.5, base - 2);
        if (px.has(x, y)) px.ellipse(x, y, 1.5, 1, deep(a));
      }
      break;
    }
    case 'root': {
      // mangrove roots and redmoor: arching prop roots from a trunk high up down into the sand
      const top = H * 0.08;
      px.stroke(W / 2, top, W / 2 + rng.range(-3, 3), H * 0.45, 3, 2.4, md(a));
      const n = 6;
      for (let i = 0; i < n; i++) {
        const tx = (i + 0.5) * (W / n) + rng.range(-2, 2);
        let x = W / 2, y = H * 0.35 + rng.range(0, H * 0.15);
        const steps = 12;
        for (let k = 1; k <= steps; k++) {
          const t = k / steps;
          const nx = W / 2 + (tx - W / 2) * Math.sin(t * Math.PI / 2);
          const ny = H * 0.35 + (base - H * 0.35) * (t * t);
          px.stroke(x, y, nx, ny, 1.8 - t * 0.7, 1.8 - t * 0.7, md(a));
          x = nx;
          y = ny;
        }
      }
      for (let i = 0; i < 3; i++) branch(cx, W / 2, top + 2, -Math.PI / 2 + rng.range(-0.9, 0.9), H * 0.12, 1.4, 1, 0.6);
      break;
    }
    case 'tube': {
      // cholla: a hollow skeleton tube full of diamond holes
      for (let x = 1; x < W - 1; x++) for (let y = base - H + 2; y <= base; y++) {
        const v = 0.4 + (1 - (y - (base - H)) / H) * 0.4;
        px.set(x, y, shadeOf(a, v, x, y));
      }
      for (let x = 3; x < W - 3; x += 4) for (let y = base - H + 4; y < base - 1; y += 4) {
        const ox = (Math.floor(y / 4) % 2) * 2;
        px.ellipse(x + ox, y, 1.2, 1, deep(a));
      }
      break;
    }
    case 'tree': {
      // bonsai driftwood: a twisting trunk and spreading upper branches ready for moss
      let x = W / 2, y = base;
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const nx = W / 2 + Math.sin(i * 0.9 + rng.range(0, 0.5)) * W * 0.12, ny = base - ((i + 1) / steps) * H * 0.6;
        px.stroke(x, y, nx, ny, 3.2 - i * 0.2, 3 - i * 0.2, md(a));
        x = nx;
        y = ny;
      }
      for (let i = 0; i < 5; i++) branch(cx, x, y, -Math.PI / 2 + (i - 2) * 0.55, H * rng.range(0.22, 0.32), 1.6, 2, 0.4, 0.15);
      for (const s of [-1, 1]) px.stroke(W / 2, base, W / 2 + s * W * 0.25, base, 2.2, 1, md(a));
      break;
    }
    case 'arch': {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const x = 3 + t * (W - 6), y = base - Math.sin(t * Math.PI) * (H - 4);
        px.ellipse(x, y, 2.6, 2.6, md(a));
      }
      break;
    }
    case 'bark': {
      // cork bark: a curled flat with deep furrows
      for (let y = 0; y < H; y++) {
        const w = W * (0.35 + 0.1 * Math.sin(y * 0.15));
        const off = Math.sin(y * 0.08) * W * 0.12;
        for (let x = -w; x <= w; x++) {
          const xx = W / 2 + x + off;
          const furrow = Math.sin(x * 1.3 + px.noise(Math.round(xx), y >> 2, 6) * 3) > 0.6;
          px.set(xx, y, furrow ? deep(a) : shadeOf(a, 0.5 - x / w * 0.25, Math.round(xx), y));
        }
      }
      break;
    }
    default:
      blob(cx, W / 2, base - H * 0.4, W * 0.45, H * 0.5, a);
  }
  px.rim(lt(a), dk(a));
  px.outline(0, true);
}

// ---------------------------------------------------------------- plants

function plant(cx: Ctx, shape: string) {
  const { px, rng, W, H, a, b } = cx;
  const base = H - 1;
  const leafC = (x: number, y: number, v: number) => shadeOf(wiltRamp(cx, a, x, y), v, x, y);
  switch (shape) {
    case 'carpet': {
      for (let x = 1; x < W - 1; x++) {
        const h = Math.max(1, Math.round(H * (0.6 + px.noise(x, 0, 2) * 0.4)));
        for (let y = 0; y < h; y++) if (px.noise(x, y, 3) > 0.15 || y === 0) px.set(x + (y === h - 1 ? Math.round(cx.sway(0.3, x)) : 0), base - y, leafC(x, y, 0.35 + (y / h) * 0.55));
      }
      break;
    }
    case 'tuft': {
      const n = Math.round(W * 0.8);
      for (let i = 0; i < n; i++) {
        const x = rng.range(1, W - 1), h = H * rng.range(0.5, 1);
        for (let y = 0; y < h; y++) px.set(x + cx.sway(y / H, i) + (y / h) * rng.range(-1, 1), base - y, leafC(Math.round(x), y, 0.35 + (y / h) * 0.55));
      }
      break;
    }
    case 'grass': case 'ribbon': case 'blades': {
      // vallisneria, sagittaria, seagrass: long blades from the base, bending with the current
      const n = shape === 'ribbon' ? Math.max(5, Math.round(W / 2)) : Math.max(4, Math.round(W / 2.5));
      const wid = shape === 'blades' ? 1.2 : shape === 'ribbon' ? 0.9 : 0.6;
      for (let i = 0; i < n; i++) {
        const x0 = W / 2 + rng.range(-W * 0.25, W * 0.25);
        const len = H * rng.range(0.55, 1);
        const lean = rng.range(-0.25, 0.25);
        for (let y = 0; y < len; y++) {
          const k = y / len;
          const x = x0 + lean * y + cx.sway(k * (len / H), i * 0.7) * 1.4 + (shape === 'ribbon' ? Math.sin(k * 6 + i) * 0.6 : 0);
          for (let s = -wid; s <= wid; s += 0.5) px.set(x + s, base - y, leafC(Math.round(x + s), y, (s < 0 ? 0.7 : 0.4) + k * 0.2));
        }
        if (b !== a && shape === 'grass' && i % 3 === 0) px.set(x0 + lean * len + cx.sway(1, i * 0.7), base - len, md(b));
      }
      break;
    }
    case 'rosette': case 'crypt': case 'bromeliad': {
      // amazon sword, crypts and bromeliads: leaves fanning out from one crown
      const n = shape === 'crypt' ? 7 : shape === 'bromeliad' ? 9 : 9;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const ang = -Math.PI / 2 + (t - 0.5) * (shape === 'bromeliad' ? 2.2 : 1.9);
        const len = H * (shape === 'crypt' ? 0.75 : 0.95) * (1 - Math.abs(t - 0.5) * 0.6) * rng.range(0.85, 1);
        const wid = shape === 'crypt' ? W * 0.13 : shape === 'bromeliad' ? W * 0.07 : W * 0.09;
        const ramp = b !== a && (shape === 'crypt' ? i % 2 === 0 : shape === 'bromeliad' ? Math.abs(t - 0.5) < 0.2 : i % 3 === 0) ? b : a;
        leaf(cx, W / 2, base, ang, len, wid, ramp, i);
      }
      break;
    }
    case 'stem': {
      // stem plants: a few upright stems with leaf pairs at each node, red tops if red
      const n = Math.max(2, Math.round(W / 4));
      for (let i = 0; i < n; i++) {
        const x0 = W / 2 + (i - (n - 1) / 2) * 3 + rng.range(-1, 1);
        const len = H * rng.range(0.75, 1);
        for (let y = 0; y < len; y++) {
          const k = y / len;
          const x = x0 + cx.sway(k * (len / H), i);
          px.set(x, base - y, dk(a));
          if (y % 3 === 0 && y > 1) {
            const top = k > 0.7 && b !== a;
            const ramp = top ? b : wiltRamp(cx, a, Math.round(x), y);
            const ll = 2 + (y % 6 === 0 ? 1 : 0);
            for (let s = 1; s <= ll; s++) {
              px.set(x - s, base - y - (s > 1 ? 1 : 0), shadeOf(ramp, 0.75, Math.round(x) - s, y));
              px.set(x + s, base - y - (s > 1 ? 1 : 0), shadeOf(ramp, 0.45, Math.round(x) + s, y));
            }
          }
        }
      }
      break;
    }
    case 'anubias': {
      px.stroke(1, base - 1, W - 1, base - 1, 1.2, 1.2, md(RAMP.olive));
      const n = Math.max(3, Math.round(W / 3));
      for (let i = 0; i < n; i++) {
        const x = 2 + (i / (n - 1)) * (W - 4);
        const ang = -Math.PI / 2 + rng.range(-0.7, 0.7);
        const len = H * rng.range(0.5, 0.85);
        px.line(x, base - 1, x + Math.cos(ang) * len * 0.4, base - 1 + Math.sin(ang) * len * 0.4, dk(a));
        const lx = x + Math.cos(ang) * len * 0.65 + cx.sway(0.4, i), ly = base + Math.sin(ang) * len * 0.65;
        px.ellipse(lx, ly, Math.max(1.5, W * 0.12), Math.max(1.2, len * 0.32), i % 2 && b !== a ? md(b) : md(a));
        px.ellipse(lx - 0.5, ly - 0.5, Math.max(0.8, W * 0.06), Math.max(0.8, len * 0.18), lt(a));
      }
      break;
    }
    case 'fern': {
      px.stroke(W * 0.2, base - 1, W * 0.8, base - 1, 1, 1, md(RAMP.brown));
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const ang = -Math.PI / 2 + (t - 0.5) * 1.5 + rng.range(-0.15, 0.15);
        leaf(cx, W * (0.25 + t * 0.5), base - 1, ang, H * rng.range(0.65, 0.95), Math.max(1, W * 0.06), a, i);
      }
      break;
    }
    case 'moss': {
      const n = Math.round(W * H * 0.6);
      for (let i = 0; i < n; i++) {
        const x = rng.range(1, W - 1), y = base - Math.abs(rng.range(-1, 1) * rng.range(0, 1)) * H;
        const d = Math.abs(x - W / 2) / (W / 2);
        if ((base - y) / H > 1 - d * d) continue;
        px.set(x + cx.sway((base - y) / H, x) * 0.5, y, leafC(Math.round(x), Math.round(y), 0.3 + ((base - y) / H) * 0.6 + rng.range(-0.1, 0.1)));
      }
      break;
    }
    case 'ball': {
      for (let i = 0; i < W * H * 1.5; i++) {
        const ang = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * W * 0.48;
        const x = W / 2 + Math.cos(ang) * r, y = base - H / 2 + Math.sin(ang) * r;
        px.set(x, y, shadeOf(a, 0.65 - Math.cos(ang) * 0.15 * (r / W) - Math.sin(ang) * 0.3 * (r / W) * 2, Math.round(x), Math.round(y)));
      }
      break;
    }
    case 'floater': {
      // floaters hang from the surface: pads on top, a beard of roots below
      const n = Math.max(3, Math.round(W / 5));
      for (let i = 0; i < n; i++) {
        const x = rng.range(3, W - 3), r = rng.range(1.5, Math.max(1.6, Math.min(4, H * 0.5)));
        const rootLen = H * rng.range(0.8, 1.6);
        for (let y = 0; y < rootLen; y++) px.set(x + Math.sin(y * 0.4 + i + cx.frame) * 0.6, 2 + y, shadeOf(RAMP.taupe, 0.6, Math.round(x), y), 170);
        px.ellipse(x, 1.5, r, 1.4, i % 2 && b !== a ? md(b) : md(a));
        px.set(x - 1, 1, lt(a));
      }
      break;
    }
    case 'lily': {
      // bulb plants: broad underwater leaves on long stems, a few pads up high
      px.ellipse(W / 2, base - 1, 2.5, 1.6, md(RAMP.brown));
      const n = 6;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const len = H * rng.range(0.4, 0.95);
        const x1 = W / 2 + (t - 0.5) * W * 0.8 + cx.sway(len / H, i);
        const y1 = base - len;
        px.line(W / 2, base - 1, x1, y1, dk(b !== a && i % 2 ? b : a));
        const ramp = b !== a && i % 2 ? b : a;
        px.ellipse(x1, y1, Math.max(2, W * 0.16), Math.max(1.5, W * 0.1), md(ramp));
        px.ellipse(x1 - 1, y1 - 0.5, Math.max(1, W * 0.08), Math.max(1, W * 0.05), lt(ramp));
      }
      break;
    }
    case 'leafy': {
      // emersed and compact plants: heart-shaped leaves on short stems
      const n = Math.max(4, Math.round((W * H) / 40));
      for (let i = 0; i < n; i++) {
        const x = W / 2 + rng.range(-W * 0.35, W * 0.35), y = base - rng.range(H * 0.15, H * 0.9);
        px.line(W / 2, base, x, y, dk(a));
        const ramp = b !== a && i % 3 === 0 ? b : a;
        const r = Math.max(1.5, Math.min(W, H) * 0.14);
        const sx = x + cx.sway((base - y) / H, i);
        px.ellipse(sx, y, r, r * 0.8, md(wiltRamp(cx, ramp, Math.round(sx), Math.round(y))));
        px.set(sx - 1, y - 1, lt(ramp));
      }
      break;
    }
    case 'chaeto': {
      for (let i = 0; i < W * 4; i++) {
        let x = rng.range(2, W - 2), y = base - rng.range(1, H - 1);
        for (let k = 0; k < 6; k++) {
          x += rng.range(-1, 1);
          y += rng.range(-1, 1);
          const d = Math.hypot((x - W / 2) / (W / 2), (y - (base - H / 2)) / (H / 2));
          if (d < 1) px.set(x, y, shadeOf(a, 0.3 + rng.range(0, 0.6), Math.round(x), Math.round(y)));
        }
      }
      break;
    }
    case 'grape': {
      px.stroke(1, base - 1, W - 1, base - 1, 0.8, 0.8, dk(a));
      for (let i = 0; i < W / 3; i++) {
        const x = 2 + i * 3, h = H * rng.range(0.4, 1);
        px.line(x, base - 1, x + cx.sway(0.5, i), base - h, dk(a));
        for (let y = 2; y < h; y += 2) px.ellipse(x + cx.sway(y / H, i) + (y % 4 ? 1 : -1), base - y, 1, 1, md(a));
      }
      break;
    }
    case 'redweed': {
      for (let i = 0; i < 5; i++) branch(cx, W / 2, base, -Math.PI / 2 + rng.range(-0.8, 0.8), H * 0.45, 1.2, 2, 0.6);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px.has(x, y)) px.set(x + cx.sway((base - y) / H), y, shadeOf(a, 0.3 + (1 - y / H) * 0.6, x, y));
      break;
    }
    case 'brush': {
      px.stroke(W / 2, base, W / 2, base - H * 0.55, 0.8, 0.8, md(RAMP.sand));
      for (let i = 0; i < 30; i++) {
        const ang = -Math.PI / 2 + rng.range(-0.9, 0.9);
        const l = H * rng.range(0.25, 0.45);
        px.line(W / 2, base - H * 0.5, W / 2 + Math.cos(ang) * l * 0.6 + cx.sway(1), base - H * 0.5 + Math.sin(ang) * l, shadeOf(a, rng.range(0.3, 0.9), i, 0));
      }
      break;
    }
    case 'kelp': {
      // a tall stipe swaying in the surge, blades along it and gas floats at their bases
      const stipes = 2;
      for (let s = 0; s < stipes; s++) {
        const x0 = W / 2 + (s - 0.5) * 6;
        let prevX = x0;
        for (let y = 0; y < H; y++) {
          const k = y / H;
          const x = x0 + cx.sway(k, s) * 3 + Math.sin(k * 5 + s) * 2;
          px.stroke(prevX, base - y + 1, x, base - y, 0.8, 0.8, dk(a));
          prevX = x;
          if (y > 8 && y % 9 === s * 4) {
            const dir = (y / 9) % 2 ? 1 : -1;
            px.ellipse(x + dir * 1.5, base - y, 1.2, 1.2, md(b));
            for (let l = 0; l < W * 0.4; l++) px.set(x + dir * (2 + l), base - y - l * 0.5 + Math.sin(l * 0.6 + cx.frame) * 0.8, shadeOf(a, 0.4 + (1 - l / (W * 0.4)) * 0.4, Math.round(x) + l, y));
          }
        }
      }
      for (let i = 0; i < 4; i++) branch(cx, W / 2, base, -Math.PI / 2 + (i - 1.5) * 0.6, 4, 1, 0, 0.3);
      break;
    }
    default:
      leaf(cx, W / 2, base, -Math.PI / 2, H, W * 0.2, a);
  }
  px.outline(deep(a), true);
}

// ---------------------------------------------------------------- corals and anemones

function coral(cx: Ctx, shape: string) {
  const { px, rng, W, H, a, b, frame } = cx;
  const base = H - 1;
  const pulse = Math.sin((frame / 4) * Math.PI * 2);
  switch (shape) {
    case 'branching': {
      for (let i = 0; i < 4; i++) branch(cx, W / 2 + rng.range(-2, 2), base, -Math.PI / 2 + rng.range(-0.8, 0.8), H * 0.4, 1.6, 2, 0.55);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px.has(x, y)) px.set(x, y, shadeOf(a, 0.3 + (1 - y / H) * 0.6, x, y));
      for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) if (px.has(x, y) && !px.has(x, y - 1)) px.set(x, y, lt(b));
      break;
    }
    case 'plate': {
      const tiers = Math.max(1, Math.round(H / 3));
      for (let i = 0; i < tiers; i++) {
        const y = base - i * 3;
        const w = W * (0.5 + 0.5 * (i / Math.max(1, tiers - 1))) * rng.range(0.85, 1);
        px.ellipse(W / 2 + rng.range(-1, 1), y - 1, w / 2, 1.6, md(a));
        px.line(W / 2 - w / 2 + 1, y - 2, W / 2 + w / 2 - 1, y - 2, lt(b));
      }
      break;
    }
    case 'dome': {
      blob(cx, W / 2, base - H * 0.45, W * 0.48, H * 0.62, a, 0.06);
      // brain coral grooves and favia cups
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (!px.has(x, y)) continue;
        const groove = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2.2) > 0.65;
        if (groove) px.set(x, y, md(b));
      }
      break;
    }
    case 'polyps': case 'mat': {
      for (let x = 1; x < W - 1; x++) px.set(x, base, dk(a));
      const n = Math.round(W / 2.2);
      for (let i = 0; i < n; i++) {
        const x = 1.5 + i * 2.2, h = Math.max(1, H * rng.range(0.4, 1) * (0.8 + pulse * 0.1));
        px.line(x, base, x, base - h + 1, md(a));
        px.ellipse(x, base - h, shape === 'mat' ? 0.8 + pulse * 0.4 : 1.2, 0.9, i % 2 ? md(b) : lt(b));
        px.set(x, base - h, lt(a));
      }
      break;
    }
    case 'mushroom': {
      const n = Math.max(2, Math.round(W / 5));
      for (let i = 0; i < n; i++) {
        const x = W / 2 + (i - (n - 1) / 2) * 4, y = base - rng.range(1, H * 0.6);
        px.ellipse(x, y, 2.6, 1.4, i % 2 ? md(b) : md(a));
        px.set(x, y, lt(a));
        px.set(x - 1, y - 1, lt(b));
      }
      break;
    }
    case 'toadstool': {
      px.stroke(W / 2, base, W / 2, base - H * 0.5, W * 0.12, W * 0.1, md(a));
      px.ellipse(W / 2, base - H * 0.6, W * 0.46, H * 0.25, md(a));
      for (let i = 0; i < W * 1.5; i++) {
        const x = W / 2 + rng.range(-W * 0.44, W * 0.44), y = base - H * 0.62 - rng.range(0, H * 0.25) * (1 + pulse * 0.15);
        px.set(x, y, lt(b));
      }
      break;
    }
    case 'tentacles': {
      // torch, hammer, frogspawn, duncan: a skeleton cup with fleshy swaying tentacles
      px.ellipse(W / 2, base - 1, W * 0.25, 1.5, md(RAMP.bone));
      const n = Math.round(W * 0.9);
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.4;
        const len = H * rng.range(0.6, 0.95) * (0.92 + pulse * 0.08);
        let x = W / 2, y = base - 2;
        for (let k = 0; k < len; k++) {
          x += Math.cos(ang) * 0.9 + cx.sway(k / H, i) * 0.15;
          y += Math.sin(ang) * 0.9;
          px.set(x, y, shadeOf(a, 0.4 + (k / len) * 0.3, Math.round(x), Math.round(y)));
        }
        px.ellipse(x, y, 1, 1, md(b));
      }
      break;
    }
    case 'bubbles': {
      for (let i = 0; i < W * 0.8; i++) {
        const x = rng.range(W * 0.15, W * 0.85), y = base - rng.range(1, H * 0.85);
        const r = rng.range(1.2, 2.4) * (0.9 + pulse * 0.1);
        px.ellipse(x, y, r, r, md(a));
        px.set(x - r * 0.4, y - r * 0.4, lt(a));
      }
      break;
    }
    case 'fan': {
      px.stroke(W / 2, base, W / 2, base - 4, 1.2, 1, md(a));
      for (let i = 0; i < 14; i++) branch(cx, W / 2, base - 3, -Math.PI / 2 + (i / 13 - 0.5) * 2.2, H * 0.35, 0.8, 2, 0.25);
      for (let y = 0; y < H; y += 3) for (let x = 0; x < W; x++) if (px.has(x, y + 1) && px.has(x, y - 1)) px.set(x + cx.sway(1 - y / H) * 0.5, y, md(b));
      break;
    }
    case 'anemone': {
      // a column (foot hidden in the rock) under a crown of swaying tentacles; bubble tips if green/red
      px.ellipse(W / 2, base - 1, W * 0.22, 2, md(b));
      const n = Math.round(W * 1.2);
      for (let i = 0; i < n; i++) {
        const ang = -Math.PI / 2 + (i / (n - 1) - 0.5) * 2.8;
        const len = H * rng.range(0.55, 1) * (0.9 + pulse * 0.1);
        let x = W / 2, y = base - 2;
        for (let k = 0; k < len; k++) {
          x += Math.cos(ang) * 0.85 + cx.sway(k / H, i) * 0.12;
          y += Math.sin(ang) * 0.85;
          px.set(x, y, shadeOf(a, 0.35 + (k / len) * 0.5, Math.round(x), Math.round(y)));
        }
        if (cx.rng.chance(0.5)) px.set(x, y, lt(b));
      }
      break;
    }
    case 'clam': {
      px.ellipse(W / 2, base - H * 0.35, W * 0.48, H * 0.4, md(RAMP.bone));
      for (let x = 1; x < W - 1; x++) {
        const y = base - H * 0.55 + Math.sin(x * 1.1) * 1.2;
        for (let k = 0; k < H * 0.35; k++) px.set(x, y + k, shadeOf(px.noise(x >> 1, k, 4) > 0.5 ? a : b, 0.4 + px.noise(x, k, 5) * 0.5, x, k));
      }
      break;
    }
    case 'duster': {
      px.stroke(W / 2, base, W / 2, base - H * 0.5, 0.8, 0.8, md(a));
      for (let i = 0; i < 9; i++) {
        const ang = -Math.PI / 2 + (i / 8 - 0.5) * 2.6;
        const l = H * 0.45 * (0.9 + pulse * 0.1);
        px.line(W / 2, base - H * 0.5, W / 2 + Math.cos(ang) * l, base - H * 0.5 + Math.sin(ang) * l * 0.8, i % 2 ? lt(b) : md(b));
      }
      break;
    }
    case 'xenia': {
      for (let i = 0; i < 4; i++) {
        const x = W / 2 + (i - 1.5) * 3, h = H * rng.range(0.5, 0.75);
        px.stroke(x, base, x + cx.sway(0.5, i), base - h, 1, 0.8, md(a));
        const open = (frame + i) % 4 < 2 ? 1 : 0.5;
        for (let p = 0; p < 6; p++) {
          const ang = (p / 6) * Math.PI * 2;
          px.line(x + cx.sway(0.5, i), base - h, x + Math.cos(ang) * 2.5 * open + cx.sway(0.5, i), base - h + Math.sin(ang) * 2 * open, lt(b));
        }
      }
      break;
    }
    case 'sun': {
      for (let i = 0; i < 5; i++) {
        const x = W * 0.2 + i * W * 0.15, y = base - rng.range(1, H * 0.5);
        px.ellipse(x, y, 1.8, 1.8, md(a));
        if (cx.frame % 2 === 0) for (let p = 0; p < 6; p++) {
          const ang = (p / 6) * Math.PI * 2;
          px.set(x + Math.cos(ang) * 2.5, y + Math.sin(ang) * 2.5, lt(b));
        }
      }
      break;
    }
    case 'tree_coral': {
      for (let i = 0; i < 3; i++) branch(cx, W / 2, base, -Math.PI / 2 + (i - 1) * 0.45, H * 0.4, 1.8, 2, 0.5, 0);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px.has(x, y)) px.set(x + cx.sway(1 - y / H, x * 0.1), y, shadeOf(a, 0.35 + (1 - y / H) * 0.5, x, y));
      for (let i = 0; i < W * 2; i++) {
        const x = rng.range(0, W), y = rng.range(0, H * 0.6);
        if (px.has(x, y + 1)) px.set(x, y, md(b));
      }
      break;
    }
    case 'rods': {
      for (let i = 0; i < 5; i++) {
        const x0 = W / 2 + (i - 2) * 3;
        const h = H * rng.range(0.6, 1);
        px.stroke(x0, base, x0 + (i - 2) * 1.2 + cx.sway(1, i), base - h, 1.2, 0.9, md(a));
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px.has(x, y) && px.noise(x, y, 6) < 0.3) px.set(x, y, lt(b));
      break;
    }
    default:
      blob(cx, W / 2, base - H * 0.4, W * 0.45, H * 0.5, a);
  }
  px.outline(deep(a), true);
}

// ---------------------------------------------------------------- botanicals, decor and land

function decor(cx: Ctx, shape: string) {
  const { px, rng, W, H, a, b } = cx;
  const base = H - 1;
  switch (shape) {
    case 'leaves': {
      for (let i = 0; i < 4; i++) {
        const x = rng.range(5, W - 5), y = base - rng.range(0, H - 2);
        const ramp = i % 2 ? b : a;
        px.ellipse(x, y, rng.range(4, 6), 1.4, md(ramp));
        px.line(x - 4, y, x + 4, y, dk(ramp));
      }
      break;
    }
    case 'cones': {
      for (let i = 0; i < 4; i++) {
        const x = rng.range(3, W - 3);
        px.ellipse(x, base - 2, 1.8, 2.2, md(a));
        px.set(x, base - 3, lt(a));
        px.set(x - 1, base - 1, deep(a));
      }
      break;
    }
    case 'pods': {
      for (let i = 0; i < 3; i++) {
        const x = 4 + i * (W - 8) / 2;
        px.ellipse(x, base - 3, 3, 2.6, md(i % 2 ? b : a));
        px.ellipse(x, base - 3, 1.2, 1, deep(a));
      }
      break;
    }
    case 'coconut': {
      for (let y = 0; y < H; y++) {
        const w = Math.sqrt(Math.max(0, 1 - Math.pow((H - y) / H, 2))) * W * 0.48;
        for (let x = -w; x <= w; x++) px.set(W / 2 + x, base - (H - 1 - y), shadeOf(a, 0.3 + (1 - y / H) * 0.3 + (px.noise(Math.round(x), y, 2) - 0.5) * 0.3, Math.round(x), y));
      }
      px.ellipse(W / 2, base - 1, W * 0.18, H * 0.35, 0);
      break;
    }
    case 'shells': {
      for (let i = 0; i < 4; i++) {
        const x = 4 + i * (W - 8) / 3;
        px.ellipse(x, base - 2, 2.6, 2.2, md(a));
        px.ellipse(x - 0.5, base - 2.5, 1.2, 1, lt(a));
        px.set(x + 1.5, base - 1, 0);
      }
      break;
    }
    case 'chest': {
      px.rect(1, base - H * 0.55, W - 2, H * 0.55, md(a));
      px.ellipse(W / 2, base - H * 0.55, W / 2 - 1, H * 0.3, md(a));
      px.rect(1, base - H * 0.55, W - 2, 1, md(b));
      px.rect(W / 2 - 1, base - H * 0.5, 2, 3, lt(b));
      for (let x = 3; x < W - 2; x += 4) px.line(x, base - H * 0.5, x, base, dk(a));
      px.rim(lt(a), deep(a));
      break;
    }
    case 'ship': {
      // a sunken galleon on its side: hull, a snapped mast, gun ports
      const pts: [number, number][] = [[2, base - H * 0.5], [W - 2, base - H * 0.6], [W * 0.85, base], [W * 0.12, base]];
      poly(px, pts, (x, y) => shadeOf(a, 0.3 + (px.noise(x >> 2, y, 3) - 0.5) * 0.3 + (1 - y / H) * 0.3, x, y));
      for (let x = 6; x < W - 6; x += 5) px.rect(x, base - H * 0.35, 2, 2, 0);
      px.stroke(W * 0.45, base - H * 0.5, W * 0.6, 2, 1.4, 1, md(a));
      px.line(W * 0.45, base - H * 0.75, W * 0.8, base - H * 0.65, md(b));
      break;
    }
    case 'castle': {
      px.rect(3, base - H * 0.6, W - 6, H * 0.6, md(a));
      for (const tx of [1, W - 8]) {
        px.rect(tx, base - H + 4, 7, H - 4, md(a));
        for (let k = 0; k < 3; k++) px.rect(tx + k * 3, base - H + 2, 1.5, 2, md(a));
      }
      px.rect(W / 2 - 3, base - 8, 6, 8, 0);
      px.ellipse(W / 2, base - 8, 3, 2, 0);
      px.rect(tx(W), base - H * 0.4, 2, 2, md(b));
      px.rim(lt(a), dk(a));
      break;
    }
    case 'columns': {
      for (let i = 0; i < 3; i++) {
        const x = 3 + i * (W - 6) / 2.2, h = H * (i === 1 ? 1 : rng.range(0.4, 0.7));
        px.rect(x, base - h, 6, h, md(a));
        px.rect(x - 1, base - h, 8, 2, lt(a));
        for (let k = 1; k < 3; k++) px.line(x + k * 2, base - h + 2, x + k * 2, base, dk(a));
      }
      px.rect(W * 0.55, base - 2, 10, 2, md(a));
      break;
    }
    case 'lantern': {
      px.rect(W / 2 - 2, base - H * 0.4, 4, H * 0.4, md(a));
      px.rect(W / 2 - 4, base - H * 0.62, 8, H * 0.22, md(a));
      px.rect(W / 2 - 2, base - H * 0.58, 4, H * 0.12, md(b));
      poly(px, [[1, base - H * 0.62], [W / 2, base - H], [W - 1, base - H * 0.62]], (x, y) => shadeOf(a, 0.6 - (x / W) * 0.3, x, y));
      px.rim(lt(a), dk(a));
      break;
    }
    case 'amphora': {
      for (let y = 0; y < H; y++) {
        const t = y / H;
        const w = t < 0.15 ? W * 0.18 : W * 0.48 * Math.sin(((t - 0.1) / 0.9) * Math.PI) + 1;
        for (let x = -w; x <= w; x++) px.set(W / 2 + x, y, shadeOf(a, 0.65 - (x / Math.max(1, w)) * 0.3, Math.round(x), y));
      }
      px.ellipse(W / 2, 1, W * 0.2, 1, 0);
      px.line(W / 2 - W * 0.18, 3, W / 2 - W * 0.4, H * 0.3, dk(a));
      px.line(W / 2 + W * 0.18, 3, W / 2 + W * 0.4, H * 0.3, dk(a));
      break;
    }
    case 'claycave': {
      blob(cx, W / 2, base - H * 0.4, W * 0.48, H * 0.55, a, 0.06);
      px.ellipse(W / 2, base - 1, W * 0.2, H * 0.3, 0);
      break;
    }
    case 'tubes': {
      for (let i = 0; i < 3; i++) {
        const y = base - 2 - i * 3, x0 = 2 + i * 2;
        px.rect(x0, y - 2, W - 4 - i * 3, 3, md(a));
        px.ellipse(x0, y - 0.5, 1, 1.5, 0);
      }
      break;
    }
    case 'clamshell': {
      px.ellipse(W / 2, base - 2, W * 0.45, 2.5, md(a));
      const open = cx.frame % 4 === 0 ? 4 : 1;
      poly(px, [[2, base - 3], [W / 2, base - 3 - H * 0.4 * (open / 4) - 2], [W - 2, base - 3]], (x, y) => shadeOf(a, 0.55 + Math.sin(x * 1.2) * 0.2, x, y));
      if (open > 2) px.ellipse(W / 2, base - 4, 1.5, 1.5, lt(RAMP.pearl));
      break;
    }
    case 'bridge': {
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        px.ellipse(2 + t * (W - 4), base - 3 - Math.sin(t * Math.PI) * (H - 6), 1.5, 1.5, md(a));
      }
      for (let x = 4; x < W - 3; x += 5) {
        const t = (x - 2) / (W - 4);
        const y = base - 3 - Math.sin(t * Math.PI) * (H - 6);
        px.line(x, y, x, y - 4, md(b));
      }
      px.line(4, base - 7, W - 4, base - 7 - (H - 6) * 0.2, md(b));
      break;
    }
    case 'bank': {
      // land: a mound of earth with a green or muddy top
      for (let x = 0; x < W; x++) {
        const t = x / W;
        const h = Math.max(2, H * (0.55 + 0.45 * Math.sin(t * Math.PI)) * (0.9 + px.noise(x, 0, 2) * 0.15));
        for (let y = 0; y < h; y++) {
          const top = y > h - 3;
          px.set(x, base - y, top ? shadeOf(b, 0.5 + px.noise(x, y, 3) * 0.4, x, y) : shadeOf(a, 0.3 + (y / h) * 0.4, x, y));
        }
      }
      break;
    }
    default:
      blob(cx, W / 2, base - H * 0.4, W * 0.45, H * 0.5, a);
  }
  px.outline(0, true);
}

const tx = (w: number) => Math.round(w * 0.2);

// ---------------------------------------------------------------- entry

/** Draw one item at a growth size and sway frame. Plants are drawn browner as health falls. */
export function drawItem(it: ItemDef, size: number, seed: number, frame: number, health = 1): ItemSprite {
  const W = Math.max(4, Math.round(it.w * size)) + 4;
  const H = Math.max(3, Math.round(it.h * size)) + 3;
  const colors = it.colors.length ? it.colors : (['slate'] as RampName[]);
  const a = RAMP[colors[0]], b = RAMP[colors[1] ?? colors[0]], c = RAMP[colors[2] ?? colors[1] ?? colors[0]];
  const swayPh = (frame / SWAY_FRAMES) * Math.PI * 2;
  const amp = it.plant?.kind === 'kelp' ? 2.5 : it.cat === 'plant' || it.coral?.sway ? 1.6 : 0.8;
  const cx: Ctx = {
    px: new Pix(W, H), rng: new Rng(seed), W, H, a, b, c, frame, wilt: 1 - health,
    sway: (k, phase = 0) => Math.sin(swayPh + phase * 0.9 + k * 1.5) * amp * k * k,
  };
  switch (it.cat) {
    case 'rock': stone(cx, it.shape); break;
    case 'wood': wood(cx, it.shape); break;
    case 'plant': plant(cx, it.shape); break;
    case 'coral': coral(cx, it.shape); break;
    default: decor(cx, it.shape);
  }
  const hangs = it.place === 'surface' || it.place === 'hang';
  return { img: cx.px.toCanvas(), ax: Math.round(W / 2), ay: hangs ? 0 : H - 1 };
}
