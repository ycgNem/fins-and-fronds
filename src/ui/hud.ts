// The always-on interface: three floating chips along the top (the aquarium and tank switcher,
// the clock and speed, reputation and coins), the window pills along the bottom, toasts, the
// guestbook slip and the hall of bays. There are no full-width bars: the wall shows between the
// chips (STYLE.md, Interface). The tank modes are folder tabs on the side panel (panels.ts).
import { correspondent, REQUESTS, species, TIERS, upgrade } from '../data';
import { PALETTE_RGB, RAMP, rgba, UI as C } from '../data/palette';
import { drawIcon, hasArt } from '../render/icons';
import { prop, PROP_SCALE, propSize, streetWindow, wallClock } from '../render/shop';
import { type App, SPEEDS, type Toast } from '../app/app';
import { baysUnlocked } from '../sim/catalog';
import { clockText, dayOf } from '../sim/state';
import { isOpen } from '../sim/visitors';
import { dayName, weekEvent } from '../sim/week';
import { BAL } from '../sim/balance';
import { isStock, offers } from '../sim/sales';
import type { TankStats } from '../sim/Game';
import type { Tank } from '../sim/state';
import { layoutShelf, type Shelf, tagW } from './shelf';
import { noteBox, noteReserve } from './tutorial';
import { ICON, M, type Rect, textWidth, type UI } from './ui';

/** the band the top chips sit in, and the band the window pills sit in */
export const TOP_H = 34;
export const TOOLBAR_H = 34;
const CHIP_H = 26, CHIP_Y = 5;

export function drawHud(app: App) {
  watchTanks(app);
  topChips(app);
  windowPills(app);
  if (app.view === 'hall') hall(app);
  else if (app.tank) {
    // a tank that just earned a star sparkles along its top edge
    const r = app.tankRect, k = app.scale;
    sparkles(app, app.tank.id, r.x / k, r.y / k, r.w / k, Math.min(r.h / k, 60));
  }
  toasts(app);
  guestLine(app);
}

// ---------------------------------------------------------------- news from the tanks

/** What the interface remembers about each tank between frames: the most stars and the tank types
 *  it has had (to celebrate a new one), its recent Wellbeing (to warn when it falls fast), and when
 *  it last sparkled. Read from the stats, so the sim needs no events for any of it. */
const seen = new Map<number, { stars: number; types: Set<string>; well: number; at: number; warned: number; sparkle: number }>();
/** the tank types the codex held last frame (a type new to the codex has its own toast) */
let codexTypes: Set<string> | null = null;
/** the game all that belongs to (a loaded save starts the memory afresh) */
let seenGame: App['game'] = null;
const SPARKLE_SECS = 2.5;

function watchTanks(app: App) {
  const g = app.game;
  if (!g) return;
  if (g !== seenGame) {
    seen.clear();
    codexTypes = null;
    seenGame = g;
  }
  const s = app.state;
  const known = codexTypes ?? new Set(s.codex.archetypes);
  for (const t of s.tanks) {
    const st = g.stats.get(t.id);
    if (!st) continue;
    const well = st.rating.parts.wellbeing;
    const m = seen.get(t.id);
    if (!m) {
      seen.set(t.id, { stars: st.rating.stars, types: new Set(st.cls.matches.map((q) => q.def.id)), well, at: s.time, warned: -Infinity, sparkle: -99 });
      continue;
    }
    // (while Ida's tour runs her note does the talking)
    const say = s.tutorial.done && !isStock(t);
    if (st.rating.stars > m.stars) {
      // a whole star more than it has had (half stars come and go while you scape)
      if (say && st.rating.stars >= 2 && Math.floor(st.rating.stars) > Math.floor(m.stars)) {
        app.toast(`${t.name} is now a ${Math.floor(st.rating.stars)}-star tank!`, 'good');
        app.audio.play('chime');
        m.sparkle = app.ui.time;
      }
      m.stars = st.rating.stars;
    }
    let told = false;
    for (const q of st.cls.matches) {
      if (m.types.has(q.def.id)) continue;
      m.types.add(q.def.id);
      if (!say) continue;
      m.sparkle = app.ui.time;
      // a type the codex already knew gets its own word (the best one, if several come at once);
      // one new to the codex is toasted by the game
      if (known.has(q.def.id) && !told) app.toast(`${t.name} is now recognized: ${q.def.name}!`, 'good');
      told = true;
    }
    // a sharp fall in Wellbeing: the recent level follows a rise at once and a fall slowly, so a
    // slow slide over a day stays quiet and a bad hour does not
    const dt = Math.max(0, s.time - m.at);
    m.at = s.time;
    if (!t.animals.length || well >= m.well) m.well = well;
    else m.well -= (m.well - well) * Math.min(1, dt / BAL.dropWindowMin);
    if (say && m.well - well >= BAL.wellbeingDrop && s.time - m.warned >= BAL.warnGapMin) {
      const worst = [...st.moods.values()].sort((a, b) => a.mood - b.mood)[0];
      const why = worst?.reasons.find((r) => !r.good)?.text;
      app.toast(`${t.name}: wellbeing is falling.${worst ? ` ${species(worst.sp).name}: ${why ?? 'unsettled'}.` : ''}`, 'bad');
      m.warned = s.time;
      m.well = well;
    }
  }
  for (const id of seen.keys()) if (!s.tanks.some((t) => t.id === id)) seen.delete(id);
  codexTypes = new Set(s.codex.archetypes);
}

type Attention = { icon: string; text: string; bad: boolean };

