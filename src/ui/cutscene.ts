// Cutscenes: illustrated shots (PixelLab scenes, sprite names cs:<shot>) hung like a framed
// picture on the shop wall, with a paper caption that types itself out underneath. Click or Space
// shows the next line; there is no skipping, and each scene plays once per save (state.seen). Light
// effects (rain, dust in a lamp beam, a glint on the keys, the painted shop sign) are drawn over
// the picture in its own pixels, so they stay crisp at any zoom.
import type { App } from '../app/app';
import { PALETTE, rgba, UI as C } from '../data/palette';
import { importedFrame } from '../render/art/sprites';
import { drawText, type Face } from './font';
import { ICON, M, textWidth } from './ui';

/** picture size in its own pixels (the PixelLab canvas) */
export const SHOT_W = 400;
export const SHOT_H = 224;

type Fx =
  | { t: 'rain'; n?: number }
  | { t: 'dust'; x: number; y: number; w: number; h: number }
  | { t: 'glint'; x: number; y: number; delay?: number }
  | { t: 'text'; text: string; x: number; y: number; color: number; shadow?: number; face?: Face; scale?: number; align?: 'center' | 'left' }
  | { t: 'flicker'; x: number; y: number; r: number }
  | { t: 'confetti' }
  | { t: 'shimmer'; x: number; y: number; w: number; h: number };

export interface Line {
  who?: string;
  text: string;
}

export interface Shot {
  img: string;
  /** shown while the art is missing (art is optional, the story is not) */
  alt: string;
  lines: Line[];
  fx?: Fx[];
}

export interface Scene {
  id: string;
  title: string;
  shots: Shot[];
}

export const SCENES: Record<string, Scene> = {
  intro: {
    id: 'intro',
    title: 'The keys',
    shots: [
      {
        img: 'cs:intro_street', alt: 'A closed fish shop on a rainy corner.',
        fx: [{ t: 'text', text: 'Fins & Fronds', x: 138, y: 64, color: 2 }, { t: 'rain', n: 90 }, { t: 'flicker', x: 372, y: 54, r: 22 }],
        lines: [
          { text: 'Every town has one shop that smells of wet stone and green growing things.' },
          { text: 'Ours was called Fins & Fronds, and for a whole year its window had been dark.' },
        ],
      },
      {
        img: 'cs:intro_keys', alt: 'An old hand drops a ring of brass keys into yours.',
        fx: [{ t: 'glint', x: 214, y: 92 }, { t: 'glint', x: 229, y: 138, delay: 0.7 }, { t: 'glint', x: 192, y: 126, delay: 1.4 }],
        lines: [
          { who: 'Ida Fenwick', text: 'Forty-one years I kept that shop. My knees are done with buckets.' },
          { who: 'Ida Fenwick', text: 'The town needs somewhere to see a river up close. It is yours, if you want it.' },
        ],
      },
      {
        img: 'cs:intro_inside', alt: 'The empty shop: bare stands, one dry tank, dust in the lamplight.',
        fx: [{ t: 'dust', x: 110, y: 50, w: 110, h: 130 }, { t: 'flicker', x: 152, y: 48, r: 14 }],
        lines: [
          { text: 'There was not much left. Bare stands, a cupboard of old gear, and one empty tank by the window.' },
          { text: 'And on the counter, a jar of old filter sponges that Ida swore were still alive.' },
        ],
      },
      {
        img: 'cs:intro_note', alt: 'A note on the counter, next to the jar of sponges.',
        fx: [{ t: 'glint', x: 132, y: 132 }, { t: 'glint', x: 290, y: 70, delay: 1.1 }],
        lines: [
          { who: 'Ida\'s note', text: 'Start with one good tank in the window. Do it properly: filter, heat, light, plants, patience.' },
          { who: 'Ida\'s note', text: 'Do that, and the town will come in out of the rain to look. I will write. Love, Ida.' },
        ],
      },
      {
        img: 'cs:intro_morning', alt: 'Morning sun on the shop window, the door propped open.',
        fx: [{ t: 'text', text: 'Fins & Fronds', x: 138, y: 64, color: 39 }, { t: 'shimmer', x: 106, y: 128, w: 60, h: 32 }],
        lines: [
          { text: 'So the next morning you propped the door open, filled a bucket, and got to work.' },
        ],
      },
    ],
  },
  town: {
    id: 'town',
    title: 'The Town Aquarium',
    shots: [
      {
        img: 'cs:town_crowd', alt: 'The whole town outside the shop, a ribbon across the door.',
        fx: [{ t: 'text', text: 'Fins & Fronds', x: 138, y: 63, color: 39 }, { t: 'confetti' }],
        lines: [
          { text: 'One tank in a window became two, then five. The shop outgrew its walls, and the town noticed.' },
          { text: 'On a bright Saturday they came to see what Fins & Fronds had become.' },
        ],
      },
      {
        img: 'cs:town_ribbon', alt: 'Ida cuts the ribbon with a big pair of scissors.',
        fx: [{ t: 'confetti' }],
        lines: [
          { who: 'Ida Fenwick', text: 'I said they would come in out of the rain. I did not say they would bring the whole town.' },
          { who: 'Ida Fenwick', text: 'I declare the Town Aquarium open!' },
        ],
      },
      {
        img: 'cs:town_inside', alt: 'Visitors silhouetted against glowing tanks.',
        fx: [{ t: 'shimmer', x: 160, y: 20, w: 230, h: 140 }, { t: 'shimmer', x: 0, y: 80, w: 70, h: 60 }],
        lines: [
          { text: 'Saltwater, reefs, a koi pond, a touch pool for the school trips. There is so much more to build.' },
        ],
      },
    ],
  },
};

