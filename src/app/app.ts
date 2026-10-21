// The app: owns the canvas, the game, one TankView per tank and the UI state, and routes input.
// The screen is a low-resolution buffer (800x450 or a little more) scaled up by a whole number; the tank is
// drawn at a whole-number zoom inside it, so every sprite pixel stays square.
import { item, species } from '../data';
import { PALETTE, rgba, UI as C } from '../data/palette';
import { Audio } from '../engine/audio';
import { Input } from '../engine/input';
import { creatureFrame } from '../render/art/sprites';
import { MARGIN, TankView, waterLook } from '../render/tankview';
import * as act from '../sim/actions';
import { BAL } from '../sim/balance';
import { geom } from '../sim/facts';
import { Game, type GameEvent } from '../sim/Game';
import { newGame } from '../sim/newgame';
import { clearLocal, hasSave, loadLocal, saveLocal } from '../sim/save';
import { hourOf, type Tank } from '../sim/state';
import { isOpen } from '../sim/visitors';
import { drawHud, TOOLBAR_H, TOP_H } from '../ui/hud';
import { drawPanel, panelW } from '../ui/panels';
import { drawTitle } from '../ui/title';
import { textWidth, UI } from '../ui/ui';
import { drawWindow } from '../ui/windows';

export type Mode = 'look' | 'scape' | 'stock' | 'gear' | 'water' | 'care';
export type WindowId = 'codex' | 'letters' | 'trips' | 'upgrades' | 'guestbook' | 'menu' | 'newtank';

export interface Toast {
  text: string;
  tone: 'good' | 'bad' | 'info';
  life: number;
}

export interface Pop {
  x: number;
  y: number;
  text: string;
  color: number;
  life: number;
}

export const SPEEDS = [0, 1, 3, 10];

