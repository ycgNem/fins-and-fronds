// Procedural creature sprites, generated from each species' body plan and colors. These are the
// stand-ins until PixelLab art lands (art/README.md); an imported sprite named `sp:<id>:<frame>`
// always wins (see sprites.ts). Every creature faces right; the renderer mirrors for left.
import { RAMP, type RampName } from '../../data/palette';
import type { Body, Look, SpeciesDef } from '../../data/types';
import { hash2 } from '../../engine/rng';
import { Pix, shadeOf } from './pix';

export const CREATURE_FRAMES = 4;

interface Colors {
  body: readonly number[];
  belly: readonly number[];
  fin: readonly number[];
  accent: readonly number[];
}

function colors(look: Look): Colors {
  const body = RAMP[look.body];
  return {
    body,
    belly: look.belly ? RAMP[look.belly] : body,
    fin: RAMP[(look.fin ?? look.body) as RampName],
    accent: RAMP[(look.accent ?? 'pearl') as RampName],
  };
}

const light = (r: readonly number[]) => r[r.length - 1];
const mid = (r: readonly number[]) => r[Math.floor((r.length - 1) / 2)];
const dark = (r: readonly number[]) => r[Math.min(1, r.length - 1)];

// ---------------------------------------------------------------- fish

interface FishPlan {
  aspect: number;
  peak: number;
  ped: number;
  tail: 'fork' | 'round' | 'fan' | 'long' | 'shark' | 'none' | 'point';
  dorsal: [number, number, number];
  anal: [number, number, number];
  eel?: boolean;
  bodyFrac?: number;
}

const PLANS: Partial<Record<Body, FishPlan>> = {
  torpedo: { aspect: 0.3, peak: 0.35, ped: 0.22, tail: 'fork', dorsal: [0.38, 0.55, 0.35], anal: [0.55, 0.75, 0.25] },
  slender: { aspect: 0.2, peak: 0.4, ped: 0.35, tail: 'round', dorsal: [0.4, 0.75, 0.3], anal: [0.55, 0.8, 0.2] },
  deep: { aspect: 0.48, peak: 0.42, ped: 0.2, tail: 'fork', dorsal: [0.3, 0.7, 0.3], anal: [0.5, 0.8, 0.25] },
  disc: { aspect: 0.9, peak: 0.45, ped: 0.12, tail: 'round', dorsal: [0.2, 0.85, 0.12], anal: [0.35, 0.85, 0.12] },
  angel: { aspect: 0.62, peak: 0.42, ped: 0.15, tail: 'fan', dorsal: [0.3, 0.6, 1.1], anal: [0.35, 0.65, 1.1] },
  cichlid: { aspect: 0.4, peak: 0.38, ped: 0.28, tail: 'round', dorsal: [0.25, 0.85, 0.22], anal: [0.55, 0.85, 0.22] },
  eel: { aspect: 0.11, peak: 0.3, ped: 0.6, tail: 'point', dorsal: [0.3, 1, 0.25], anal: [0.5, 1, 0.25], eel: true, bodyFrac: 0.95 },
  loach: { aspect: 0.17, peak: 0.35, ped: 0.55, tail: 'round', dorsal: [0.55, 0.7, 0.3], anal: [0.65, 0.8, 0.2], eel: true },
  knife: { aspect: 0.22, peak: 0.3, ped: 0.15, tail: 'point', dorsal: [0, 0, 0], anal: [0.25, 0.95, 0.35], eel: true, bodyFrac: 0.95 },
  cory: { aspect: 0.38, peak: 0.3, ped: 0.28, tail: 'fork', dorsal: [0.28, 0.45, 0.55], anal: [0.62, 0.75, 0.2] },
  pleco: { aspect: 0.28, peak: 0.25, ped: 0.3, tail: 'fork', dorsal: [0.25, 0.55, 0.4], anal: [0.6, 0.7, 0.1] },
  hatchet: { aspect: 0.55, peak: 0.35, ped: 0.15, tail: 'fork', dorsal: [0.6, 0.72, 0.25], anal: [0.55, 0.8, 0.15] },
  betta: { aspect: 0.3, peak: 0.35, ped: 0.35, tail: 'long', dorsal: [0.4, 0.8, 0.9], anal: [0.35, 0.85, 1.0] },
  fancy: { aspect: 0.62, peak: 0.42, ped: 0.25, tail: 'long', dorsal: [0.3, 0.6, 0.45], anal: [0.6, 0.75, 0.25], bodyFrac: 0.7 },
  koi: { aspect: 0.3, peak: 0.38, ped: 0.3, tail: 'fork', dorsal: [0.3, 0.65, 0.18], anal: [0.62, 0.75, 0.15] },
  puffer: { aspect: 0.62, peak: 0.45, ped: 0.25, tail: 'round', dorsal: [0.68, 0.78, 0.3], anal: [0.68, 0.78, 0.3] },
  round: { aspect: 0.75, peak: 0.5, ped: 0.25, tail: 'round', dorsal: [0.6, 0.75, 0.2], anal: [0.6, 0.75, 0.2] },
  goby: { aspect: 0.24, peak: 0.25, ped: 0.4, tail: 'round', dorsal: [0.3, 0.8, 0.45], anal: [0.55, 0.8, 0.3] },
  sculpin: { aspect: 0.36, peak: 0.2, ped: 0.3, tail: 'round', dorsal: [0.25, 0.8, 0.5], anal: [0.55, 0.8, 0.3] },
  mudskipper: { aspect: 0.28, peak: 0.2, ped: 0.35, tail: 'round', dorsal: [0.3, 0.75, 0.6], anal: [0.6, 0.8, 0.2] },
  tang: { aspect: 0.62, peak: 0.42, ped: 0.15, tail: 'fork', dorsal: [0.2, 0.85, 0.15], anal: [0.4, 0.85, 0.15] },
  shark: { aspect: 0.2, peak: 0.3, ped: 0.25, tail: 'shark', dorsal: [0.35, 0.45, 0.9], anal: [0.62, 0.68, 0.4] },
  arowana: { aspect: 0.22, peak: 0.3, ped: 0.4, tail: 'round', dorsal: [0.7, 0.9, 0.4], anal: [0.5, 0.92, 0.45] },
  lionfish: { aspect: 0.38, peak: 0.35, ped: 0.25, tail: 'fan', dorsal: [0.15, 0.75, 1.3], anal: [0.6, 0.75, 0.5] },
  flat: { aspect: 0.2, peak: 0.25, ped: 0.4, tail: 'round', dorsal: [0.4, 0.6, 0.2], anal: [0.4, 0.6, 0.1] },
  ray: { aspect: 0.16, peak: 0.4, ped: 0.1, tail: 'point', dorsal: [0, 0, 0], anal: [0, 0, 0], bodyFrac: 0.62 },
  pipefish: { aspect: 0.07, peak: 0.3, ped: 0.6, tail: 'fan', dorsal: [0.45, 0.6, 0.6], anal: [0, 0, 0] },
  gardeneel: { aspect: 0.08, peak: 0.3, ped: 0.6, tail: 'point', dorsal: [0, 0, 0], anal: [0, 0, 0], eel: true, bodyFrac: 1 },
};