/** Small reasons to go and look at a tank, for its hall card: an unwell species, toxic water, a
 *  missed feeding, green glass. */
export function attention(app: App, t: Tank, st: TankStats): Attention[] {
  const A = BAL.attention;
  const out: Attention[] = [];
  const worst = [...st.moods.values()].sort((a, b) => a.mood - b.mood)[0];
  if (worst && worst.mood < A.mood) out.push({ icon: ICON.heart, text: `${species(worst.sp).name}: ${worst.reasons.find((r) => !r.good)?.text ?? 'unwell'}`, bad: worst.mood < 0.3 });
  const ch = t.chem;
  if (ch.nh3 > A.toxin || ch.no2 > A.toxin) out.push({ icon: ICON.drop, text: `${ch.nh3 >= ch.no2 ? 'Ammonia' : 'Nitrite'} in the water: test it and change some (Water)`, bad: true });
  const auto = (app.state.upgrades['auto_feeders'] ?? 0) > 0 || t.equip.includes('auto_feeder');
  if (t.animals.length && !auto && !app.game!.fedRecently(t)) out.push({ icon: ICON.fish, text: 'Hungry: not fed for a day (Care, or F)', bad: false });
  if (ch.glass > A.glass) out.push({ icon: ICON.leaf, text: `The glass is ${Math.round(ch.glass * 100)}% green: scrape it (Care)`, bad: false });
  return out;
}

/** the attention badges in a row, right-aligned at (rx, y); hovering them says why */
function badges(u: UI, list: Attention[], rx: number, y: number) {
  if (!list.length) return;
  const bw = 15, x0 = rx - list.length * (bw + 2);
  list.forEach((a, i) => {
    const x = x0 + i * (bw + 2);
    u.rr(x, y, bw, 14, 3, 0);
    const fill = a.bad ? C.bad : C.warn;
    u.rr(x + 1, y + 1, bw - 2, 12, 3, fill);
    u.text(a.icon, x + Math.floor(bw / 2) + 1, y, inkOn(fill), { align: 'center' });
  });
  if (u.hover(x0, y, list.length * (bw + 2), 14)) u.tip([{ text: 'Needs a look' }, ...list.map((a) => ({ text: a.text, color: a.bad ? C.bad : C.warn }))]);
}

