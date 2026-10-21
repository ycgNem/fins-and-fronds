// One tank, drawn at its native pixel size into its own canvas (interior plus frame, stand and
// light), then scaled by the renderer. Draw order, back to front:
//
//   water backdrop -> light shafts -> back ground band, back items, haze -> middle band, items,
//   swimmers -> front band, front items, land -> surface, floaters, bags -> glass crawlers ->
//   bubbles, food, motes -> caustics -> water tints -> lighting -> glow -> glass algae, smudges ->
//   frame
//
// Scene-level light and water grading are the one place colors blend off-palette (STYLE.md).
import { equip, item, species, substrate } from '../data';
import { PALETTE as PALETTE_HEX, PALETTE_RGB, RAMP, rgba } from '../data/palette';
import type { WaterLook } from '../data/types';
import { hash2, Rng } from '../engine/rng';
import { itemBase } from '../sim/actions';
import { type Geom, geom, groundY } from '../sim/facts';
import type { TankStats } from '../sim/Game';
import type { Tank } from '../sim/state';
import { type Agent, Agents, BURIED, type Cave, type SceneCtx } from './agents';
import { bayer, ctx2d, makeCanvas, Pix, shadeOf } from './art/pix';
import { creatureFrame, drawFrame, type Frame, importedFrame, itemFrame } from './art/sprites';

export const MARGIN = { l: 8, r: 8, t: 14, b: 18 };

const silhouettes = new WeakMap<Frame, Frame>();

/** a creature frame filled with deep shadow (an animal tucked into its den) */
function silhouetteOf(fr: Frame): Frame {
  let s = silhouettes.get(fr);
  if (s) return s;
  const cv = document.createElement('canvas');
  cv.width = fr.w;
  cv.height = fr.h;
  const x = cv.getContext('2d')!;
  x.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, 0, 0, fr.w, fr.h);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = PALETTE_HEX[1];
  x.fillRect(0, 0, fr.w, fr.h);
  s = { img: cv, sx: 0, sy: 0, w: fr.w, h: fr.h, ax: fr.ax, ay: fr.ay };
  silhouettes.set(fr, s);
  return s;
}

/** backdrop gradient (top to bottom), the far silhouette tone and the depth haze tone */
const LOOKS: Record<WaterLook, { grad: number[]; far: number; haze: number }> = {
  clear: { grad: [48, 47, 41, 40, 39], far: 39, haze: 41 },
  green: { grad: [33, 32, 31, 30, 29], far: 29, haze: 31 },
  blackwater: { grad: [22, 21, 20, 19, 49], far: 49, haze: 20 },
  amber: { grad: [23, 22, 21, 20, 10], far: 10, haze: 21 },
  rift: { grad: [48, 47, 46, 45, 44], far: 44, haze: 46 },
  brackish: { grad: [38, 37, 36, 35, 34], far: 34, haze: 36 },
  reef: { grad: [43, 42, 47, 46, 45], far: 45, haze: 47 },
  lagoon: { grad: [43, 42, 41, 40, 39], far: 39, haze: 41 },
  kelp: { grad: [37, 36, 40, 39, 29], far: 29, haze: 40 },
  cold: { grad: [8, 7, 47, 46, 45], far: 45, haze: 46 },
  pelagic: { grad: [47, 46, 45, 44, 0], far: 0, haze: 45 },
  deep: { grad: [45, 44, 1, 0, 0], far: 0, haze: 44 },
  pond: { grad: [33, 37, 36, 35, 34], far: 34, haze: 36 },
  cave: { grad: [7, 6, 2, 1, 0], far: 0, haze: 2 },
};

/** What the water looks like: chosen from the water, the shell, the stock's home and its state. */
export function waterLook(t: Tank, st?: TankStats): WaterLook {
  const sh = geom(t).shell;
  if (sh.tags.includes('kreisel')) return 'pelagic';
  if (sh.tags.includes('pond')) return 'pond';
  if (t.chem.algae > 0.75 && t.water === 'fresh') return 'green';
  const regions = new Map<string, number>();
  for (const a of t.animals) for (const r of species(a.sp).regions) regions.set(r, (regions.get(r) ?? 0) + 1);
  let top = '', n = 0;
  for (const [r, c] of regions) if (c > n) {
    top = r;
    n = c;
  }
  if (t.water === 'marine') {
    if (top === 'kelp_forest' || top === 'rocky_shore') return 'kelp';
    if (top === 'open_ocean') return 'pelagic';
    if (top === 'deep_sea') return 'deep';
    if (top === 'cold_north') return 'cold';
    if (top === 'seagrass') return 'lagoon';
    return st && st.facts.coralTotal > 0 ? 'reef' : 'lagoon';
  }
  if (t.water === 'brackish') return 'brackish';
  if (t.chem.tannin > 0.3) return 'blackwater';
  if (t.chem.tannin > 0.15) return 'amber';
  if (top === 'lake_malawi' || top === 'lake_tanganyika') return 'rift';
  if (top === 'mexico_karst') return 'cave';
  if (top === 'temperate_na' || top === 'temperate_eu' || top === 'east_asia') return 'cold';
  return 'clear';
}

interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  ph: number;
}

interface Rect {
  uid: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DrawOpts {
  hour: number;
  lightsOn: boolean;
  /** visitors around: the room lights are on */
  open: boolean;
  hoverItem?: number;
  selectItem?: number;
  hoverAgent?: number;
  selectAgent?: number;
  ghost?: { id: string; x: number; layer: 0 | 1 | 2; ok: boolean; on?: number; y?: number };
  /** Care mode: show the scraper / sponge under the cursor */
  tool?: { kind: 'scrape' | 'wipe'; x: number; y: number };
}

const GLASS_CELL = 6;
const SMUDGE_CELL = 10;
/** fingerprints cover a few cells; this maps their mean to the sim's 0..1 smudge level */
const SMUDGE_GAIN = 4.5;

export class TankView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  agents = new Agents();
  g: Geom;
  time = 0;
  look: WaterLook = 'clear';
  itemRects: Rect[] = [];
  private bubbles: Bubble[] = [];
  private motes: Bubble[] = [];
  /** the tank being drawn (for the ground line under a buried animal) */
  private drawing?: Tank;
  private rng = new Rng(11);
  private bg: HTMLCanvasElement | null = null;
  private bgKey = '';
  private stand: HTMLCanvasElement | null = null;
  private standKey = '';
  private ground: HTMLCanvasElement[] = [];
  private groundKey = '';
  private glassCells: Float32Array;
  private smudgeCells: Float32Array;
  private glassCanvas: HTMLCanvasElement;
  private glassDirty = true;
  private gw: number;
  private gh: number;
  private sw: number;
  private sh: number;
  private emitAcc = 0;

  constructor(public tankId: number, t: Tank) {
    this.g = geom(t);
    this.canvas = makeCanvas(this.g.w + MARGIN.l + MARGIN.r, this.g.h + MARGIN.t + MARGIN.b);
    this.ctx = ctx2d(this.canvas);
    this.gw = Math.ceil(this.g.w / GLASS_CELL);
    this.gh = Math.ceil(this.g.h / GLASS_CELL);
    this.sw = Math.ceil(this.g.w / SMUDGE_CELL);
    this.sh = Math.ceil(this.g.h / SMUDGE_CELL);
    this.glassCells = new Float32Array(this.gw * this.gh);
    this.smudgeCells = new Float32Array(this.sw * this.sh);
    this.glassCanvas = makeCanvas(this.g.w, this.g.h);
    // start the films where the sim says they are, patchy rather than even
    for (let i = 0; i < this.glassCells.length; i++) this.glassCells[i] = Math.min(1, t.chem.glass * (0.4 + hash2(i, 1, t.id) * 1.2));
    for (let i = 0; i < this.smudgeCells.length; i++) {
      const y = Math.floor(i / this.sw) / this.sh;
      this.smudgeCells[i] = y > 0.3 && y < 0.85 && hash2(i, 2, t.id) < t.smudge * 0.3 ? 0.5 + hash2(i, 3, t.id) * 0.5 : 0;
    }
  }