function halfHeight(p: FishPlan, t: number): number {
  if (t < 0 || t > 1) return 0;
  if (t < p.peak) return Math.pow(Math.sin(((t / p.peak) * Math.PI) / 2), 0.6);
  const k = (t - p.peak) / (1 - p.peak);
  return p.ped + (1 - p.ped) * Math.pow(Math.cos((k * Math.PI) / 2), p.eel ? 0.4 : 0.9);
}

function fish(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const p = PLANS[s.body] ?? PLANS.torpedo!;
  const c = colors(s.look);
  const longFin = s.tags.includes('long_fin');
  const L = Math.max(6, Math.round(len));
  const bodyLen = L * (p.bodyFrac ?? (p.tail === 'long' ? 0.62 : 0.8));
  const H = Math.max(3, Math.round(L * p.aspect));
  const finScale = longFin ? 1.8 : 1;
  const finMax = Math.ceil(H * Math.max(p.dorsal[2], p.anal[2]) * 0.5 * finScale) + (p.tail === 'long' ? Math.ceil(H * 0.6) : 0);
  const W = L + 2, HH = H + finMax * 2 + 4;
  const cy = Math.floor(HH / 2);
  const px = new Pix(W, HH);
  const phase = (frame / CREATURE_FRAMES) * Math.PI * 2;
  const tailAmp = Math.max(1, Math.round(H * 0.12));
  const und = (x: number) => (p.eel ? Math.round(Math.sin((x / L) * Math.PI * 2.2 - phase) * Math.max(1, H * 0.35) * (x / L)) : 0);
  const pattern = s.look.pattern ?? 'plain';
  const seed = s.id.length * 7919 + s.cm * 13;
  const clear = !!s.look.clear;
  const bodyA = clear ? 120 : 255;

  // fins first, so the body paints over their roots
  const finColor = (x: number, y: number) => shadeOf(c.fin, 0.55 + (hash2(x, y, seed) - 0.5) * 0.2, x, y);
  const finA = clear ? 90 : longFin || p.tail === 'long' ? 215 : 235;
  for (let x = 1; x <= Math.floor(bodyLen); x++) {
    const t = x / bodyLen;
    const hh = halfHeight(p, t) * (H / 2);
    const u = und(x);
    for (const [fin, sign] of [[p.dorsal, -1], [p.anal, 1]] as const) {
      const [a, b, hgt] = fin;
      if (t < a || t > b || hgt <= 0) continue;
      const k = (t - a) / (b - a);
      const shape = Math.sin(k * Math.PI * (k < 0.3 ? 1 : 0.85)) * (1 - k * 0.3);
      const fh = Math.round(hgt * (H / 2) * finScale * shape);
      for (let d = 0; d <= fh; d++) px.set(x, cy + u + sign * Math.round(hh + d), finColor(x, d), finA);
    }
  }
  // tail
  const tx0 = Math.floor(bodyLen);
  const pedH = halfHeight(p, 1) * (H / 2);
  const tailLen = L - tx0;
  const tailDy = Math.round(Math.sin(phase) * tailAmp);
  for (let x = tx0; x <= L; x++) {
    const k = (x - tx0) / Math.max(1, tailLen);
    const u = und(x) + Math.round(tailDy * k);
    let top = 0, bot = 0, notch = -1;
    switch (p.tail) {
      case 'fork': top = bot = pedH + k * H * 0.45; notch = k * H * 0.28 * (k > 0.4 ? 1 : 0); break;
      case 'round': top = bot = pedH + Math.sin(k * Math.PI * 0.85) * H * 0.38; break;
      case 'fan': top = bot = pedH + k * H * 0.55; break;
      case 'long': top = bot = pedH + Math.sin(k * Math.PI * 0.7) * H * (0.9 + 0.2 * Math.sin(phase + k * 3)); break;
      case 'shark': top = pedH + k * H * 0.75; bot = pedH + Math.sin(k * Math.PI) * H * 0.2; break;
      case 'point': top = bot = pedH * (1 - k); break;
      case 'none': break;
    }
    for (let y = -Math.round(top); y <= Math.round(bot); y++) {
      if (notch >= 0 && Math.abs(y) < notch) continue;
      const tailCol = pattern === 'tail' && s.look.accent ? shadeOf(c.accent, 0.5, x, y) : finColor(x, y);
      px.set(x, cy + u + y, tailCol, finA);
    }
  }
  // body
  for (let x = 0; x <= Math.floor(bodyLen) + 1; x++) {
    const t = x / bodyLen;
    const hh = halfHeight(p, t) * (H / 2);
    if (hh <= 0.2) continue;
    const u = und(x);
    for (let y = -Math.round(hh); y <= Math.round(hh); y++) {
      const v = y / Math.max(1, hh); // -1 top .. 1 bottom
      let col: number;
      if (v > 0.35) col = shadeOf(c.belly, 0.75 + (v - 0.35) * 0.3, x, y);
      else col = shadeOf(c.body, 0.25 + (v + 1) * 0.33, x, y);
      // patterns
      const n = hash2(x, y, seed);
      const nn = hash2(Math.floor(x / 3), Math.floor(y / 3), seed + 5);
      switch (pattern) {
        case 'stripe': if (Math.abs(v + 0.05) < 0.22 && t > 0.12 && t < 0.95) col = s.look.accent ? mid(c.accent) : dark(c.body); break;
        case 'neon':
          if (v > -0.45 && v < -0.1 && t > 0.12 && t < 0.9) col = light(c.body);
          else if (v > 0.05 && t > 0.45 && s.look.accent) col = shadeOf(c.accent, 0.6, x, y);
          break;
        case 'bars': {
          const nb = L < 20 ? 3 : L < 50 ? 5 : 6;
          if (((t * nb + 0.15) % 1) < 0.26 && t > 0.08) col = s.look.accent ? dark(c.accent) : dark(c.body);
          break;
        }
        case 'tiger': if (Math.floor(t * L * 0.5) % 2 === 0 && t > 0.1) col = dark(c.accent); break;
        case 'spots': if (n < 0.13) col = light(c.accent); break;
        case 'dots': if (n < 0.08) col = light(c.accent); break;
        case 'saddle': if (v < 0 && Math.floor(t * 5) % 2 === 1) col = dark(c.accent); break;
        case 'split': if (t > 0.5 && v > -0.7) col = s.look.accent ? shadeOf(c.accent, 0.35 + (v + 1) * 0.2, x, y) : shadeOf(c.belly, 0.6, x, y); break;
        case 'calico': if (nn < 0.22) col = dark(c.accent); else if (nn > 0.8) col = light(RAMP.pearl); else if (nn > 0.62 && s.look.accent) col = mid(c.accent); break;
        case 'marble': if (nn < 0.3) col = dark(c.body); else if (nn > 0.78 && s.look.accent) col = mid(c.accent); break;
        case 'band': {
          for (const b of [0.2, 0.5, 0.82]) {
            const d = Math.abs(t - b);
            if (d < 0.05) col = light(RAMP.pearl);
            else if (d < 0.075) col = 0;
          }
          break;
        }
        case 'mask': if (t > 0.06 && t < 0.18) col = dark(c.accent); break;
        case 'tail': break;
        case 'glow': if (t > 0.08 && t < 0.2 && v > 0 && v < 0.6) col = light(c.accent); break;
        case 'plain': break;
      }
      px.set(x, cy + u + y, col, bodyA);
    }
    if (clear && hh > 1) px.set(x, cy + u, light(RAMP.pearl), 200);
  }
  // pectoral fin
  if (H >= 6 && !p.eel) {
    const ex = Math.round(bodyLen * 0.28);
    px.ellipse(ex, cy + Math.round(H * 0.12), Math.max(1, H * 0.16), Math.max(0.6, H * 0.07), mid(c.fin), finA);
  }
  // eye
  if (!s.look.blind) {
    const ex = Math.max(1, Math.round(bodyLen * (s.body === 'mudskipper' ? 0.12 : 0.11)));
    const ey = cy + und(ex) - Math.max(1, Math.round(H * (s.body === 'mudskipper' ? 0.42 : 0.14)));
    if (L >= 30) {
      px.rect(ex - 1, ey - 1, 2, 2, 0);
      px.set(ex - 1, ey - 1, 9);
    } else px.set(ex, ey, 0);
  }
  px.outline(0);
  return px.toCanvas();
}

