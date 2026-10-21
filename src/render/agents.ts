// Creature motion for the tank view. Presentation only: the sim knows each animal's species,
// health and mood; here they get a position and a behavior from their zone and tags (schools
// that hold together, cories that glide and root along the bottom, nerites inching over the
// glass, jellies riding the kreisel's current, crabs pottering on the land shelf). Shy and
// nocturnal animals claim a cave or a hollow log as a den: they tuck in behind it (drawn behind
// the rock or wood), peek out now and then, and come out to forage when it suits them.
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
  /** drawn half-hidden (burrowed, or nocturnal and out in daylight) */
  hidden: number;
  /** the cave item this one has claimed as its den (uid; BURIED for the sand), and how far in it is 0..1 */
  den: number;
  inDen: number;
  /** heading home to the den */
  home: boolean;
  homeTimer: number;
  /** how far its head pokes out of the den 0..1, and which side of the den it uses */
  peek: number;
  peekTimer: number;
  side: number;
  /** depth in the tank, 0 at the back glass to 1 at the front (swimmers drift through it) */
  z: number;
  tz: number;
}

/** the den of a burrower that found no cave big enough: it digs into the sand, head out */
export const BURIED = -2;

/** a cave or hollow log in tank pixels: its base center, size and depth layer */
export interface Cave {
  uid: number;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: 0 | 1 | 2;
}