const TYPE_SPEED = 55;
const FADE = 0.45;

export class Cutscene {
  shot = 0;
  line = 0;
  chars = 0;
  time = 0;
  /** -1..1: fading in from black at the start of a shot, out at the end of the scene */
  fade = 0;
  private leaving = false;

  constructor(public scene: Scene, private onDone: () => void) {}

  private get cur(): Shot {
    return this.scene.shots[this.shot];
  }

  private get text(): string {
    return this.cur.lines[this.line]?.text ?? '';
  }

  /** advance: finish typing, next line, next shot, or end */
  next() {
    if (this.leaving) return;
    if (this.chars < this.text.length) {
      this.chars = this.text.length;
      return;
    }
    if (this.line < this.cur.lines.length - 1) {
      this.line++;
      this.chars = 0;
      return;
    }
    if (this.shot < this.scene.shots.length - 1) {
      this.shot++;
      this.line = 0;
      this.chars = 0;
      this.fade = 0;
      return;
    }
    this.end();
  }

  end() {
    if (this.leaving) return;
    this.leaving = true;
    this.fade = 0;
  }

  update(dt: number) {
    this.time += dt;
    this.chars = Math.min(this.text.length, this.chars + dt * TYPE_SPEED);
    if (this.leaving) {
      this.fade -= dt / FADE;
      if (this.fade <= -1) this.onDone();
    } else this.fade = Math.min(1, this.fade + dt / FADE);
  }

  /** Draw the framed picture (window pixels) and the caption and buttons (UI pixels). */
  draw(app: App) {
    const ctx = app.ctx;
    const k = app.scale;
    const sw = app.canvas.width, sh = app.canvas.height;
    app.drawRoom();
    // the picture: the largest whole-number zoom that leaves room for the caption
    const capH = 96 * k;
    const z = Math.max(1, Math.floor(Math.min((sw - 40 * k) / SHOT_W, (sh - capH - 40 * k) / SHOT_H)));
    const pw = SHOT_W * z, ph = SHOT_H * z;
    const px = Math.floor((sw - pw) / 2), py = Math.max(12 * k, Math.floor((sh - capH - ph) / 2) - 4 * k);
    // a wooden frame and a soft shadow on the wall
    const f = 4 * k;
    ctx.fillStyle = rgba(0, 0.3);
    ctx.fillRect(px - f + 2 * k, py - f + 4 * k, pw + f * 2, ph + f * 2);
    ctx.fillStyle = PALETTE[19];
    ctx.fillRect(px - f, py - f, pw + f * 2, ph + f * 2);
    ctx.fillStyle = PALETTE[21];
    ctx.fillRect(px - f, py - f, pw + f * 2, k);
    ctx.fillStyle = PALETTE[49];
    ctx.fillRect(px - k, py - k, pw + 2 * k, ph + 2 * k);
    const shot = this.cur;
    const fr = importedFrame(shot.img);
    ctx.save();
    ctx.beginPath();
    ctx.rect(px, py, pw, ph);
    ctx.clip();
    if (fr) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(fr.img, fr.sx, fr.sy, fr.w, fr.h, px, py, pw, ph);
    } else {
      ctx.fillStyle = PALETTE[35];
      ctx.fillRect(px, py, pw, ph);
    }
    this.drawFx(ctx, shot, px, py, z, !fr);
    // fade through the dark between shots
    const dark = this.leaving ? Math.min(1, Math.max(0, -this.fade)) : 1 - this.fade;
    if (dark > 0) {
      ctx.fillStyle = rgba(0, dark);
      ctx.fillRect(px, py, pw, ph);
    }
    ctx.restore();

