// Ida's guided first tank. A pinned paper note walks a new shopkeeper through every feature in
// the order a real fishkeeper would set up a tank: buy it, filter, heat and light, substrate,
// hardscape, plants, cycle it (with Ida's seeded sponges), stock it, acclimate, feed, then the
// report card, the open sign, letters, the codex, upgrades, trips and the hall.
//
// Steps never block: each one finishes the moment its condition is true, so a player who runs
// ahead is never held back, and the note always shows the next thing to do. The tour cannot be
// skipped, but Back rereads earlier steps. A pulsing outline and a bobbing arrow point at the
// button or tab to press (UI.rects, recorded as they are drawn). The note keeps to a band at the
// top of the screen that the tank view and the hall leave free, so it never covers a tank.
import type { App, Mode } from '../app/app';
import { equip, item, shell } from '../data';
import { UI as C } from '../data/palette';
import { BAL } from '../sim/balance';
import { isStock } from '../sim/sales';
import { cycleProgress } from '../sim/water';
import { hallArea, TOOLBAR_H, TOP_H } from './hud';
import { panelW } from './panels';
import { ICON, M, type Rect, textWidth } from './ui';
import { pickedShell, windowRect } from './windows';

interface Step {
  id: string;
  title: string;
  text: string;
  /** ids in UI.rects to point at, first one found wins (so a step can point at the tab, then the button inside it) */
  target?: (app: App) => string[];
  /** finished: move on */
  done?: (app: App) => boolean;
  /** a "Got it" button instead of a condition */
  ack?: boolean;
  /** a one-off helper button on the note */
  action?: { label: string; run: (app: App) => void; hidden?: (app: App) => boolean };
}

const slots = (app: App) => new Set((app.tank?.equip ?? []).map((e) => equip(e).slot));
const inMode = (app: App, m: Mode, then: string[]): string[] => (app.view === 'tank' && app.mode === m ? then : [`modes:${['look', 'scape', 'stock', 'gear', 'water', 'care'].indexOf(m)}`]);
const cats = (app: App, ...c: string[]) => (app.tank?.items ?? []).filter((p) => c.includes(item(p.id).cat));
/** a tab to point at, unless it is already the open one: then the pointer moves on to what is inside it */
const tab = (id: string, i: number, open: number): string[] => (i === open ? [] : [`${id}:${i}`]);
/** in the new-tank window: Build once a big enough size is picked, else the row of the one Ida means */
const sizeUp = (app: App, liters: number, row: string): string[] => (pickedShell(app).liters >= liters ? ['build'] : [`shell:${row}`, 'shells']);

