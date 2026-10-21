// Creature motion for the tank view. Presentation only: the sim knows each animal's species,
// health and mood; here they get a position and a behavior from their zone and tags (schools
// that hold together, cories that glide and root along the bottom, nerites inching over the
// glass, jellies riding the kreisel's current, crabs pottering on the land shelf).
import { species } from '../data';
import type { SpeciesDef } from '../data/types';
import { Rng } from '../engine/rng';
import { type Geom, groundY } from '../sim/facts';
import type { Animal, Tank } from '../sim/state';
import { creatureLength } from './art/sprites';

export type Mode = 'swim' | 'bottom' | 'glass' | 'perch' | 'drift' | 'land' | 'burrow' | 'hide';

export interface Agent {
  uid: number;
  sp: string;
  def: SpeciesDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 1 faces right, -1 left */
  face: number;
  phase: number;
  mode: Mode;
  tx: number;
  ty: number;
  timer: number;
  /** startled: dart for a moment */
  scared: number;
  len: number;
  fry: boolean;
  grade: number;
  mood: number;
  /** depth layer it sits on (bottom dwellers), for the ground line */
  layer: 0 | 1 | 2;
  /** drawn half-hidden (burrowed, tucked into a cave in daylight) */
  hidden: number;
}

export interface Food {
  x: number;
  y: number;
  vy: number;
  life: number;
  sunk: boolean;
}

export interface SceneCtx {
  t: Tank;
  g: Geom;
  lightsOn: boolean;
  /** water movement 0..4 (drifts creatures and food) */
  flow: number;
  kreisel: boolean;
  caves: { x: number; y: number }[];
  perches: { x: number; y: number }[];
}

function modeFor(s: SpeciesDef, g: Geom): Mode {
  if (s.zone === 'land') return g.landX < g.w ? 'land' : 'bottom';
  if (s.body === 'gardeneel') return 'burrow';
  if (s.body === 'jelly') return 'drift';
  if (s.body === 'mussel' || s.kind === 'star' || s.kind === 'urchin' || s.kind === 'slug' || s.kind === 'isopod') return s.kind === 'star' || s.kind === 'urchin' || s.kind === 'slug' ? 'glass' : 'bottom';
  switch (s.zone) {
    case 'glass': return 'glass';
    case 'bottom': case 'substrate': return 'bottom';
    case 'rock': return 'perch';
    case 'drift': return 'drift';
    default:
      if (s.kind === 'snail') return 'glass';
      if (s.kind === 'shrimp' || s.kind === 'crab' || s.kind === 'crayfish') return 'bottom';
      return 'swim';
  }
}

function band(s: SpeciesDef, g: Geom): [number, number] {
  const top = g.surface + 3, bot = g.h - g.maxDepth * 0.8 - 4;
  const span = Math.max(8, bot - top);
  switch (s.zone) {
    case 'surface': return [top, top + span * 0.18];
    case 'top': return [top, top + span * 0.45];
    case 'mid': return [top + span * 0.2, top + span * 0.8];
    default: return [top + span * 0.1, bot];
  }
}

export class Agents {
  list: Agent[] = [];
  food: Food[] = [];
  private rng = new Rng(7);
  private byUid = new Map<number, Agent>();

  /** Match agents to the tank's animals: new arrivals splash in from the surface. */
  sync(t: Tank, g: Geom, released: Set<string>) {
    const seen = new Set<number>();
    for (const a of t.animals) {
      seen.add(a.uid);
      let ag = this.byUid.get(a.uid);
      if (!ag) {
        ag = this.spawn(a, t, g, released.has(a.sp));
        this.byUid.set(a.uid, ag);
        this.list.push(ag);
      }
      ag.fry = a.fry;
      const adult = creatureLength(a.sp);
      ag.len = a.fry ? Math.max(4, Math.round(adult * 0.5)) : adult;
      ag.grade = a.grade;
      ag.mood = a.mood;
    }
    if (seen.size !== this.list.length) {
      this.list = this.list.filter((ag) => seen.has(ag.uid));
      for (const uid of [...this.byUid.keys()]) if (!seen.has(uid)) this.byUid.delete(uid);
    }
  }

  private spawn(a: Animal, t: Tank, g: Geom, fromBag: boolean): Agent {
    const def = species(a.sp);
    const r = this.rng;
    const mode = modeFor(def, g);
    const [y0, y1] = band(def, g);
    const x = mode === 'land' ? r.range(g.landX + 6, g.w - 6) : r.range(10, Math.min(g.landX, g.w) - 10);
    const layer = r.int(0, 2) as 0 | 1 | 2;
    let y = fromBag ? g.surface + 4 : r.range(y0, y1);
    if (!fromBag && (mode === 'bottom' || mode === 'burrow')) y = groundY(t, g, x, layer) - 2;
    if (mode === 'land') y = g.surface - 2;
    return {
      uid: a.uid, sp: a.sp, def, x, y, vx: r.range(-4, 4), vy: 0, face: r.chance(0.5) ? 1 : -1, phase: r.range(0, 4),
      mode, tx: x, ty: y, timer: r.range(0, 3), scared: 0, len: creatureLength(a.sp), fry: a.fry, grade: a.grade, mood: a.mood, layer, hidden: 0,
    };
  }

