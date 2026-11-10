// The app: owns the canvas, the game, one TankView per tank and the UI state, and routes input.
// The screen is a low-resolution buffer (800x450 or a little more) scaled up by a whole number; the tank is
// drawn at a whole-number zoom inside it, so every sprite pixel stays square.
import { item, species, TIERS } from '../data';
import { PALETTE, rgba, setCalmColors, UI as C } from '../data/palette';
import { markNotesSeen, notesSeen } from '../data/patchnotes';
import { Audio, QUIET, type SoundScene } from '../engine/audio';
import { Input } from '../engine/input';
import { creatureFrame } from '../render/art/sprites';
import { isRainy, prop, propsDrawn, propSize, wallClock } from '../render/shop';
import { MARGIN, TankView, waterLook } from '../render/tankview';
import * as act from '../sim/actions';
import { BAL } from '../sim/balance';
import { geom } from '../sim/facts';
import { Game, type GameEvent } from '../sim/Game';
import { newGame, showcaseTank } from '../sim/newgame';
import { BACKUP_KEY, clearLocal, hasSave, loadLocal, SAVE_KEY, saveLocal } from '../sim/save';
import { clockText, dayOf, hourOf, type Tank } from '../sim/state';
import { isOpen } from '../sim/visitors';
import { bannerBox, drawHud, TOOLBAR_H, toastBoxes, TOP_H } from '../ui/hud';
import { drawPanel, panelW } from '../ui/panels';
import { Cutscene, SCENES } from '../ui/cutscene';
import { drawTitle } from '../ui/title';
import { drawTutorial, noteReserve, PAUSED_UNTIL } from '../ui/tutorial';
import { M, textWidth, UI } from '../ui/ui';
import { drawWindow } from '../ui/windows';

export type Mode = 'look' | 'scape' | 'stock' | 'gear' | 'water' | 'care';
export type WindowId = 'codex' | 'letters' | 'trips' | 'upgrades' | 'guestbook' | 'menu' | 'newtank' | 'news';

export interface Toast {
  text: string;
  tone: 'good' | 'bad' | 'info';
  life: number;
}

export interface Pop {
  /** where it rose from, as shares of the tank glass, so it stays with the glass when the window resizes */
  fx: number;
  fy: number;
  /** UI pixels it has risen above that point */
  lift: number;
  text: string;
  color: number;
  life: number;
  /** the coins a coin pop shows: a sale with no clear spot for its own pop adds to the newest one */
  coins?: number;
}

