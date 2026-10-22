// Immediate-mode UI drawn straight into the low-resolution game buffer (1 UI pixel = 1 game
// pixel). Panels register their rectangles so clicks over them never reach the tank behind.
//
// The look (STYLE.md, Interface): light sea-glass cards with pixel-rounded corners and dark ink,
// teal and gold pill buttons with a pressable lip, folder tabs, paper for letters. Text is the
// PixelLab "Fronds Text" face; headings use "Fronds Display".
import { PALETTE, rgba, UI as C } from '../data/palette';
import type { Input } from '../engine/input';
import type { Frame } from '../render/art/sprites';
import { drawFit } from '../render/art/sprites';
import { drawIcon, hasArt } from '../render/icons';
import { drawText, ellipsize, type Face, FONT_H, ICON, LINE_H, textWidth, wrapText } from './font';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Drawn extends Rect {
  kind: 'text' | 'button' | 'panel';
  s: string;
  layer: number;
  /** the button being drawn (its own label belongs to it) */
  owner: string;
}

function intersect(a: Rect, b: Rect): Rect | null {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w), y2 = Math.min(a.y + a.h, b.y + b.h);
  return x2 > x && y2 > y ? { x, y, w: x2 - x, h: y2 - y } : null;
}

export interface TipLine {
  text: string;
  color?: number;
}

export type PanelStyle = 'card' | 'paper' | 'inset' | 'chip' | 'window';
export type ButtonStyle = 'normal' | 'good' | 'bad' | 'flat' | 'paper';

/** Layout metrics shared by every panel. */
export const M = {
  /** a line of text */
  line: LINE_H,
  /** a labelled row (text with a little air) */
  row: 17,
  /** a list row with a sprite */
  item: 26,
  /** a standard button */
  btn: 20,
  /** a small button */
  btnS: 16,
  /** padding inside cards */
  pad: 8,
};

/** corner profiles: how far each row from the top (and bottom) is inset */
const CORNER: Record<number, number[]> = { 0: [], 1: [1], 2: [2, 1], 3: [3, 1, 1], 4: [4, 2, 1, 1] };

export class UI {
  ctx!: CanvasRenderingContext2D;
  input!: Input;
  w = 0;
  h = 0;
  mx = -1;
  my = -1;
  time = 0;
  dt = 1 / 60;
  clicked = false;
  /** the pointer is over a panel drawn last frame */
  captured = false;
  tooltip: TipLine[] | null = null;
  tipWidth = 220;
  scroll = new Map<string, number>();
  sfx: (id: string) => void = () => {};
  /** where each button, tab and marked area was drawn this frame, by id, and on which layer (the
   *  tutorial points at them, but not at one buried under a window) */
  rects = new Map<string, Rect & { layer: number }>();
  private blocks: Rect[] = [];
  private prevBlocks: Rect[] = [];
  /** visible areas of scrolling lists: what is clipped away cannot be hovered or clicked */
  private clips: Rect[] = [];
  /** a window was open last frame: only the top layer (the window, its pills, the tutorial) takes input */
  private modalPrev = false;
  private modalNow = false;
  /** 0 for the shop floor, 1 for windows and what is drawn over them */
  layer = 0;
  /** debugging aid: set true (window.app.ui.audit) to record what each frame draws, then read
   *  overlaps() for text that collides with other text, a button or a panel drawn over it */
  audit = false;
  private drawn: Drawn[] = [];
  private owner = '';
  private inTip = false;

  /** w and h are the UI size in UI pixels (the canvas may be larger and scaled) */
  begin(ctx: CanvasRenderingContext2D, input: Input, dt: number, w: number, h: number) {
    this.ctx = ctx;
    this.input = input;
    this.w = w;
    this.h = h;
    this.mx = input.x;
    this.my = input.y;
    this.dt = dt;
    this.time += dt;
    this.tooltip = null;
    this.rects.clear();
    this.drawn = [];
    this.prevBlocks = this.blocks;
    this.blocks = [];
    this.captured = this.prevBlocks.some((b) => this.inside(b));
    this.clicked = input.clicked;
    this.clips = [];
    this.modalPrev = this.modalNow;
    this.modalNow = false;
    this.layer = 0;
  }