/** animals that keep a den: nocturnal fish, cave spawners, plecos, loaches, crayfish */
export function keepsDen(s: SpeciesDef): boolean {
  return s.tags.includes('nocturnal') || s.tags.includes('cave') || s.tags.includes('shell_dweller') || s.needs.includes('caves') || s.breed.type === 'cave' ||
    s.body === 'pleco' || s.body === 'loach' || s.kind === 'crayfish';
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
  caves: Cave[];
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
  /** little clouds of sand kicked up by rooting bottom fish (drawn by the tank view) */
  puffs: { x: number; y: number; vx: number; vy: number; life: number }[] = [];
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
      den: -1, inDen: 0, home: false, homeTimer: r.range(0, 4), peek: 0, peekTimer: r.range(1, 4), side: r.chance(0.5) ? 1 : -1,
      z: layer / 2, tz: r.range(0.1, 0.9),
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
    for (const p of this.puffs) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 6 * dt;
      p.life -= dt;
    }
    this.puffs = this.puffs.filter((p) => p.life > 0);
    if (this.puffs.length > 120) this.puffs.splice(0, this.puffs.length - 120);

    // per-species school centers for cohesion
    const centers = new Map<string, { x: number; y: number; vx: number; vy: number; z: number; n: number }>();
    for (const a of this.list) {
      if (a.mode !== 'swim') continue;
      const ce = centers.get(a.sp) ?? { x: 0, y: 0, vx: 0, vy: 0, z: 0, n: 0 };
      ce.x += a.x; ce.y += a.y; ce.vx += a.vx; ce.vy += a.vy; ce.z += a.z; ce.n++;
      centers.set(a.sp, ce);
    }

    for (const a of this.list) {
      const s = a.def;
      const speed = (a.fry ? 0.6 : 1) * Math.min(26, 5 + a.len * 0.35) * (a.scared > 0 ? 2.6 : 1);
      const nocturnalDay = s.tags.includes('nocturnal') && c.lightsOn;
      const asleep = !c.lightsOn && !s.tags.includes('nocturnal') && a.mode === 'swim';
      a.timer -= dt;
      a.scared = Math.max(0, a.scared - dt);
      a.hidden += ((nocturnalDay && a.mode !== 'drift' && a.inDen < 0.5 ? 1 : 0) - a.hidden) * Math.min(1, dt * 0.8);

      // ---- dens: shy animals go home by day (nocturnal) or on and off (the rest), and when startled
      if (c.caves.length && (a.mode === 'swim' || a.mode === 'bottom' || a.mode === 'perch') && keepsDen(s)) {
        a.homeTimer -= dt;
        if (a.homeTimer <= 0) {
          a.homeTimer = r.range(8, 22);
          a.home = s.tags.includes('nocturnal') ? c.lightsOn : r.chance(this.food.length ? 0.1 : 0.55);
        }
        if (a.scared > 0) a.home = true;
        if (this.food.length && !nocturnalDay && a.scared <= 0) a.home = false;
        // only a den longer than the animal hides it; burrowers that fit nowhere dig in instead
        const fits = c.caves.filter((q) => q.w >= a.len * 1.1);
        if (a.home && !fits.length && s.tags.includes('burrower') && a.mode === 'bottom') {
          a.den = BURIED;
          a.inDen = Math.min(1, a.inDen + dt * 0.8);
          a.vx = 0;
          a.y = groundY(t, g, a.x, a.layer) - 1;
          a.phase += dt * 0.6;
          continue;
        }
        if (a.home && fits.length) {
          let cv = fits.find((q) => q.uid === a.den);
          if (!cv) {
            // the nearest den with the fewest lodgers
            const lodgers = (u: number) => this.list.filter((b) => b.den === u).length;
            cv = [...fits].sort((p, q) => lodgers(p.uid) - lodgers(q.uid) || Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
            a.den = cv.uid;
          }
          const mates = this.list.filter((b) => b.den === cv!.uid);
          const idx = mates.indexOf(a), n = mates.length;
          const spread = n > 1 ? ((idx / (n - 1)) - 0.5) * Math.min(cv.w * 0.6, n * a.len * 0.35) : 0;
          const hx = cv.x + spread * 0.5, hy = cv.y - Math.max(2, Math.min(cv.h * 0.22, a.len * 0.22));
          const dx = hx - a.x, dy = hy - a.y, d = Math.hypot(dx, dy);
          if (d > 2 && a.inDen < 0.5) {
            const v = speed * 0.8;
            a.vx = (dx / d) * v;
            a.vy = (dy / d) * v;
            a.x += a.vx * dt;
            a.y += a.vy * dt;
            if (Math.abs(a.vx) > 0.6) a.face = a.vx > 0 ? 1 : -1;
            a.phase += dt * 4;
          } else {
            if (s.tags.includes('territorial') || s.temper === 'aggressive') {
              for (const b of this.list) {
                if (b === a || b.sp === a.sp || b.inDen > 0.5 || b.mode === 'glass') continue;
                if (Math.abs(b.x - cv.x) < cv.w * 0.6 + 6 && Math.abs(b.y - hy) < 14 && b.scared <= 0) {
                  // a dash at the intruder, who bolts
                  b.scared = 0.7;
                  b.vx += Math.sign(b.x - cv.x || 1) * 30;
                  a.peek = 1;
                  a.peekTimer = 1.2;
                }
              }
            }
            a.inDen = Math.min(1, a.inDen + dt * 1.5);
            // peek out of the side of the den now and then, then duck back in
            a.peekTimer -= dt;
            if (a.peekTimer <= 0) a.peekTimer = r.range(3, 7);
            const out = a.peekTimer < 1.6 && a.scared <= 0 ? 1 : 0;
            a.peek += (out - a.peek) * Math.min(1, dt * 2.5);
            a.face = a.side;
            a.x = hx + a.side * (Math.max(0, cv.w * 0.42 - a.len * 0.5) + a.len * 0.35 * a.peek);
            a.y = hy;
            a.vx = a.vy = 0;
            a.phase += dt * 0.8;
          }
          continue;
        }
        a.inDen = Math.max(0, a.inDen - dt * 2);
        a.peek = 0;
        if (a.inDen === 0 && a.den === BURIED) a.den = -1;
      }

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
            if (r.chance(0.35)) a.tz = r.range(0.05, 0.95);
            if (a.mode === 'perch' && c.perches.length) {
              const p = r.pick(c.perches);
              a.tx = p.x + r.range(-10, 10);
              a.ty = p.y - r.range(2, 14);
            } else if (asleep) {
              // lights out: settle low among the plants and barely move
              a.tx = Math.max(8, Math.min(waterR - 8, a.x + r.range(-12, 12)));
              a.ty = r.range(y0 + (y1 - y0) * 0.6, y1);
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
          // drift forward and back through the tank; a school keeps to one depth
          const schoolZ = ce && ce.n > 1 && s.tags.includes('schooling') ? ce.z / ce.n : a.tz;
          a.z += ((a.tz * 0.4 + schoolZ * 0.6) - a.z) * Math.min(1, dt * 0.35);
          const sp = Math.hypot(a.vx, a.vy);
          const max = nocturnalDay || asleep ? speed * 0.25 : speed;
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
          a.z += (a.layer / 2 - a.z) * Math.min(1, dt * 2);
          if (a.vx === 0 && s.kind === 'fish' && (s.body === 'cory' || s.tags.includes('scavenger')) && r.chance(dt * 3)) {
            const mx = a.x + a.face * a.len * 0.45, my = a.y + Math.max(1, a.len * 0.12);
            for (let i = 0; i < 3; i++) this.puffs.push({ x: mx + r.range(-1, 1), y: my, vx: r.range(-3, 3), vy: -r.range(2, 6), life: r.range(0.6, 1.2) });
          }
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