export const SPEEDS = [0, 1, 3, 10];
/** narrower than this (UI pixels) and taller than wide, the shop asks for the screen turned */
const SIDEWAYS_W = 720;
/** hall thumbnails are repainted this often (seconds), at most this many in one frame */
const THUMB_EVERY = 1 / 15;
const THUMBS_PER_FRAME = 6;

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
  /** the item being placed, and how far a rock or wood is turned before it goes in (R) */
  placing: { id: string; fromInventory: boolean; rot?: number } | null = null;
  layer: 0 | 1 | 2 = 1;
  tool: 'scrape' | 'wipe' | 'sculpt' | null = null;
  /** a piece being dragged in Scape: where it was picked up (and its riders), to put it back if the
   *  drag is interrupted; the state shows it under the pointer only as a preview until it is let go */
  drag: { uid: number; tank: number; px: number; py: number; dx: number; x0: number; y0: number; layer0: 0 | 1 | 2; on0?: number; riders: [number, number][] } | null = null;
  zoomBoost = 0;
  /** watch mode: the interface steps aside and the tank gets the whole screen */
  watch = false;
  private watchHint = 0;
  /** how long watch mode's Back button stays up (the pointer moved, or a tap) */
  private watchUi = 0;
  private watchAt = { x: -1, y: -1 };
  /** the speed Space resumes at */
  private resumeSpeed = 1;
  /** a right-drag or two-finger pan that began over the tank */
  private panning = false;
  /** touchpad wheel deltas add up to whole zoom steps */
  private zoomAcc = 0;
  /** the portrait screen card is up (the game waits) */
  sideways = false;
  /** the screen is mainly touched (a phone or tablet) */
  private coarse = false;
  /** the crisp interface is small for this screen (the larger one would be 1.5x or more) */
  private roomy = false;
  /** when each hall thumbnail was last painted, and how many more may be painted this frame */
  private thumbs = new Map<number, number>();
  private thumbBudget = 0;
  pan = { x: 0, y: 0 };
  toasts: Toast[] = [];
  /** why the autosave would not load, if Continue failed (the save itself is kept) */
  loadError: string | null = null;
  pops: Pop[] = [];
  /** the view and glass size the pops float over: they belong to that glass, so a change of view,
   *  or the window resized under them (they were placed apart at the old size), lets them go */
  private popsOver = '';
  /** species whose bags just opened (their fish swim in from the surface) */
  released = new Map<number, Set<string>>();
  /** panel state: tabs, filters, selected rows, quantities */
  panel = { scapeTab: 0, stockTab: 0, gearTab: 0, codexTab: 0, codexSel: '', buySp: '', buyN: 1, upgradeTab: 0, letterSel: '', tripSel: '', shellSel: '', waterSel: 'fresh' as 'fresh' | 'brackish' | 'marine', confirmNew: 0, confirmDismantle: 0 };
  /** the last guestbook line, shown under the tank for a while */
  guest: { text: string; who: string; life: number } | null = null;
  /** the new-chapter banner (y: where it has been put, so it never hops up while it shows) */
  banner: { title: string; sub: string; life: number; y?: number } | null = null;
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
    this.ui.sfx = (id) => this.audio.play(id === 'error' ? 'error' : 'click');
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.watchDpr();
    canvas.addEventListener('pointerdown', () => this.audio.unlock(), { once: false });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.save();
    });
    window.addEventListener('beforeunload', () => this.save());
  }

  /** The canvas is the full window, in device pixels (so 125% and 150% display scaling still get
   *  square pixels). The UI draws in UI pixels (canvas / scale, at least 800x450 where the screen has
   *  them); the tank draws in canvas pixels at its own whole-number zoom, so it can use the space. */
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const vw = Math.max(1, Math.floor(window.innerWidth * dpr)), vh = Math.max(1, Math.floor(window.innerHeight * dpr));
    this.canvas.width = vw;
    this.canvas.height = vh;
    this.canvas.style.width = `${vw / dpr}px`;
    this.canvas.style.height = `${vh / dpr}px`;
    // crisp: a whole number of device pixels per UI pixel, as many as fit 800x450 and never fewer
    // than the display's own whole scale (a phone keeps its fingertip-sized buttons)
    const fit = Math.min(vw / 800, vh / 450);
    const crisp = Math.max(1, Math.floor(fit), Math.floor(dpr));
    // "larger interface" fills the screen in quarter steps (softer pixels). Until the player picks,
    // a touchscreen that would draw the interface smaller than its own pixels gets it.
    const set = this.game?.state.settings.textSize;
    this.coarse = matchMedia('(pointer: coarse)').matches;
    const big = set === undefined ? this.coarse && crisp < dpr : set > 0;
    // a laptop screen at 1x has room for half as big again: worth pointing out
    this.roomy = !this.coarse && Math.floor(fit * 4) / 4 >= crisp * 1.5;
    this.scale = big ? Math.max(crisp, Math.floor(fit * 4) / 4, dpr) : crisp;
    this.W = Math.floor(vw / this.scale);
    this.H = Math.floor(vh / this.scale);
    this.input.setScale(this.scale / dpr);
    // a portrait phone cannot fit the shop: ask for the screen turned sideways instead
    this.sideways = this.W < SIDEWAYS_W && this.H > this.W;
  }

  /** moving the window to another screen, or browser zoom, changes the device pixel ratio */
  private watchDpr() {
    const mq = matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    mq.addEventListener('change', () => {
      this.resize();
      this.watchDpr();
    }, { once: true });
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
    // a new shop has nothing to catch up on
    markNotesSeen();
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
    const r = loadLocal();
    if (!r) return this.startNew();
    // a save that will not load is kept as it is (and backed up); the title screen says so
    if ('error' in r) {
      this.loadError = r.error;
      return;
    }
    const s = r.state;
    let g: Game;
    try {
      g = new Game(s);
    } catch (e) {
      // it read but will not run: keep it the same way (backed up, never written over)
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        /* storage blocked or full: the save is still in its own slot */
      }
      this.loadError = e instanceof Error ? e.message : String(e);
      return;
    }
    const earned = g.offlineIncome((Date.now() - s.savedAt) / 3600000);
    // (a few coins for a short absence is not news)
    if (earned >= BAL.offlineToastMin) this.toast(`While you were away, Ida minded the shop: +${earned} coins.`, 'good');
    this.load(g);
    // a returning player sees what changed since they last played (once per update, after any scene)
    if (!notesSeen() && g.state.tutorial.done) this.window = 'news';
    // a shop that reached the top before there was a finale sees it now (once)
    if (g.state.tier >= 5) this.playScene('finale');
  }

  private load(g: Game) {
    this.game = g;
    this.loadError = null;
    setCalmColors(!!g.state.settings.calmColors);
    this.resize();
    this.views.clear();
    this.thumbs.clear();
    this.tankId = g.state.tanks[0]?.id ?? 0;
    this.screen = 'game';
    this.window = null;
    this.mode = 'look';
    this.select = null;
    this.drag = null;
    this.placing = null;
    this.tool = null;
    this.watch = false;
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

  /** Run a player command and toast its message, if any: a command only speaks when it refuses. */
  run(msg: string | void) {
    if (!msg) return;
    this.toast(msg, 'bad');
    this.audio.play('error');
  }

  /** Whether a hall thumbnail should be repainted this frame: a few times a second each, a few per
   *  frame in turn, so a hall of eighteen tanks does not paint every one every frame (a tank not yet
   *  painted always is). The animals keep moving between paints. */
  thumbDue(id: number): boolean {
    const last = this.thumbs.get(id);
    if (last !== undefined && (this.ui.time - last < THUMB_EVERY || this.thumbBudget <= 0)) return false;
    this.thumbs.set(id, this.ui.time);
    this.thumbBudget--;
    return true;
  }

  viewFor(t: Tank): TankView {
    let v = this.views.get(t.id);
    if (!v || v.g.shell.id !== t.shell) {
      v = new TankView(t.id, t);
      this.views.set(t.id, v);
      this.thumbs.delete(t.id);
    }
    return v;
  }

  setTank(id: number) {
    this.cancelDrag();
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
    propsDrawn.length = 0;
    this.thumbBudget = THUMBS_PER_FRAME;
    // a drag lives only while its tank is on screen with nothing over it: anything else puts the
    // piece back where it was (a second finger, Esc, a window, the hall, watch mode, a cutscene)
    const d = this.drag;
    if (d && (this.cutscene || this.sideways || this.screen !== 'game' || this.window || this.watch || this.view !== 'tank' || this.tankId !== d.tank || this.mode !== 'scape' || this.input.gesture)) this.cancelDrag();
    // (a scene that ends during its update has already cleared itself)
    if (this.cutscene && !this.sideways) this.cutscene.update(dt);
    if (this.sideways) {
      this.drawSideways();
    } else if (this.cutscene) {
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

  /** A portrait phone (or a very narrow window): the shop needs a wide screen, so a friendly card
   *  asks for it turned, and the game waits meanwhile as it does under a window. */
  private drawSideways() {
    this.drawRoom();
    this.uiSpace();
    const u = this.ui;
    const phone = this.coarse;
    const head = phone ? 'Turn your phone sideways' : 'A little wider, please';
    const text = phone ? 'The shop needs a wide screen. Turn your phone on its side and the tanks come back.' : 'The shop needs a wide screen. Make the window wider and the tanks come back.';
    const w = Math.min(280, this.W - 24), x = Math.round((this.W - w) / 2);
    const ph = u.paraHeight(text, w - M.pad * 2);
    const h = 66 + ph + 10, y = Math.max(8, Math.round((this.H - h) / 2));
    u.panel(x, y, w, h, 'card');
    // a phone standing up, an arrow, the same phone on its side
    const cx = x + w / 2, gy = y + 12;
    u.rr(cx - 34, gy, 16, 26, 3, C.ink);
    u.rr(cx - 32, gy + 2, 12, 20, 1, 41);
    u.fill(cx - 10, gy + 12, 14, 2, C.accent);
    u.fill(cx, gy + 9, 2, 8, C.accent);
    u.fill(cx + 2, gy + 11, 2, 4, C.accent);
    u.rr(cx + 10, gy + 5, 26, 16, 3, C.ink);
    u.rr(cx + 12, gy + 7, 20, 12, 1, 41);
    u.head(head, cx, y + 44, C.head, { align: 'center', maxW: w - M.pad * 2 });
    u.para(text, x + M.pad, y + 62, w - M.pad * 2, C.text);
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
    if (s.settings.speed > 0) this.resumeSpeed = s.settings.speed;
    // once the tour is over, mention the larger interface on a screen with room for it, once
    // (choosing either way in the menu, or this, settles it)
    if (this.roomy && s.settings.textSize === undefined && s.tutorial.done) {
      s.settings.textSize = 0;
      this.toast('Text looking small? The menu (the gear, or Esc) has a larger interface.', 'info');
    }
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
      p.lift += dt * 10;
    }
    this.pops = this.pops.filter((p) => p.life > 0);
    // watch mode hides the notices, so they wait for the player to step back
    if (!this.watch) for (const t of this.toasts) t.life -= dt;
    this.toasts = this.toasts.filter((t) => t.life > 0);
    if (this.guest && !this.watch) {
      this.guest.life -= dt;
      if (this.guest.life <= 0) this.guest = null;
    }
    // the new-chapter banner waits while a window is open (it would sit over it), as toasts wait in Watch
    if (this.banner && !this.window) {
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
          // from just above the sand, clear of the plaque on the stand
          this.pop({ fx: 0.2, fy: 1, lift: 18, text: `+${e.amount}`, color: C.coin, life: 1.6, coins: e.amount }, 0.6);
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
        if (e.level === 5) this.playScene('finale');
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
          this.pop({ fx: 0.3, fy: 0.6, lift: 0, text: 'tap tap', color: C.onDark, life: 1.2 }, 0.4);
        }
        break;
      }
      case 'died': case 'codex': case 'fry': case 'expedition':
        break;
    }
  }

  /** Keys arrive lowercased (Shift and Caps Lock do not change a shortcut; Shift+R is read from the
   *  Shift key) and digits by position; Ctrl, Cmd and Alt combinations are left to the browser. */
  private handleKeys() {
    const inp = this.input;
    const k = inp.keysPressed;
    if (k.has('Escape')) {
      // a piece being dragged goes back first, then whatever is on top closes
      if (this.drag) this.cancelDrag();
      else if (this.watch) this.toggleWatch();
      else if (this.window) this.window = null;
      else if (this.placing) this.placing = null;
      else if (this.tool) this.tool = null;
      else if (this.select) this.select = null;
      else this.window = 'menu';
    }
    if (this.window) return;
    const s = this.state;
    // Space pauses, and picks up again at the speed you had
    if (k.has(' ')) s.settings.speed = s.settings.speed === 0 ? this.resumeSpeed : 0;
    const modes: Mode[] = ['look', 'scape', 'stock', 'gear', 'water', 'care'];
    modes.forEach((m, i) => {
      if (k.has(String(i + 1)) && !this.placing) this.setMode(m);
    });
    if (this.placing) {
      if (k.has('1') || k.has('q')) this.layer = 0;
      if (k.has('2') || k.has('w')) this.layer = 1;
      if (k.has('3') || k.has('e')) this.layer = 2;
    }
    // R turns a rock or wood clockwise, Shift+R back: the one being placed, else the selected one
    const shift = inp.keys.has('Shift');
    const turn = k.has('r') ? (shift ? -1 : 1) : 0;
    if (turn && this.placing && act.canTurn(this.placing.id)) this.placing.rot = act.turnAngle((this.placing.rot ?? 0) + turn * 15);
    else if (turn && this.tank && this.select?.kind === 'item') this.run(act.turnItem(this.game!, this.tank, this.select.uid, turn));
    // F feeds the tank on screen (from the hall it would feed one you cannot see)
    if (k.has('f') && this.view === 'tank' && this.tank) this.run(act.feed(this.game!, this.tank));
    if (k.has('h')) this.view = this.view === 'hall' ? 'tank' : 'hall';
    if (k.has('v')) this.toggleWatch();
    if (k.has(']') || (k.has('Tab') && !shift)) this.cycleTank(1);
    if (k.has('[') || (k.has('Tab') && shift)) this.cycleTank(-1);
  }

  cycleTank(d: number) {
    const ts = this.state.tanks;
    if (!ts.length) return;
    const i = ts.findIndex((t) => t.id === this.tankId);
    this.setTank(ts[(i + d + ts.length) % ts.length].id);
  }

  setMode(m: Mode) {
    this.cancelDrag();
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

  /** Watch mode is only for watching: whatever was in hand (a piece to place, a tool, a drag) is
   *  put down on the way in. */
  toggleWatch() {
    this.cancelDrag();
    this.watch = !this.watch && this.view === 'tank' && !!this.tank;
    this.watchHint = this.watch ? 4 : 0;
    this.watchUi = this.watch ? 4 : 0;
    if (this.watch) {
      this.placing = null;
      this.tool = null;
      this.stroke = null;
    }
    this.zoomBoost = 0;
    this.pan = { x: 0, y: 0 };
  }

  /** watch mode's only interface: a fading hint, a Back button that shows while the pointer moves
   *  (or after a tap, on a touchscreen), and the clock kept small in a corner */
  private drawWatchHint(dt: number) {
    const u = this.ui, inp = this.input;
    this.watchHint = Math.max(0, this.watchHint - dt);
    const moved = inp.x >= 0 && (inp.x !== this.watchAt.x || inp.y !== this.watchAt.y);
    this.watchAt = { x: inp.x, y: inp.y };
    this.watchUi = moved || inp.pressed ? 3 : Math.max(0, this.watchUi - dt);
    const s = this.state;
    const corner = `Day ${dayOf(s.time)} ${clockText(s.time)}`;
    u.ctx.globalAlpha = 0.75;
    u.text(corner, this.W - 8, this.H - 16, C.onDark, { align: 'right', shadow: 0 });
    u.ctx.globalAlpha = 1;
    if (this.watchUi > 0) {
      const label = inp.touch ? 'Back' : 'Back (V)';
      const bw = u.buttonW(label, 'ui:eye', 16);
      u.ctx.globalAlpha = Math.min(1, this.watchUi * 2);
      if (u.button('watch', this.W - bw - 8, 8, bw, Math.max(18, M.btn), label, { style: 'flat', icon: 'ui:eye' })) this.toggleWatch();
      u.ctx.globalAlpha = 1;
    }
    if (this.watchHint > 0) {
      const text = inp.touch ? 'Watching. Tap Back to step back; pinch to zoom.' : 'Watching. V or Esc to step back; F feeds; the wheel zooms.';
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
    // the glass and its rim must show whole, and the stand under it; the cabinet's overhang at the
    // ends may run under the panel or off the edge, so a long tank can take the next zoom up
    const fit = Math.min(sw / (v.g.w + 4), sh / ch);
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
    const inView = !this.ui.overUI && this.input.x >= vp.x && this.input.x < vp.x + vp.w && this.input.y >= vp.y && this.input.y < vp.y + vp.h;
    const inTank = inView && tx >= 0 && ty >= 0 && tx < v.g.w && ty < v.g.h;
    this.handleTankInput(t, v, tx, ty, inTank, inView);

    const lightsOn = hour >= t.set.lightOn && hour < t.set.lightOff && t.equip.some((e) => e.startsWith('led') || e === 't5_bank' || e === 'metal_halide' || e === 'exhibit_skylight');
    let ghost;
    if (this.placing && inTank) {
      const host = this.hostUnder(t, v, tx, ty);
      const spot = act.dropSpot(t, this.placing.id, tx, this.layer, host, this.placing.rot);
      ghost = { id: this.placing.id, x: spot.x, layer: this.layer, ok: act.canPlace(t, this.placing.id) === '', on: spot.on, y: spot.y, rot: this.placing.rot };
    }
    // watching shows the tank alone: no hover or selection corners, no ghost, no tool
    const marks = !this.watch;
    v.draw(t, st, {
      hour, lightsOn, open: !!isOpen(s, s.time),
      hoverItem: marks && this.hover?.kind === 'item' ? this.hover.uid : undefined,
      selectItem: marks && this.select?.kind === 'item' ? this.select.uid : undefined,
      hoverAgent: marks && this.hover?.kind === 'agent' ? this.hover.uid : undefined,
      selectAgent: marks && this.select?.kind === 'agent' ? this.select.uid : undefined,
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
    if (l - vp.x > room('sh:poster').w + 16 && top - vp.y > 20) prop(ctx, 'sh:poster', l - room('sh:poster').w - 14, Math.min(floorY - 140, top + room('sh:poster').h + 10));
    // a shelf of supplies and the clock on the wall above the tank
    const shelf = room('sh:shelf');
    if (top - vp.y > shelf.h + 30) {
      prop(ctx, 'sh:shelf', l + 10, top - 18);
      wallClock(ctx, r - 30, vp.y + Math.min(40, (top - vp.y) / 2), 11, this.state.time);
    }
    const rightRoom = vp.x + vp.w - r;
    if (rightRoom > room('sh:buckets').w + 10) prop(ctx, 'sh:buckets', r + 8, floorY + 3);
    if (rightRoom > room('sh:pothos').w + 10) prop(ctx, 'sh:pothos', r + Math.floor((rightRoom - room('sh:pothos').w) / 2), vp.y + Math.max(18, M.btn) + 6 + room('sh:pothos').h);
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
    // zoomed in, the stand runs out of the view, and its plaque goes with it rather than float over
    // the panel or the toolbar (a small tank's stand may sit a few pixels below the view: that is fine)
    const vp = this.viewport();
    if (x < vp.x || x + w > vp.x + vp.w || y < vp.y || py > vp.y + vp.h) return;
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

  /** the rock or wood under a point that an epiphyte or coral (the one being placed, or id) would
   *  go onto, by its drawn pixels; except leaves out the piece being dragged */
  hostUnder(t: Tank, v: TankView, tx: number, ty: number, id = this.placing?.id, except?: number): number | undefined {
    if (!id) return undefined;
    const it = item(id);
    if (it.place !== 'attach' && it.place !== 'rock') return undefined;
    return v.itemAt(tx, ty, 2, (uid) => {
      if (uid === except) return false;
      const host = t.items.find((p) => p.uid === uid);
      const hc = host && item(host.id).cat;
      return hc === 'rock' || hc === 'wood';
    });
  }

  /** Put a piece being dragged back where it was picked up, with whatever grows on it. */
  cancelDrag() {
    const d = this.drag;
    this.drag = null;
    const t = d && this.game?.tank(d.tank);
    const p = t && t.items.find((q) => q.uid === d.uid);
    if (!d || !t || !p) return;
    p.x = d.x0;
    p.y = d.y0;
    p.layer = d.layer0;
    if (d.on0 === undefined) delete p.on;
    else p.on = d.on0;
    for (const [uid, x] of d.riders) {
      const q = t.items.find((r) => r.uid === uid);
      if (q) q.x = x;
    }
  }

  /** Show a dragged piece under the pointer (only a preview: letting go makes the real move). A
   *  rock or wood keeps inside the glass with its riders; a rider goes onto the stone or wood under
   *  it, or down to the sand. */
  private dragTo(t: Tank, v: TankView, tx: number, ty: number) {
    const d = this.drag!;
    const p = t.items.find((q) => q.uid === d.uid);
    // (a press that has not moved yet leaves it where it is)
    if (!p || !this.input.dragging) return;
    const it = item(p.id);
    const x = tx - d.dx;
    if (it.place === 'attach' || it.place === 'rock') {
      const host = this.hostUnder(t, v, tx, ty, p.id, p.uid);
      const spot = act.dropSpot(t, p.id, x, d.layer0, host);
      p.x = spot.x;
      p.y = spot.y;
      const h = spot.on !== undefined ? t.items.find((q) => q.uid === spot.on) : undefined;
      if (h) {
        p.on = h.uid;
        p.layer = h.layer;
      } else {
        delete p.on;
        p.layer = d.layer0;
      }
      return;
    }
    const nx = act.clampX(t, p.id, x, p.size, p.rot);
    const dx = nx - p.x;
    p.x = nx;
    for (const q of t.items) if (q.on === p.uid) q.x = Math.max(4, Math.min(v.g.w - 4, q.x + dx));
  }

  private handleTankInput(t: Tank, v: TankView, tx: number, ty: number, inTank: boolean, inView: boolean) {
    const g = this.game!;
    const inp = this.input;
    this.hover = null;
    // nothing reaches the tank behind an open window, not even a pan
    if (this.window) {
      this.panning = false;
      return;
    }
    // zoom: a wheel click is a step, a touchpad's small deltas add up to one
    if (inTank && inp.wheel) {
      this.zoomAcc = Math.max(-1, Math.min(1, this.zoomAcc + inp.wheel));
      inp.wheel = 0;
      if (Math.abs(this.zoomAcc) >= 1) {
        this.zoomBoost = Math.max(0, Math.min(3, this.zoomBoost - Math.sign(this.zoomAcc)));
        this.zoomAcc = 0;
      }
    } else this.zoomAcc *= 0.9;
    // right-drag (or two fingers) pans a zoomed tank, when it began over the tank; it starts from
    // where the pointer is, so a second finger landing does not jump the view
    if (!inp.rightDown) this.panning = false;
    else if (!this.panning && (inp.rightPressed || inp.gesture) && inView) {
      this.panning = true;
      this.lastX = inp.x;
      this.lastY = inp.y;
    }
    if (this.panning && (inp.gesture || !this.placing)) {
      this.pan.x += (inp.x - this.lastX) * this.scale;
      this.pan.y += (inp.y - this.lastY) * this.scale;
    }
    this.lastX = inp.x;
    this.lastY = inp.y;
    // watching is only for watching: zoom and pan, nothing else
    if (this.watch) return;
    if (inp.rightPressed && this.placing) this.placing = null;

    // dragging an item to move it (Scape)
    if (this.drag) {
      const d = this.drag;
      if (inp.down) this.dragTo(t, v, tx, ty);
      else {
        const p = t.items.find((q) => q.uid === d.uid);
        const host = p && (item(p.id).place === 'attach' || item(p.id).place === 'rock') ? this.hostUnder(t, v, tx, ty, p.id, p.uid) ?? null : undefined;
        // the preview goes back, and the move is made as one command; a press (or a long press)
        // without a drag is just a selection, and a crypt only melts when it is really moved
        this.cancelDrag();
        if (p && inp.dragging && Math.hypot(tx - d.px, ty - d.py) >= 1) this.run(act.moveItem(g, t, p.uid, tx - d.dx, d.layer0, Math.abs(tx - d.dx - d.x0) > 2, host));
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
        const msg = act.buyItem(g, t, this.placing.id, tx, this.layer, host, this.placing.fromInventory, this.placing.rot);
        if (msg) this.toast(msg, 'bad');
        // one piece per click; hold Shift to keep placing the same thing
        if (!msg && !inp.keys.has('Shift')) this.placing = null;
        else if (this.placing.fromInventory && !(this.state.inventory[this.placing.id] > 0)) this.placing = null;
      }
      return;
    }
    // (a creature drawn behind a piece cannot be picked through it)
    const agent = v.agentAt(tx, ty);
    const itemUid = v.itemAt(tx, ty, 1);
    if (this.mode === 'scape') {
      if (itemUid !== undefined) this.hover = { kind: 'item', uid: itemUid };
      if (inp.pressed && itemUid !== undefined) {
        const p = t.items.find((q) => q.uid === itemUid)!;
        this.select = { kind: 'item', uid: itemUid };
        const riders = t.items.filter((q) => q.on === p.uid).map((q): [number, number] => [q.uid, q.x]);
        this.drag = { uid: itemUid, tank: t.id, px: tx, py: ty, dx: tx - p.x, x0: p.x, y0: p.y, layer0: p.layer, on0: p.on, riders };
      } else if (inp.clicked && itemUid === undefined) this.select = null;
    } else {
      if (agent) {
        this.hover = { kind: 'agent', uid: agent.uid };
        const a = t.animals.find((x) => x.uid === agent.uid);
        const s = species(agent.sp);
        const m = g.stats.get(t.id)?.moods.get(agent.sp);
        const title = a?.name ? `${a.name}, ${s.name.toLowerCase()}` : s.name;
        const verb = inp.touch ? 'Tap' : 'Click';
        this.ui.tip([{ text: title + (a?.fry ? ' (young)' : '') }, { text: a?.name ? `${verb} to see or rename` : `${verb} to name it`, color: C.textDim }, ...(m ? [{ text: `Mood ${Math.round(m.mood * 100)}%`, color: m.mood > 0.7 ? C.good : m.mood > 0.4 ? C.warn : C.bad }] : [])]);
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

  /** a pop's text box this frame, in UI pixels (centered on its spot on the glass) */
  private popBox(p: Pop) {
    const r = this.tankRect, k = this.scale, w = textWidth(p.text, 'display');
    return { x: Math.round((r.x + r.w * p.fx) / k - w / 2), y: Math.round((r.y + r.h * p.fy) / k - p.lift), w, h: 11 };
  }

  /**
   * Float a pop over the watched tank somewhere in the band from p.fx across `span` of the glass, on a
   * spot no other pop covers and inside the view (a zoomed or panned tank runs on under the panel and
   * off the screen). They all rise at the same speed, so pops that start apart never meet. With no
   * free spot a coin pop adds its coins to the newest coin pop (if that still fits), or is let go.
   */
  private pop(p: Pop, span: number) {
    type Box = { x: number; y: number; w: number; h: number };
    const vp = this.viewport(), r = this.tankRect, k = this.scale;
    if (r.w <= 0 || r.h <= 0) return;
    // in view for the whole of its rise (10 px a second, at most 1.6 s)
    const inView = (b: Box) => b.x >= vp.x + 2 && b.x + b.w <= vp.x + vp.w - 2 && b.y - 18 >= vp.y && b.y + b.h <= vp.y + vp.h;
    const hits = (b: Box, skip?: Pop) =>
      this.pops.some((q) => {
        if (q === skip) return false;
        const a = this.popBox(q);
        return a.x - 3 < b.x + b.w && b.x - 3 < a.x + a.w && a.y - 2 < b.y + b.h && b.y - 2 < a.y + a.h;
      });
    // sand below the view: rise from the bottom of the view instead
    p.fy = Math.min(p.fy, ((vp.y + vp.h) * k - r.y) / r.h);
    // the band, cut to the glass in view (a half text width in from either edge)
    const half = ((textWidth(p.text, 'display') / 2 + 4) * k) / r.w;
    const lo = Math.max(p.fx, (vp.x * k - r.x) / r.w + half);
    const hi = Math.min(p.fx + span, ((vp.x + vp.w) * k - r.x) / r.w - half);
    if (hi > lo) {
      for (let i = 0; i < 6; i++) {
        p.fx = lo + Math.random() * (hi - lo);
        const b = this.popBox(p);
        if (inView(b) && !hits(b)) {
          this.pops.push(p);
          return;
        }
      }
    }
    if (p.coins === undefined) return;
    const q = [...this.pops].reverse().find((q) => q.coins !== undefined);
    if (!q) return;
    const text = `+${q.coins! + p.coins}`;
    const b = this.popBox({ ...q, text });
    if (!inView(b) || hits(b, q)) return;
    q.coins! += p.coins;
    q.text = text;
  }

  private drawOverlays() {
    const u = this.ui;
    const r = this.tankRect, k = this.scale;
    const over = `${this.view}:${this.tankId}:${this.watch}:${Math.round(r.w / k)}x${Math.round(r.h / k)}`;
    if (over !== this.popsOver) [this.pops, this.popsOver] = [[], over];
    if (!this.window && this.pops.length) {
      // (a pan after a pop rose can carry it out of the view: the view's edge trims it)
      const vp = this.viewport();
      u.clip(vp.x, vp.y, vp.w, vp.h);
      for (const p of this.pops) {
        const b = this.popBox(p);
        u.text(p.text, b.x, b.y, p.color, { shadow: 0, face: 'display' });
      }
      u.unclip();
    }
    // (a passing notice, like a toast: the audit lets it cover the shop for its few seconds, but
    // checks it against the toasts, which the tier toast that comes with it is one of)
    if (this.banner && !this.window) u.own('banner', () => {
      const b = this.banner!;
      const { x, y, w, h } = bannerBox(this.W, Math.max(320, textWidth(b.sub) + 40), toastBoxes(this), b.y);
      b.y = y;
      u.ctx.globalAlpha = Math.min(1, b.life);
      u.panel(x, y, w, h, 'card', false);
      u.head(b.title, x + w / 2, y + 10, C.head, { align: 'center' });
      u.text(b.sub, x + w / 2, y + 30, C.strong, { align: 'center' });
      u.ctx.globalAlpha = 1;
    });
  }

  /** a creature's portrait frame for lists */
  portrait(sp: string) {
    return creatureFrame(sp, 0);
  }
}