    // caption, in UI pixels
    app.ctx.setTransform(k, 0, 0, k, 0, 0);
    const u = app.ui;
    const cw = Math.min(app.W - 40, Math.max(420, Math.round(pw / k))), cx = Math.floor((app.W - cw) / 2);
    const cy = Math.round((py + ph + f) / k) + 10, chh = Math.min(84, app.H - cy - 8);
    u.panel(cx, cy, cw, chh, 'paper', false);
    const ln = shot.lines[this.line];
    let ty = cy + 9;
    if (ln?.who) {
      u.head(ln.who, cx + 14, ty, 19);
      ty += M.row + 1;
    }
    u.para(this.text.slice(0, Math.floor(this.chars)), cx + 14, ty, cw - 28, C.paperInk);
    if (this.chars >= this.text.length && Math.floor(this.time * 2) % 2 === 0) u.text(ICON.right, cx + cw - 18, cy + chh - 20, 19);
    const dots = this.scene.shots.map((_, i) => (i === this.shot ? 'o' : '.')).join(' ');
    u.text(dots, cx + cw / 2, cy + chh - 18, 3, { align: 'center' });
    if (u.clicked) {
      u.eat();
      this.next();
    }
    const keys = app.input.keysPressed;
    if (keys.has(' ') || keys.has('Enter')) this.next();
  }

  private drawFx(ctx: CanvasRenderingContext2D, shot: Shot, px: number, py: number, z: number, missing: boolean) {
    const t = this.time;
    const P = (x: number, y: number, w: number, h: number, c: number, a = 1) => {
      ctx.fillStyle = a >= 1 ? PALETTE[c] : rgba(c, a);
      ctx.fillRect(px + Math.round(x) * z, py + Math.round(y) * z, Math.max(1, Math.round(w)) * z, Math.max(1, Math.round(h)) * z);
    };
    if (missing) {
      // no art yet: the scene still reads, on sage with the alt line
      drawText(ctx, shot.alt, px + 12 * z, py + (SHOT_H / 2 - 6) * z, PALETTE[C.onDark], z, null, 'text');
    }
    for (const fx of shot.fx ?? []) {
      switch (fx.t) {
        case 'rain': {
          const n = fx.n ?? 70;
          for (let i = 0; i < n; i++) {
            const sx = (i * 97.3) % SHOT_W, speed = 140 + (i % 5) * 20;
            const y = ((t * speed + i * 53) % (SHOT_H + 20)) - 10;
            const x = (sx + y * 0.25) % SHOT_W;
            P(x, y, 1, 4, 48, 0.45);
          }
          break;
        }
        case 'dust':
          for (let i = 0; i < 26; i++) {
            const x = fx.x + ((i * 37 + Math.sin(t * 0.3 + i) * 12) % fx.w + fx.w) % fx.w;
            const y = fx.y + ((i * 59 - t * (3 + (i % 4))) % fx.h + fx.h) % fx.h;
            P(x, y, 1, 1, 28, 0.35 + 0.35 * Math.sin(t * 1.7 + i));
          }
          break;
        case 'glint': {
          const ph = ((t - (fx.delay ?? 0)) % 2.4) / 2.4;
          if (ph > 0 && ph < 0.25) {
            const s = Math.sin((ph / 0.25) * Math.PI) * 4;
            P(fx.x - s, fx.y, s * 2 + 1, 1, 9);
            P(fx.x, fx.y - s, 1, s * 2 + 1, 9);
          }
          break;
        }
        case 'flicker': {
          const a = 0.1 + 0.07 * Math.sin(t * 9) * Math.sin(t * 2.3);
          ctx.fillStyle = rgba(23, Math.max(0, a));
          ctx.beginPath();
          ctx.arc(px + fx.x * z, py + fx.y * z, fx.r * z, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shimmer':
          for (let i = 0; i < 14; i++) {
            const x = fx.x + ((i * 71 + t * 6) % fx.w);
            const y = fx.y + ((i * 43) % fx.h);
            P(x, y, 1, 1, 9, 0.25 + 0.25 * Math.sin(t * 2 + i * 1.3));
          }
          break;
        case 'confetti':
          for (let i = 0; i < 60; i++) {
            const x = (i * 61.7 + Math.sin(t + i) * 8) % SHOT_W;
            const y = ((t * (24 + (i % 7) * 4) + i * 37) % (SHOT_H + 10)) - 5;
            P(x, y, 2, 1 + (Math.floor(t * 4 + i) % 2), [15, 18, 41, 47, 57, 31][i % 6]);
          }
          break;
        case 'text': {
          const sc = fx.scale ?? 1;
          const w = textWidth(fx.text, fx.face ?? 'display') * sc;
          const x = fx.align === 'left' ? fx.x : fx.x - w / 2;
          drawText(ctx, fx.text, px + Math.round(x) * z, py + fx.y * z, PALETTE[fx.color], sc * z, fx.shadow !== undefined ? PALETTE[fx.shadow] : null, fx.face ?? 'display');
          break;
        }
      }
    }
  }
}