// ---------------------------------------------------------------- invertebrates and others

function shrimp(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(7, Math.round(len));
  const H = Math.max(4, Math.round(L * 0.42));
  const px = new Pix(L + 6, H + 6);
  const a = s.look.clear ? 130 : 255;
  const by = 2 + Math.round(H * 0.45);
  for (let x = 0; x < L; x++) {
    const t = x / L;
    const arch = Math.round(Math.sin(t * Math.PI) * H * 0.25);
    const hh = Math.max(1, Math.round((1 - Math.abs(t - 0.45) * 1.4) * H * 0.38));
    for (let y = -hh; y <= hh; y++) {
      let col = shadeOf(c.body, 0.35 + ((y + hh) / (2 * hh)) * 0.5, x, y);
      if (s.look.pattern === 'stripe' && Math.abs(y + hh * 0.6) < 1) col = light(c.accent);
      if (s.look.pattern === 'bars' && Math.floor(t * 5) % 2 === 0) col = light(c.accent);
      if (s.look.pattern === 'dots' && hash2(x, y, L) < 0.15) col = light(c.accent);
      if (s.look.pattern === 'spots' && hash2(x, y, L + 3) < 0.18) col = mid(c.accent);
      px.set(3 + x, by - arch + y, col, a);
    }
    if (x % 3 === 1 && t > 0.25 && t < 0.75) px.set(3 + x, by - arch + hh + 1 + ((frame + x) % 2), dark(c.body), a);
  }
  // tail fan, antennae, eye
  px.set(3 + L - 1, by, mid(c.body), a);
  px.set(3 + L, by - 1, mid(c.body), a);
  px.set(3 + L, by + 1, mid(c.body), a);
  px.line(3, by - 1, 0, by - 3 - (frame % 2), dark(c.body), 200);
  px.line(4, by - 1, 1, by - H - (frame % 2), dark(c.body), 160);
  px.set(5, by - 1, 0);
  px.outline(0, true);
  return px.toCanvas();
}