export class App {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: Input;
  audio = new Audio();
  ui = new UI();
  scale = 2;
  W = 800;
  H = 450;
  game: Game | null = null;
  screen: 'title' | 'game' = 'title';
  views = new Map<number, TankView>();
  tankId = 0;
  view: 'tank' | 'hall' = 'tank';
  mode: Mode = 'look';
  window: WindowId | null = null;
  /** which bay the new-tank window builds in */
  newTankBay = 0;
  select: { kind: 'item' | 'agent'; uid: number } | null = null;
  hover: { kind: 'item' | 'agent'; uid: number } | null = null;
  placing: { id: string; fromInventory: boolean } | null = null;
  layer: 0 | 1 | 2 = 1;
  tool: 'scrape' | 'wipe' | 'sculpt' | null = null;
  drag: { uid: number; dx: number } | null = null;
  zoomBoost = 0;
  pan = { x: 0, y: 0 };
  toasts: Toast[] = [];
  pops: Pop[] = [];
  /** species whose bags just opened (their fish swim in from the surface) */
  released = new Map<number, Set<string>>();
  /** panel state: tabs, filters, selected rows, quantities */
  panel = { scapeTab: 0, stockTab: 0, gearTab: 0, codexTab: 0, codexSel: '', buySp: '', buyN: 1, upgradeTab: 0, letterSel: '', tripSel: '', shellSel: '', waterSel: 'fresh' as 'fresh' | 'brackish' | 'marine', confirmNew: 0 };
  /** the last guestbook line, shown under the tank for a while */
  guest: { text: string; who: string; life: number } | null = null;
  banner: { title: string; sub: string; life: number } | null = null;
  private saveTimer = 0;
  private lastX = 0;
  private lastY = 0;
  /** last pointer spot of a scraper or cloth stroke, in tank pixels */
  private stroke: { x: number; y: number } | null = null;
  private titleDemo: { game: Game; view: TankView } | null = null;
  /** the tank's water area on screen, in window pixels */
  tankRect = { x: 0, y: 0, w: 0, h: 0, z: 1 };
  /** where the plaque goes, in UI pixels */
  private plaqueAt = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.input = new Input(canvas);
    this.ui.sfx = () => this.audio.play('click');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.addEventListener('pointerdown', () => this.audio.unlock(), { once: false });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });
    window.addEventListener('beforeunload', () => this.save());
  }

  /** The canvas is the full window. The UI draws in UI pixels (window / scale, at least 800x450);
   *  the tank draws in window pixels at its own whole-number zoom, so it can use the space. */
  resize() {
    const vw = Math.floor(window.innerWidth), vh = Math.floor(window.innerHeight);
    this.canvas.width = vw;
    this.canvas.height = vh;
    this.canvas.style.width = `${vw}px`;
    this.canvas.style.height = `${vh}px`;
    this.scale = Math.max(1, Math.floor(Math.min(vw / 800, vh / 450)));
    this.W = Math.floor(vw / this.scale);
    this.H = Math.floor(vh / this.scale);
    this.input.setScale(this.scale);
  }

  // ---------------------------------------------------------------- game lifecycle

  get state() {
    return this.game!.state;
  }

  get tank(): Tank | undefined {
    return this.game?.tank(this.tankId);
  }

  startNew() {
    clearLocal();
    this.load(new Game(newGame()));
    this.toast('Welcome! The previous owner left you one tank, a little neglected. Fix it up and the visitors will come.', 'info');
  }

  continueSave() {
    const s = loadLocal();
    if (!s) return this.startNew();
    const g = new Game(s);
    // a little offline income: the aquarium kept running while you were away
    const away = (Date.now() - s.savedAt) / 3600000;
    const hours = Math.min(BAL.offlineCapHours, away * BAL.offlineGameHoursPerHour);
    if (hours > 0.1) {
      const before = s.coins;
      g.tick(hours * 60);
      const earned = Math.round(s.coins - before);
      g.events.length = 0;
      if (earned > 0) this.toast(`While you were away the aquarium earned ${earned} coins.`, 'good');
    }
    this.load(g);
  }

  private load(g: Game) {
    this.game = g;
    this.views.clear();
    this.tankId = g.state.tanks[0]?.id ?? 0;
    this.screen = 'game';
    this.window = null;
    this.mode = 'look';
    this.select = null;
    this.titleDemo = null;
    this.audio.setVolume(g.state.settings.volume);
  }

  save() {
    if (this.game && this.screen === 'game') saveLocal(this.game.state);
  }

  hasSave() {
    return hasSave();
  }

  toast(text: string, tone: Toast['tone'] = 'info') {
    this.toasts.push({ text, tone, life: 5 + text.length * 0.03 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  /** Run a player command and toast its message, if any. */
  run(msg: string | void) {
    if (msg) this.toast(msg, 'info');
  }

  viewFor(t: Tank): TankView {
    let v = this.views.get(t.id);
    if (!v || v.g.shell.id !== t.shell) {
      v = new TankView(t.id, t);
      this.views.set(t.id, v);
    }
    return v;
  }

  setTank(id: number) {
    this.tankId = id;
    this.view = 'tank';
    this.select = null;
    this.placing = null;
    this.zoomBoost = 0;
    this.pan = { x: 0, y: 0 };
  }

  // ---------------------------------------------------------------- frame

  frame(dt: number) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    this.ui.begin(ctx, this.input, dt, this.W, this.H);
    if (this.screen === 'title') {
      this.drawTitleScreen(dt);
    } else if (this.game) {
      this.update(dt);
      this.draw(dt);
    }
    this.uiSpace();
    this.ui.end();
    this.input.endFrame();
  }

  /** switch drawing to UI pixels */
  private uiSpace() {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  private drawTitleScreen(dt: number) {
    if (!this.titleDemo) {
      const g = new Game(newGame(12345));
      const t = g.state.tanks[0];
      t.chem.glass = 0;
      t.chem.algae = 0;
      t.smudge = 0;
      g.state.time = 12 * 60;
      this.titleDemo = { game: g, view: new TankView(t.id, t) };
    }
    const { game, view } = this.titleDemo;
    const t = game.state.tanks[0];
    const opts = { hour: 12, lightsOn: true, open: true };
    view.update(dt, t, game.stats.get(t.id), opts, new Set());
    view.draw(t, game.stats.get(t.id), opts);
    this.drawRoom();
    const sw = this.canvas.width, sh = this.canvas.height;
    // leave room for the sign above and the buttons below
    const top = 100 * this.scale, bottom = 96 * this.scale;
    const z = Math.max(1, Math.floor(Math.min(sw / view.canvas.width, (sh - top - bottom) / view.canvas.height)));
    const x = Math.floor((sw - view.canvas.width * z) / 2), y = top + Math.floor((sh - top - bottom - view.canvas.height * z) / 2);
    this.ctx.drawImage(view.canvas, x, y, view.canvas.width * z, view.canvas.height * z);
    this.uiSpace();
    drawTitle(this);
  }

  private update(dt: number) {
    const g = this.game!;
    const s = g.state;
    const speed = SPEEDS.includes(s.settings.speed) ? s.settings.speed : 1;
    if (speed > 0 && !(this.window && this.window !== 'letters' && this.window !== 'guestbook')) g.tick(dt * speed);
    this.handleKeys();
    for (const e of g.events.splice(0)) this.onEvent(e);
    for (const t of s.tanks) if (!this.views.has(t.id)) this.viewFor(t);
    for (const id of [...this.views.keys()]) if (!s.tanks.some((t) => t.id === id)) this.views.delete(id);
    if (!this.tank && s.tanks.length) this.tankId = s.tanks[0].id;
    // every tank keeps living, but only the visible one animates every frame
    const hour = hourOf(s.time);
    const open = !!isOpen(s, s.time);
    for (const t of s.tanks) {
      const v = this.viewFor(t);
      if (this.view === 'tank' && t.id !== this.tankId) continue;
      const lightsOn = hour >= t.set.lightOn && hour < t.set.lightOff && t.equip.some((e) => e.startsWith('led') || e === 't5_bank' || e === 'metal_halide' || e === 'exhibit_skylight');
      v.update(dt, t, g.stats.get(t.id), { hour, lightsOn, open }, this.released.get(t.id) ?? new Set());
      this.released.delete(t.id);
    }
    for (const p of this.pops) {
      p.life -= dt;
      p.y -= dt * 10;
    }
    this.pops = this.pops.filter((p) => p.life > 0);
    for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);
    if (this.guest) {
      this.guest.life -= dt;
      if (this.guest.life <= 0) this.guest = null;
    }
    if (this.banner) {
      this.banner.life -= dt;
      if (this.banner.life <= 0) this.banner = null;
    }
    const cur = this.tank ? g.stats.get(this.tank.id) : undefined;
    this.audio.setCrowd(open && cur ? Math.min(1, cur.visitorsPerHour / 60) : 0);
    this.saveTimer += dt;
    if (this.saveTimer > 30) {
      this.saveTimer = 0;
      this.save();
    }
  }

  private onEvent(e: GameEvent) {
    const g = this.game!;
    switch (e.t) {
      case 'toast':
        this.toast(e.text, e.tone ?? 'info');
        break;
      case 'sfx':
        this.audio.play(e.name);
        break;
      case 'coins': {
        if (this.view === 'tank' && e.tank === this.tankId && this.tank) {
          const r = this.tankRect, k = this.scale;
          this.pops.push({ x: (r.x + r.w * (0.2 + Math.random() * 0.6)) / k, y: (r.y + r.h) / k - 6, text: `+${e.amount}`, color: C.coin, life: 1.6 });
          if (Math.random() < 0.35) this.audio.play('coin');
        }
        break;
      }
      case 'guest':
        if (e.entry.tank === this.tankId || this.view === 'hall') this.guest = { text: e.entry.text, who: e.entry.who, life: 9 };
        break;
      case 'letter': {
        this.toast('A letter arrived. Open Letters to read it.', 'info');
        break;
      }
      case 'tier':
        this.banner = { title: 'A new chapter', sub: `Your aquarium is now a ${['Front-Window Tank', 'Corner Aquarium', 'Little Aquarium', 'Town Aquarium', 'Regional Aquarium', 'Grand Oceanarium'][e.level]}!`, life: 6 };
        break;
      case 'feed': {
        const t = g.tank(e.tank);
        if (t) this.viewFor(t).agents.feed(geom(t), 10 + Math.min(30, t.animals.length));
        break;
      }
      case 'release': {
        const set = this.released.get(e.tank) ?? new Set<string>();
        set.add(e.sp);
        this.released.set(e.tank, set);
        break;
      }
      case 'tap': {
        const t = g.tank(e.tank);
        if (t && e.tank === this.tankId && this.view === 'tank') {
          this.viewFor(t).agents.startle();
          const r = this.tankRect, k = this.scale;
          this.pops.push({ x: (r.x + r.w * (0.3 + Math.random() * 0.4)) / k, y: (r.y + r.h * 0.6) / k, text: 'tap tap', color: C.onDark, life: 1.2 });
        }
        break;
      }
      case 'died': case 'codex': case 'fry': case 'expedition':
        break;
    }
  }

  private handleKeys() {
    const k = this.input.keysPressed;
    if (k.has('Escape')) {
      if (this.placing) this.placing = null;
      else if (this.tool) this.tool = null;
      else if (this.window) this.window = null;
      else if (this.select) this.select = null;
      else this.window = 'menu';
    }
    if (this.window) return;
    const s = this.state;
    if (k.has(' ')) s.settings.speed = s.settings.speed === 0 ? 1 : 0;
    const modes: Mode[] = ['look', 'scape', 'stock', 'gear', 'water', 'care'];
    modes.forEach((m, i) => {
      if (k.has(String(i + 1)) && !this.placing) this.setMode(m);
    });
    if (this.placing) {
      if (k.has('1') || k.has('q')) this.layer = 0;
      if (k.has('2') || k.has('w')) this.layer = 1;
      if (k.has('3') || k.has('e')) this.layer = 2;
    }
    if (k.has('f') && this.tank) this.run(act.feed(this.game!, this.tank));
    if (k.has('h')) this.view = this.view === 'hall' ? 'tank' : 'hall';
    if (k.has('Tab') || k.has(']')) this.cycleTank(1);
    if (k.has('[')) this.cycleTank(-1);
  }

  cycleTank(d: number) {
    const ts = this.state.tanks;
    if (!ts.length) return;
    const i = ts.findIndex((t) => t.id === this.tankId);
    this.setTank(ts[(i + d + ts.length) % ts.length].id);
  }

  setMode(m: Mode) {
    this.mode = m;
    this.placing = null;
    this.tool = null;
    this.select = null;
    this.view = 'tank';
  }

  // ---------------------------------------------------------------- drawing

  /** the hall: a sage-green papered wall, a wainscot and a wooden floor (STYLE.md, Interface) */
  drawRoom() {
    const c = this.ctx;
    const k = this.scale;
    const sw = this.canvas.width, sh = this.canvas.height;
    const rail = Math.floor(sh * 0.7 / k) * k, floor = Math.floor(sh * 0.93 / k) * k;
    const grd = c.createLinearGradient(0, 0, 0, rail);
    grd.addColorStop(0, PALETTE[C.wallTop]);
    grd.addColorStop(1, PALETTE[C.wallBottom]);
    c.fillStyle = grd;
    c.fillRect(0, 0, sw, rail);
    // wallpaper: a quiet stripe of frond sprigs
    c.fillStyle = rgba(37, 0.18);
    for (let x = 12 * k; x < sw; x += 28 * k) {
      c.fillRect(x, 0, k, rail);
      for (let y = 10 * k + ((x / k / 28) % 2) * 14 * k; y < rail - 6 * k; y += 28 * k) {
        c.fillRect(x - 2 * k, y, 2 * k, k);
        c.fillRect(x + k, y + 3 * k, 2 * k, k);
      }
    }
    // chair rail and wainscot boards
    c.fillStyle = PALETTE[38];
    c.fillRect(0, rail, sw, k);
    c.fillStyle = PALETTE[C.wallBottom];
    c.fillRect(0, rail + k, sw, floor - rail - k);
    c.fillStyle = rgba(34, 0.5);
    c.fillRect(0, rail + k, sw, k);
    for (let x = 0; x < sw; x += 22 * k) c.fillRect(x, rail + 2 * k, k, floor - rail - 2 * k);
    // floorboards
    c.fillStyle = PALETTE[C.floor];
    c.fillRect(0, floor, sw, sh - floor);
    c.fillStyle = PALETTE[25];
    c.fillRect(0, floor, sw, k);
    c.fillStyle = rgba(0, 0.25);
    for (let x = 0; x < sw; x += 46 * k) c.fillRect(x, floor + k, k, sh - floor);
  }

  private neighborGlow(side: -1 | 1) {
    const s = this.state;
    const i = s.tanks.findIndex((t) => t.id === this.tankId);
    const n = s.tanks[i + side];
    if (!n) return;
    const look = waterLook(n, this.game!.stats.get(n.id));
    const colors: Record<string, string> = { clear: '77,155,230', green: '30,188,115', blackwater: '205,104,61', amber: '230,144,78', rift: '77,101,180', brackish: '146,169,132', reef: '48,225,185', lagoon: '14,175,155', kelp: '84,126,100', cold: '143,211,255', pelagic: '72,74,119', deep: '50,51,83', pond: '145,219,105', cave: '127,112,138' };
    const rgb = colors[look] ?? '77,155,230';
    const c = this.ctx;
    const k = this.scale;
    const x = (side < 0 ? 0 : this.W - panelW(this) - 46) * k;
    const grd = c.createLinearGradient(side < 0 ? 0 : x + 40 * k, 0, side < 0 ? 40 * k : x, 0);
    grd.addColorStop(0, `rgba(${rgb},0.22)`);
    grd.addColorStop(1, `rgba(${rgb},0)`);
    c.fillStyle = grd;
    c.fillRect(x, (TOP_H + 20) * k, 40 * k, (this.H - TOP_H - TOOLBAR_H - 60) * k);
  }

  private draw(dt: number) {
    this.drawRoom();
    if (this.view === 'hall') {
      // drawn by the HUD (bay cards)
    } else if (this.tank) {
      this.neighborGlow(-1);
      this.neighborGlow(1);
      this.drawTank(this.tank, dt);
    }
    this.uiSpace();
    if (this.view === 'tank' && this.tank) this.drawPlaque(this.tank);
    drawHud(this);
    if (this.view === 'tank' && this.tank) drawPanel(this);
    if (this.window) drawWindow(this);
    this.drawOverlays();
  }

  /** area the tank may use, between the bars and left of the side panel */
  viewport() {
    const x = 4, y = TOP_H + 4;
    return { x, y, w: this.W - panelW(this) - 16, h: this.H - TOP_H - TOOLBAR_H - 30 };
  }

  private drawTank(t: Tank, _dt: number) {
    const g = this.game!;
    const v = this.viewFor(t);
    const st = g.stats.get(t.id);
    const s = g.state;
    const hour = hourOf(s.time);
    const vp = this.viewport();
    // the view in window pixels; the tank gets the largest whole-number zoom that fits
    const k = this.scale;
    const sx = vp.x * k, sy = vp.y * k, sw = vp.w * k, sh = vp.h * k;
    const cw = v.canvas.width, ch = v.canvas.height;
    const fit = Math.min(sw / cw, sh / ch);
    const base = fit >= 1 ? Math.floor(fit) : fit >= 0.5 ? 0.5 : fit;
    const z = Math.max(0.25, base + this.zoomBoost);
    const dw = Math.round(cw * z), dh = Math.round(ch * z);
    // pan only when the zoomed tank is bigger than the view
    const maxPx = Math.max(0, (dw - sw) / 2), maxPy = Math.max(0, (dh - sh) / 2);
    this.pan.x = Math.max(-maxPx, Math.min(maxPx, this.pan.x));
    this.pan.y = Math.max(-maxPy, Math.min(maxPy, this.pan.y));
    const ox = Math.round(sx + (sw - dw) / 2 + this.pan.x), oy = Math.round(sy + (sh - dh) / 2 + this.pan.y);
    this.tankRect = { x: ox + MARGIN.l * z, y: oy + MARGIN.t * z, w: v.g.w * z, h: v.g.h * z, z };

    // pointer in tank pixels (input is in UI pixels)
    const tx = (this.input.x * k - ox) / z - MARGIN.l, ty = (this.input.y * k - oy) / z - MARGIN.t;
    const inTank = !this.ui.overUI && this.input.x >= vp.x && this.input.x < vp.x + vp.w && this.input.y >= vp.y && this.input.y < vp.y + vp.h && tx >= 0 && ty >= 0 && tx < v.g.w && ty < v.g.h;
    this.handleTankInput(t, v, tx, ty, inTank);

    const lightsOn = hour >= t.set.lightOn && hour < t.set.lightOff && t.equip.some((e) => e.startsWith('led') || e === 't5_bank' || e === 'metal_halide' || e === 'exhibit_skylight');
    let ghost;
    if (this.placing && inTank) {
      const host = this.hostUnder(t, v, tx, ty);
      const spot = act.dropSpot(t, this.placing.id, tx, this.layer, host);
      ghost = { id: this.placing.id, x: spot.x, layer: this.layer, ok: act.canPlace(t, this.placing.id) === '', on: spot.on, y: spot.y };
    }
    v.draw(t, st, {
      hour, lightsOn, open: !!isOpen(s, s.time),
      hoverItem: this.hover?.kind === 'item' ? this.hover.uid : undefined,
      selectItem: this.select?.kind === 'item' ? this.select.uid : undefined,
      hoverAgent: this.hover?.kind === 'agent' ? this.hover.uid : undefined,
      selectAgent: this.select?.kind === 'agent' ? this.select.uid : undefined,
      ghost,
      tool: inTank && (this.tool === 'scrape' || this.tool === 'wipe') ? { kind: this.tool, x: tx, y: ty } : undefined,
    });
    this.ctx.imageSmoothingEnabled = z < 1;
    this.ctx.drawImage(v.canvas, ox, oy, dw, dh);
    this.ctx.imageSmoothingEnabled = false;
    this.plaqueAt = { x: (ox + dw / 2) / k, y: (oy + dh - MARGIN.b * z * 0.55) / k };
  }

  /** the brass plaque on the stand: the tank's name and stars (UI pixels) */
  private drawPlaque(t: Tank) {
    const st = this.game!.stats.get(t.id);
    if (!st) return;
    const px = Math.round(this.plaqueAt.x), py = Math.round(this.plaqueAt.y);
    // a small tank on a small screen has a short stand: use the text face and a slimmer plate
    const big = (MARGIN.b * this.tankRect.z) / this.scale >= 28;
    const face = big ? 'display' : 'text';
    const nameW = Math.min(200, textWidth(t.name, face));
    const w = nameW + 88, h = big ? 22 : 18;
    const u = this.ui;
    const x = Math.round(px - w / 2), y = py - h / 2;
    // a brass plaque screwed to the stand
    u.rr(x, y + 2, w, h, 3, 0, 0.35);
    u.rr(x, y, w, h, 3, 20);
    u.rr(x + 1, y + 1, w - 2, h - 2, 2, 22);
    u.fill(x + 3, y + 1, w - 6, 1, 23);
    u.fill(x + 3, y + h / 2 - 1, 2, 2, 20);
    u.fill(x + w - 5, y + h / 2 - 1, 2, 2, 20);
    u.text(t.name, x + 10, y + (big ? 4 : 2), 19, { maxW: 200, face });
    u.stars(x + w - 70, y + (big ? 4 : 2), st.rating.stars, C.coin, 21);
  }

  hostUnder(t: Tank, v: TankView, tx: number, ty: number): number | undefined {
    if (!this.placing) return undefined;
    const it = item(this.placing.id);
    if (it.place !== 'attach' && it.place !== 'rock') return undefined;
    for (let i = v.itemRects.length - 1; i >= 0; i--) {
      const r = v.itemRects[i];
      const host = t.items.find((p) => p.uid === r.uid);
      if (!host) continue;
      const hc = item(host.id).cat;
      if (hc !== 'rock' && hc !== 'wood') continue;
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return r.uid;
    }
    return undefined;
  }

  private itemUnder(v: TankView, tx: number, ty: number): number | undefined {
    for (let i = v.itemRects.length - 1; i >= 0; i--) {
      const r = v.itemRects[i];
      const ix = r.x + r.w * 0.12, iw = r.w * 0.76;
      if (tx >= ix && tx < ix + iw && ty >= r.y + 1 && ty < r.y + r.h) return r.uid;
    }
    return undefined;
  }

  private handleTankInput(t: Tank, v: TankView, tx: number, ty: number, inTank: boolean) {
    const g = this.game!;
    const inp = this.input;
    this.hover = null;
    // zoom and pan
    if (inTank && inp.wheel && !this.window) {
      this.zoomBoost = Math.max(0, Math.min(3, this.zoomBoost - Math.sign(inp.wheel)));
      inp.wheel = 0;
    }
    // right-drag pans a zoomed tank
    if (inp.rightDown && !this.placing) {
      this.pan.x += (inp.x - this.lastX) * this.scale;
      this.pan.y += (inp.y - this.lastY) * this.scale;
    }
    this.lastX = inp.x;
    this.lastY = inp.y;
    if (this.window) return;
    if (inp.rightPressed && this.placing) this.placing = null;

    // dragging an item to move it (Scape)
    if (this.drag) {
      if (!inp.down) {
        const p = t.items.find((q) => q.uid === this.drag!.uid);
        if (p) this.run(act.moveItem(g, t, p.uid, tx - this.drag.dx, p.layer));
        this.drag = null;
      } else {
        const p = t.items.find((q) => q.uid === this.drag!.uid);
        if (p) {
          const nx = Math.max(4, Math.min(v.g.w - 4, Math.round(tx - this.drag.dx)));
          const d = nx - p.x;
          p.x = nx;
          for (const q of t.items) if (q.on === p.uid) q.x += d;
        }
      }
      return;
    }
    if (!inTank) {
      this.stroke = null;
      return;
    }

    if (this.tool === 'scrape' || this.tool === 'wipe') {
      if (!inp.down) {
        this.stroke = null;
        return;
      }
      // follow the whole stroke since last frame, not just where the pointer is now
      const from = this.stroke ?? { x: tx, y: ty };
      const steps = Math.max(1, Math.ceil(Math.hypot(tx - from.x, ty - from.y) / 3));
      let level = this.tool === 'scrape' ? t.chem.glass : t.smudge;
      for (let k = 1; k <= steps; k++) {
        const px = from.x + ((tx - from.x) * k) / steps, py = from.y + ((ty - from.y) * k) / steps;
        level = this.tool === 'scrape' ? v.scrape(px, py) : v.wipe(px, py);
      }
      if (this.tool === 'scrape') {
        if (t.chem.glass - level > 0.004 && Math.random() < 0.3) this.audio.play('scrape');
        t.chem.glass = Math.min(t.chem.glass, level);
      } else t.smudge = Math.min(t.smudge, level);
      this.stroke = { x: tx, y: ty };
      return;
    }
    if (this.tool === 'sculpt') {
      if (inp.down) {
        const n = t.profile.length;
        const i = Math.round((tx / v.g.w) * (n - 1));
        const val = (v.g.h - 5 - ty) / v.g.maxDepth;
        act.setProfile(g, t, i, val);
      }
      if (inp.released) g.refresh(t);
      return;
    }
    if (this.placing) {
      if (inp.clicked) {
        const host = this.hostUnder(t, v, tx, ty);
        const msg = act.buyItem(g, t, this.placing.id, tx, this.layer, host, this.placing.fromInventory);
        if (msg) this.toast(msg, 'bad');
        if (this.placing.fromInventory && !(this.state.inventory[this.placing.id] > 0)) this.placing = null;
      }
      return;
    }
    const agent = v.agents.pick(tx, ty);
    const itemUid = this.itemUnder(v, tx, ty);
    if (this.mode === 'scape') {
      if (itemUid !== undefined) this.hover = { kind: 'item', uid: itemUid };
      if (inp.pressed && itemUid !== undefined) {
        const p = t.items.find((q) => q.uid === itemUid)!;
        this.select = { kind: 'item', uid: itemUid };
        this.drag = { uid: itemUid, dx: tx - p.x };
      } else if (inp.clicked && itemUid === undefined) this.select = null;
    } else {
      if (agent) {
        this.hover = { kind: 'agent', uid: agent.uid };
        const a = t.animals.find((x) => x.uid === agent.uid);
        const s = species(agent.sp);
        const m = g.stats.get(t.id)?.moods.get(agent.sp);
        this.ui.tip([{ text: s.name + (a?.fry ? ' (young)' : '') }, { text: s.sci, color: C.textDim }, ...(m ? [{ text: `Mood ${Math.round(m.mood * 100)}%`, color: m.mood > 0.7 ? C.good : m.mood > 0.4 ? C.warn : C.bad }] : [])]);
      } else if (itemUid !== undefined) {
        this.hover = { kind: 'item', uid: itemUid };
        const p = t.items.find((q) => q.uid === itemUid);
        if (p) this.ui.tip([{ text: item(p.id).name }]);
      }
      if (inp.clicked) {
        if (agent) this.select = { kind: 'agent', uid: agent.uid };
        else if (itemUid !== undefined) this.select = { kind: 'item', uid: itemUid };
        else this.select = null;
        if (this.select && this.mode !== 'look') this.mode = 'look';
      }
    }
  }

  private drawOverlays() {
    const u = this.ui;
    for (const p of this.pops) u.text(p.text, p.x, p.y, p.color, { align: 'center', shadow: 0, face: 'display' });
    if (this.banner) {
      const w = Math.max(320, textWidth(this.banner.sub) + 40), x = (this.W - w) / 2, y = 80;
      u.panel(x, y, w, 56, 'card', false);
      u.head(this.banner.title, this.W / 2, y + 10, C.head, { align: 'center' });
      u.text(this.banner.sub, this.W / 2, y + 30, C.strong, { align: 'center' });
    }
  }

  /** a creature's portrait frame for lists */
  portrait(sp: string) {
    return creatureFrame(sp, 0);
  }
}