/** ink or white, whichever reads better on this palette color (the colorblind-safe amber is pale) */
function inkOn(c: number): number {
  const [r, g, b] = PALETTE_RGB[c].map((v) => (v / 255 <= 0.03928 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.18 ? 0 : 9;
}

/** a few pixel stars twinkling over a tank that just did well */
function sparkles(app: App, id: number, x: number, y: number, w: number, h: number) {
  const age = app.ui.time - (seen.get(id)?.sparkle ?? -99);
  if (age < 0 || age > SPARKLE_SECS) return;
  const u = app.ui;
  u.ctx.globalAlpha = Math.min(1, (SPARKLE_SECS - age) * 1.5);
  for (let i = 0; i < 12; i++) {
    // fixed spots per star, each twinkling on its own beat and drifting up a little
    const sx = x + ((i * 0.618 + 0.11) % 1) * w, sy = y + ((i * 0.377 + 0.2) % 1) * h - age * 6;
    if (Math.sin(age * 9 + i * 1.7) < -0.2) continue;
    const c = i % 3 ? C.coin : 9, big = i % 4 === 0;
    u.fill(sx - 1, sy - (big ? 3 : 2), 2, big ? 6 : 4, c);
    u.fill(sx - (big ? 3 : 2), sy - 1, big ? 6 : 4, 2, c);
  }
  u.ctx.globalAlpha = 1;
}

function topChips(app: App) {
  const u = app.ui;
  const s = app.state;
  const W = app.W;
  const by = CHIP_Y + 4;

  const tier = TIERS[s.tier];
  const t = app.tank;
  const multi = s.tanks.length > 1;
  const nameW = t && app.view === 'tank' ? Math.min(160, textWidth(t.name)) : 0;
  const open = isOpen(s, s.time);
  const clock = `${dayName(s.time).slice(0, 3)}, day ${dayOf(s.time)}  ${clockText(s.time)}`;
  const speedW = [20, 20, 26, 32];
  const coins = String(Math.floor(s.coins));
  const coinW = textWidth(coins, 'display');
  const rw = 12 + 14 + 70 + 14 + 14 + coinW + 12;
  // measure all three, then drop the aquarium's name and shorten the sign on narrow screens
  const leftW = (showTier: boolean) => 10 + (showTier ? textWidth(tier.name, 'display') + 10 : 0) + 46 + (multi ? 2 * (M.btnS + 4) : 0) + (nameW ? nameW + 12 : 0) + 6;
  const midW = (sign: string) => 12 + textWidth(clock) + 10 + textWidth(sign) + 16 + speedW.reduce((a, b) => a + b + 2, 0) + 4;
  let sign = open === 'day' ? 'Open' : open === 'night' ? 'Night' : 'Closed';
  let showTier = true;
  if (leftW(true) + midW(sign) + rw + 36 > W) showTier = false;
  if (leftW(false) + midW(sign) + rw + 36 > W) sign = open ? ICON.star : '-';
  const lw = leftW(showTier), cw = midW(sign);

  // left: the aquarium, the hall and the tank switcher
  u.panel(6, CHIP_Y, lw, CHIP_H, 'chip');
  let x = 16;
  if (showTier) {
    u.head(tier.name, x, CHIP_Y + 6);
    x += textWidth(tier.name, 'display') + 10;
  }
  if (u.button('hall', x, by - 2, 44, 18, 'Hall', { active: app.view === 'hall', style: 'flat', tip: 'See every bay (H)' })) app.view = app.view === 'hall' ? 'tank' : 'hall';
  x += 48;
  if (multi) {
    if (u.button('prev', x, by - 1, M.btnS, M.btnS, ICON.left, { style: 'flat', tip: 'Previous tank ([)' })) app.cycleTank(-1);
    x += M.btnS + 4;
  }
  if (nameW && t) {
    u.text(t.name, x + 2, CHIP_Y + 6, C.strong, { maxW: 160 });
    x += nameW + 8;
  }
  if (multi && u.button('next', x, by - 1, M.btnS, M.btnS, ICON.right, { style: 'flat', tip: 'Next tank (])' })) app.cycleTank(1);

  // middle: day, clock, open sign and speed
  const rx = W - 6 - rw;
  const cx = Math.min(rx - cw - 12, Math.max(lw + 18, Math.floor(W / 2 - cw / 2)));
  u.panel(cx, CHIP_Y, cw, CHIP_H, 'chip');
  // an open window holds the clock: it dims and the pause button shows it
  const held = !!app.window && s.settings.speed > 0;
  u.text(clock, cx + 12, CHIP_Y + 6, held ? C.textDim : C.strong);
  // the week: what is on today
  const today = weekEvent(s.time);
  if (u.hover(cx, CHIP_Y, textWidth(clock) + 16, CHIP_H)) u.tip([{ text: `${dayName(s.time)}, day ${dayOf(s.time)}` }, { text: today ? today.text : 'Nothing special on today.', color: C.textDim }]);
  let sx = cx + 12 + textWidth(clock) + 10;
  u.rr(sx - 4, CHIP_Y + 5, textWidth(sign) + 8, 16, 3, open ? C.good : C.panelLo);
  u.text(sign, sx, CHIP_Y + 6, open ? 9 : C.textDim);
  if (u.hover(sx - 4, CHIP_Y, textWidth(sign) + 8, CHIP_H)) {
    // (sleeping waits for the end of Ida's tour: Game.sleepUntilOpen does nothing during it)
    const sleep = s.tutorial.done ? 'Click to sleep until morning' : 'After the tour, click here to sleep until morning';
    u.tip([{ text: open ? 'Open to visitors' : 'Closed: no visitors until 9:00' }, ...(open ? [] : [{ text: sleep, color: C.textDim }])]);
    // sleep through the closed night instead of fast-forwarding it
    if (!open && u.clicked && s.tutorial.done && app.game) {
      u.eat();
      app.game.sleepUntilOpen();
    }
  }
  sx += textWidth(sign) + 16;
  const labels = ['||', ICON.right, ICON.right + ICON.right, ICON.right + ICON.right + ICON.right];
  SPEEDS.forEach((sp, i) => {
    if (u.button(`speed${i}`, sx, by - 2, speedW[i], 18, labels[i], { active: (held ? 0 : s.settings.speed) === sp, style: 'flat', tip: sp === 0 ? 'Pause (Space)' : `${sp} game minute${sp > 1 ? 's' : ''} per second` })) s.settings.speed = sp;
    sx += speedW[i] + 2;
  });

  // right: reputation toward the next tier, and coins
  const next = TIERS[s.tier + 1];
  u.panel(rx, CHIP_Y, rw, CHIP_H, 'chip');
  if (!drawIcon(u.ctx, 'ui:rep', rx + 6, CHIP_Y + 5, 16)) u.text(ICON.sparkle, rx + 10, CHIP_Y + 6, C.accent);
  if (next) {
    const frac = (s.rep - TIERS[s.tier].rep) / (next.rep - TIERS[s.tier].rep);
    u.bar(rx + 24, CHIP_Y + 9, 70, 9, frac, C.accent);
    u.mark('rep', rx + 6, CHIP_Y + 2, 92, CHIP_H - 4);
    if (u.hover(rx + 6, CHIP_Y, 92, CHIP_H)) u.tip([{ text: `${tier.name}: reputation ${Math.floor(s.rep)} / ${next.rep}` }, { text: `Next: ${next.name}. ${next.unlocks}`, color: C.textDim }]);
  } else u.text(String(Math.floor(s.rep)), rx + 24, CHIP_Y + 6, C.accent);
  if (!drawIcon(u.ctx, 'ui:coin', rx + rw - 12 - coinW - 18, CHIP_Y + 5, 16)) u.text(ICON.coin, rx + rw - 12 - coinW - 14, CHIP_Y + 6, C.coin);
  u.head(coins, rx + rw - 12, CHIP_Y + 6, C.strong, { align: 'right' });
  const cx0 = rx + rw - 12 - coinW - 20;
  if (u.hover(cx0, CHIP_Y, coinW + 22, CHIP_H) && app.game) {
    const st = [...app.game.stats.values()];
    const perHour = st.reduce((a, q) => a + q.coinsPerHour, 0), upkeep = st.reduce((a, q) => a + q.upkeep, 0);
    u.tip([{ text: `Coins: ${coins}` }, { text: `About ${Math.round(perHour)} an hour from visitors while open`, color: C.textDim }, { text: `Upkeep for every tank: ${Math.round(upkeep)} a day`, color: C.textDim }]);
  }
}

/** the icon art for each window (ui:<name>, icons sheet) */
export const WIN_ICON: Record<NonNullable<App['window']>, string> = {
  letters: 'letters', codex: 'codex', trips: 'trips', upgrades: 'upgrades', guestbook: 'guestbook', menu: 'settings', newtank: 'fish', news: 'scroll',
};

function windowPills(app: App) {
  const u = app.ui;
  const s = app.state;
  const y = app.H - TOOLBAR_H + 6;
  const ready = s.letters.filter((l) => l.ready).length;
  const unread = s.letters.filter((l) => !l.read).length;
  const back = s.expeditions.filter((e) => e.finds).length;
  const wins: { id: NonNullable<App['window']>; label: string; badge?: number; tip: string }[] = [
    { id: 'letters', label: 'Letters', badge: ready || unread || undefined, tip: 'Letters from the people who visit' },
    { id: 'codex', label: 'Codex', tip: 'Every tank type, species and partnership you have found' },
    { id: 'trips', label: 'Trips', badge: back || undefined, tip: 'Collecting expeditions with Captain Wren' },
    { id: 'upgrades', label: 'Upgrades', tip: 'Improve the aquarium' },
    { id: 'guestbook', label: 'Guestbook', tip: 'What the visitors wrote' },
    { id: 'menu', label: '', tip: 'Settings and saves (Esc)' },
  ];
  let x = 8;
  // the pills switch windows, so they stay live while one is open
  const layer = u.layer;
  u.layer = 1;
  for (const w of wins) {
    const icon = `ui:${WIN_ICON[w.id]}`;
    const label = w.label || (hasArt(icon) ? '' : ICON.cog);
    const bw = Math.max(26, u.buttonW(label, icon));
    if (u.button(`win:${w.id}`, x, y, bw, 22, label, { active: app.window === w.id, style: 'flat', badge: w.badge, tip: w.tip, icon })) {
      app.window = app.window === w.id ? null : w.id;
      if (w.id === 'letters') for (const l of s.letters) l.read = true;
    }
    x += bw + 4;
  }
  u.layer = layer;
  pillsEnd = x;
}

/** where the window pills end, so the guestbook slip can share their band */
let pillsEnd = 0;

/** Where this frame's toasts go: only the newest two (a pile of notices would bury the tank),
 *  stacked from the top left, beside Ida's note when there is room on its left, else below it.
 *  maxW is the column they wrap in. Empty in Watch, which hides them. */
export function toastBoxes(app: App): { maxW: number; boxes: (Rect & { t: Toast })[] } {
  const note = noteBox(app);
  const beside = note && note.y < TOP_H + 20 ? note.x - 16 : 380;
  let y = note && note.y < TOP_H + 20 && beside < 200 ? note.y + note.h + 8 : TOP_H + 6;
  const x = 8, maxW = Math.max(200, Math.min(380, beside));
  if (app.watch) return { maxW, boxes: [] };
  const boxes = app.toasts.slice(-2).map((t) => {
    const w = Math.min(maxW, textWidth(t.text) + 26);
    const h = app.ui.paraHeight(t.text, w - 26) + 10;
    const b = { t, x, y, w, h };
    y += h + 5;
    return b;
  });
  return { maxW, boxes };
}

/**
 * Where the new-chapter banner goes in a UI W wide: centred near the top, unless that covers a
 * toast (the tier toast comes with it, and on an 800-wide screen the banner hid its last line).
 * Then to the right of the toasts' column when there is room, else below them; lower than it has
 * been (since) only, so it never hops up as a toast above it goes.
 */
export function bannerBox(W: number, w: number, toasts: { maxW: number; boxes: Rect[] }, since = 0): Rect {
  const h = 56, top = 80;
  const r = { x: Math.floor((W - w) / 2), y: Math.max(top, since), w, h };
  const hits = (q: Rect) => toasts.boxes.some((b) => q.x < b.x + b.w + 6 && b.x < q.x + q.w + 6 && q.y < b.y + b.h + 6 && b.y < q.y + q.h + 6);
  if (!hits(r)) return r;
  const right = Math.max(...toasts.boxes.map((b) => b.x)) + toasts.maxW + 8;
  if (right + w <= W - 8) return { ...r, x: right + Math.floor((W - 8 - right - w) / 2) };
  return { ...r, y: Math.max(r.y, ...toasts.boxes.map((b) => b.y + b.h + 8)) };
}

function toasts(app: App) {
  const u = app.ui;
  // (the audit lets them cover the shop: they pass. Never each other, nor the new-chapter banner)
  for (const { t, x, y, w, h } of toastBoxes(app).boxes) u.own('toast', () => {
    u.ctx.globalAlpha = Math.min(1, t.life);
    u.panel(x, y, w, h, 'chip', false);
    u.rr(x + 5, y + 5, 5, h - 10, 2, t.tone === 'good' ? C.good : t.tone === 'bad' ? C.bad : C.accent);
    u.para(t.text, x + 16, y + 4, w - 24, C.strong);
    u.ctx.globalAlpha = 1;
  });
}

/** the newest guestbook line on a paper slip in the bottom band, after the window pills (over the
 *  floor it covered the stock-rack labels and the plants in the corner) */
function guestLine(app: App) {
  const g = app.guest;
  if (!g) return;
  const u = app.ui;
  const text = `"${g.text}"  ${g.who}`;
  const x = pillsEnd + 6, y = app.H - TOOLBAR_H + 6;
  // (in the hall the counter's corner reaches down into this band on short screens)
  const end = app.view === 'hall' ? Math.min(app.W - hallArea(app).right, app.W - 6 - (propSize('sh:counter')?.w ?? 0)) - 4 : app.W - 8;
  const w = Math.min(end - x, textWidth(text) + 20);
  if (w < 120) return;
  u.ctx.globalAlpha = Math.min(1, g.life);
  u.panel(x, y, w, 22, 'paper', false);
  u.text(text, x + 10, y + 4, C.paperInk, { maxW: w - 18 });
  u.ctx.globalAlpha = 1;
}

/** the hall's floor plan in UI pixels: the street window's width on the left, the counter's on the
 *  right, and the bays in between */
export function hallArea(app: App) {
  const left = app.W >= 900 ? (app.W >= 1100 ? 168 : 136) : 0, right = app.W >= 820 ? (app.W >= 1100 ? 200 : 180) : 0;
  return { left, right, gx: 8 + left, gw: app.W - 16 - left - right };
}

function hall(app: App) {
  const u = app.ui;
  const s = app.state;
  const bays = baysUnlocked(s, TIERS[s.tier].bays);
  const racks = TIERS[s.tier].racks;
  const display = s.tanks.filter((t) => !isStock(t)).length;
  const stock = s.tanks.filter((t) => isStock(t)).length;
  // one closed-off spot hints at what comes next, while there is a next
  const moreBays = s.tier < TIERS.length - 1 || (s.upgrades['extra_bays'] ?? 0) < upgrade('extra_bays').levels.length;
  const moreRacks = TIERS.some((tr) => tr.racks > racks);
  const nDisplay = Math.max(bays + (moreBays ? 1 : 0), display), nRacks = Math.max(racks + (moreRacks ? 1 : 0), stock);
  const top = TOP_H + 8, bottom = app.H - TOOLBAR_H - 8;
  // the shop floor: the street window on the left, the counter on the right, bays in between
  const { left, right, gx, gw } = hallArea(app);
  shopCorners(app, left, right, top, bottom);
  // the bays start below Ida's note while the tour runs
  const btop = top + noteReserve(app);
  const gap = 10, label = 18;
  // display bays get most of the wall; the stock room is a lower, shorter row of racks
  const avail = bottom - btop - label * 2 - gap;
  const dCols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(nDisplay * 1.6)))), dRows = Math.ceil(nDisplay / dCols);
  const rCols = Math.min(nRacks, Math.max(3, Math.floor(gw / 150))), rRows = Math.ceil(nRacks / rCols);
  const rH = Math.min(130, Math.floor((avail * 0.34 - (rRows - 1) * gap) / rRows));
  const dH = Math.min(200, Math.floor((avail - rRows * rH - (rRows - 1) * gap - (dRows - 1) * gap) / dRows));
  const used = label + dRows * dH + (dRows - 1) * gap + gap + label + rRows * rH + (rRows - 1) * gap;
  let y = btop + Math.max(0, Math.floor((bottom - btop - used) / 2));
  u.text('Display bays', gx + 2, y + 2, C.onDark, { face: 'display', shadow: 0 });
  y += label;
  grid(app, gx, gw, y, dCols, dH, nDisplay, (i) => i, bays, false);
  y += dRows * dH + (dRows - 1) * gap + gap;
  u.text('Stock room', gx + 2, y + 2, C.onDark, { face: 'display', shadow: 0 });
  u.text('fish and plants for sale', gx + 6 + textWidth('Stock room', 'display'), y + 2, 38);
  y += label;
  grid(app, gx, gw, y, rCols, rH, nRacks, (i) => BAL.rackBay + i, racks, true);
}

