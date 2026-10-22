// The app: owns the canvas, the game, one TankView per tank and the UI state, and routes input.
// The screen is a low-resolution buffer (800x450 or a little more) scaled up by a whole number; the tank is
// drawn at a whole-number zoom inside it, so every sprite pixel stays square.
import { item, species, TIERS } from '../data';
import { PALETTE, rgba, setCalmColors, UI as C } from '../data/palette';
import { Audio, QUIET, type SoundScene } from '../engine/audio';
import { Input } from '../engine/input';
import { creatureFrame } from '../render/art/sprites';
import { isRainy, prop, propSize, wallClock } from '../render/shop';
import { MARGIN, TankView, waterLook } from '../render/tankview';
import * as act from '../sim/actions';
import { BAL } from '../sim/balance';
import { geom } from '../sim/facts';
import { Game, type GameEvent } from '../sim/Game';
import { newGame, showcaseTank } from '../sim/newgame';
import { clearLocal, hasSave, loadLocal, saveLocal } from '../sim/save';
import { clockText, dayOf, hourOf, type Tank } from '../sim/state';
import { isOpen } from '../sim/visitors';
import { drawHud, TOOLBAR_H, TOP_H } from '../ui/hud';
import { drawPanel, panelW } from '../ui/panels';
import { Cutscene, SCENES } from '../ui/cutscene';
import { drawTitle } from '../ui/title';
import { drawTutorial, noteReserve, PAUSED_UNTIL } from '../ui/tutorial';
import { M, textWidth, UI } from '../ui/ui';
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
  drag: { uid: number; dx: number; x0: number; layer0: number } | null = null;
  zoomBoost = 0;
  /** watch mode: the interface steps aside and the tank gets the whole screen */
  watch = false;
  private watchHint = 0;
  pan = { x: 0, y: 0 };
  toasts: Toast[] = [];
  pops: Pop[] = [];
  /** species whose bags just opened (their fish swim in from the surface) */
  released = new Map<number, Set<string>>();
  /** panel state: tabs, filters, selected rows, quantities */
  panel = { scapeTab: 0, stockTab: 0, gearTab: 0, codexTab: 0, codexSel: '', buySp: '', buyN: 1, upgradeTab: 0, letterSel: '', tripSel: '', shellSel: '', waterSel: 'fresh' as 'fresh' | 'brackish' | 'marine', confirmNew: 0, confirmDismantle: 0 };
  /** the last guestbook line, shown under the tank for a while */
  guest: { text: string; who: string; life: number } | null = null;
  banner: { title: string; sub: string; life: number } | null = null;
  /** a cutscene playing over everything (the game waits) */
  cutscene: Cutscene | null = null;
  /** things the tutorial watches for that are not in the state (fed, sculpted, windows opened) */
  tutorialFlags = new Set<string>();
  /** an earlier tutorial step the player went back to reread (null: the current step) */
  tutorialPeek: number | null = null;
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
    // crisp whole-number pixels by default; "larger interface" fills the screen in quarter steps
    const fit = Math.min(vw / 800, vh / 450);
    const big = (this.game?.state.settings.textSize ?? 0) > 0;
    this.scale = Math.max(1, big ? Math.floor(fit * 4) / 4 : Math.floor(fit));
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
    this.view = 'hall';
    this.tutorialFlags.clear();
    this.tutorialPeek = null;
    this.playScene('intro');
  }

  /** Play a cutscene once per save (state.seen); the game waits until it ends or is skipped. */
  playScene(id: string, force = false) {
    const s = this.game?.state;
    if (!s || (!force && s.seen.includes(id)) || !SCENES[id]) return;
    this.cutscene = new Cutscene(SCENES[id], () => {
      this.cutscene = null;
      if (!s.seen.includes(id)) s.seen.push(id);
      this.save();
    });
  }

  continueSave() {
    const s = loadLocal();
    if (!s) return this.startNew();
    const g = new Game(s);
    const earned = g.offlineIncome((Date.now() - s.savedAt) / 3600000);
    if (earned > 0) this.toast(`While you were away, Ida minded the shop: +${earned} coins.`, 'good');
    this.load(g);
  }

  private load(g: Game) {
    this.game = g;
    setCalmColors(!!g.state.settings.calmColors);
    this.resize();
    this.views.clear();
    this.tankId = g.state.tanks[0]?.id ?? 0;
    this.screen = 'game';
    this.window = null;
    this.mode = 'look';
    this.select = null;
    this.titleDemo = null;
    this.audio.setVolume(g.state.settings.volume);
    this.audio.setAmbience(g.state.settings.ambience ?? 0.7);
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
    // (a scene that ends during its update has already cleared itself)
    if (this.cutscene) this.cutscene.update(dt);
    if (this.cutscene) {
      this.cutscene.draw(this);
    } else if (this.screen === 'title') {
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
      const s = newGame(12345);
      showcaseTank(s);
      const g = new Game(s);
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
    // the title tank's filter trickling in a quiet shop
    this.audio.update(dt, { ...QUIET, filter: 'hob', near: 0.7 });
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

  /** what the shop should sound like: the shown tank's gear up close; from the hall only the room,
   *  the visitors and the rain (a tank is heard only while you are watching it) */
  private soundScene(): SoundScene {
    const s = this.state;
    const g = this.game!;
    const open = isOpen(s, s.time);
    const tanks = this.view === 'tank' && this.tank ? [this.tank] : [];
    const near = this.view === 'tank' ? (this.watch ? 1 : 0.85) : 0.5;
    const has = (id: string) => tanks.some((t) => t.equip.includes(id));
    const filter: SoundScene['filter'] = has('sump') || has('life_support') ? 'sump' : has('hob_filter') ? 'hob' : has('sponge_filter') ? 'sponge' : tanks.some((t) => t.equip.length) ? 'canister' : 'none';
    const air = has('air_pump') ? 0.6 : has('mister') ? 0.2 : 0;
    const marine = tanks.filter((t) => t.water === 'marine').length / Math.max(1, tanks.length);
    const hum = Math.min(1, marine * 0.7 + (tanks.some((t) => t.equip.some((e) => e.startsWith('chiller'))) ? 0.3 : 0) + (has('protein_skimmer') ? 0.2 : 0));
    const surge = has('surge_device') ? 1 : has('wavemaker') ? 0.55 : has('powerhead') ? 0.2 : 0;
    const vph = open ? (this.view === 'tank' && this.tank ? g.stats.get(this.tank.id)?.visitorsPerHour ?? 0 : [...g.stats.values()].reduce((a, st) => a + st.visitorsPerHour, 0) * 0.5) : 0;
    return { filter, air, hum, surge, crowd: Math.min(1, vph / 50), rain: isRainy(dayOf(s.time)) ? 1 : 0, night: open !== 'day', near };
  }

  private update(dt: number) {
    const g = this.game!;
    const s = g.state;
    // nothing lives in the shop yet: Ida's first steps keep the clock still
    if (!s.tutorial.done && s.tutorial.step < PAUSED_UNTIL) s.settings.speed = 0;
    const speed = SPEEDS.includes(s.settings.speed) ? s.settings.speed : 1;
    // any open window pauses the clock (the shop waits while you read or plan)
    if (speed > 0 && !this.window) g.tick(dt * speed);
    this.handleKeys();
    for (const e of g.events.splice(0)) this.onEvent(e);
    for (const t of s.tanks) if (!this.views.has(t.id)) this.viewFor(t);
    for (const id of [...this.views.keys()]) if (!s.tanks.some((t) => t.id === id)) this.views.delete(id);
    if (!this.tank && s.tanks.length) this.tankId = s.tanks[0].id;
    if (!s.tanks.length) this.view = 'hall';
    if (this.window) this.tutorialFlags.add('w:' + this.window);
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
    this.audio.update(dt, this.soundScene());
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
        // a tank's own sounds (fry, a sale from it) only when you are looking at that tank
        if (e.tank === undefined || (this.view === 'tank' && e.tank === this.tankId)) this.audio.play(e.name);
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
        if (e.level === 3) this.playScene('town');
        this.banner = { title: 'A new chapter', sub: `Fins & Fronds is now a ${TIERS[e.level].name}!`, life: 6 };
        break;
      case 'feed': {
        this.tutorialFlags.add('fed');
        this.audio.play('feed');
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
      if (this.watch) this.toggleWatch();
      else if (this.window) this.window = null;
      else if (this.placing) this.placing = null;
      else if (this.tool) this.tool = null;
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
    if (k.has('v') || k.has('V')) this.toggleWatch();
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
    if (this.watch && (this.view !== 'tank' || !this.tank)) this.watch = false;
    if (this.view === 'hall') {
      // drawn by the HUD (bay cards)
    } else if (this.tank) {
      if (!this.watch) {
        this.neighborGlow(-1);
        this.neighborGlow(1);
      }
      this.drawTank(this.tank, dt);
    }
    this.uiSpace();
    if (this.watch) {
      this.drawWatchHint(dt);
      this.drawOverlays();
      return;
    }
    if (this.view === 'tank' && this.tank) this.drawPlaque(this.tank);
    drawHud(this);
    if (this.view === 'tank' && this.tank) {
      drawPanel(this);
      const vp = this.viewport();
      const ww = this.ui.buttonW('Watch (V)', 'ui:eye', 16);
      if (this.ui.button('watch', vp.x + vp.w - ww - 4, vp.y + 2, ww, Math.max(18, M.btn), 'Watch (V)', { style: 'flat', tip: 'Hide the shop and watch this tank full screen', icon: 'ui:eye' })) this.toggleWatch();
    }
    if (this.window) drawWindow(this);
    this.drawOverlays();
    drawTutorial(this);
  }

  toggleWatch() {
    this.watch = !this.watch && this.view === 'tank' && !!this.tank;
    this.watchHint = this.watch ? 4 : 0;
    this.zoomBoost = 0;
    this.pan = { x: 0, y: 0 };
  }

  /** watch mode's only interface: a fading hint, and the clock and coins kept small in a corner */
  private drawWatchHint(dt: number) {
    const u = this.ui;
    this.watchHint = Math.max(0, this.watchHint - dt);
    const s = this.state;
    const corner = `Day ${dayOf(s.time)} ${clockText(s.time)}`;
    u.ctx.globalAlpha = 0.75;
    u.text(corner, this.W - 8, this.H - 16, C.onDark, { align: 'right', shadow: 0 });
    u.ctx.globalAlpha = 1;
    if (this.watchHint > 0) {
      const text = 'Watching. V or Esc to step back; F feeds; the wheel zooms.';
      const w = textWidth(text) + 24;
      u.ctx.globalAlpha = Math.min(1, this.watchHint);
      u.panel(Math.round((this.W - w) / 2), 10, w, 24, 'chip', false);
      u.text(text, this.W / 2, 15, C.text, { align: 'center' });
      u.ctx.globalAlpha = 1;
    }
  }

  /** area the tank may use, between the bars and left of the side panel (and below Ida's note) */
  viewport() {
    if (this.watch) return { x: 0, y: 0, w: this.W, h: this.H };
    const note = noteReserve(this);
    const x = 4, y = TOP_H + 4 + note;
    return { x, y, w: this.W - panelW(this) - 16, h: this.H - TOP_H - TOOLBAR_H - 30 - note };
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
    // a tank that fits stands on the floor (its stand at the bottom of the view), not mid-air
    const ox = Math.round(sx + (sw - dw) / 2 + this.pan.x), oy = Math.round(dh <= sh && !this.watch ? sy + sh - dh : sy + (sh - dh) / 2 + this.pan.y);
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
    if (!this.watch) this.shopAround(ox, oy, dw, dh);
    this.ctx.imageSmoothingEnabled = z < 1;
    this.ctx.drawImage(v.canvas, ox, oy, dw, dh);
    this.ctx.imageSmoothingEnabled = false;
    this.plaqueAt = { x: (ox + dw / 2) / k, y: (oy + dh - MARGIN.b * z * 0.55) / k };
  }

  /** The shop in the margins around the tank (window pixels in, UI pixels drawn): a plant and
   *  a poster on the left, buckets and a hanging pothos on the right, where there is room. */
  private shopAround(ox: number, oy: number, dw: number, dh: number) {
    const k = this.scale, ctx = this.ctx;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const vp = this.viewport();
    const floorY = Math.floor(this.H * 0.93);
    const l = ox / k, r = (ox + dw) / k, top = oy / k;
    const room = (name: string) => propSize(name) ?? { w: 0, h: 0 };
    if (l - vp.x > room('sh:monstera').w + 12) prop(ctx, 'sh:monstera', l - room('sh:monstera').w - 8, floorY + 4);
    if (l - vp.x > room('sh:poster').w + 16 && top - TOP_H > 20) prop(ctx, 'sh:poster', l - room('sh:poster').w - 14, Math.min(floorY - 140, top + room('sh:poster').h + 10));
    // a shelf of supplies and the clock on the wall above the tank
    const shelf = room('sh:shelf');
    if (top - TOP_H > shelf.h + 30) {
      prop(ctx, 'sh:shelf', l + 10, top - 18);
      wallClock(ctx, r - 30, TOP_H + Math.min(40, (top - TOP_H) / 2), 11, this.state.time);
    }
    const rightRoom = vp.x + vp.w - r;
    if (rightRoom > room('sh:buckets').w + 10) prop(ctx, 'sh:buckets', r + 8, floorY + 3);
    if (rightRoom > room('sh:pothos').w + 10) prop(ctx, 'sh:pothos', r + Math.floor((rightRoom - room('sh:pothos').w) / 2), TOP_H + room('sh:pothos').h + 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        // a click without a real move is just a selection (a crypt only melts when it is moved)
        if (p) this.run(act.moveItem(g, t, p.uid, tx - this.drag.dx, p.layer, Math.abs(tx - this.drag.dx - this.drag.x0) > 2 || p.layer !== this.drag.layer0));
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
        this.tutorialFlags.add('sculpted');
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
        // one piece per click; hold Shift to keep placing the same thing
        if (!msg && !inp.keys.has('Shift')) this.placing = null;
        else if (this.placing.fromInventory && !(this.state.inventory[this.placing.id] > 0)) this.placing = null;
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
        this.drag = { uid: itemUid, dx: tx - p.x, x0: p.x, layer0: p.layer };
      } else if (inp.clicked && itemUid === undefined) this.select = null;
    } else {
      if (agent) {
        this.hover = { kind: 'agent', uid: agent.uid };
        const a = t.animals.find((x) => x.uid === agent.uid);
        const s = species(agent.sp);
        const m = g.stats.get(t.id)?.moods.get(agent.sp);
        const title = a?.name ? `${a.name}, ${s.name.toLowerCase()}` : s.name;
        this.ui.tip([{ text: title + (a?.fry ? ' (young)' : '') }, { text: a?.name ? 'Click to see or rename' : 'Click to name it', color: C.textDim }, ...(m ? [{ text: `Mood ${Math.round(m.mood * 100)}%`, color: m.mood > 0.7 ? C.good : m.mood > 0.4 ? C.warn : C.bad }] : [])]);
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
    if (!this.window) for (const p of this.pops) u.text(p.text, p.x, p.y, p.color, { align: "center", shadow: 0, face: "display" });
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