function snail(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(5, Math.round(len));
  const tall = s.id.includes('trumpet') || s.id.includes('rabbit') || s.id.includes('assassin') || s.id.includes('nassarius');
  const W = L + 4, H = Math.round(L * (tall ? 0.8 : 0.75)) + 3;
  const px = new Pix(W, H);
  const r = Math.max(2, L * 0.36);
  const cx = Math.round(W * 0.45), cy = Math.round(H - 2 - r);
  // foot
  const ext = frame % 2;
  for (let x = 1; x < W - 1 + ext - 1; x++) px.set(x, H - 2, shadeOf(RAMP.sand, 0.4, x, 0));
  px.set(W - 2 + ext - 1, H - 4, dark(RAMP.sand));
  px.set(W - 3 + ext - 1, H - 4, dark(RAMP.sand));
  if (tall) {
    for (let i = 0; i < 4; i++) px.ellipse(cx - i * r * 0.35, cy - i * r * 0.3, r * (1 - i * 0.18), r * 0.7 * (1 - i * 0.15), shadeOf(c.body, 0.45 + i * 0.1, i, 0));
    if (s.look.pattern === 'stripe') for (let i = 0; i < 4; i++) px.line(cx - i * r * 0.35 - r * 0.6, cy - i * r * 0.3, cx - i * r * 0.35 + r * 0.6, cy - i * r * 0.3, light(c.accent));
  } else {
    px.ellipse(cx, cy, r, r, mid(c.body));
    px.ellipse(cx - r * 0.25, cy - r * 0.25, r * 0.55, r * 0.55, light(c.body));
    px.ellipse(cx - r * 0.1, cy - r * 0.1, r * 0.2, r * 0.2, dark(c.body));
    if (s.look.pattern === 'stripe' || s.look.pattern === 'bars') for (let a = 0; a < 6; a++) {
      const ang = (a / 6) * Math.PI * 2;
      px.line(cx, cy, cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, dark(c.accent));
    }
  }
  px.outline(0, true);
  return px.toCanvas();
}