/** The two ends of the shop floor, drawn behind the bays: the window, the OPEN sign and a big
 *  plant on the left; the clock, the chalkboard of today's stock, the notice board of letters
 *  and the counter with the cat on the right. */
function shopCorners(app: App, left: number, right: number, top: number, bottom: number) {
  const u = app.ui, ctx = u.ctx, s = app.state;
  const hour = (s.time % 1440) / 60;
  const floorY = Math.floor(app.H * 0.93);
  const open = !!isOpen(s, s.time);
  if (left) {
    // the window sits low on the wall, the way a shop window does (and clear of the toasts)
    const wx = 22, ww = left - 40, full = Math.min(150, Math.floor((floorY - top) * 0.36));
    const wy = Math.max(top + 26, Math.floor(app.H * 0.26));
    const mon = propSize('sh:monstera'), pot = propSize('sh:pothos');
    // the keepsakes stand on planks between the window and the plant. When they need more wall the
    // window gives up to a third of its height for them (still tall enough for the OPEN sign)
    const sx0 = 12, sx1 = left - 8, sy1 = floorY + 4 - (mon?.h ?? 0) - 6;
    const sy0 = (wh: number) => Math.max(wy + wh + 12, top + (pot?.h ?? 0) + 4);
    const items = (s.keepsakes ?? []).flatMap((id) => {
      const k = propSize(`ks:${id}`, 1);
      return k ? [{ id, ...k }] : [];
    });
    let wh = full, shelf = layoutShelf(items, sx1 - sx0, sy1 - sy0(wh), [PROP_SCALE, 1]);
    for (let h = full - 6; shelf?.hidden !== 0 && items.length && h >= Math.max(90, full * 0.66); h -= 6) {
      const k = layoutShelf(items, sx1 - sx0, sy1 - sy0(h), [PROP_SCALE, 1]);
      if (k && (!shelf || k.hidden < shelf.hidden)) [shelf, wh] = [k, h];
    }
    streetWindow(ctx, wx, wy, ww, wh, hour, dayOf(s.time), u.time);
    // the OPEN sign at full size when the window is wide enough for it, else at its art's size
    const sk = (propSize('sh:open')?.w ?? 0) <= ww - 10 ? PROP_SCALE : 1;
    const sign = propSize('sh:open', sk);
    if (sign) {
      const sx = wx + Math.floor((ww - sign.w) / 2), sy = wy + 8 + sign.h;
      prop(ctx, 'sh:open', sx, sy, { dim: open ? 0 : 0.55, scale: sk });
      if (open) {
        // the glow of the tubes on the glass
        ctx.fillStyle = rgba(60, 0.12 + 0.03 * Math.sin(u.time * 3));
        ctx.fillRect(sx - 4, sy - sign.h - 4, sign.w + 8, sign.h + 8);
      }
    }
    // the pothos hangs from the ceiling line under the chips, in front of the window frame
    if (pot) prop(ctx, 'sh:pothos', wx + ww - pot.w + 6, top + pot.h);
    prop(ctx, 'sh:monstera', 10, floorY + 4);
    const bk = propSize('sh:buckets');
    if (bk && 14 + (mon?.w ?? 60) + bk.w <= left + 2) prop(ctx, 'sh:buckets', 14 + (mon?.w ?? 60), floorY + 3);
    if (shelf) keepsakeShelf(app, sx0, sx1, sy0(wh), shelf);
  }
  if (right) {
    const rx = app.W - right;
    wallClock(ctx, rx + right / 2, top + 18, 11, s.time);
    // the chalkboard: what the stock room has for sale today
    const cb = propSize('sh:chalkboard');
    let y = top + 38;
    if (cb) {
      const bx = rx + Math.floor((right - cb.w) / 2);
      prop(ctx, 'sh:chalkboard', bx, y + cb.h);
      const fish = s.tanks.flatMap((t) => offers(t, app.game!.stats.get(t.id)?.moods));
      // sold out only after a sale today; a rack still breeding its first fish says so
      const racked = s.tanks.some((t) => isStock(t) && (t.animals.length || t.bags.length));
      const lines = fish.length ? fish.slice(0, 4).map((o) => `${species(o.sp).name} ${o.each}`) : (s.stats.salesToday ?? 0) > 0 ? ['Sold out!', 'More soon'] : racked ? ['Coming soon'] : ['Nothing yet'];
      // chalk on the board (its own writing, not an overlap)
      u.own('sh:chalkboard', () => {
        u.text('Today', bx + cb.w / 2, y + Math.round(9 * PROP_SCALE), 9, { align: 'center' });
        lines.forEach((l, i) => u.text(l, bx + Math.round(10 * PROP_SCALE), y + Math.round((23 + i * 11) * PROP_SCALE), 8, { maxW: cb.w - Math.round(20 * PROP_SCALE) }));
      });
      if (u.hover(bx, y, cb.w, cb.h)) u.tip([{ text: 'The chalkboard' }, { text: 'What shoppers can buy from your stock tanks today, and the price each.', color: C.textDim }]);
      y += cb.h + 8;
    }
    // the notice board: letters from the town (click to read them)
    const nb = propSize('sh:corkboard');
    const counter = propSize('sh:counter');
    if (nb && y + nb.h < floorY - (counter?.h ?? 100) - 4) {
      const bx = rx + Math.floor((right - nb.w) / 2);
      prop(ctx, 'sh:corkboard', bx, y + nb.h);
      const unread = s.letters.filter((l) => !l.read).length;
      if (u.hover(bx, y, nb.w, nb.h)) {
        u.tip([{ text: 'The notice board' }, { text: unread ? `${unread} new letter${unread > 1 ? 's' : ''} pinned up. Click to read.` : 'Letters from the town. Click to read.', color: C.textDim }]);
        if (u.clicked) {
          u.eat();
          app.window = 'letters';
          for (const l of s.letters) l.read = true;
        }
      }
      if (unread) u.own('sh:corkboard', () => {
        u.rr(bx + nb.w - 10, y - 4, 14, 14, 4, 0);
        u.rr(bx + nb.w - 9, y - 3, 12, 12, 3, C.bad);
        u.text(String(unread), bx + nb.w - 3, y - 4, 9, { align: 'center' });
      });
    }
    // a poster in the gap above the shelf
    const pos = propSize('sh:poster');
    if (pos && nb && counter && y + nb.h + 16 + pos.h < floorY - counter.h - 90) prop(ctx, 'sh:poster', rx + Math.floor((right - pos.w) / 2), y + nb.h + 16 + pos.h);
    if (counter) {
      const cx = app.W - counter.w - 6;
      prop(ctx, 'sh:shelf', cx - 4, floorY - counter.h - 22);
      prop(ctx, 'sh:counter', cx, floorY + 4);
      // Ida's cat sleeps on the counter, and breathes
      const cat = propSize('sh:cat');
      if (cat) {
        const breathe = Math.sin(u.time * 1.6) > 0.6 ? 1 : 0;
        // (the counter top is about a third of the way down the art, under the register)
        prop(ctx, 'sh:cat', cx + Math.round(62 * PROP_SCALE), floorY + 4 - counter.h + Math.round(40 * PROP_SCALE) + breathe);
      }
      // the crate of supplies beside the counter, when the counter's corner has room for it
      const sup = propSize('sh:supplies');
      if (sup && cx - sup.w - 4 >= app.W - right) prop(ctx, 'sh:supplies', cx - sup.w - 4, floorY + 3);
    }
  }
}