export const STEPS: Step[] = [
  {
    id: 'welcome', title: 'Welcome to Fins & Fronds', ack: true,
    text: 'This is the shop floor. Up top: the shop and its display bays, the clock and the open sign, and on the right your reputation and coins. Time is paused until there is something to look at.',
  },
  {
    id: 'build', title: 'A tank for the window',
    text: 'Every display starts with a tank. Click "Build a tank" in the front-window bay.',
    target: () => ['build0'],
    done: (app) => app.window === 'newtank' || app.state.tanks.length > 0,
  },
  {
    id: 'size', title: 'Pick a size',
    text: 'A 20 gallon long is a lovely first tank: wide for scaping and long enough for a school, so I have picked one out. The 29 is the same footprint, taller for stem plants. Bigger water is more forgiving, too. Then press Build.',
    // the window opens on the 20 gallon long; a smaller pick sends the pointer back to it
    target: (app) => (app.window === 'newtank' ? sizeUp(app, shell('std_20l').liters, 'std_20l') : ['build0']),
    done: (app) => app.state.tanks.length > 0,
  },
  {
    id: 'filter', title: 'Filter first',
    text: 'The filter is the heart of the tank: it moves the water and it is where the good bacteria live. In Gear, buy a hang-on-back filter (or a sponge filter, gentlest for shrimp).',
    target: (app) => inMode(app, 'gear', [...tab('geartab', 0, app.panel.gearTab), 'gearlist']),
    done: (app) => slots(app).has('filter'),
  },
  {
    id: 'heat', title: 'Heat and light',
    text: 'Tropical fish want about 24-26 C, so add a heater rated for your tank: each says how many gallons it can heat (Heat tab). Plants need light: a Basic LED will do, a Planted LED grows them faster (Light tab).',
    target: (app) => inMode(app, 'gear', [...tab('geartab', slots(app).has('heater') ? 2 : 1, app.panel.gearTab), 'gearlist']),
    done: (app) => slots(app).has('heater') && slots(app).has('light'),
  },
  {
    id: 'sand', title: 'Substrate and slope',
    text: 'Now the fun part. In Scape, the Sand tab sets what covers the bottom. Aquasoil feeds plants, sand suits corydoras. Raise the slope so the back sits higher than the front, or press Sculpt and shape it by hand.',
    target: (app) => inMode(app, 'scape', [...tab('stab', 6, app.panel.scapeTab), 'slope:+']),
    done: (app) => !!app.tank && (app.tank.substrate !== 'fine_sand' || Math.abs(app.tank.slope - 0.3) > 0.01 || app.tutorialFlags.has('sculpted')),
    ack: true,
  },
  {
    id: 'hardscape', title: 'Stone and wood',
    text: 'Stones and driftwood are the bones of a scape. Pick one in Rock or Wood, then click in the tank to set it down. Q, W and E place it at the back, middle or front. Put the biggest piece a third of the way across, not in the middle.',
    // on Rock or Wood already: the list; while a piece is in hand the tank is the target, and its ghost shows where
    target: (app) => inMode(app, 'scape', app.placing ? [] : app.panel.scapeTab <= 1 ? ['scapelist'] : ['stab:1', 'stab:0']),
    done: (app) => cats(app, 'rock', 'wood').length > 0,
  },
  {
    id: 'plants', title: 'Living plants',
    text: 'Plants eat ammonia and outcompete algae. Add at least two kinds from the Plant tab: tall ones at the back, short ones in front. Java fern and anubias can sit right on your wood.',
    target: (app) => inMode(app, 'scape', app.placing ? [] : app.panel.scapeTab === 2 ? ['scapelist'] : ['stab:2']),
    done: (app) => new Set(cats(app, 'plant').map((p) => p.id)).size >= 2,
  },
  {
    id: 'cycle', title: 'Cycle the tank',
    text: 'Fish make ammonia. Bacteria in the filter turn it into nitrite, then into nitrate, which plants and water changes remove. A brand-new tank has none yet. Squeeze one of my old sponges into your filter: they are full of them.',
    // the sponge is a button on this note: once it is in, the cycle bar shows it took
    target: (app) => inMode(app, 'water', ['tut:act', 'cycle']),
    action: {
      label: 'Squeeze in Ida\'s sponge',
      run: (app) => {
        const t = app.tank;
        if (!t) return;
        t.chem.bacA = Math.max(t.chem.bacA, 0.96);
        t.chem.bacB = Math.max(t.chem.bacB, 0.96);
        app.tutorialFlags.add('sponge');
        app.game!.refresh(t);
        app.toast('Seeded media from a mature filter: the cycle is ready. (Without it, a new tank takes a few weeks.)', 'good');
      },
      hidden: (app) => app.tutorialFlags.has('sponge'),
    },
    done: (app) => !!app.tank && cycleProgress(app.tank.chem) >= 0.9 && slots(app).has('filter'),
  },
  {
    id: 'stock', title: 'Fish!',
    // (the species data wants ten neons and eight harlequins; both suit plain tap water)
    text: 'In Stock, every species says how it would fit this tank: "good fit", "maybe" or "no". Schooling fish need company: ten or more neon tetras, or eight harlequin rasboras. Pick one, set the number and order.',
    target: (app) => inMode(app, 'stock', app.panel.stockTab !== 0 ? ['stocktab:0'] : app.panel.buySp ? ['order'] : ['stocklist']),
    done: (app) => !!app.tank && (app.tank.bags.length > 0 || app.tank.animals.length > 0),
  },
  {
    id: 'acclimate', title: 'Let them settle',
    text: 'New fish float in their bag for half an hour so the temperature evens out. Press play up top (or a faster speed) and watch them swim out.',
    // once the clock runs there is nothing to press: just watch
    target: (app) => (app.state.settings.speed === 0 ? ['speed1', 'speed2'] : []),
    done: (app) => !!app.tank && app.tank.animals.length > 0,
  },
  {
    id: 'feed', title: 'Feeding',
    text: 'Feed once or twice a day: Care, then Feed (or press F). What they do not eat in a few minutes rots into ammonia, so a pinch is plenty.',
    target: (app) => inMode(app, 'care', ['feed']),
    done: (app) => app.tutorialFlags.has('fed'),
  },
  {
    id: 'look', title: 'The report card', ack: true,
    text: 'Look shows how the tank rates: wellbeing, habitat, scape, authenticity and spectacle. Hover any line to see why. The better it rates, the more people stop at the window.',
    target: (app) => inMode(app, 'look', ['report']),
  },
  {
    id: 'open', title: 'Open for business', ack: true,
    text: 'The shop opens at 9:00 and closes at 19:00. Visitors leave coins, and talk about you: that is the teal reputation bar. Reputation turns the shop into something bigger, with more display bays, new waters and bigger tanks.',
    target: () => ['rep'],
  },
  {
    id: 'letters', title: 'Letters',
    text: 'People write to the shop asking for particular tanks: a school, a shrimp colony, a biotope. Answer them for coins and reputation. I will write too. Open Letters.',
    target: () => ['win:letters'],
    done: (app) => app.window === 'letters' || app.tutorialFlags.has('w:letters'),
  },
  {
    id: 'codex', title: 'The codex',
    text: 'The codex keeps every tank type, species and partnership you discover, with the real facts behind them. Each new tank type you build earns reputation.',
    target: () => ['win:codex'],
    done: (app) => app.window === 'codex' || app.tutorialFlags.has('w:codex'),
  },
  {
    id: 'upgrades', title: 'Upgrades',
    text: 'Upgrades improve the whole shop: test kits for exact readings, a plant dip against pest snails, benches so people linger. Have a look.',
    target: () => ['win:upgrades'],
    done: (app) => app.window === 'upgrades' || app.tutorialFlags.has('w:upgrades'),
  },
  {
    id: 'trips', title: 'Trips and the guestbook', ack: true,
    text: 'Once the shop grows, Captain Wren will take you collecting in real rivers and reefs (Trips). The guestbook keeps what visitors say about your tanks.',
    target: () => ['win:trips', 'win:guestbook'],
  },
  {
    id: 'hall', title: 'The hall', ack: true,
    text: 'The hall shows every display bay at once (press H). More bays open as your reputation grows. Close the window first if one is open.',
    target: (app) => (app.view === 'hall' ? [] : ['hall']),
  },
  {
    id: 'stockroom', title: 'The stock room', ack: true,
    text: 'The back room has a rack for stock tanks. Shoppers buy fish from them over the counter: breed a pair of guppies or a colony of cherry shrimp there and keep a few back as breeders. Overgrown plants are cut and sold too. A 10 gallon with a sponge filter is a fine start.',
    target: (app) => (app.window === 'newtank' ? sizeUp(app, shell('std_10').liters, 'std_10') : app.view === 'hall' ? [`build${BAL.rackBay}`] : ['hall']),
    done: (app) => app.state.tanks.some(isStock),
  },
  {
    id: 'end', title: 'Over to you', ack: true,
    text: 'That is everything. Keep the glass clean, test the water now and then, change some of it every week, and read your letters. The rest is up to you. Love, Ida.',
  },
];