  feed(g: Geom, n: number) {
    for (let i = 0; i < n; i++) {
      this.food.push({ x: this.rng.range(g.w * 0.25, Math.min(g.landX, g.w) * 0.75), y: g.surface + 1, vy: this.rng.range(4, 9), life: 90, sunk: false });
    }
  }

  startle() {
    for (const a of this.list) {
      if (a.mode === 'swim' || a.mode === 'perch' || a.mode === 'bottom') {
        a.scared = 0.8 + this.rng.range(0, 0.6);
        const ang = this.rng.range(0, Math.PI * 2);
        a.vx += Math.cos(ang) * 40;
        a.vy += Math.sin(ang) * 20;
      }
    }
  }

  update(dt: number, c: SceneCtx) {
    const { t, g } = c;
    const r = this.rng;
    const waterR = Math.min(g.landX, g.w) - 3;
    // food sinks, drifts with the current, and slowly dissolves
    for (const f of this.food) {
      if (!f.sunk) {
        f.y += f.vy * dt;
        f.x += Math.sin(f.y * 0.2) * 0.3 + (c.flow - 1) * 1.5 * dt;
        const gy = groundY(t, g, f.x, 2) - 1;
        if (f.y >= gy) {
          f.y = gy;
          f.sunk = true;
        }
      }
      f.life -= dt;
    }
    this.food = this.food.filter((f) => f.life > 0);

    // per-species school centers for cohesion
    const centers = new Map<string, { x: number; y: number; vx: number; vy: number; n: number }>();
    for (const a of this.list) {
      if (a.mode !== 'swim') continue;
      const ce = centers.get(a.sp) ?? { x: 0, y: 0, vx: 0, vy: 0, n: 0 };
      ce.x += a.x; ce.y += a.y; ce.vx += a.vx; ce.vy += a.vy; ce.n++;
      centers.set(a.sp, ce);
    }

    for (const a of this.list) {
      const s = a.def;
      const speed = (a.fry ? 0.6 : 1) * Math.min(26, 5 + a.len * 0.35) * (a.scared > 0 ? 2.6 : 1);
      const nocturnalDay = s.tags.includes('nocturnal') && c.lightsOn;
      a.timer -= dt;
      a.scared = Math.max(0, a.scared - dt);
      a.hidden += ((nocturnalDay && a.mode !== 'drift' ? 1 : 0) - a.hidden) * Math.min(1, dt * 0.8);

      // hungry fish chase sinking food
      let chasing = false;
      if (this.food.length && a.mode !== 'drift' && a.mode !== 'land' && a.mode !== 'burrow' && !nocturnalDay) {
        let best: Food | null = null, bd = 60 * 60;
        for (const f of this.food) {
          if ((a.mode === 'swim' || a.mode === 'perch') === f.sunk && a.mode !== 'glass') continue;
          const d = (f.x - a.x) ** 2 + (f.y - a.y) ** 2;
          if (d < bd) {
            bd = d;
            best = f;
          }
        }
        if (best) {
          chasing = true;
          a.tx = best.x;
          a.ty = best.y;
          if (bd < 9) best.life = 0;
        }
      }

      switch (a.mode) {
        case 'swim': case 'perch': {
          const [y0, y1] = band(s, g);
          if (!chasing && (a.timer <= 0 || Math.hypot(a.tx - a.x, a.ty - a.y) < 4)) {
            a.timer = r.range(1.5, 5);
            if (nocturnalDay && c.caves.length) {
              const cv = r.pick(c.caves);
              a.tx = cv.x + r.range(-4, 4);
              a.ty = cv.y - 3;
            } else if (a.mode === 'perch' && c.perches.length) {
              const p = r.pick(c.perches);
              a.tx = p.x + r.range(-10, 10);
              a.ty = p.y - r.range(2, 14);
            } else {
              a.tx = r.range(8, waterR - 8);
              a.ty = r.range(y0, y1);
            }
          }
          let ax = (a.tx - a.x) * 0.6, ay = (a.ty - a.y) * 0.6;
          const ce = centers.get(a.sp);
          if (ce && ce.n > 1 && (s.tags.includes('schooling') || s.tags.includes('shoaling')) && !chasing) {
            const k = s.tags.includes('schooling') ? 1 : 0.4;
            ax += ((ce.x / ce.n - a.x) * 0.8 + (ce.vx / ce.n - a.vx) * 0.6) * k;
            ay += ((ce.y / ce.n - a.y) * 0.8 + (ce.vy / ce.n - a.vy) * 0.6) * k;
          }
          // keep a little room between neighbors
          for (const b of this.list) {
            if (b === a || b.mode !== 'swim') continue;
            const dx = a.x - b.x, dy = a.y - b.y;
            const d2 = dx * dx + dy * dy;
            const min = (a.len + b.len) * 0.35;
            if (d2 < min * min && d2 > 0.01) {
              ax += (dx / Math.sqrt(d2)) * 30;
              ay += (dy / Math.sqrt(d2)) * 30;
            }
          }
          a.vx += ax * dt;
          a.vy += ay * dt;
          const sp = Math.hypot(a.vx, a.vy);
          const max = nocturnalDay ? speed * 0.25 : speed;
          if (sp > max) {
            a.vx *= max / sp;
            a.vy *= max / sp;
          }
          a.vy *= 1 - Math.min(1, dt * 1.5);
          break;
        }
        case 'bottom': {
          // glide a little, stop and root about, glide again
          if (!chasing && a.timer <= 0) {
            a.timer = r.range(1, 4);
            a.tx = Math.max(6, Math.min(waterR - 6, a.x + r.range(-50, 50)));
            if (r.chance(0.2)) a.layer = r.int(0, 2) as 0 | 1 | 2;
          }
          const dx = a.tx - a.x;
          const crawl = s.kind === 'snail' ? 1.5 : s.kind === 'fish' ? speed * 0.8 : speed * 0.45;
          a.vx = Math.abs(dx) > 1 ? Math.sign(dx) * Math.min(crawl, Math.abs(dx) * 2) : 0;
          a.vy = 0;
          a.y = groundY(t, g, a.x, a.layer) - Math.max(1, a.len * 0.12);
          break;
        }
        case 'glass': {
          // inch across the front glass, upward and sideways, sometimes down to graze the sand
          if (a.timer <= 0) {
            a.timer = r.range(4, 10);
            a.tx = Math.max(4, Math.min(waterR - 4, a.x + r.range(-30, 30)));
            a.ty = Math.max(g.surface + 3, Math.min(g.h - 8, a.y + r.range(-25, 25)));
          }
          const slow = s.kind === 'snail' ? 1.6 : s.kind === 'fish' ? 4 : 2.2;
          const dx = a.tx - a.x, dy = a.ty - a.y;
          const d = Math.hypot(dx, dy);
          a.vx = d > 1 ? (dx / d) * slow : 0;
          a.vy = d > 1 ? (dy / d) * slow : 0;
          a.y = Math.min(a.y, groundY(t, g, a.x, 2) - 2);
          break;
        }
        case 'drift': {
          // jellies pulse upward and sink; in a kreisel the current carries them round
          const pulse = Math.sin(a.phase * 1.4);
          if (c.kreisel) {
            const cx = g.w / 2, cy = (g.surface + g.h) / 2;
            const dx = a.x - cx, dy = a.y - cy;
            const d = Math.max(1, Math.hypot(dx, dy));
            a.vx = (-dy / d) * 5 + (dx / d) * (g.w * 0.3 - d) * 0.05;
            a.vy = (dx / d) * 5 + (dy / d) * (g.w * 0.3 - d) * 0.05 + (pulse > 0.8 ? -3 : 0.5);
          } else {
            a.vy = pulse > 0.8 ? -6 : 1.5;
            a.vx += (r.range(-1, 1) + (c.flow - 1) * 0.3) * dt * 4;
            a.vx *= 0.98;
          }
          break;
        }
        case 'land': {
          if (a.timer <= 0) {
            a.timer = r.range(2, 6);
            // amphibious fish and crabs slip into the water now and then
            const toWater = s.tags.includes('amphibious') && r.chance(0.3);
            a.tx = toWater ? r.range(10, g.landX - 10) : r.range(g.landX + 6, g.w - 6);
          }
          const dx = a.tx - a.x;
          a.vx = Math.abs(dx) > 1 ? Math.sign(dx) * Math.min(speed * 0.4, Math.abs(dx)) : 0;
          a.vy = 0;
          a.y = a.x > g.landX ? g.surface - 2 : Math.min(groundY(t, g, a.x, 1) - 2, g.surface + 6);
          break;
        }
        case 'burrow': {
          a.vx = 0;
          a.vy = 0;
          a.hidden = c.lightsOn && a.scared <= 0 ? 0.2 : 0.85;
          break;
        }
        case 'hide':
          break;
      }

      a.x += a.vx * dt;
      a.y += a.vy * dt;
      // stay in the water
      const minY = a.mode === 'land' ? g.surface - 4 : g.surface + 2;
      const floor = groundY(t, g, a.x, a.layer) - 1;
      a.x = Math.max(3, Math.min((a.mode === 'land' ? g.w : waterR) - 3, a.x));
      a.y = Math.max(minY, Math.min(floor, a.y));
      if (Math.abs(a.vx) > 0.6) a.face = a.vx > 0 ? 1 : -1;
      a.phase += dt * (a.mode === 'swim' ? 3 + Math.hypot(a.vx, a.vy) * 0.25 : a.mode === 'drift' ? 1.2 : Math.abs(a.vx) > 0.2 ? 3 : 0.8);
    }
  }

  /** the creature under a point (tank pixels), front-most first */
  pick(x: number, y: number): Agent | null {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const a = this.list[i];
      const hw = Math.max(4, a.len / 2 + 1), hh = Math.max(3, a.len * 0.3);
      if (Math.abs(x - a.x) <= hw && Math.abs(y - a.y) <= hh) return a;
    }
    return null;
  }
}
