// The always-on interface: three floating chips along the top (the aquarium and tank switcher,
// the clock and speed, reputation and coins), the window pills along the bottom, toasts, the
// guestbook slip and the hall of bays. There are no full-width bars: the wall shows between the
// chips (STYLE.md, Interface). The tank modes are folder tabs on the side panel (panels.ts).
import { species, TIERS, upgrade } from '../data';
import { rgba, UI as C } from '../data/palette';
import { drawIcon, hasArt } from '../render/icons';
import { prop, propSize, streetWindow, wallClock } from '../render/shop';
import { type App, SPEEDS } from '../app/app';
import { baysUnlocked } from '../sim/catalog';
import { clockText, dayOf } from '../sim/state';
import { isOpen } from '../sim/visitors';
import { BAL } from '../sim/balance';
import { isStock, offers } from '../sim/sales';
import { ICON, M, textWidth } from './ui';

/** the band the top chips sit in, and the band the window pills sit in */
export const TOP_H = 34;
export const TOOLBAR_H = 34;
const CHIP_H = 26, CHIP_Y = 5;

export function drawHud(app: App) {
  topChips(app);
  windowPills(app);
  if (app.view === 'hall') hall(app);
  toasts(app);
  guestLine(app);
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
  const clock = `Day ${dayOf(s.time)}  ${clockText(s.time)}`;
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
  u.text(clock, cx + 12, CHIP_Y + 6, C.strong);
  let sx = cx + 12 + textWidth(clock) + 10;
  u.rr(sx - 4, CHIP_Y + 5, textWidth(sign) + 8, 16, 3, open ? C.good : C.panelLo);
  u.text(sign, sx, CHIP_Y + 6, open ? 9 : C.textDim);
  if (u.hover(sx - 4, CHIP_Y, textWidth(sign) + 8, CHIP_H)) u.tip([{ text: open ? 'Open to visitors' : 'Closed: no visitors until 9:00' }]);
  sx += textWidth(sign) + 16;
  const labels = ['||', ICON.right, ICON.right + ICON.right, ICON.right + ICON.right + ICON.right];
  SPEEDS.forEach((sp, i) => {
    if (u.button(`speed${i}`, sx, by - 2, speedW[i], 18, labels[i], { active: s.settings.speed === sp, style: 'flat', tip: sp === 0 ? 'Pause (Space)' : `${sp} game minute${sp > 1 ? 's' : ''} per second` })) s.settings.speed = sp;
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
}

/** the icon art for each window (ui:<name>, icons sheet) */
export const WIN_ICON: Record<NonNullable<App['window']>, string> = {
  letters: 'letters', codex: 'codex', trips: 'trips', upgrades: 'upgrades', guestbook: 'guestbook', menu: 'settings', newtank: 'fish',
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
}

function toasts(app: App) {
  const u = app.ui;
  let y = TOP_H + 6;
  const x = 8;
  for (const t of app.toasts) {
    const w = Math.min(380, textWidth(t.text) + 26);
    const h = u.paraHeight(t.text, w - 26) + 10;
    u.ctx.globalAlpha = Math.min(1, t.life);
    u.panel(x, y, w, h, 'chip', false);
    u.rr(x + 5, y + 5, 5, h - 10, 2, t.tone === 'good' ? C.good : t.tone === 'bad' ? C.bad : C.accent);
    u.para(t.text, x + 16, y + 4, w - 24, C.strong);
    u.ctx.globalAlpha = 1;
    y += h + 5;
  }
}

function guestLine(app: App) {
  const g = app.guest;
  if (!g) return;
  const u = app.ui;
  const text = `"${g.text}"  ${g.who}`;
  const w = Math.min(app.W - 360, textWidth(text) + 20);
  const x = 8, y = app.H - TOOLBAR_H - 26;
  u.ctx.globalAlpha = Math.min(1, g.life);
  u.panel(x, y, w, 22, 'paper', false);
  u.text(text, x + 10, y + 4, C.paperInk, { maxW: w - 18 });
  u.ctx.globalAlpha = 1;
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
  const left = app.W >= 900 ? (app.W >= 1100 ? 168 : 136) : 0, right = app.W >= 820 ? 180 : 0;
  shopCorners(app, left, right, top, bottom);
  const gx = 8 + left, gw = app.W - 16 - left - right;
  const gap = 10, label = 18;
  // display bays get most of the wall; the stock room is a lower, shorter row of racks
  const avail = bottom - top - label * 2 - gap;
  const dCols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(nDisplay * 1.6)))), dRows = Math.ceil(nDisplay / dCols);
  const rCols = Math.min(nRacks, Math.max(3, Math.floor(gw / 150))), rRows = Math.ceil(nRacks / rCols);
  const rH = Math.min(130, Math.floor((avail * 0.34 - (rRows - 1) * gap) / rRows));
  const dH = Math.min(200, Math.floor((avail - rRows * rH - (rRows - 1) * gap - (dRows - 1) * gap) / dRows));
  const used = label + dRows * dH + (dRows - 1) * gap + gap + label + rRows * rH + (rRows - 1) * gap;
  let y = top + Math.max(0, Math.floor((bottom - top - used) / 2));
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
    const wx = 22, ww = left - 40, wh = Math.min(150, Math.floor((floorY - top) * 0.36));
    const wy = Math.max(top + 26, Math.floor(app.H * 0.26));
    streetWindow(ctx, wx, wy, ww, wh, hour, dayOf(s.time), u.time);
    const sign = propSize('sh:open');
    if (sign) {
      const sx = wx + Math.floor((ww - sign.w) / 2), sy = wy + 8 + sign.h;
      prop(ctx, 'sh:open', sx, sy, { dim: open ? 0 : 0.55 });
      if (open) {
        // the glow of the tubes on the glass
        ctx.fillStyle = rgba(60, 0.12 + 0.03 * Math.sin(u.time * 3));
        ctx.fillRect(sx - 4, sy - sign.h - 4, sign.w + 8, sign.h + 8);
      }
    }
    const pot = propSize('sh:pothos');
    if (pot && wy - top > pot.h * 0.6) prop(ctx, 'sh:pothos', wx + ww - pot.w + 6, Math.min(wy - 6, top + pot.h));
    prop(ctx, 'sh:monstera', 10, floorY + 4);
    const mon = propSize('sh:monstera');
    prop(ctx, 'sh:buckets', 14 + (mon?.w ?? 60), floorY + 3);
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
      const lines = fish.length ? fish.slice(0, 4).map((o) => `${species(o.sp).name} ${o.each}`) : s.tanks.some(isStock) ? ['Sold out!', 'More soon'] : ['Nothing yet'];
      u.text('Today', bx + cb.w / 2, y + 9, 9, { align: 'center' });
      lines.forEach((l, i) => u.text(l, bx + 10, y + 23 + i * 11, 8, { maxW: cb.w - 20 }));
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
      if (unread) {
        u.rr(bx + nb.w - 10, y - 4, 14, 14, 4, 0);
        u.rr(bx + nb.w - 9, y - 3, 12, 12, 3, C.bad);
        u.text(String(unread), bx + nb.w - 3, y - 4, 9, { align: 'center' });
      }
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
        prop(ctx, 'sh:cat', cx + 62, floorY + 4 - counter.h + 40 + breathe);
      }
      prop(ctx, 'sh:supplies', cx - (propSize('sh:supplies')?.w ?? 80) - 4, floorY + 3);
    }
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
      v.draw(t, st, { hour, lightsOn: hour >= t.set.lightOn && hour < t.set.lightOff, open: !!isOpen(s, s.time) });
      const tx = x + Math.floor((iw - dw) / 2), ty = y + ih - dh;
      // a soft shadow on the floor under the stand
      u.ctx.fillStyle = rgba(0, 0.22);
      u.ctx.fillRect(tx + 4, ty + dh - 1, dw - 8, 3);
      u.ctx.imageSmoothingEnabled = kk < 1;
      u.ctx.drawImage(v.canvas, tx, ty, dw, dh);
      u.ctx.imageSmoothingEnabled = false;
      const lw = Math.min(cw, Math.max(150, dw)), lx = x + Math.floor((cw - lw) / 2), ly = y + ih + 4;
      u.panel(lx, ly, lw, foot - 6, 'paper', false);
      if (rack) {
        const forSale = offers(t, st?.moods).reduce((a, o) => a + o.n, 0);
        u.text(t.name, lx + 7, ly + 4, C.paperInk, { maxW: lw - 80 });
        u.text(forSale ? `${forSale} for sale` : t.animals.length ? 'breeding' : 'empty', lx + lw - 7, ly + 4, forSale ? 30 : 3, { align: 'right' });
      } else {
        u.head(t.name, lx + 7, ly + 4, C.paperInk, { maxW: lw - 80 });
        if (st) {
          u.stars(lx + lw - 66, ly + 5, st.rating.stars, C.coin, 62);
          u.text(st.cls.best ? st.cls.best.def.name : 'Unrecognized', lx + 7, ly + 18, 3, { maxW: lw - 70 });
          u.text(`${ICON.coin} ${Math.round(st.coinsPerHour)}/h`, lx + lw - 7, ly + 18, 20, { align: 'right' });
        }
      }
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
      const gh = Math.min(ch - sh - 50, Math.round(sw * 0.55));
      const oy = sy - gh;
      for (let d = 0; d < sw - 8; d += 6) {
        u.fill(sx + 4 + d, oy, 3, 1, 9, 0.35);
        u.fill(sx + 4 + d, sy - 1, 3, 1, 9, 0.35);
      }
      for (let d = 0; d < gh; d += 6) {
        u.fill(sx + 4, oy + d, 1, 3, 9, 0.35);
        u.fill(sx + sw - 5, oy + d, 1, 3, 9, 0.35);
      }
      const bw = Math.min(124, cw - 12);
      if (u.button(`build${bay}`, x + Math.floor((cw - bw) / 2), oy + Math.floor(gh / 2) - 10, bw, M.btn, rack ? 'Set up' : 'Build a tank', { style: 'good', tip: rack ? 'A stock tank: breed and grow fish and plants to sell' : 'A display tank for the shop floor' })) {
        app.newTankBay = bay;
        app.window = 'newtank';
      }
      u.text(rack ? 'Empty rack' : 'Empty bay', x + cw / 2, oy - 16, C.onDark, { align: 'center', shadow: 0, maxW: cw - 10 });
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