/** The keepsake shelf: what each correspondent left when their story ended (art ks:<id>; one
 *  without art yet is left off), laid out by layoutShelf in the wall from x0 to x1 below y0. When
 *  the wall is too small for all of them, as many as fit stay (mostly the newest), with a "+N" for
 *  the rest where it has room; every one is in the Codex, under Plaques, as their tips say. */
function keepsakeShelf(app: App, x0: number, x1: number, y0: number, shelf: Shelf) {
  const u = app.ui;
  const more = shelf.hidden ? `${shelf.hidden} more in the Codex, under Plaques.` : 'Every keepsake is listed in the Codex, under Plaques.';
  for (const p of shelf.planks) {
    const py = y0 + p;
    // a plank on two brackets, with its shadow on the wall
    u.fill(x0 + 2, py + 3, x1 - x0 - 4, 2, 0, 0.18);
    u.fill(x0, py - 1, x1 - x0, 4, RAMP.wood[2]);
    u.fill(x0, py - 1, x1 - x0, 1, RAMP.wood[3]);
    u.fill(x0, py + 2, x1 - x0, 1, RAMP.wood[1]);
    for (const bx of [x0 + 6, x1 - 9]) u.fill(bx, py + 3, 3, 6, RAMP.wood[1]);
  }
  for (const k of shelf.spots) {
    const x = x0 + k.x, base = y0 + shelf.planks[k.row] - 1;
    prop(u.ctx, `ks:${k.id}`, x, base, { scale: shelf.scale });
    if (u.hover(x, base - k.h, k.w, k.h)) {
      const r = REQUESTS.find((q) => q.from === k.id && q.keepsake);
      u.tip([{ text: r?.keepsake ?? 'A keepsake' }, { text: `From ${correspondent(k.id).name}, at the end of their story. Their letters are kept in Letters.`, color: C.textDim }, { text: more, color: C.textDim }]);
    }
  }
  if (shelf.more) {
    // the ones the wall had no room for: a chalk tag on the last plank
    const x = x0 + shelf.more.x, base = y0 + shelf.planks[shelf.more.row] - 1;
    u.text(`+${shelf.hidden}`, x + 2, base - 12, C.onDark, { shadow: 0 });
    if (u.hover(x, base - 14, tagW(shelf.hidden), 14)) u.tip([{ text: `${shelf.hidden} more keepsake${shelf.hidden > 1 ? 's' : ''}` }, { text: 'The wall has no room for them here. The Codex keeps every one, under Plaques.', color: C.textDim }]);
  }
}

