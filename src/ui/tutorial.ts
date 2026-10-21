// Ida's guided first tank. A pinned paper note walks a new shopkeeper through every feature in
// the order a real fishkeeper would set up a tank: buy it, filter, heat and light, substrate,
// hardscape, plants, cycle it (with Ida's seeded sponges), stock it, acclimate, feed, then the
// report card, the open sign, letters, the codex, upgrades, trips and the hall.
//
// Steps never block: each one finishes the moment its condition is true, so a player who runs
// ahead is never held back, and the note always shows the next thing to do. A pulsing outline
// and a bobbing arrow point at the button or tab to press (UI.rects, recorded as they are drawn).
import type { App, Mode } from '../app/app';
import { equip, item } from '../data';
import { UI as C } from '../data/palette';
import { BAL } from '../sim/balance';
import { isStock } from '../sim/sales';
import { cycleProgress } from '../sim/water';
import { TOOLBAR_H, TOP_H } from './hud';
import { ICON, M, type Rect, textWidth } from './ui';

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
    text: 'A 20 gallon long is a lovely first tank: wide for scaping and long enough for a school. The 29 is the same footprint, taller for stem plants. Bigger water is more forgiving, too. Then press Build.',
    target: () => ['build', 'shells'],
    done: (app) => app.state.tanks.length > 0,
  },
  {
    id: 'filter', title: 'Filter first',
    text: 'The filter is the heart of the tank: it moves the water and it is where the good bacteria live. In Gear, buy a hang-on-back filter (or a sponge filter, gentlest for shrimp).',
    target: (app) => inMode(app, 'gear', ['geartab:0', 'gearlist']),
    done: (app) => slots(app).has('filter'),
  },
  {
    id: 'heat', title: 'Heat and light',
    text: 'Tropical fish want about 24-26 C, so add a heater (Heat tab). Plants need light: a Basic LED will do, a Planted LED grows them faster (Light tab).',
    target: (app) => inMode(app, 'gear', slots(app).has('heater') ? ['geartab:2', 'gearlist'] : ['geartab:1', 'gearlist']),
    done: (app) => slots(app).has('heater') && slots(app).has('light'),
  },
  {
    id: 'sand', title: 'Substrate and slope',
    text: 'Now the fun part. In Scape, the Sand tab sets what covers the bottom. Aquasoil feeds plants, sand suits corydoras. Raise the slope so the back sits higher than the front, or press Sculpt and shape it by hand.',
    target: (app) => inMode(app, 'scape', ['stab:6', 'slope:+']),
    done: (app) => !!app.tank && (app.tank.substrate !== 'fine_sand' || Math.abs(app.tank.slope - 0.3) > 0.01 || app.tutorialFlags.has('sculpted')),
    ack: true,
  },
  {
    id: 'hardscape', title: 'Stone and wood',
    text: 'Stones and driftwood are the bones of a scape. Pick one in Rock or Wood, then click in the tank to set it down. Q, W and E place it at the back, middle or front. Put the biggest piece a third of the way across, not in the middle.',
    target: (app) => inMode(app, 'scape', ['stab:1', 'stab:0']),
    done: (app) => cats(app, 'rock', 'wood').length > 0,
  },
  {
    id: 'plants', title: 'Living plants',
    text: 'Plants eat ammonia and outcompete algae. Add at least two kinds from the Plant tab: tall ones at the back, short ones in front. Java fern and anubias can sit right on your wood.',
    target: (app) => inMode(app, 'scape', ['stab:2']),
    done: (app) => new Set(cats(app, 'plant').map((p) => p.id)).size >= 2,
  },
  {
    id: 'cycle', title: 'Cycle the tank',
    text: 'Fish make ammonia. Bacteria in the filter turn it into nitrite, then into nitrate, which plants and water changes remove. A brand-new tank has none yet. Squeeze one of my old sponges into your filter: they are full of them.',
    target: (app) => inMode(app, 'water', ['cycle']),
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
    text: 'In Stock, every species says how it would fit this tank: "good fit", "maybe" or "no". Schooling fish need company: six or more neons or embers. Pick one, set the number and order.',
    target: (app) => inMode(app, 'stock', app.panel.buySp ? ['order'] : ['stocktab:0', 'stocklist']),
    done: (app) => !!app.tank && (app.tank.bags.length > 0 || app.tank.animals.length > 0),
  },
  {
    id: 'acclimate', title: 'Let them settle',
    text: 'New fish float in their bag for half an hour so the temperature evens out. Press play up top (or a faster speed) and watch them swim out.',
    target: () => ['speed1', 'speed2'],
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
    target: () => ['hall'],
  },
  {
    id: 'stockroom', title: 'The stock room', ack: true,
    text: 'The back room has a rack for stock tanks. Shoppers buy fish from them over the counter: breed a pair of guppies or a colony of cherry shrimp there and keep a few back as breeders. Overgrown plants are cut and sold too. A 10 gallon with a sponge filter is a fine start.',
    target: (app) => (app.view === 'hall' ? [`build${BAL.rackBay}`] : ['hall']),
    done: (app) => app.state.tanks.some(isStock),
  },
  {
    id: 'end', title: 'Over to you', ack: true,
    text: 'That is everything. Keep the glass clean, test the water now and then, change some of it every week, and read your letters. The rest is up to you. Love, Ida.',
  },
];