function crab(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(7, Math.round(len));
  if (s.id === 'horseshoe_crab') {
    const px = new Pix(L + 2, Math.round(L * 0.35) + 3);
    const cy = px.h - 2;
    for (let x = 0; x < L * 0.7; x++) {
      const t = x / (L * 0.7);
      const h = Math.round(Math.sin(t * Math.PI) * L * 0.3);
      for (let y = 0; y < h; y++) px.set(1 + x, cy - y, shadeOf(c.body, 0.3 + (y / Math.max(1, h)) * 0.6, x, y));
    }
    px.line(1 + L * 0.7, cy - 1, L, cy - 1, dark(c.body));
    px.outline(0, true);
    return px.toCanvas();
  }
  const W = L + 6, H = Math.round(L * 0.55) + 5;
  const px = new Pix(W, H);
  const cx = Math.round(W / 2), cy = Math.round(H * 0.45);
  const rx = L * 0.36, ry = L * 0.2;
  // legs
  for (let i = 0; i < 3; i++) {
    const lx = cx - rx * 0.6 + i * rx * 0.6;
    const k = (frame + i) % 2;
    px.line(lx, cy + ry * 0.5, lx - 2 - k, H - 1, dark(c.body));
    px.line(lx + 1, cy + ry * 0.5, lx + 3 + k, H - 1, dark(c.body));
  }
  px.ellipse(cx, cy, rx, ry, mid(c.body));
  px.ellipse(cx - rx * 0.2, cy - ry * 0.3, rx * 0.6, ry * 0.45, light(c.body));
  // claws (fiddlers have one big one)
  const big = s.id === 'fiddler_crab' ? 1.8 : 1;
  const clawC = s.look.accent ? mid(c.accent) : mid(c.body);
  px.ellipse(cx + rx + 1, cy - ry * 0.6 - frame % 2, 1.6 * big, 1.2 * big, clawC);
  px.ellipse(cx - rx - 1, cy - ry * 0.6, 1.4, 1.1, clawC);
  px.set(cx + 2, cy - Math.round(ry) - 1, 0);
  px.set(cx - 2, cy - Math.round(ry) - 1, 0);
  px.outline(0, true);
  return px.toCanvas();
}

function spidercrab(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(30, Math.round(len));
  const px = new Pix(L + 4, Math.round(L * 0.5) + 4);
  const cx = px.w / 2, cy = px.h * 0.35;
  for (let i = 0; i < 4; i++) {
    const k = ((frame + i) % 2) * 2;
    const reach = L * (0.28 + i * 0.05);
    px.stroke(cx - 4, cy, cx - reach * 0.6, cy - 4 + i * 2, 1.2, 0.8, dark(c.body));
    px.stroke(cx - reach * 0.6, cy - 4 + i * 2, cx - reach + k, px.h - 2, 0.8, 0.6, dark(c.body));
    px.stroke(cx + 4, cy, cx + reach * 0.6, cy - 4 + i * 2, 1.2, 0.8, dark(c.body));
    px.stroke(cx + reach * 0.6, cy - 4 + i * 2, cx + reach - k, px.h - 2, 0.8, 0.6, dark(c.body));
  }
  px.ellipse(cx, cy, L * 0.11, L * 0.09, mid(c.body));
  px.ellipse(cx - 2, cy - 2, L * 0.06, L * 0.04, light(c.body));
  px.outline(0, true);
  return px.toCanvas();
}

function crayfish(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(8, Math.round(len));
  const px = new Pix(L + 6, Math.round(L * 0.45) + 4);
  const cy = Math.round(px.h * 0.55);
  for (let x = 0; x < L; x++) {
    const t = x / L;
    const hh = Math.max(1, Math.round((t < 0.5 ? 0.8 : 1 - (t - 0.5)) * L * 0.13));
    for (let y = -hh; y <= hh; y++) px.set(3 + x, cy + y, shadeOf(c.body, 0.3 + ((y + hh) / (2 * hh)) * 0.5, x, y));
  }
  px.ellipse(3 + L + 1, cy - 2 - (frame % 2), 2, 1.3, mid(c.body));
  px.ellipse(3 + L, cy + 2, 1.6, 1, mid(c.body));
  px.line(3, cy, 0, cy + 2, mid(c.body));
  px.line(3, cy, 0, cy - 2, mid(c.body));
  for (let i = 0; i < 4; i++) px.set(3 + L * 0.55 + i * 2, cy + Math.round(L * 0.13) + 1 + ((frame + i) % 2), dark(c.body));
  px.set(3 + L - 3, cy - 2, 0);
  px.outline(0, true);
  return px.toCanvas();
}