/** one block of bays: a tank on its stand, an empty stand to build on, or one still closed off */
function grid(app: App, gx: number, gw: number, y0: number, cols: number, ch: number, total: number, bayOf: (i: number) => number, open: number, rack: boolean) {
  const u = app.ui;
  const s = app.state;
  const g = app.game!;
  const gap = 10;
  const cw = Math.floor((gw - (cols - 1) * gap) / cols);
  for (let i = 0; i < total; i++) {
    const x = gx + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
    const bay = bayOf(i);
    const t = s.tanks.find((q) => q.bay === bay);
    if (t) {
      const v = app.viewFor(t);
      const st = g.stats.get(t.id);
      // the tank (with its own stand) fills the space; a museum label sits below it
      const foot = rack ? 30 : 38;
      const iw = cw, ih = ch - foot;
      const k = Math.min(iw / v.canvas.width, ih / v.canvas.height);
      const kk = k >= 1 ? Math.floor(k) : k;
      const dw = Math.round(v.canvas.width * kk), dh = Math.round(v.canvas.height * kk);
      const hour = (s.time % 1440) / 60;
      if (app.thumbDue(t.id)) v.draw(t, st, { hour, lightsOn: hour >= t.set.lightOn && hour < t.set.lightOff, open: !!isOpen(s, s.time) });
      const tx = x + Math.floor((iw - dw) / 2), ty = y + ih - dh;
      // a soft shadow on the floor under the stand
      u.ctx.fillStyle = rgba(0, 0.22);
      u.ctx.fillRect(tx + 4, ty + dh - 1, dw - 8, 3);
      u.ctx.imageSmoothingEnabled = kk < 1;
      u.ctx.drawImage(v.canvas, tx, ty, dw, dh);
      u.ctx.imageSmoothingEnabled = false;
      // the label is as wide as its writing needs, up to the whole cell (not cut at the tank's width)
      const rate = st ? `${ICON.coin} ${Math.round(st.coinsPerHour)}/h` : '';
      const need = rack ? textWidth(t.name) + textWidth('12 for sale') + 26
        : Math.max(textWidth(t.name, 'display') + 86, textWidth(st?.cls.best ? st.cls.best.def.name : 'Unrecognized') + textWidth(rate) + 26);
      const lw = Math.min(cw, Math.max(150, dw, need)), lx = x + Math.floor((cw - lw) / 2), ly = y + ih + 4;
      u.panel(lx, ly, lw, foot - 6, 'paper', false);
      if (rack) {
        const forSale = offers(t, st?.moods).reduce((a, o) => a + o.n, 0);
        const note = forSale ? `${forSale} for sale` : t.animals.length ? 'breeding' : 'empty';
        u.text(t.name, lx + 7, ly + 4, C.paperInk, { maxW: lw - 22 - textWidth(note) });
        u.text(note, lx + lw - 7, ly + 4, forSale ? C.good : 3, { align: 'right' });
      } else {
        u.head(t.name, lx + 7, ly + 4, C.paperInk, { maxW: lw - 82 });
        if (st) {
          u.stars(lx + lw - 66, ly + 5, st.rating.stars, C.coin, 62);
          u.text(st.cls.best ? st.cls.best.def.name : 'Unrecognized', lx + 7, ly + 18, 3, { maxW: lw - 22 - textWidth(rate) });
          u.text(rate, lx + lw - 7, ly + 18, C.gold, { align: 'right' });
        }
      }
      if (st) badges(u, attention(app, t, st), tx + dw - 4, ty + 4);
      sparkles(app, t.id, tx, ty, dw, Math.min(dh, 50));
      if (u.hover(x, y, cw, ch)) {
        u.rr(tx - 2, ty - 2, dw + 4, 2, 1, C.pick);
        if (u.clicked) {
          u.eat();
          app.setTank(t.id);
        }
      }
    } else if (i < open) {
      // an empty stand, and the outline of the tank it could hold
      const sw = Math.min(cw - 20, rack ? 120 : 170), sh = rack ? 16 : 26;
      const sx = x + Math.floor((cw - sw) / 2), sy = y + ch - sh - 4;
      u.ctx.fillStyle = rgba(0, 0.2);
      u.ctx.fillRect(sx + 3, sy + sh, sw - 6, 3);
      u.rr(sx, sy, sw, sh, 2, rack ? 6 : 19);
      u.rr(sx + 2, sy + 2, sw - 4, sh - 4, 1, rack ? 7 : 20);
      if (!rack) {
        u.fill(sx + Math.floor(sw / 2), sy + 3, 1, sh - 6, 19);
        u.fill(sx + 3, sy + 2, sw - 6, 1, 21);
      }
      // the dashed outline of a tank, as tall as the cell allows once the label has its line
      const room = sy - y;
      const gh = Math.max(0, Math.min(room - 20, Math.round(sw * 0.55)));
      const oy = sy - gh;
      const outline = gh >= M.btn + 8;
      if (outline) {
        for (let d = 0; d < sw - 8; d += 6) {
          u.fill(sx + 4 + d, oy, 3, 1, 9, 0.35);
          u.fill(sx + 4 + d, sy - 1, 3, 1, 9, 0.35);
        }
        for (let d = 0; d < gh; d += 6) {
          u.fill(sx + 4, oy + d, 1, 3, 9, 0.35);
          u.fill(sx + sw - 5, oy + d, 1, 3, 9, 0.35);
        }
      }
      // the button inside the outline, or just above the stand when the row is short
      const bw = Math.min(124, cw - 12);
      const by = outline ? oy + Math.floor(gh / 2) - 10 : Math.max(y, sy - M.btn - 3);
      if (u.button(`build${bay}`, x + Math.floor((cw - bw) / 2), by, bw, M.btn, rack ? 'Set up' : 'Build a tank', { style: 'good', tip: rack ? 'A stock tank: breed and grow fish and plants to sell' : 'A display tank for the shop floor' })) {
        app.newTankBay = bay;
        app.window = 'newtank';
      }
      const ly = (outline ? oy : by) - 16;
      if (ly >= y - 2) u.text(rack ? 'Empty rack' : 'Empty bay', x + cw / 2, ly, C.onDark, { align: 'center', shadow: 0, maxW: cw - 10 });
    } else {
      // closed off: a stand under a dust sheet
      const nextTier = rack ? TIERS.find((tr) => tr.racks > i) : TIERS.find((tr) => tr.bays + (s.upgrades['extra_bays'] ?? 0) > i);
      const sw = Math.min(cw - 20, rack ? 120 : 170), shh = Math.min(ch - 40, rack ? 50 : 90);
      const sx = x + Math.floor((cw - sw) / 2), sy = y + ch - shh - 4;
      const c = u.ctx;
      c.fillStyle = rgba(0, 0.2);
      c.fillRect(sx + 2, sy + shh, sw - 4, 3);
      // the stand legs peek out under a dust sheet draped over the empty tank
      u.fill(sx + 8, sy + shh - 8, 4, 8, 19);
      u.fill(sx + sw - 12, sy + shh - 8, 4, 8, 19);
      const sheet = (inset: number, col: number, a: number) => {
        c.fillStyle = rgba(col, a);
        c.beginPath();
        c.moveTo(sx + 10 + inset, sy + inset);
        c.lineTo(sx + sw - 10 - inset, sy + inset);
        c.lineTo(sx + sw - inset, sy + shh - 8);
        for (let k = 0; k <= 8; k++) c.lineTo(sx + sw - inset - ((sw - inset * 2) * k) / 8, sy + shh - 8 + (k % 2 ? 4 : 0));
        c.closePath();
        c.fill();
      };
      sheet(0, 7, 0.9);
      sheet(2, 8, 0.95);
      for (let f = 1; f < 5; f++) {
        const fx = sx + Math.floor((sw * f) / 5);
        u.fill(fx, sy + 6, 1, shh - 16, 7, 0.7);
        u.fill(fx + 1, sy + 6, 1, shh - 16, 9, 0.5);
      }
      u.text('Closed off', x + cw / 2, sy - 30, C.onDark, { align: 'center', shadow: 0, face: 'display', maxW: cw - 10 });
      u.text(nextTier ? `Opens at ${nextTier.name}` : rack ? 'The back room is full' : 'Buy Extra Bays', x + cw / 2, sy - 15, C.onDark, { align: 'center', maxW: cw - 12, shadow: 0 });
    }
  }
}