/** steps before this one keep the clock paused (nothing is alive yet) */
export const PAUSED_UNTIL = STEPS.findIndex((s) => s.id === 'acclimate');

const NOTE_W = 440;

/** The step the note shows: the current one, or an earlier one the player went back to reread. */
function shownStep(app: App): number {
  const cur = app.state.tutorial.step;
  return app.tutorialPeek !== null && app.tutorialPeek < cur ? app.tutorialPeek : cur;
}

function active(app: App): boolean {
  return !!app.game && app.screen === 'game' && !app.state.tutorial.done && !app.watch && !app.cutscene && app.state.tutorial.step < STEPS.length;
}

/** whether Ida's note is on screen this frame (windows make room for it) */
export const tourShowing = active;

/** where the note sits when no window is open: a band along the top of the tank view or the hall */
/** a phone on its side: the note spreads across the band and the tank view reserves only this step */
const short = (app: App) => app.H < 520;

function band(app: App): { x: number; y: number; w: number } {
  const [x0, x1] = app.view === 'tank' && app.tank ? [4, app.W - panelW(app) - 12] : (() => {
    const a = hallArea(app);
    return [a.gx, a.gx + a.gw];
  })();
  const w = short(app) ? x1 - x0 : Math.min(NOTE_W, x1 - x0);
  return { x: x1 - w, y: TOP_H + 4, w };
}