function amphibian(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(8, Math.round(len));
  const frog = s.body === 'frog';
  const H = Math.round(L * (frog ? 0.5 : 0.35)) + 6;
  const px = new Pix(L + 4, H);
  const cy = Math.round(H * 0.5);
  const bodyLen = frog ? L * 0.55 : L * 0.62;
  for (let x = 0; x < L; x++) {
    const t = x / L;
    let hh: number;
    if (frog) hh = t < 0.55 ? Math.sin((t / 0.55) * Math.PI) * L * 0.18 : 0;
    else hh = t < 0.62 ? (t < 0.2 ? 0.95 : 0.8) * L * 0.1 : (1 - (t - 0.62) / 0.38) * L * 0.08;
    if (!frog && t > 0.62) hh += L * 0.03; // tail fin
    const h = Math.max(1, Math.round(hh));
    if (hh <= 0) continue;
    for (let y = -h; y <= h; y++) {
      const v = y / h;
      const col = v > 0.3 ? shadeOf(c.belly, 0.7, x, y) : shadeOf(c.body, 0.4 + (v + 1) * 0.25, x, y);
      px.set(2 + L - 1 - x, cy + y, s.look.pattern === 'spots' && hash2(x, y, 3) < 0.15 ? dark(c.body) : col);
    }
  }
  // legs
  const k = frame % 2;
  const legC = mid(c.body);
  if (frog) {
    px.stroke(2 + L - bodyLen, cy + 1, 2 + L - bodyLen - L * 0.25, cy + 2 + k * 2, 1.2, 0.8, legC);
    px.stroke(2 + L - bodyLen - L * 0.25, cy + 2 + k * 2, 2, cy + 1 - k, 0.8, 0.6, legC);
  } else {
    for (const lx of [L * 0.2, L * 0.5]) {
      px.line(2 + L - lx, cy + 2, 2 + L - lx - 1 + k, cy + Math.round(L * 0.12) + 1, legC);
    }
  }
  // axolotl gills
  if (s.body === 'axolotl') {
    const gx = 2 + L - Math.round(L * 0.18);
    for (let i = 0; i < 3; i++) {
      const ang = -0.9 + i * 0.45 + (k ? 0.08 : 0);
      px.line(gx, cy - 2, gx - Math.cos(ang) * L * 0.12, cy - 2 + Math.sin(ang) * L * 0.15, mid(c.accent));
      px.line(gx, cy - 1, gx - Math.cos(-ang) * L * 0.1, cy - 1 - Math.sin(ang) * L * 0.12, mid(c.accent));
    }
  }
  px.set(2 + L - Math.round(L * 0.08), cy - Math.max(1, Math.round(L * 0.04)), 0);
  px.outline(0);
  return px.toCanvas();
}

function jelly(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(6, Math.round(len * 0.7));
  const tent = s.id === 'sea_nettle' ? 2.6 : s.id === 'comb_jelly' ? 0.2 : 1.1;
  const W = L + 4, H = Math.round(L * (0.5 + tent)) + 6;
  const px = new Pix(W, H);
  const squash = [1, 0.88, 0.8, 0.9][frame];
  const rx = (L / 2) * (2 - squash) * 0.55 + L * 0.2;
  const ry = (L / 2) * squash * 0.8;
  const cx = W / 2, cy = 2 + ry;
  if (s.id === 'comb_jelly') {
    px.ellipse(cx, cy + 1, L * 0.35, L * 0.48, light(c.body), 120);
    for (let i = 0; i < 4; i++) {
      const col = [47, 42, 60, 18][(i + frame) % 4];
      px.line(cx - L * 0.25 + i * L * 0.17, cy - L * 0.3, cx - L * 0.25 + i * L * 0.17, cy + L * 0.4, col, 230);
    }
    return px.toCanvas();
  }
  if (s.id === 'upside_down_jelly') {
    px.ellipse(cx, H - 3, rx, 2, mid(c.body), 220);
    for (let i = 0; i < 6; i++) px.ellipse(cx - rx * 0.7 + i * rx * 0.28, H - 5 - ((i + frame) % 2), 1.5, 2, i % 2 ? mid(c.accent) : light(c.body), 220);
    return px.toCanvas();
  }
  for (let y = 0; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - Math.pow((ry - y) / ry, 2))));
    for (let x = -w; x <= w; x++) {
      const edge = Math.abs(x) >= w - 1 || y >= ry - 1;
      px.set(cx + x, 2 + y, edge ? light(c.body) : mid(c.body), edge ? 210 : 110);
    }
  }
  if (s.id === 'moon_jelly') for (let i = 0; i < 4; i++) px.ellipse(cx - rx * 0.45 + i * rx * 0.3, 2 + ry * 0.55, 1.2, 1.2, mid(c.accent), 200);
  // tentacles and oral arms
  const n = Math.max(3, Math.round(rx / 2));
  for (let i = 0; i < n; i++) {
    const x0 = cx - rx * 0.8 + (i / (n - 1)) * rx * 1.6;
    let x = x0, y = 2 + ry;
    const tl = L * tent * (0.7 + hash2(i, 1, L) * 0.3);
    for (let k = 0; k < tl; k++) {
      x += Math.sin(k * 0.35 + frame * 1.5 + i) * 0.45;
      y += 1;
      px.set(x, y, s.id === 'sea_nettle' ? mid(c.accent) : light(c.body), 150);
    }
  }
  return px.toCanvas();
}