/** steps before this one keep the clock paused (nothing is alive yet) */
export const PAUSED_UNTIL = STEPS.findIndex((s) => s.id === 'acclimate');

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
    return;
  }
  const step = STEPS[s.tutorial.step];
  const u = app.ui;

  // the pointer: the first target drawn this frame
  let target: Rect | undefined;
  for (const id of step.target?.(app) ?? []) {
    target = u.rects.get(id);
    if (target) break;
  }
  if (target) {
    const p = 0.5 + 0.5 * Math.sin(u.time * 5);
    const r = target;
    u.ctx.globalAlpha = 0.55 + 0.45 * p;
    for (const [d, c] of [[3, C.pick], [2, 9]] as const) {
      u.fill(r.x - d, r.y - d, r.w + d * 2, 1, c);
      u.fill(r.x - d, r.y + r.h + d - 1, r.w + d * 2, 1, c);
      u.fill(r.x - d, r.y - d, 1, r.h + d * 2, c);
      u.fill(r.x + r.w + d - 1, r.y - d, 1, r.h + d * 2, c);
    }
    u.ctx.globalAlpha = 1;
    // a bobbing arrow on whichever side has room
    const bob = Math.round(Math.sin(u.time * 6) * 3);
    const below = r.y < app.H / 2;
    const ax = Math.round(r.x + r.w / 2), ay = below ? r.y + r.h + 6 + bob : r.y - 6 - bob;
    for (let i = 0; i < 6; i++) {
      const yy = below ? ay + i : ay - i;
      u.fill(ax - i - 1, yy, i * 2 + 2, 1, 0);
      if (i > 0) u.fill(ax - i, yy, i * 2, 1, C.pick);
    }
  }

  // the note: bottom left above the window pills, or top left if the target is down there
  const w = 300;
  const text = step.text;
  const bodyH = u.paraHeight(text, w - 24);
  const h = 30 + bodyH + 10 + M.btn + 8;
  let x = 8, y = app.H - TOOLBAR_H - h - 8;
  if (target && target.x < x + w + 6 && target.y + target.h > y - 6) y = TOP_H + 8;
  if (app.window) {
    // over a window: keep to the bottom-left corner, it may overlap the window's edge
    x = 6;
    y = app.H - TOOLBAR_H - h - 4;
  }
  u.panel(x, y, w, h, 'paper');
  // a pin
  u.rr(x + w / 2 - 3, y - 3, 7, 7, 3, C.bad);
  u.fill(x + w / 2 - 1, y - 2, 2, 2, 61);
  u.head(step.title, x + 12, y + 9, 19, { maxW: w - 90 });
  u.text(`${s.tutorial.step + 1}/${STEPS.length}`, x + w - 12, y + 9, 3, { align: 'right' });
  u.para(text, x + 12, y + 28, w - 24, C.paperInk);
  const by = y + h - M.btn - 8;
  let bx = x + 12;
  if (step.action && !step.action.hidden?.(app)) {
    const bw = textWidth(step.action.label) + 20;
    if (u.button('tut:act', bx, by, bw, M.btn, step.action.label, { style: 'good' })) step.action.run(app);
    bx += bw + 6;
  }
  if (step.ack && u.button('tut:ok', bx, by, 76, M.btn, s.tutorial.step === STEPS.length - 1 ? 'Thanks!' : `Got it ${ICON.right}`, { style: 'good' })) {
    s.tutorial.step++;
    if (s.tutorial.step >= STEPS.length) s.tutorial.done = true;
  }
  if (u.button('tut:skip', x + w - 84, by, 72, M.btn, 'Skip all', { style: 'paper', tip: 'Skip the guided tour (you can replay it from the menu)' })) {
    s.tutorial.done = true;
    if (s.settings.speed === 0) s.settings.speed = 1;
  }
}