/**
 * Back, the step's own action and Got it side by side are wider than a narrow note (the one beside
 * a window): then the action gets a row of its own above the other two.
 */
function twoRows(step: Step, w: number, act = !!step.action): boolean {
  if (!act || !step.action) return false;
  const back = STEPS.indexOf(step) > 0 ? textWidth(`${ICON.left} Back`) + 20 + 6 : 0;
  const ok = step.ack ? Math.max(76, textWidth('Thanks!') + 20, textWidth(`Got it ${ICON.right}`) + 20) + 6 : 0;
  return 12 + back + textWidth(step.action.label) + 20 + ok + 12 > w;
}

/** whether the note shows this step's action button now (not while peeking back, not once hidden) */
function acts(app: App, step: Step): boolean {
  return !!step.action && STEPS.indexOf(step) === app.state.tutorial.step && !step.action.hidden?.(app);
}

/** the note's height for a step; `act`: with its action button (the reserve sizes for it always) */
function noteH(app: App, step: Step, w: number, act = acts(app, step)): number {
  return 28 + app.ui.paraHeight(step.text, w - 24) + 8 + M.btn + 8 + (twoRows(step, w, act) ? M.btn + 4 : 0);
}

/** UI pixels the tank view and the hall leave free at the top for the note, so it never covers a tank. */
export function noteReserve(app: App): number {
  if (!active(app)) return 0;
  const b = band(app);
  // sized for the longest step so the tank does not hop as the steps change (on a short screen,
  // for this one, so the tank keeps some room)
  return Math.max(...(short(app) ? [STEPS[shownStep(app)]] : STEPS).map((st) => noteH(app, st, b.w, !!st.action))) + 6;
}

/** Ida's note for this frame, in UI pixels (null when there is none). */
export function noteBox(app: App): Rect | null {
  if (!active(app)) return null;
  const step = STEPS[shownStep(app)];
  let { x, y, w } = band(app);
  if (app.window) {
    // over a window: the wall beside it, or its bottom-left corner on a narrow screen
    const win = windowRect(app);
    if (win.x - 12 >= 220) {
      w = Math.min(300, win.x - 12);
      x = 6;
      y = win.y;
    } else {
      w = Math.min(300, app.W - 12);
      x = 6;
      y = app.H - TOOLBAR_H - noteH(app, step, w) - 4;
    }
  }
  return { x, y, w, h: noteH(app, step, w) };
}