  get interiorX() {
    return MARGIN.l;
  }
  get interiorY() {
    return MARGIN.t;
  }

  // ---------------------------------------------------------------- glass films

  private mean(cells: Float32Array) {
    let s = 0;
    for (const v of cells) s += v;
    return s / cells.length;
  }

  /** Scrape algae off the glass in a radius; returns the new film level 0..1. */
  scrape(x: number, y: number, r = 7): number {
    this.paint(this.glassCells, this.gw, this.gh, GLASS_CELL, x, y, r);
    return this.mean(this.glassCells);
  }

  /** Wipe fingerprints; returns the new smudge level 0..1. */
  wipe(x: number, y: number, r = 10): number {
    this.paint(this.smudgeCells, this.sw, this.sh, SMUDGE_CELL, x, y, r);
    return Math.min(1, this.mean(this.smudgeCells) * SMUDGE_GAIN);
  }

  private paint(cells: Float32Array, w: number, h: number, size: number, x: number, y: number, r: number) {
    for (let cy = 0; cy < h; cy++) for (let cx = 0; cx < w; cx++) {
      const dx = (cx + 0.5) * size - x, dy = (cy + 0.5) * size - y;
      if (dx * dx + dy * dy <= r * r) cells[cy * w + cx] = 0;
    }
    this.glassDirty = true;
  }

  private growFilms(t: Tank, dt: number) {
    const target = t.chem.glass;
    const m = this.mean(this.glassCells);
    if (m < target - 0.01) {
      for (let k = 0; k < 3; k++) {
        const i = Math.floor(this.rng.next() * this.glassCells.length);
        this.glassCells[i] = Math.min(1, this.glassCells[i] + dt * 3);
      }
      this.glassDirty = true;
    } else if (m > target + 0.03) {
      for (let i = 0; i < this.glassCells.length; i++) this.glassCells[i] *= 1 - dt * 0.5;
      this.glassDirty = true;
    }
    const sm = Math.min(1, this.mean(this.smudgeCells) * SMUDGE_GAIN);
    if (sm < t.smudge - 0.02) {
      const cx = Math.floor(this.rng.next() * this.sw), cy = Math.floor(this.sh * (0.3 + this.rng.next() * 0.5));
      const i = cy * this.sw + cx;
      this.smudgeCells[i] = Math.min(1, this.smudgeCells[i] + 0.5 + this.rng.next() * 0.5);
      this.glassDirty = true;
    } else if (sm > t.smudge + 0.08) {
      for (let i = 0; i < this.smudgeCells.length; i++) this.smudgeCells[i] *= 0.9;
      this.glassDirty = true;
    }
  }

  private redrawGlass() {
    const c = ctx2d(this.glassCanvas);
    c.clearRect(0, 0, this.g.w, this.g.h);
    const img = c.createImageData(this.g.w, this.g.h);
    const d = img.data;
    const algae = [PALETTE_RGB[30], PALETTE_RGB[31], PALETTE_RGB[25], PALETTE_RGB[36]];
    for (let y = 0; y < this.g.h; y++) for (let x = 0; x < this.g.w; x++) {
      const v = this.glassCells[Math.floor(y / GLASS_CELL) * this.gw + Math.floor(x / GLASS_CELL)];
      const i = (y * this.g.w + x) * 4;
      if (v > 0.03 && hash2(x, y, 5) < v * 0.85) {
        const rgb = algae[Math.floor(hash2(x, y, 6) * algae.length)];
        d[i] = rgb[0];
        d[i + 1] = rgb[1];
        d[i + 2] = rgb[2];
        d[i + 3] = 90 + v * 110;
      }
      const s = this.smudgeCells[Math.floor(y / SMUDGE_CELL) * this.sw + Math.floor(x / SMUDGE_CELL)];
      if (s > 0.05) {
        // a fingerprint or nose print: faint whorls in a soft oval, set somewhere in its cell
        const ci = Math.floor(x / SMUDGE_CELL), cj = Math.floor(y / SMUDGE_CELL);
        const cx = (ci + 0.25 + hash2(ci, cj, 21) * 0.5) * SMUDGE_CELL, cy = (cj + 0.25 + hash2(ci, cj, 22) * 0.5) * SMUDGE_CELL;
        const nose = hash2(ci, cj, 23) < 0.3;
        const r = Math.hypot((x - cx) / (nose ? 5 : 2.5), (y - cy) / (nose ? 3.5 : 3.2));
        if (r < 1 && (nose || Math.sin(r * 9 + hash2(ci, cj, 24) * 3) > 0.1)) {
          d[i] = 230;
          d[i + 1] = 236;
          d[i + 2] = 240;
          d[i + 3] = Math.max(d[i + 3], (nose ? 14 : 20) * s + 8);
        }
      }
    }
    c.putImageData(img, 0, 0);
    this.glassDirty = false;
  }

  // ---------------------------------------------------------------- cached layers

  private backdrop(t: Tank): HTMLCanvasElement {
    // the far layer is PixelLab art (bg:<look>) once its sheet has loaded, else procedural
    const far = importedFrame(`bg:${this.look}`);
    const key = `${t.shell}|${this.look}|${t.water}|${far ? `${t.profile.join(',')}|${t.slope}` : '-'}`;
    if (this.bg && this.bgKey === key) return this.bg;
    const { w, h, surface } = this.g;
    const L = LOOKS[this.look];
    const px = new Pix(w, h);
    const span = Math.max(1, h - surface);
    for (let y = 0; y < h; y++) {
      const k = Math.max(0, (y - surface) / span);
      for (let x = 0; x < w; x++) {
        const f = k * (L.grad.length - 1);
        const i = Math.floor(f);
        px.set(x, y, L.grad[Math.min(L.grad.length - 1, i + (f - i > bayer(x, y) ? 1 : 0))]);
      }
    }
    // far silhouettes: a soft line of hills, weed or reef at the back
    const r = new Rng(t.id * 97 + 3);
    const marine = t.water === 'marine';
    for (let x = 0; x < w && !far; x++) {
      const n = Math.sin(x * 0.03 + r.range(0, 0.0001)) * 0.5 + Math.sin(x * 0.071 + 1.3) * 0.3 + Math.sin(x * 0.17 + 4) * 0.2;
      const top = h - h * (marine ? 0.28 : 0.22) - n * h * 0.07;
      for (let y = Math.floor(top); y < h; y++) if (bayer(x, y) < 0.7) px.set(x, y, L.far);
      if (!marine && hash2(x, 9, t.id) < 0.25) {
        const blade = h * (0.15 + hash2(x, 10, t.id) * 0.25);
        for (let y = 0; y < blade; y++) if (bayer(x, Math.floor(top - y)) < 0.6) px.set(x + Math.round(Math.sin(y * 0.1) * 2), top - y, L.far);
      }
    }
    // above the water line (paludariums, ripariums and the lid gap): the dim room behind
    for (let y = 0; y < surface; y++) for (let x = 0; x < w; x++) px.set(x, y, y < surface - 6 ? (bayer(x, y) < 0.5 ? 1 : 0) : 1);
    this.bg = px.toCanvas();
    if (far) this.drawFar(t, this.bg, far, L.haze);
    this.bgKey = key;
    return this.bg;
  }