function octopus(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(10, Math.round(len * 0.8));
  const px = new Pix(L + 4, Math.round(L * 0.85) + 4);
  const cx = px.w * 0.5, cy = L * 0.28;
  for (let i = 0; i < 8; i++) {
    let x = cx - L * 0.2 + (i / 7) * L * 0.4, y = cy + L * 0.15;
    const dir = (i - 3.5) / 3.5;
    for (let k = 0; k < L * 0.55; k++) {
      x += dir * 0.6 + Math.sin(k * 0.3 + frame + i) * 0.4;
      y += 0.7;
      const r = Math.max(0.5, 1.6 * (1 - k / (L * 0.55)));
      px.ellipse(x, y, r, r, k % 4 === 0 ? light(c.body) : mid(c.body));
    }
  }
  px.ellipse(cx, cy, L * 0.24, L * 0.26, mid(c.body));
  px.ellipse(cx - L * 0.06, cy - L * 0.08, L * 0.1, L * 0.1, light(c.body));
  if (s.look.pattern === 'mask') px.ellipse(cx + L * 0.12, cy + L * 0.1, 1.5, 1.5, light(c.accent));
  px.set(cx + L * 0.12, cy + L * 0.04, 0);
  px.outline(0);
  return px.toCanvas();
}

function cuttle(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(10, Math.round(len));
  const H = Math.round(L * 0.45) + 4;
  const px = new Pix(L + 4, H);
  const cy = Math.round(H / 2);
  const shift = frame * 2;
  for (let x = 0; x < L * 0.75; x++) {
    const t = x / (L * 0.75);
    const hh = Math.round(Math.sin(Math.min(1, t * 1.2) * Math.PI * 0.9 + 0.2) * L * 0.18);
    for (let y = -hh - 1; y <= hh + 1; y++) {
      const edge = Math.abs(y) > hh;
      let col = edge ? light(RAMP.pearl) : shadeOf(c.body, 0.35 + (y + hh) / (2 * hh + 1) * 0.5, x, y);
      if (!edge && Math.floor((x + shift) / 3) % 3 === 0) col = dark(c.body);
      px.set(2 + x, cy + y, col, edge ? 160 : 255);
    }
  }
  for (let i = 0; i < 4; i++) px.line(2 + L * 0.75, cy - 1 + i, L + 1, cy - 2 + i * 1.5 + ((frame + i) % 2), mid(c.body));
  px.set(2 + Math.round(L * 0.68), cy - 2, 0);
  px.outline(0);
  return px.toCanvas();
}

function star(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(8, Math.round(len * 0.6));
  const px = new Pix(L + 3, L + 3);
  const cx = px.w / 2, cy = px.h / 2;
  const thin = s.id === 'serpent_star';
  for (let a = 0; a < 5; a++) {
    const ang = -Math.PI / 2 + (a / 5) * Math.PI * 2 + (thin ? Math.sin(frame + a) * 0.15 : 0);
    px.stroke(cx, cy, cx + Math.cos(ang) * L * 0.48, cy + Math.sin(ang) * L * 0.48, thin ? 1.2 : L * 0.12, 0.5, mid(c.body));
  }
  px.ellipse(cx, cy, L * (thin ? 0.12 : 0.16), L * (thin ? 0.12 : 0.16), mid(c.body));
  px.rim(light(c.body), dark(c.body));
  px.outline(0);
  return px.toCanvas();
}

function urchin(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(6, Math.round(len));
  const px = new Pix(L + 6, L + 2);
  const cx = px.w / 2, cy = px.h - L * 0.35 - 1;
  const n = 14;
  for (let i = 0; i < n; i++) {
    const ang = Math.PI + (i / (n - 1)) * Math.PI + (frame % 2 ? 0.05 : 0);
    px.line(cx, cy, cx + Math.cos(ang) * L * 0.55, cy + Math.sin(ang) * L * 0.55, dark(c.body));
  }
  px.ellipse(cx, cy, L * 0.32, L * 0.3, mid(c.body));
  if (s.look.accent) for (let i = 0; i < 5; i++) px.set(cx - L * 0.2 + i * L * 0.1, cy - L * 0.15, light(c.accent));
  px.rim(light(c.body), dark(c.body));
  px.outline(0, true);
  return px.toCanvas();
}