type Side = 'down' | 'up' | 'left' | 'right';

const overlap = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Rect, b: Rect) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;

/**
 * Where the arrow may go, best first. A folder tab has its card's title under it, so from above;
 * a pill tab has its neighbours above and below, so only from a side; a list or a card from the
 * side, in the padding; a stepper's little +/- has its label beside it, so the outline alone.
 * Anything else from below, where a button keeps its breathing room, then above, then a side.
 */
function arrowSides(id: string, r: Rect): Side[] {
  if (id.startsWith('modes:')) return ['up'];
  if (/:\d+$/.test(id) || r.h >= 40) return ['left', 'right'];
  if (r.w < 24 && r.h < 24) return [];
  return ['down', 'up', 'left', 'right'];
}

/** the box the arrow sweeps on that side as it bobs */
function arrowBox(r: Rect, side: Side): Rect {
  const cx = Math.round(r.x + r.w / 2), cy = Math.round(r.y + r.h / 2);
  switch (side) {
    case 'down': return { x: cx - 6, y: r.y + r.h + 3, w: 12, h: 12 };
    case 'up': return { x: cx - 6, y: r.y - 15, w: 12, h: 13 };
    case 'right': return { x: r.x + r.w + 3, y: cy - 6, w: 12, h: 12 };
    case 'left': return { x: r.x - 15, y: cy - 6, w: 13, h: 12 };
  }
}