  /**
   * The look's far scenery along the back, its foot tucked under the back ground band, tiled
   * with every other tile mirrored, and washed with the haze tone so it sits far away.
   */
  private drawFar(t: Tank, bg: HTMLCanvasElement, far: Frame, haze: number) {
    const { w, h, surface } = this.g;
    let foot = 0;
    for (let x = 0; x < w; x += 4) foot = Math.max(foot, groundY(t, this.g, x, 0));
    const y = Math.max(surface + 4, Math.min(h, foot + 3) - far.h);
    const layer = makeCanvas(w, h);
    const c = ctx2d(layer);
    const x0 = -Math.floor(((far.w * 2 - (w % (far.w * 2))) % (far.w * 2)) / 2); // centered
    for (let x = x0, i = 0; x < w; x += far.w, i++) {
      c.save();
      c.translate(i % 2 ? x + far.w : x, y);
      if (i % 2) c.scale(-1, 1);
      c.drawImage(far.img, far.sx, far.sy, far.w, far.h, 0, 0, far.w, far.h);
      c.restore();
    }
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = rgba(haze, 0.55);
    c.fillRect(0, 0, w, h);
    ctx2d(bg).drawImage(layer, 0, 0);
  }

  private groundLayers(t: Tank): HTMLCanvasElement[] {
    const key = `${t.substrate}|${t.profile.join(',')}|${t.slope}|${t.shell}`;
    if (this.ground.length && this.groundKey === key) return this.ground;
    const sub = substrate(t.substrate);
    const a = RAMP[sub.colors[0]], b = RAMP[sub.colors[1] ?? sub.colors[0]];
    const { w, h } = this.g;
    this.ground = [0, 1, 2].map((layer) => {
      const px = new Pix(w, h);
      const dim = layer === 0 ? -0.22 : layer === 1 ? -0.1 : 0;
      for (let x = 0; x < w; x++) {
        const top = groundY(t, this.g, x, layer);
        for (let y = top; y < h; y++) {
          const depth = (y - top) / Math.max(1, h - top);
          const n = hash2(x, y, 31 + layer);
          let v = 0.62 - depth * 0.35 + dim;
          let ramp = a;
          switch (sub.grain) {
            case 'bare':
              if (y > top + 1) continue;
              v = 0.5;
              break;
            case 'fine_sand':
              v += (n - 0.5) * 0.15;
              break;
            case 'sand':
              v += (n - 0.5) * 0.3;
              if (n > 0.92) ramp = b;
              break;
            case 'gravel': {
              const cell = hash2(x >> 1, y >> 1, 7 + layer);
              v += (cell - 0.5) * 0.5 + ((x & 1) === 0 && (y & 1) === 0 ? 0.15 : -0.05);
              if (cell > 0.75) ramp = b;
              break;
            }
            case 'pebble': {
              const cx = Math.floor(x / 4), cy = Math.floor(y / 3);
              const cell = hash2(cx, cy, 9 + layer);
              const lx = x - cx * 4, ly = y - cy * 3;
              v += (cell - 0.5) * 0.4 + (lx === 0 || ly === 0 ? -0.25 : lx === 1 && ly === 1 ? 0.2 : 0);
              if (cell > 0.6) ramp = b;
              break;
            }
            case 'soil':
              v = 0.25 - depth * 0.2 + dim + (n - 0.5) * 0.25;
              if (n > 0.85) ramp = b;
              break;
            case 'mud':
              v = 0.4 - depth * 0.3 + dim + (n - 0.5) * 0.08;
              break;
            case 'crushed':
              v += (n - 0.5) * 0.35;
              if (n > 0.8) ramp = RAMP.pearl;
              break;
          }
          if (y === top && sub.grain !== 'bare') v += 0.18;
          px.set(x, y, shadeOf(ramp, v, x, y));
        }
      }
      return px.toCanvas();
    });
    this.groundKey = key;
    return this.ground;
  }

  // ---------------------------------------------------------------- update

  update(dt: number, t: Tank, st: TankStats | undefined, opts: DrawOpts, released: Set<string>) {
    this.time += dt;
    this.g = geom(t);
    this.look = waterLook(t, st);
    this.agents.sync(t, this.g, released);
    const caves: Cave[] = [];
    const perches: { x: number; y: number }[] = [];
    for (const p of t.items) {
      const it = item(p.id);
      const base = itemBase(t, p);
      if (it.tags?.includes('cave') && !p.on) {
        // the drawn size (imported art can differ from the item's nominal size)
        const f = itemFrame(p.id, p.size, p.seed, 0, p.health);
        caves.push({ uid: p.uid, x: base.x, y: base.y, w: f.w, h: f.h, layer: p.layer });
      }
      if (it.cat === 'rock' || it.cat === 'coral' || it.cat === 'wood') perches.push({ x: base.x, y: base.y - it.h * p.size * 0.5 });
    }
    const ctx: SceneCtx = { t, g: this.g, lightsOn: opts.lightsOn, flow: st?.facts.flow ?? 1, kreisel: this.g.shell.tags.includes('kreisel'), caves, perches };
    this.agents.update(dt, ctx);
    this.growFilms(t, dt);

    // bubbles from the airstone, the sponge filter, CO2 and bubbling decor
    this.emitAcc += dt;
    const emitters: { x: number; y: number; rate: number; r: number }[] = [];
    const floor = (x: number) => groundY(t, this.g, x, 0) - 2;
    const wx = Math.min(this.g.w, this.g.landX);
    if (t.equip.includes('air_pump')) emitters.push({ x: wx * 0.12, y: floor(wx * 0.12), rate: 10, r: 1.2 });
    if (t.equip.includes('sponge_filter')) emitters.push({ x: 10, y: floor(10) - 12, rate: 8, r: 1 });
    if (t.equip.includes('hob_filter')) emitters.push({ x: wx - 18, y: this.g.surface + 6, rate: 5, r: 0.8 });
    if (t.set.co2 && t.equip.some((e) => equip(e).slot === 'co2') && opts.lightsOn) emitters.push({ x: wx - 12, y: floor(wx - 12) - 6, rate: 6, r: 0.5 });
    for (const p of t.items) if (item(p.id).tags?.includes('bubbler')) {
      const b = itemBase(t, p);
      emitters.push({ x: b.x, y: b.y - 4, rate: Math.sin(this.time * 0.8 + p.uid) > 0.6 ? 14 : 0, r: 1.5 });
    }
    for (const e of emitters) {
      if (this.rng.chance(e.rate * dt)) this.bubbles.push({ x: e.x + this.rng.range(-1, 1), y: e.y, vy: -this.rng.range(14, 22), r: e.r * this.rng.range(0.7, 1.3), ph: this.rng.range(0, 6) });
    }
    for (const b of this.bubbles) {
      b.y += b.vy * dt;
      b.x += Math.sin(this.time * 4 + b.ph) * 0.15;
    }
    this.bubbles = this.bubbles.filter((b) => b.y > this.g.surface + 1);
    // drifting motes: more in cloudy water
    const want = 10 + Math.round(t.chem.cloud * 60);
    while (this.motes.length < want) this.motes.push({ x: this.rng.range(0, wx), y: this.rng.range(this.g.surface + 2, this.g.h - 6), vy: this.rng.range(-0.6, 0.6), r: 0, ph: this.rng.range(0, 6) });
    if (this.motes.length > want) this.motes.length = want;
    const drift = ((st?.facts.flow ?? 1) - 0.5) * 1.2;
    for (const m of this.motes) {
      m.x += (drift + Math.sin(this.time * 0.3 + m.ph) * 0.5) * dt;
      m.y += (m.vy + Math.sin(this.time * 0.5 + m.ph)) * 0.4 * dt;
      if (m.x > wx) m.x = 0;
      if (m.x < 0) m.x = wx;
    }
  }