function slug(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(8, Math.round(len));
  const px = new Pix(L + 4, Math.round(L * 0.4) + 4);
  const by = px.h - 2;
  for (let x = 0; x < L; x++) {
    const t = x / L;
    const h = Math.round(Math.sin(t * Math.PI) * L * 0.28) + (x % 3 === frame % 3 ? 1 : 0);
    for (let y = 0; y < h; y++) px.set(2 + x, by - y, y === h - 1 ? light(c.accent) : shadeOf(c.body, 0.4 + (y / Math.max(1, h)) * 0.5, x, y));
  }
  px.line(2 + L - 1, by - 2, 2 + L + 1, by - 4, mid(c.body));
  px.outline(0, true);
  return px.toCanvas();
}

function isopod(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(10, Math.round(len));
  const px = new Pix(L + 4, Math.round(L * 0.35) + 4);
  const by = px.h - 2;
  for (let x = 0; x < L; x++) {
    const t = x / L;
    const h = Math.round(Math.sqrt(Math.max(0, 1 - Math.pow(t * 2 - 1, 2))) * L * 0.26);
    for (let y = 1; y <= h; y++) px.set(2 + x, by - y, x % 4 === 0 ? dark(c.body) : shadeOf(c.body, 0.4 + (y / Math.max(1, h)) * 0.5, x, y));
    if (x % 3 === 0) px.set(2 + x, by + ((frame + x) % 2 ? 0 : -1) + 1, dark(c.body));
  }
  px.set(2 + L - 3, by - 3, 0);
  px.outline(0, true);
  return px.toCanvas();
}

function seahorse(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(8, Math.round(len * 1.1));
  const W = Math.round(L * 0.55) + 4;
  const px = new Pix(W, L + 3);
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    // an S: head at the top bending forward, belly out, tail curling at the bottom
    const x = W * 0.45 + Math.sin(t * Math.PI * 1.6 + 0.4) * W * 0.18 - (t > 0.8 ? (t - 0.8) * W * 1.2 : 0);
    const y = 2 + t * (L - 2);
    const r = Math.max(0.7, (t < 0.15 ? 0.13 : t < 0.55 ? 0.17 : 0.17 * (1 - (t - 0.55) / 0.5)) * L * 0.6);
    pts.push([x, y, r]);
  }
  for (const [x, y, r] of pts) px.ellipse(x, y, r, r, mid(c.body));
  // snout and dorsal fin flutter
  px.stroke(pts[1][0] + 1, pts[1][1] + 1, pts[1][0] + L * 0.2, pts[1][1] + 2, 1, 0.6, mid(c.body));
  px.line(pts[9][0] - pts[9][2] - 1, pts[9][1] - 1, pts[9][0] - pts[9][2] - 2 - (frame % 2), pts[9][1] + 2, light(c.fin), 200);
  for (const [x, y] of pts) if (s.look.pattern === 'dots' && hash2(Math.round(x), Math.round(y), 9) < 0.3) px.set(x, y, light(c.accent));
  px.rim(light(c.body), dark(c.body));
  px.set(pts[1][0] + 1, pts[1][1] - 1, 0);
  px.outline(0);
  return px.toCanvas();
}

function mussel(s: SpeciesDef, len: number): HTMLCanvasElement {
  const c = colors(s.look);
  const L = Math.max(6, Math.round(len));
  const px = new Pix(L + 2, Math.round(L * 0.45) + 2);
  px.ellipse(px.w / 2, px.h - 1, L * 0.48, L * 0.35, mid(c.body));
  for (let i = 1; i < 4; i++) px.ellipse(px.w / 2, px.h - 1, L * 0.48 * (i / 4), L * 0.35 * (i / 4), i % 2 ? dark(c.body) : mid(c.body));
  px.outline(0, true);
  return px.toCanvas();
}

/** Draw one animation frame of a species at a given length (fry are drawn at half length). */
export function drawCreature(s: SpeciesDef, len: number, frame: number): HTMLCanvasElement {
  switch (s.body) {
    case 'shrimp': return shrimp(s, len, frame);
    case 'snail': return snail(s, len, frame);
    case 'crab': return crab(s, len, frame);
    case 'spidercrab': return spidercrab(s, len, frame);
    case 'crayfish': return crayfish(s, len, frame);
    case 'axolotl': case 'frog': case 'newt': return amphibian(s, len, frame);
    case 'jelly': return jelly(s, len, frame);
    case 'octopus': return octopus(s, len, frame);
    case 'cuttle': return cuttle(s, len, frame);
    case 'star': return star(s, len, frame);
    case 'urchin': return urchin(s, len, frame);
    case 'slug': return slug(s, len, frame);
    case 'isopod': return isopod(s, len, frame);
    case 'seahorse': return seahorse(s, len, frame);
    case 'mussel': return mussel(s, len);
    default: return fish(s, len, frame);
  }
}