  /** start drawing a window: everything drawn before it stops taking input from next frame */
  modal() {
    this.modalNow = true;
    this.layer = 1;
  }

  inside(r: Rect) {
    return this.mx >= r.x && this.my >= r.y && this.mx < r.x + r.w && this.my < r.y + r.h;
  }

  hover(x: number, y: number, w: number, h: number) {
    if (this.modalPrev && this.layer === 0) return false;
    for (const c of this.clips) if (!this.inside(c)) return false;
    return this.mx >= x && this.my >= y && this.mx < x + w && this.my < y + h;
  }

  block(x: number, y: number, w: number, h: number) {
    this.blocks.push({ x, y, w, h });
  }

  /** the pointer is over UI drawn this frame or last */
  get overUI() {
    return this.captured || this.blocks.some((b) => this.inside(b));
  }

  eat() {
    this.clicked = false;
    this.input.released = false;
  }

  /** remember an area by id without drawing anything (for the tutorial's pointer) */
  mark(id: string, x: number, y: number, w: number, h: number) {
    this.rects.set(id, { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h), layer: this.layer });
  }

  fill(x: number, y: number, w: number, h: number, c: number, a = 1) {
    this.ctx.fillStyle = a >= 1 ? PALETTE[c] : rgba(c, a);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  /** a filled rectangle with pixel-rounded corners */
  rr(x: number, y: number, w: number, h: number, r: number, c: number, a = 1) {
    x = Math.round(x);
    y = Math.round(y);
    w = Math.round(w);
    h = Math.round(h);
    const prof = CORNER[Math.max(0, Math.min(4, Math.min(r, Math.floor(h / 2), Math.floor(w / 2))))];
    const n = prof.length;
    this.fill(x, y + n, w, h - n * 2, c, a);
    prof.forEach((ins, i) => {
      this.fill(x + ins, y + i, w - ins * 2, 1, c, a);
      this.fill(x + ins, y + h - 1 - i, w - ins * 2, 1, c, a);
    });
  }

  panel(x: number, y: number, w: number, h: number, style: PanelStyle = 'card', blocking = true) {
    x = Math.round(x);
    y = Math.round(y);
    if (blocking) this.block(x, y, w, h);
    if (this.audit && !this.inTip) this.drawn.push({ kind: 'panel', x, y, w, h, s: style, layer: this.layer, owner: this.owner });
    switch (style) {
      case 'card':
      case 'window':
        // sea glass: a soft shadow, an outline, a bright top edge and a darker foot
        this.rr(x + 1, y + 3, w, h, 4, 0, 0.28);
        this.rr(x, y, w, h, 4, C.edge);
        this.rr(x + 1, y + 1, w - 2, h - 2, 3, C.panel);
        this.fill(x + 4, y + 1, w - 8, 1, C.panelHi);
        this.fill(x + 3, y + h - 3, w - 6, 1, C.panelLo);
        break;
      case 'paper':
        this.rr(x + 1, y + 3, w, h, 2, 0, 0.28);
        this.rr(x, y, w, h, 2, 19);
        this.rr(x + 1, y + 1, w - 2, h - 2, 1, C.paper);
        this.fill(x + 2, y + h - 3, w - 4, 1, 62);
        break;
      case 'inset':
        this.rr(x, y, w, h, 3, C.panelLo, 0.55);
        this.fill(x + 3, y, w - 6, 1, C.panelLo);
        break;
      case 'chip':
        this.rr(x, y + 2, w, h, 4, 0, 0.25);
        this.rr(x, y, w, h, 4, C.edge);
        this.rr(x + 1, y + 1, w - 2, h - 2, 3, C.panel);
        this.fill(x + 4, y + 1, w - 8, 1, C.panelHi);
        break;
    }
  }

  text(s: string, x: number, y: number, c: number = C.text, opts: { align?: 'left' | 'center' | 'right'; shadow?: number; maxW?: number; face?: Face } = {}) {
    const face = opts.face ?? 'text';
    if (opts.maxW) s = ellipsize(s, opts.maxW, face);
    let tx = x;
    if (opts.align === 'center') tx = x - Math.floor(textWidth(s, face) / 2);
    else if (opts.align === 'right') tx = x - textWidth(s, face);
    if (this.audit && !this.inTip && s.trim()) {
      // the ink: caps on rows 1-10 of the cell, cut to the scroll list it is drawn in
      let r: Rect | null = { x: Math.round(tx), y: Math.round(y) + 1, w: textWidth(s, face), h: 10 };
      for (const c of this.clips) r = r && intersect(r, c);
      if (r && r.w > 0 && r.h > 0) this.drawn.push({ kind: 'text', ...r, s, layer: this.layer, owner: this.owner });
    }
    return drawText(this.ctx, s, Math.round(tx), Math.round(y), PALETTE[c], 1, opts.shadow !== undefined ? PALETTE[opts.shadow] : null, face);
  }

  /** a heading in the display face */
  head(s: string, x: number, y: number, c: number = C.head, opts: { align?: 'left' | 'center' | 'right'; maxW?: number } = {}) {
    return this.text(s, x, y, c, { ...opts, face: 'display' });
  }

  /** wrapped paragraph; returns the height used */
  para(s: string, x: number, y: number, w: number, c: number = C.text, lineH = LINE_H): number {
    const lines = wrapText(s, w);
    lines.forEach((l, i) => this.text(l, x, y + i * lineH, c));
    return lines.length * lineH;
  }

  paraHeight(s: string, w: number, lineH = LINE_H) {
    return wrapText(s, w).length * lineH;
  }

  /** button width for a label, with room for a 16 px icon when the art is there */
  buttonW(label: string, icon?: string, pad = 20) {
    const art = icon && hasArt(icon);
    return (label ? textWidth(label) + pad : 8) + (art ? (label ? 16 : 18) : 0);
  }

  button(id: string, x: number, y: number, w: number, h: number, label: string, opts: { disabled?: boolean; active?: boolean; tip?: TipLine[] | string; style?: ButtonStyle; badge?: number; icon?: string } = {}): boolean {
    x = Math.round(x);
    y = Math.round(y);
    this.rects.set(id, { x, y, w, h, layer: this.layer });
    if (this.audit) this.drawn.push({ kind: 'button', x, y, w, h, s: id, layer: this.layer, owner: id });
    const outer = this.owner;
    this.owner = id;
    const hov = this.hover(x, y, w, h) && !opts.disabled;
    const down = hov && this.input.down;
    const st = opts.style ?? 'normal';
    // face, highlight, lip, label
    let face: number, hi: number, lip: number, txt: number;
    if (opts.disabled) [face, hi, lip, txt] = [C.panelLo, 8, 6, C.textDim];
    else if (opts.active) [face, hi, lip, txt] = [C.pick, 28, C.pickLo, C.strong];
    else if (st === 'good') [face, hi, lip, txt] = [hov ? 31 : 30, 32, 29, 9];
    else if (st === 'bad') [face, hi, lip, txt] = [hov ? 15 : 14, 61, 10, 9];
    else if (st === 'paper') [face, hi, lip, txt] = [hov ? 63 : 62, 9, 22, C.paperInk];
    else if (st === 'flat') [face, hi, lip, txt] = [hov ? 9 : C.panelHi, 9, C.panelLo, C.strong];
    else [face, hi, lip, txt] = [hov ? 41 : 40, 42, 39, 9];
    const sink = down ? 1 : 0;
    const r = h >= 16 ? 3 : 2;
    this.rr(x, y, w, h, r, st === 'flat' && !opts.active ? C.edge : 0);
    this.rr(x + 1, y + 1, w - 2, h - 2, r - 1, lip);
    this.rr(x + 1, y + 1 + sink, w - 2, h - 4, r - 1, face);
    if (!down) this.fill(x + 3, y + 2, w - 6, 1, hi);
    // a 16 px icon at the left; the label centers in what is left
    const art = opts.icon && h >= 18 && drawIcon(this.ctx, opts.icon, x + (label ? 4 : (w - 16) / 2), y + Math.floor((h - 2 - 16) / 2) + sink, 16, opts.disabled ? 0.5 : 1);
    const lx = art && label ? x + 18 : x;
    if (label) this.text(label, lx + (x + w - lx) / 2, y + Math.floor((h - 2 - 12) / 2) + sink, txt, { align: 'center', maxW: x + w - lx - 6 });
    if (opts.badge) {
      const s = String(opts.badge);
      const bw = Math.max(13, textWidth(s) + 7);
      this.rr(x + w - bw + 4, y - 6, bw, 14, 4, 0);
      this.rr(x + w - bw + 5, y - 5, bw - 2, 12, 3, C.bad);
      this.text(s, x + w - bw / 2 + 4, y - 6, 9, { align: 'center' });
    }
    this.owner = outer;
    if (hov) {
      if (opts.tip) this.tip(typeof opts.tip === 'string' ? [{ text: opts.tip }] : opts.tip);
      if (this.clicked) {
        this.eat();
        this.sfx('click');
        return true;
      }
    }
    return false;
  }

  /** a row in a list: highlights on hover; returns true when clicked */
  row(x: number, y: number, w: number, h: number, selected = false, tip?: TipLine[] | string): boolean {
    const hov = this.hover(x, y, w, h);
    if (selected) {
      this.rr(x, y, w, h, 3, C.pick, 0.55);
      this.fill(x, y + 3, 2, h - 6, C.pickLo);
    } else if (hov) this.rr(x, y, w, h, 3, C.panelHi, 0.6);
    if (hov && tip) this.tip(typeof tip === 'string' ? [{ text: tip }] : tip);
    if (hov && this.clicked) {
      this.eat();
      this.sfx('click');
      return true;
    }
    return false;
  }

  /** a segmented control of pill tabs; returns the selected index */
  tabs(id: string, x: number, y: number, labels: string[], current: number, w?: number, total?: number): number {
    let cx = x;
    let out = current;
    const natural = labels.map((l) => textWidth(l) + 14);
    const spare = total ? Math.max(0, total - natural.reduce((a, b) => a + b, 0) - (labels.length - 1) * 2) : 0;
    labels.forEach((l, i) => {
      const tw = w ?? natural[i] + Math.floor(spare / labels.length);
      if (this.button(`${id}:${i}`, cx, y, tw, M.btnS + 2, l, { active: i === current, style: 'flat' })) out = i;
      cx += tw + 2;
    });
    return out;
  }

  /** folder tabs along the top edge of a card; the selected one joins the card */
  folderTabs(id: string, x: number, y: number, w: number, labels: string[], current: number, tips?: string[]): number {
    let out = current;
    const n = labels.length;
    // each tab as wide as its label, sharing out what is left
    const natural = labels.map((l) => textWidth(l) + 6);
    const spare = Math.max(0, w - natural.reduce((a, b) => a + b, 0) - (n - 1) * 2);
    let tx = x;
    labels.forEach((l, i) => {
      const tw = natural[i] + Math.floor(spare / n) + (i < spare % n ? 1 : 0), sel = i === current;
      const th = sel ? 22 : 19, ty = y + (sel ? 0 : 3);
      const hov = this.hover(tx, ty, tw, th);
      this.rects.set(`${id}:${i}`, { x: tx, y: ty, w: tw, h: th, layer: this.layer });
      this.rr(tx, ty, tw, th + 4, 3, C.edge);
      this.rr(tx + 1, ty + 1, tw - 2, th + 3, 2, sel ? C.panel : hov ? 8 : C.panelLo);
      if (sel) this.fill(tx + 3, ty + 1, tw - 6, 1, C.panelHi);
      this.text(l, tx + tw / 2, ty + Math.floor((th - 12) / 2), sel ? C.head : C.text, { align: 'center', maxW: tw - 2 });
      this.block(tx, ty, tw, th);
      if (hov) {
        if (tips?.[i]) this.tip([{ text: tips[i] }]);
        if (this.clicked) {
          this.eat();
          this.sfx('click');
          out = i;
        }
      }
      tx += tw + 2;
    });
    return out;
  }

  bar(x: number, y: number, w: number, h: number, frac: number, col: number, bg: number = C.panelLo) {
    const f = Math.max(0, Math.min(1, frac));
    this.rr(x, y, w, h, 2, C.edge);
    this.rr(x + 1, y + 1, w - 2, h - 2, 1, bg);
    const fw = Math.round((w - 2) * f);
    if (fw > 0) {
      this.rr(x + 1, y + 1, fw, h - 2, 1, col);
      if (h >= 6) this.fill(x + 2, y + 2, Math.max(0, fw - 2), 1, 9, 0.35);
    }
  }

  /** half-star rating, 0..5 */
  stars(x: number, y: number, n: number, col: number = C.coin, empty: number = C.panelLo) {
    const step = 12;
    for (let i = 0; i < 5; i++) {
      const full = n >= i + 1, half = !full && n >= i + 0.5;
      this.text(ICON.star, x + i * step, y, full ? col : empty);
      if (half) {
        // the left half in color over an empty star
        this.clip(x + i * step, y, 6, FONT_H);
        this.text(ICON.star, x + i * step, y, col);
        this.unclip();
      }
    }
    return step * 5;
  }

  /** a minus / value / plus stepper; returns the delta clicked (-1, 0, 1) */
  stepper(id: string, x: number, y: number, label: string, w = 100): number {
    let d = 0;
    const b = M.btnS;
    if (this.button(id + ':-', x, y, b, b, '-', { style: 'flat' })) d = -1;
    this.text(label, x + w / 2, y + 1, C.strong, { align: 'center', maxW: w - b * 2 - 4 });
    if (this.button(id + ':+', x + w - b, y, b, b, '+', { style: 'flat' })) d = 1;
    return d;
  }

  toggle(_id: string, x: number, y: number, label: string, on: boolean, maxW = Infinity): boolean {
    const hov = this.hover(x, y, Math.min(maxW, 18 + textWidth(label)), 14);
    this.rr(x, y, 13, 13, 2, C.edge);
    this.rr(x + 1, y + 1, 11, 11, 1, on ? C.good : C.panelHi);
    if (on) {
      // a tick
      this.fill(x + 3, y + 6, 2, 2, 9);
      this.fill(x + 5, y + 7, 2, 2, 9);
      this.fill(x + 7, y + 4, 2, 3, 9);
    }
    this.text(label, x + 18, y - 1, hov ? C.strong : C.text, { maxW: maxW - 18 });
    if (hov && this.clicked) {
      this.eat();
      this.sfx('click');
      return !on;
    }
    return on;
  }

  divider(x: number, y: number, w: number) {
    this.fill(x, y, w, 1, C.panelLo);
    this.fill(x, y + 1, w, 1, C.panelHi, 0.8);
  }

  sprite(fr: Frame, x: number, y: number, w: number, h: number) {
    drawFit(this.ctx, fr, x, y, w, h);
  }

  /** a scrolling region: returns the offset; draw rows between clip() and unclip() */
  scrollArea(id: string, x: number, y: number, w: number, h: number, contentH: number): number {
    let off = this.scroll.get(id) ?? 0;
    if (this.hover(x, y, w, h) && this.input.wheel) {
      off += this.input.wheel * 30;
      this.input.wheel = 0;
    }
    off = Math.max(0, Math.min(Math.max(0, contentH - h), off));
    this.scroll.set(id, off);
    if (contentH > h) {
      const th = Math.max(14, (h * h) / contentH);
      this.rr(x + w - 4, y, 4, h, 2, C.panelLo, 0.7);
      this.rr(x + w - 4, y + (off / (contentH - h)) * (h - th), 4, th, 2, C.accent);
    }
    return off;
  }

  clip(x: number, y: number, w: number, h: number) {
    this.clips.push({ x, y, w, h });
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(x, y, w, h);
    this.ctx.clip();
  }

  unclip() {
    this.clips.pop();
    this.ctx.restore();
  }

  tip(lines: TipLine[], width = 220) {
    this.tooltip = lines;
    this.tipWidth = width;
  }

  end() {
    this.inTip = true;
    if (this.tooltip && this.tooltip.length) this.drawTip(this.tooltip);
    this.inTip = false;
  }

  /** draw under an owner's name, so the audit knows the writing belongs to it (a prop's own
   *  lettering, or a passing toast, which is allowed to cover things for a moment) */
  own<T>(owner: string, fn: () => T): T {
    const outer = this.owner;
    this.owner = owner;
    try {
      return fn();
    } finally {
      this.owner = outer;
    }
  }

  /**
   * What collided in the last audited frame: text over other text, text over a button that is not
   * its own, text partly hidden under a panel drawn after it, and text running off the screen.
   */
  overlaps(props: { name: string; x: number; y: number; w: number; h: number }[] = []): string[] {
    const out: string[] = [];
    // toasts come and go over anything
    const d = this.drawn.filter((q) => q.owner !== 'toast');
    // decorations must stay clear of the interface: no prop under a chip, card, button or text
    const hud = d.filter((q) => q.layer === 0 && (q.kind !== 'panel' || q.s !== 'inset'));
    for (const p of props) {
      // a little transparent margin around the art is fine, and so is the prop's own lettering
      const core = { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 6 };
      for (const q of hud) if (q.owner !== p.name && intersect(core, q)) out.push(`prop ${p.name} at ${p.x},${p.y} ${p.w}x${p.h} under ${q.kind} "${q.s}" at ${q.x},${q.y}`);
    }
    const area = (a: Rect, b: Rect) => {
      const r = intersect(a, b);
      return r && r.w > 0 && r.h > 0 ? r.w * r.h : 0;
    };
    const say = (a: Drawn) => `"${a.s}" at ${a.x},${a.y} (${a.w}x${a.h})`;
    const modal = d.some((q) => q.kind === 'panel' && q.s === 'window');
    for (let i = 0; i < d.length; i++) {
      const a = d[i];
      if (a.kind !== 'text' || (modal && a.layer === 0)) continue;
      if (a.x < 0 || a.y < 0 || a.x + a.w > this.w || a.y + a.h > this.h) out.push(`off screen: ${say(a)}`);
      // sitting on a card or chip but running past its edge
      const under = d.slice(0, i).filter((q) => q.kind === 'panel' && q.s !== 'inset' && q.layer === a.layer && area(a, q) > 0);
      const inside = (q: Rect) => a.x >= q.x && a.y >= q.y && a.x + a.w <= q.x + q.w && a.y + a.h <= q.y + q.h;
      if (under.length && !under.some(inside)) out.push(`spills out of a ${under[under.length - 1].s} panel at ${under[under.length - 1].x},${under[under.length - 1].y} ${under[under.length - 1].w}x${under[under.length - 1].h}: ${say(a)}`);
      for (let j = 0; j < d.length; j++) {
        if (i === j) continue;
        const b = d[j];
        if (modal && b.layer === 0) continue;
        if (b.kind === 'text' && j > i && area(a, b) >= 4 && !(b.s === a.s && b.x === a.x && b.y === a.y + 0)) out.push(`text on text: ${say(a)} / ${say(b)}`);
        if (b.kind === 'button' && b.owner !== a.owner && area(a, b) >= 4) out.push(`text on button ${b.s}: ${say(a)}`);
        if (b.kind === 'panel' && j > i && b.owner !== a.owner) {
          const hit = area(a, b);
          if (hit >= 4 && hit < a.w * a.h) out.push(`half under a ${b.s} panel at ${b.x},${b.y}: ${say(a)}`);
          else if (hit >= 4 && b.layer === a.layer && b.s !== 'window') out.push(`under a ${b.s} panel at ${b.x},${b.y}: ${say(a)}`);
        }
      }
    }
    return out;
  }

  private drawTip(lines: TipLine[]) {
    const maxW = this.tipWidth;
    const wrapped: { text: string; color: number; first: boolean }[] = [];
    lines.forEach((l, i) => {
      for (const t of wrapText(l.text, maxW)) wrapped.push({ text: t, color: l.color ?? C.text, first: i === 0 });
    });
    let w = 0;
    for (const l of wrapped) w = Math.max(w, textWidth(l.text));
    w += 16;
    const h = wrapped.length * LINE_H + 10;
    let x = this.mx + 12, y = this.my + 16;
    if (x + w > this.w - 4) x = this.mx - w - 6;
    if (y + h > this.h - 4) y = this.my - h - 6;
    x = Math.max(4, x);
    y = Math.max(4, y);
    this.rr(x + 1, y + 3, w, h, 4, 0, 0.3);
    this.rr(x, y, w, h, 4, C.ink);
    this.rr(x + 1, y + 1, w - 2, h - 2, 3, C.panelHi);
    wrapped.forEach((l, i) => this.text(l.text, x + 8, y + 4 + i * LINE_H, l.first && l.color === C.text ? C.strong : l.color));
  }
}

export { FONT_H, ICON, LINE_H, textWidth, wrapText };