  // ---------------------------------------------------------------- draw

  draw(t: Tank, st: TankStats | undefined, o: DrawOpts) {
    this.drawing = t;
    const c = this.ctx;
    const g = this.g;
    const { w, h } = g;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawStand(t);
    c.save();
    c.translate(MARGIN.l, MARGIN.t);
    this.clipInterior(c);
    c.drawImage(this.backdrop(t), 0, 0);
    const frame = Math.floor(this.time * 2.2);
    if (o.lightsOn) this.drawShafts(c);
    this.drawGear(c, t);
    const ground = this.groundLayers(t);
    this.itemRects = [];

    const L = LOOKS[this.look];
    const byLayer: [typeof t.items, typeof t.items, typeof t.items] = [[], [], []];
    const surface: typeof t.items = [];
    const land: typeof t.items = [];
    for (const p of t.items) {
      const it = item(p.id);
      if (it.place === 'surface' || it.place === 'hang') surface.push(p);
      else if (it.place === 'land') land.push(p);
      else byLayer[p.layer].push(p);
    }
    // things sitting on other things draw after their host
    for (const list of byLayer) list.sort((a, b) => (a.on ? 1 : 0) - (b.on ? 1 : 0) || a.y - b.y);

    // animals tucked into a den draw behind the rock or log, on its layer
    const denLayer = new Map<number, 0 | 1 | 2>();
    for (const p of t.items) denLayer.set(p.uid, p.layer);
    const inDen = (a: Agent) => a.inDen > 0.5 && denLayer.has(a.den);
    const denned = (l: number) => this.agents.list.filter((a) => inDen(a) && denLayer.get(a.den) === l);
    const homes = new Set(this.agents.list.filter(inDen).map((a) => a.den));
    const pockets = (l: number) => {
      for (const p of t.items) {
        if (p.layer !== l || !homes.has(p.uid)) continue;
        const f = itemFrame(p.id, p.size, p.seed, 0, p.health), b = itemBase(t, p);
        const pw = Math.round(f.w * 0.6), ph = Math.max(3, Math.round(f.h * 0.15));
        c.fillStyle = rgba(0, 0.26);
        c.beginPath();
        c.ellipse(b.x, b.y - ph / 2, pw / 2, ph, 0, Math.PI, 0);
        c.fill();
      }
    };
    const lodgers = (l: number, base: number) => {
      pockets(l);
      for (const a of denned(l)) this.drawAgent(c, a, o, base * (0.45 + 0.55 * a.peek), a.peek < 0.5);
    };
    // swimmers weave between the three planes of the scape by depth: the back third swims behind
    // the middle plants and under the haze, the front third passes in front of everything
    const swimmers = this.agents.list.filter((a) => a.mode !== 'glass' && a.mode !== 'land' && !inDen(a));
    const band = (a: Agent): 0 | 1 | 2 => (a.mode === 'bottom' ? a.layer : a.z < 0.34 ? 0 : a.z < 0.67 ? 1 : 2);
    const inBand = (l: number) => swimmers.filter((a) => band(a) === l).sort((p, q) => p.z - q.z);
    const backSw = inBand(0);
    const midSw = [...inBand(1), ...inBand(2)];

    c.drawImage(ground[0], 0, 0);
    lodgers(0, 0.85);
    for (const p of byLayer[0]) this.drawItem(c, t, p, frame, o);
    for (const a of backSw) this.drawAgent(c, a, o);
    c.fillStyle = rgba(L.haze, 0.22);
    c.fillRect(0, 0, w, h);
    c.drawImage(ground[1], 0, 0);
    lodgers(1, 0.9);
    for (const p of byLayer[1]) this.drawItem(c, t, p, frame, o);
    for (const a of midSw.filter((a) => band(a) === 1)) this.drawAgent(c, a, o);
    c.fillStyle = rgba(L.haze, 0.06);
    c.fillRect(0, 0, w, h);
    c.drawImage(ground[2], 0, 0);
    this.drawPests(c, t, 'ground');
    lodgers(2, 1);
    for (const p of byLayer[2]) this.drawItem(c, t, p, frame, o);
    for (const a of midSw.filter((a) => band(a) === 2)) this.drawAgent(c, a, o);
    for (const p of land) this.drawItem(c, t, p, frame, o);
    for (const a of this.agents.list) if (a.mode === 'land') this.drawAgent(c, a, o);
    if (o.ghost) this.drawGhost(c, t, o.ghost, frame);

    this.drawSurface(c, t);
    for (const p of surface) this.drawItem(c, t, p, frame, o);
    this.drawBags(c, t);
    for (const a of this.agents.list) if (a.mode === 'glass') this.drawAgent(c, a, o);
    this.drawPests(c, t, 'glass');

    // bubbles, food and motes
    for (const b of this.bubbles) {
      c.fillStyle = rgba(9, 0.55);
      c.fillRect(Math.round(b.x), Math.round(b.y), b.r > 1.1 ? 2 : 1, b.r > 1.1 ? 2 : 1);
    }
    for (const f of this.agents.food) {
      c.fillStyle = rgba(f.sunk ? 21 : 17, 1);
      c.fillRect(Math.round(f.x), Math.round(f.y), 1, 1);
    }
    for (const p of this.agents.puffs) {
      c.fillStyle = rgba(4, Math.min(0.7, p.life * 0.7));
      c.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (const m of this.motes) {
      c.fillStyle = rgba(8, 0.25 + t.chem.cloud * 0.3);
      c.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
    this.drawSideGlass(c);
    if (o.lightsOn) this.drawCaustics(c, t);

    // water tints: tea from tannins, pea soup from green water, milk from a bacterial bloom
    if (t.chem.tannin > 0.04) {
      c.fillStyle = rgba(21, Math.min(0.35, t.chem.tannin * 0.4));
      c.fillRect(0, g.surface, w, h - g.surface);
    }
    if (t.chem.algae > 0.45) {
      c.fillStyle = rgba(31, Math.min(0.45, (t.chem.algae - 0.45) * 0.9));
      c.fillRect(0, g.surface, w, h - g.surface);
    }
    if (t.chem.cloud > 0.05) {
      c.fillStyle = rgba(8, Math.min(0.5, t.chem.cloud * 0.55));
      c.fillRect(0, g.surface, w, h - g.surface);
    }
    this.drawLighting(c, t, o);
    if (this.glassDirty) this.redrawGlass();
    c.drawImage(this.glassCanvas, 0, 0);
    // a faint diagonal glare on the glass
    c.fillStyle = 'rgba(255,255,255,0.035)';
    c.beginPath();
    c.moveTo(w * 0.08, 0);
    c.lineTo(w * 0.2, 0);
    c.lineTo(w * 0.05, h);
    c.lineTo(-w * 0.07, h);
    c.fill();
    if (o.tool) this.drawTool(c, o.tool);
    c.restore();
    this.drawFrame(t);
  }

  private clipInterior(c: CanvasRenderingContext2D) {
    const { w, h, shell } = this.g;
    c.beginPath();
    if (shell.shape === 'bowl') c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shell.shape === 'kreisel') c.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    else if (shell.shape === 'hex') {
      const k = Math.round(w * 0.18);
      c.moveTo(k, 0); c.lineTo(w - k, 0); c.lineTo(w, k); c.lineTo(w, h); c.lineTo(0, h); c.lineTo(0, k);
      c.closePath();
    } else if (shell.shape === 'cylinder') {
      c.moveTo(0, 0); c.lineTo(w, 0); c.lineTo(w, h - 10); c.ellipse(w / 2, h - 10, w / 2, 10, 0, 0, Math.PI); c.closePath();
    } else c.rect(0, 0, w, h);
    c.clip();
  }

  private drawShafts(c: CanvasRenderingContext2D) {
    const { w, h, surface } = this.g;
    for (let i = 0; i < 4; i++) {
      const x = ((i * 0.27 + this.time * 0.006 * (i % 2 ? 1 : -0.7)) % 1.2) * w - w * 0.1;
      const wd = w * (0.05 + (i % 3) * 0.025);
      const a = 0.05 + 0.025 * Math.sin(this.time * 0.4 + i * 2);
      c.fillStyle = `rgba(255,250,220,${a.toFixed(3)})`;
      c.beginPath();
      c.moveTo(x, surface);
      c.lineTo(x + wd, surface);
      c.lineTo(x + wd + h * 0.25, h);
      c.lineTo(x + h * 0.25, h);
      c.fill();
    }
  }

  /** The end panes seen at a slight angle: a shadowed sliver of water at each end, edged with
   *  a line of light where the glass turns the corner. It reads as a box with depth. */
  private drawSideGlass(c: CanvasRenderingContext2D) {
    const { w, h, surface } = this.g;
    const wx = Math.min(w, this.g.landX);
    const sw = Math.max(3, Math.round(w * 0.022));
    for (const right of [false, true]) {
      for (let i = 0; i < sw; i++) {
        c.fillStyle = rgba(0, 0.18 * (1 - i / sw));
        c.fillRect(right ? wx - 1 - i : i, surface, 1, h - surface);
      }
      c.fillStyle = rgba(9, 0.1);
      c.fillRect(right ? wx - sw : sw, surface + 1, 1, h - surface - 2);
    }
  }

  private drawCaustics(c: CanvasRenderingContext2D, t: Tank) {
    const { w } = this.g;
    c.fillStyle = 'rgba(255,255,230,0.28)';
    for (let x = 0; x < Math.min(w, this.g.landX); x++) {
      const v = Math.sin(x * 0.35 + this.time * 1.3) + Math.sin(x * 0.13 - this.time * 0.9) + Math.sin(x * 0.71 + this.time * 0.4);
      if (v > 1.6) {
        const y = groundY(t, this.g, x, 2);
        c.fillRect(x, y, 1, 1);
        if (v > 2.2) c.fillRect(x, groundY(t, this.g, x, 1), 1, 1);
      }
    }
  }

  private drawGear(c: CanvasRenderingContext2D, t: Tank) {
    const { w, surface } = this.g;
    const wx = Math.min(w, this.g.landX);
    const floor = (x: number) => groundY(t, this.g, x, 0);
    // PixelLab gear (eq:<name>) when its sheet has loaded, else the simple shapes below.
    // Imported gear is placed by its top edge (hung from the rim) or by its foot (on the ground).
    const art = (n: string) => importedFrame(`eq:${n}`);
    const hang = (f: Frame, x: number, y: number, flip = false) => drawFrame(c, f, x, y + f.ay, flip);
    const airline = (x: number, bottom: number) => {
      c.fillStyle = rgba(7, 0.5);
      c.fillRect(x, surface, 1, Math.max(0, bottom - surface));
    };
    for (const id of t.equip) {
      const e = equip(id);
      switch (e.slot) {
        case 'heater': {
          const f = art(id === 'titanium_heater' ? 'titanium_heater' : 'heater');
          if (f) {
            hang(f, wx - 8, surface + 2);
            break;
          }
          // a glass heater tube in the back corner, the element glowing faintly
          const x = wx - 9, y0 = surface + 4, y1 = Math.min(floor(x) - 6, y0 + 34);
          c.fillStyle = rgba(8, 0.35);
          c.fillRect(x, y0, 3, y1 - y0);
          c.fillStyle = rgba(13, 0.45);
          c.fillRect(x + 1, y0 + 6, 1, y1 - y0 - 10);
          c.fillStyle = rgba(1, 1);
          c.fillRect(x, y0 - 2, 3, 3);
          break;
        }
        case 'filter': {
          if (id === 'sponge_filter') {
            const f = art('sponge_filter');
            if (f) {
              const y = floor(12);
              drawFrame(c, f, 12, y);
              airline(12, y - f.h);
              break;
            }
            const y = floor(10);
            c.fillStyle = rgba(1, 1);
            c.fillRect(6, y - 13, 8, 13);
            c.fillStyle = rgba(2, 1);
            for (let k = 0; k < 6; k++) c.fillRect(7 + (k % 3) * 2, y - 12 + Math.floor(k / 3) * 5, 1, 1);
            airline(9, y - 13);
          } else if (id === 'hob_filter') {
            const f = art('hob');
            if (f) hang(f, wx - f.w + f.ax - 2, surface - 6);
            else {
              c.fillStyle = rgba(1, 0.85);
              c.fillRect(wx - 20, surface - 4, 3, 40);
            }
          } else if (id === 'canister_filter' || id === 'canister_pro') {
            // glass lily pipes: the nature-aquarium signature
            const fi = art('lily_in'), fo = art('lily_out');
            if (fi && fo) {
              hang(fi, 3 + fi.ax, surface - 6);
              hang(fo, wx - 3 - fo.w + fo.ax, surface - 6);
              break;
            }
            c.fillStyle = rgba(8, 0.45);
            c.fillRect(6, surface - 4, 2, 30);
            c.fillRect(6, surface + 24, 5, 2);
            c.fillRect(wx - 10, surface - 4, 2, 12);
            c.fillRect(wx - 14, surface + 7, 6, 2);
          } else if (id === 'sump' || id === 'life_support') {
            c.fillStyle = rgba(1, 0.7);
            c.fillRect(wx - 12, surface - 6, 8, 6);
          }
          break;
        }
        case 'flow': {
          const f = art(id === 'powerhead' ? 'powerhead' : 'wavemaker');
          if (f) {
            hang(f, 3 + f.ax, surface + 6);
            if (id === 'wavemaker') hang(f, wx - 3 - f.w + f.ax, surface + 6, true);
            break;
          }
          c.fillStyle = rgba(0, 1);
          c.fillRect(4, surface + 8, 7, 5);
          c.fillStyle = rgba(2, 1);
          c.fillRect(11, surface + 9, 2, 3);
          if (id === 'wavemaker') {
            c.fillStyle = rgba(0, 1);
            c.fillRect(wx - 11, surface + 8, 7, 5);
          }
          break;
        }
        case 'air': {
          const x = Math.round(wx * 0.12);
          const f = art('airstone');
          if (f) {
            drawFrame(c, f, x, floor(x) - 1);
            airline(x, floor(x) - f.h);
            break;
          }
          airline(x, floor(x) - 2);
          c.fillStyle = rgba(2, 1);
          c.fillRect(x - 2, floor(x) - 3, 5, 2);
          break;
        }
        case 'co2': {
          const x = wx - 14;
          const f = art('co2');
          if (f) {
            drawFrame(c, f, x, floor(x) - 4);
            break;
          }
          c.fillStyle = rgba(8, 0.5);
          c.fillRect(x, floor(x) - 8, 4, 3);
          break;
        }
        case 'mister': {
          // the fogger nozzle hangs over the land and mists it
          const f = art('mister');
          if (f && this.g.landX < w) hang(f, Math.round((this.g.landX + w) / 2), 1);
          break;
        }
      }
    }
  }


  private drawItem(c: CanvasRenderingContext2D, t: Tank, p: Tank['items'][number], frame: number, o: DrawOpts) {
    const it = item(p.id);
    const base = itemBase(t, p);
    const f = itemFrame(p.id, p.size, p.seed, frame + (p.seed % 4), p.health);
    const by = it.place === 'surface' ? this.g.surface - 1 : it.place === 'hang' ? this.g.surface - 10 : base.y;
    if (it.place !== 'surface' && it.place !== 'hang' && !p.on && it.cat !== 'plant') {
      c.fillStyle = rgba(0, 0.16);
      c.beginPath();
      c.ellipse(base.x + 2, by, Math.max(3, f.w * 0.42), Math.max(1.5, f.h * 0.05), 0, 0, Math.PI * 2);
      c.fill();
    }
    drawFrame(c, f, base.x, by, p.flip);
    const rx = base.x - f.ax, ry = by - f.ay;
    this.itemRects.push({ uid: p.uid, x: rx, y: ry, w: f.w, h: f.h });
    // algae dusting on hard surfaces when the tank is out of balance
    if (t.chem.algae > 0.3 && (it.cat === 'rock' || it.cat === 'wood' || it.cat === 'decor')) {
      c.fillStyle = rgba(31, Math.min(0.6, (t.chem.algae - 0.3) * 1.2));
      for (let i = 0; i < f.w * 0.6; i++) {
        const x = rx + Math.floor(hash2(i, p.uid, 3) * f.w);
        c.fillRect(x, ry + 2 + Math.floor(hash2(i, p.uid, 4) * 3), 1, 1);
      }
    }
    if (o.hoverItem === p.uid || o.selectItem === p.uid) this.bracket(c, rx, ry, f.w, f.h, o.selectItem === p.uid ? 18 : 9);
  }

  private drawGhost(c: CanvasRenderingContext2D, t: Tank, gh: NonNullable<DrawOpts['ghost']>, frame: number) {
    const it = item(gh.id);
    const f = itemFrame(gh.id, it.plant ? 0.7 : 1, 1, frame, 1);
    let y: number;
    if (it.place === 'surface') y = this.g.surface - 1;
    else if (it.place === 'hang') y = this.g.surface - 10;
    else if (it.place === 'land') y = this.g.surface - 2;
    else y = groundY(t, this.g, gh.x, gh.layer) - (gh.y ?? 0);
    drawFrame(c, f, gh.x, y, false, 0.65);
    this.bracket(c, gh.x - f.ax, y - f.ay, f.w, f.h, gh.ok ? 32 : 15);
  }

  private bracket(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, col: number) {
    c.fillStyle = rgba(col, 1);
    const k = 3, x1 = Math.round(x) - 1, y1 = Math.round(y) - 1, x2 = Math.round(x + w), y2 = Math.round(y + h);
    c.fillRect(x1, y1, k, 1);
    c.fillRect(x1, y1, 1, k);
    c.fillRect(x2 - k + 1, y1, k, 1);
    c.fillRect(x2, y1, 1, k);
    c.fillRect(x1, y2, k, 1);
    c.fillRect(x1, y2 - k + 1, 1, k);
    c.fillRect(x2 - k + 1, y2, k, 1);
    c.fillRect(x2, y2 - k + 1, 1, k);
  }

  private drawAgent(c: CanvasRenderingContext2D, a: Agent, o: DrawOpts, shade = 1, silhouette = false) {
    const frame = Math.floor(a.phase) % 4;
    const depth = a.mode === 'swim' || a.mode === 'perch' || a.mode === 'drift' ? 0.8 + 0.2 * a.z : 1;
    const fr: Frame = creatureFrame(a.sp, frame, Math.max(3, Math.round(a.len * depth)));
    if (silhouette) {
      // a dark shape in the shadow under the wood, the way it reads from the front glass
      drawFrame(c, silhouetteOf(fr), a.x, a.y, a.face < 0, 0.8);
      const hw = fr.w, hh = fr.h;
      // two pale eye glints facing out of the dark
      c.fillStyle = rgba(8, 0.55);
      c.fillRect(Math.round(a.x + a.face * (hw / 2 - 3)), Math.round(a.y - hh * 0.12), 1, 1);
      if (o.hoverAgent === a.uid || o.selectAgent === a.uid) this.bracket(c, Math.round(a.x - hw / 2), Math.round(a.y - hh / 2), hw, hh, o.selectAgent === a.uid ? 18 : 9);
      return;
    }
    let alpha = (1 - a.hidden * 0.55) * shade;
    if (a.def.tags.includes('neo_color') && a.def.id !== 'wild_neocaridina') alpha *= 0.55 + a.grade * 0.15;
    if (a.den === BURIED && a.inDen > 0.05) {
      // dug into the sand: the body sinks below the surface and only the head end stays out
      const ground = groundY(this.drawing!, this.g, a.x, a.layer);
      // how much of the frame stays above the sand line: the whole fish on the way down, a head at rest
      const out = Math.round(4 + (1 - a.inDen) * (fr.h - 4));
      const vis = Math.max(3, Math.round(fr.w * (1 - 0.7 * a.inDen)));
      const cx = a.face > 0 ? Math.round(a.x + fr.w / 2) - vis : Math.round(a.x - fr.w / 2);
      c.save();
      c.beginPath();
      c.rect(cx, ground - fr.h - 4, vis, fr.h + 4);
      c.clip();
      drawFrame(c, fr, a.x, ground - out + fr.ay, a.face < 0, alpha);
      c.restore();
      // a little dimple of disturbed sand where the rest of it went
      c.fillStyle = rgba(0, 0.16 * a.inDen);
      c.fillRect(Math.round(a.x - fr.w * 0.35), Math.round(ground - 1), Math.round(fr.w * 0.7), 1);
    } else if (a.mode === 'burrow') {
      // garden eels: only the top shows above the sand
      const show = Math.round(fr.h * (1 - a.hidden));
      c.save();
      c.beginPath();
      c.rect(a.x - fr.w, a.y - show, fr.w * 2, show);
      c.clip();
      drawFrame(c, fr, a.x, a.y - show / 2, a.face < 0, alpha);
      c.restore();
    } else drawFrame(c, fr, a.x, a.y, a.face < 0, alpha);
    if (o.hoverAgent === a.uid || o.selectAgent === a.uid) this.bracket(c, Math.round(a.x - fr.w / 2), Math.round(a.y - fr.h / 2), fr.w, fr.h, o.selectAgent === a.uid ? 18 : 9);
  }

  private drawSurface(c: CanvasRenderingContext2D, t: Tank) {
    const { w, surface } = this.g;
    const wx = Math.min(w, this.g.landX);
    for (let x = 0; x < wx; x++) {
      const r = Math.sin(x * 0.25 + this.time * 2) + Math.sin(x * 0.09 - this.time * 1.3);
      c.fillStyle = rgba(r > 0.8 ? 9 : 8, r > 0.8 ? 0.8 : 0.45);
      c.fillRect(x, surface + (r > 1.2 ? -1 : 0), 1, 1);
      if (r > 0.3) {
        c.fillStyle = rgba(9, 0.12);
        c.fillRect(x, surface + 2, 1, 1);
      }
    }
    // the outflow churns the surface near the filter
    if (t.equip.includes('hob_filter')) {
      c.fillStyle = rgba(9, 0.6);
      for (let i = 0; i < 6; i++) c.fillRect(wx - 22 + Math.round(hash2(i, Math.floor(this.time * 8), 3) * 10), surface + Math.round(hash2(i, Math.floor(this.time * 8), 4) * 3), 1, 1);
    }
  }

  private drawBags(c: CanvasRenderingContext2D, t: Tank) {
    const { surface } = this.g;
    const wx = Math.min(this.g.w, this.g.landX);
    t.bags.forEach((b, i) => {
      const x = Math.round(wx * (0.3 + 0.18 * i) % (wx - 20)) + 10;
      const y = surface + Math.round(Math.sin(this.time * 1.5 + i) * 1);
      c.fillStyle = rgba(8, 0.35);
      c.beginPath();
      c.ellipse(x, y + 5, 8, 6, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = rgba(9, 0.6);
      c.fillRect(x - 1, y - 3, 2, 3);
      c.fillRect(x - 6, y + 1, 1, 6);
      const col = RAMP[species(b.sp).look.body];
      c.fillStyle = rgba(col[Math.floor(col.length / 2)], 1);
      for (let k = 0; k < Math.min(6, b.n); k++) c.fillRect(x - 4 + ((k * 3) % 8) + Math.round(Math.sin(this.time * 3 + k)), y + 3 + Math.floor(k / 3) * 3, 2, 1);
    });
  }

  private drawPests(c: CanvasRenderingContext2D, t: Tank, where: 'ground' | 'glass') {
    const n = Math.min(24, Math.ceil(t.pests.snails));
    if (where === 'glass') {
      for (let i = 0; i < n; i++) {
        if (i % 3 === 0) continue;
        const x = (hash2(i, t.id, 1) * Math.min(this.g.w, this.g.landX) + this.time * 0.4 * (hash2(i, 2, 3) - 0.5)) % this.g.w;
        const y = this.g.surface + 6 + hash2(i, t.id, 2) * (this.g.h - this.g.surface - 20) + Math.sin(this.time * 0.05 + i) * 4;
        c.fillStyle = rgba(i % 2 ? 3 : 20, 1);
        c.fillRect(Math.round(x), Math.round(y), 2, 2);
        c.fillStyle = rgba(4, 1);
        c.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    } else {
      for (let i = 0; i < n; i += 3) {
        const x = Math.floor(hash2(i, t.id, 5) * Math.min(this.g.w, this.g.landX));
        const y = groundY(t, this.g, x, 2);
        c.fillStyle = rgba(3, 1);
        c.fillRect(x, y - 2, 2, 2);
      }
      // aiptasia and bubble algae on the rock
      const rocks = t.items.filter((p) => item(p.id).cat === 'rock');
      if (rocks.length) {
        for (let i = 0; i < Math.min(12, Math.ceil(t.pests.aiptasia)); i++) {
          const r = rocks[i % rocks.length];
          const b = itemBase(t, r);
          const it = item(r.id);
          const x = b.x + Math.round((hash2(i, r.uid, 7) - 0.5) * it.w * 0.7), y = b.y - Math.round(hash2(i, r.uid, 8) * it.h * 0.8);
          c.fillStyle = rgba(20, 0.9);
          c.fillRect(x, y - 2, 1, 2);
          c.fillStyle = rgba(4, 0.9);
          c.fillRect(x - 1, y - 3, 3, 1);
        }
        for (let i = 0; i < Math.min(12, Math.ceil(t.pests.bubble)); i++) {
          const r = rocks[(i + 1) % rocks.length];
          const b = itemBase(t, r);
          const it = item(r.id);
          c.fillStyle = rgba(31, 1);
          c.fillRect(b.x + Math.round((hash2(i, r.uid, 9) - 0.5) * it.w * 0.7), b.y - Math.round(hash2(i, r.uid, 10) * it.h * 0.7), 2, 2);
        }
      }
    }
  }

  private drawLighting(c: CanvasRenderingContext2D, t: Tank, o: DrawOpts) {
    const { w, h } = this.g;
    const night = o.hour < 7 || o.hour >= 21;
    const lights = t.equip.map((e) => equip(e)).filter((e) => e.slot === 'light');
    const tint = lights.length ? lights.reduce((a, b) => ((b.par ?? 0) > (a.par ?? 0) ? b : a)).tint : undefined;
    if (o.lightsOn && lights.length) {
      if (tint === 'actinic') {
        c.fillStyle = 'rgba(70,60,200,0.10)';
        c.fillRect(0, 0, w, h);
      } else if (tint === 'warm') {
        c.fillStyle = 'rgba(255,190,120,0.06)';
        c.fillRect(0, 0, w, h);
      } else if (tint === 'planted') {
        c.fillStyle = 'rgba(255,120,190,0.04)';
        c.fillRect(0, 0, w, h);
      }
      return;
    }
    const moon = t.equip.includes('moonlight');
    let a = night ? 0.62 : o.open ? 0.3 : 0.45;
    if (moon && night) a = 0.48;
    c.fillStyle = moon && night ? `rgba(18,28,80,${a})` : `rgba(12,10,32,${a})`;
    c.fillRect(0, 0, w, h);
    // glowing things shine through the dark: lanternfish, flashlight fish, fluorescent corals
    for (const ag of this.agents.list) {
      const s = ag.def;
      if (!s.tags.includes('glow') && !s.tags.includes('bioluminescent')) continue;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2 + ag.uid);
      c.fillStyle = `rgba(140,255,230,${(0.12 + pulse * 0.12).toFixed(3)})`;
      c.beginPath();
      c.arc(ag.x, ag.y, 3 + ag.len * 0.25, 0, Math.PI * 2);
      c.fill();
      drawFrame(c, creatureFrame(ag.sp, Math.floor(ag.phase) % 4, ag.len), ag.x, ag.y, ag.face < 0, 0.75);
    }
    if (moon) for (const p of t.items) {
      const it = item(p.id);
      if (!it.coral?.glow) continue;
      const b = itemBase(t, p);
      drawFrame(c, itemFrame(p.id, p.size, p.seed, Math.floor(this.time * 2.2), p.health), b.x, b.y, p.flip, 0.55);
    }
  }

  private drawTool(c: CanvasRenderingContext2D, tool: NonNullable<DrawOpts['tool']>) {
    const { x, y } = tool;
    if (tool.kind === 'scrape') {
      c.fillStyle = rgba(46, 0.9);
      c.fillRect(Math.round(x) - 6, Math.round(y) - 1, 12, 3);
      c.fillStyle = rgba(9, 0.9);
      c.fillRect(Math.round(x) - 6, Math.round(y) - 2, 12, 1);
      c.fillStyle = rgba(2, 0.9);
      c.fillRect(Math.round(x) - 1, Math.round(y) + 2, 2, 6);
    } else {
      c.fillStyle = rgba(18, 0.85);
      c.fillRect(Math.round(x) - 6, Math.round(y) - 4, 12, 8);
      c.fillStyle = rgba(28, 0.85);
      c.fillRect(Math.round(x) - 6, Math.round(y) - 4, 12, 2);
    }
  }

  private drawStand(t: Tank) {
    const c = this.ctx;
    const sh = this.g.shell;
    const W = this.canvas.width, H = this.canvas.height;
    const top = MARGIN.t + this.g.h;
    if (sh.tags.includes('exhibit')) {
      // exhibit tanks are set into a wall of sage stone blocks, like the hall around them
      c.fillStyle = rgba(36, 1);
      c.fillRect(0, 0, W, H);
      c.fillStyle = rgba(35, 1);
      for (let y = 5; y < H; y += 6) {
        c.fillRect(0, y, W, 1);
        for (let x = (y / 6) % 2 ? 0 : 8; x < W; x += 16) c.fillRect(x, y - 5, 1, 5);
      }
      return;
    }
    const key = `${t.shell}|${W}|${H}`;
    if (!this.stand || this.standKey !== key) {
      this.stand = this.cabinet(W, H - top - 1, sh.tags.includes('drilled'));
      this.standKey = key;
    }
    c.drawImage(this.stand, 0, top + 1);
  }

  /**
   * The cabinet under a tank: an overhanging top board, paneled doors with brass knobs and a dark
   * plinth. Warm wood (RAMP.wood) by default; reef-ready (drilled) tanks sit on a black cabinet.
   */
  private cabinet(W: number, H: number, black: boolean): HTMLCanvasElement {
    const px = new Pix(W, H);
    // shadow, dark, body, light, highlight
    const [sd, dk, bd, lt, hi] = black ? [0, 1, 5, 2, 6] : RAMP.wood;
    const x0 = 3, x1 = W - 4, foot = H - 2;
    px.rect(2, 0, W - 4, 1, hi);
    px.rect(2, 1, W - 4, 2, lt);
    px.rect(2, 3, W - 4, 1, sd);
    px.rect(x0, 4, x1 - x0 + 1, foot - 4, bd);
    px.rect(x0, foot, x1 - x0 + 1, 2, sd);
    px.rect(x0 + 1, foot + 1, 3, 1, dk);
    px.rect(x1 - 3, foot + 1, 3, 1, dk);
    // doors in pairs, about 48 px each
    const n = Math.max(2, Math.round((x1 - x0) / 48 / 2) * 2);
    const dw = (x1 - x0 + 1) / n;
    for (let i = 0; i < n; i++) {
      const a = Math.round(x0 + i * dw), b = Math.round(x0 + (i + 1) * dw) - 1;
      const top = 5, bot = foot - 2;
      if (i > 0) px.rect(a, 4, 1, foot - 4, sd);
      if (bot - top < 5) continue;
      // raised panel: lit top and left, shaded bottom and right, a little grain inside
      px.rect(a + 2, top, b - a - 3, 1, lt);
      px.rect(a + 2, top, 1, bot - top, lt);
      px.rect(a + 2, bot, b - a - 3, 1, dk);
      px.rect(b - 1, top, 1, bot - top + 1, dk);
      for (let y = top + 2; y < bot - 1; y++) for (let x = a + 4; x < b - 2; x++) if (hash2(x >> 3, y, 41) < 0.18 && hash2(x, y, 42) < 0.7) px.set(x, y, dk);
      // knobs meet at the middle of each pair
      const kx = i % 2 ? a + 3 : b - 4, ky = Math.round((top + bot) / 2) - 1;
      px.rect(kx, ky, 2, 2, 18);
      px.set(kx, ky, 23);
    }
    return px.toCanvas();
  }

  private drawFrame(t: Tank) {
    const c = this.ctx;
    const g = this.g;
    const sh = g.shell;
    const x0 = MARGIN.l, y0 = MARGIN.t, w = g.w, h = g.h;
    const light = t.equip.map((e) => equip(e)).find((e) => e.slot === 'light');
    if (sh.shape === 'bowl' || sh.shape === 'kreisel') {
      c.strokeStyle = rgba(sh.shape === 'kreisel' ? 0 : 8, sh.shape === 'kreisel' ? 1 : 0.6);
      c.lineWidth = sh.shape === 'kreisel' ? 4 : 1;
      c.beginPath();
      c.ellipse(x0 + w / 2, y0 + h / 2, w / 2 + (sh.shape === 'kreisel' ? 2 : 0.5), h / 2 + (sh.shape === 'kreisel' ? 2 : 0.5), 0, 0, Math.PI * 2);
      c.stroke();
      c.lineWidth = 1;
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(x0 + w * 0.2, y0 + h * 0.2, 2, h * 0.25);
    } else if (sh.tags.includes('exhibit')) {
      // a thick acrylic window in a rendered wall
      c.fillStyle = rgba(0, 1);
      c.fillRect(x0 - 4, y0 - 4, w + 8, 4);
      c.fillRect(x0 - 4, y0 + h, w + 8, 4);
      c.fillRect(x0 - 4, y0, 4, h);
      c.fillRect(x0 + w, y0, 4, h);
      c.fillStyle = rgba(6, 1);
      c.fillRect(x0 - 4, y0 - 4, w + 8, 1);
    } else if (sh.tags.includes('rimless')) {
      c.fillStyle = 'rgba(200,230,230,0.55)';
      c.fillRect(x0 - 1, y0, 1, h);
      c.fillRect(x0 + w, y0, 1, h);
      c.fillRect(x0 - 1, y0 - 1, w + 2, 1);
      c.fillStyle = rgba(0, 1);
      c.fillRect(x0 - 1, y0 + h, w + 2, 1);
      c.fillStyle = 'rgba(255,255,255,0.7)';
      c.fillRect(x0 - 1, y0 - 1, 3, 1);
      c.fillRect(x0 + w - 2, y0 - 1, 3, 1);
    } else {
      // a black plastic rim, top and bottom
      c.fillStyle = rgba(0, 1);
      if (!sh.tags.includes('open_top')) c.fillRect(x0 - 2, y0 - 3, w + 4, 3);
      c.fillRect(x0 - 2, y0 + h, w + 4, 3);
      c.fillRect(x0 - 2, y0, 1, h);
      c.fillRect(x0 + w + 1, y0, 1, h);
      c.fillStyle = rgba(1, 1);
      c.fillRect(x0 - 2, y0 - 3, w + 4, 1);
      c.fillStyle = 'rgba(200,230,230,0.4)';
      c.fillRect(x0 - 1, y0, 1, h);
      c.fillRect(x0 + w, y0, 1, h);
    }
    if (light && !sh.tags.includes('exhibit')) {
      // the light: a slim bar on legs, or a pendant over open tops
      const lit = light.par ?? 0;
      const glow = lit > 200 ? 18 : 28;
      if (light.id === 'metal_halide' || sh.tags.includes('open_top')) {
        c.fillStyle = rgba(1, 1);
        c.fillRect(x0 + w / 2 - 1, 0, 2, MARGIN.t - 7);
        c.fillRect(x0 + w / 2 - 12, MARGIN.t - 8, 24, 4);
        c.fillStyle = rgba(glow, 1);
        c.fillRect(x0 + w / 2 - 10, MARGIN.t - 4, 20, 1);
      } else {
        c.fillStyle = rgba(0, 1);
        c.fillRect(x0 + 4, MARGIN.t - 9, w - 8, 3);
        c.fillRect(x0 + 6, MARGIN.t - 6, 1, 3);
        c.fillRect(x0 + w - 7, MARGIN.t - 6, 1, 3);
        c.fillStyle = rgba(glow, 1);
        c.fillRect(x0 + 6, MARGIN.t - 6, w - 12, 1);
      }
    }
  }
}