/** Advance past finished steps, then draw the note and the pointer. */
export function drawTutorial(app: App) {
  const s = app.state;
  if (s.tutorial.done) return;
  while (s.tutorial.step < STEPS.length) {
    const st = STEPS[s.tutorial.step];
    if (st.done && st.done(app)) {
      s.tutorial.step++;
      app.audio.play('chime');
      continue;
    }
    break;
  }
  if (s.tutorial.step >= STEPS.length) {
    s.tutorial.done = true;
    app.tutorialPeek = null;
    return;
  }
  const box = noteBox(app);
  if (!box) return;
  const i = shownStep(app);
  const peeking = i < s.tutorial.step;
  const step = STEPS[i];
  const u = app.ui;
  const { x, y, w, h } = box;

  // the pointer, drawn last (over the note, so the arrow is never hidden under it) and after the
  // note's own buttons, which a step can point at too: the first target drawn this frame, and
  // never one a window covers
  const pointer = () => {
    let id = '';
    let r: (Rect & { layer: number }) | undefined;
    for (const t of step.target?.(app) ?? []) {
      const q = u.rects.get(t);
      if (q && (!app.window || q.layer > 0)) {
        [id, r] = [t, q];
        break;
      }
    }
    if (!r) return;
    // a bobbing arrow on a side where it covers nothing else: no other button or tab, and not
    // the note's words. With no such side the outline points on its own, a ring thicker.
    const words = { x: x + 12, y: y + 9, w: w - 24, h: 19 + u.paraHeight(step.text, w - 24) };
    const others = [...u.rects].filter(([k, q]) => k !== id && (!app.window || q.layer > 0) && !inside(r, q) && !inside(q, r)).map(([, q]) => q);
    const side = arrowSides(id, r).find((sd) => {
      const a = arrowBox(r, sd);
      return a.x >= 0 && a.y >= 0 && a.x + a.w <= app.W && a.y + a.h <= app.H && !overlap(a, words) && !others.some((q) => overlap(a, q));
    });
    const p = 0.5 + 0.5 * Math.sin(u.time * 5);
    u.ctx.globalAlpha = 0.55 + 0.45 * p;
    for (const [d, c] of side ? ([[3, C.pick], [2, 9]] as const) : ([[4, C.pick], [3, C.pick], [2, 9]] as const)) {
      u.fill(r.x - d, r.y - d, r.w + d * 2, 1, c);
      u.fill(r.x - d, r.y + r.h + d - 1, r.w + d * 2, 1, c);
      u.fill(r.x - d, r.y - d, 1, r.h + d * 2, c);
      u.fill(r.x + r.w + d - 1, r.y - d, 1, r.h + d * 2, c);
    }
    u.ctx.globalAlpha = 1;
    if (!side) return;
    const bob = Math.round(Math.sin(u.time * 6) * 3);
    const along = side === 'down' || side === 'up';
    // the tip sits 6 px (give or take the bob) off the target, and the arrow widens away from it
    const away = side === 'down' || side === 'right' ? 1 : -1;
    const tip = side === 'down' ? r.y + r.h + 6 + bob : side === 'up' ? r.y - 6 - bob : side === 'right' ? r.x + r.w + 6 + bob : r.x - 6 - bob;
    const mid = along ? Math.round(r.x + r.w / 2) : Math.round(r.y + r.h / 2);
    for (let k = 0; k < 6; k++) {
      const at = tip + k * away;
      if (along) u.fill(mid - k - 1, at, k * 2 + 2, 1, 0);
      else u.fill(at, mid - k - 1, 1, k * 2 + 2, 0);
      if (k > 0) {
        if (along) u.fill(mid - k, at, k * 2, 1, C.pick);
        else u.fill(at, mid - k, 1, k * 2, C.pick);
      }
    }
  };

  // the note, pinned to the wall
  u.panel(x, y, w, h, 'paper');
  u.rr(x + w / 2 - 3, y - 3, 7, 7, 3, C.bad);
  u.fill(x + w / 2 - 1, y - 2, 2, 2, 61);
  const count = `${i + 1}/${STEPS.length}`;
  u.head(step.title, x + 12, y + 9, 19, { maxW: w - 40 - textWidth(count) });
  u.text(count, x + w - 12, y + 9, peeking ? C.good : 3, { align: 'right' });
  u.para(step.text, x + 12, y + 28, w - 24, C.paperInk);
  const by = y + h - M.btn - 8;
  let bx = x + 12;
  if (i > 0) {
    const bw = textWidth(`${ICON.left} Back`) + 20;
    if (u.button('tut:back', bx, by, bw, M.btn, `${ICON.left} Back`, { style: 'paper', tip: 'Read the step before this one again' })) app.tutorialPeek = i - 1;
    bx += bw + 6;
  }
  if (peeking) {
    const n = s.tutorial.step + 1, long = `Back to step ${n} ${ICON.right}`;
    // a narrow note (beside a window) has no room for the long label beside Back
    const label = i + 1 !== s.tutorial.step ? `Next ${ICON.right}` : bx + textWidth(long) + 20 <= x + w - 12 ? long : `Step ${n} ${ICON.right}`;
    const bw = textWidth(label) + 20;
    if (u.button('tut:next', x + w - bw - 12, by, bw, M.btn, label, { style: 'good' })) app.tutorialPeek = i + 1 >= s.tutorial.step ? null : i + 1;
    pointer();
    return;
  }
  if (step.action && !step.action.hidden?.(app)) {
    const bw = Math.min(w - 24, textWidth(step.action.label) + 20);
    const [ax, ay] = twoRows(step, w) ? [x + 12, by - M.btn - 4] : [bx, by];
    if (u.button('tut:act', ax, ay, bw, M.btn, step.action.label, { style: 'good' })) step.action.run(app);
  }
  if (step.ack) {
    const label = s.tutorial.step === STEPS.length - 1 ? 'Thanks!' : `Got it ${ICON.right}`;
    const bw = Math.max(76, textWidth(label) + 20);
    if (u.button('tut:ok', x + w - bw - 12, by, bw, M.btn, label, { style: 'good' })) {
      s.tutorial.step++;
      if (s.tutorial.step >= STEPS.length) s.tutorial.done = true;
    }
  }
  pointer();
}
