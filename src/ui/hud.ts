// The always-on interface: three floating chips along the top (the aquarium and tank switcher,
// the clock and speed, reputation and coins), the window pills along the bottom, toasts, the
// guestbook slip and the hall of bays. There are no full-width bars: the wall shows between the
// chips (STYLE.md, Interface). The tank modes are folder tabs on the side panel (panels.ts).
import { TIERS } from '../data';
import { UI as C } from '../data/palette';
import { type App, SPEEDS } from '../app/app';
import { baysUnlocked } from '../sim/catalog';
import { clockText, dayOf } from '../sim/state';
import { isOpen } from '../sim/visitors';
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
  u.text(ICON.sparkle, rx + 10, CHIP_Y + 6, C.accent);
  if (next) {
    const frac = (s.rep - TIERS[s.tier].rep) / (next.rep - TIERS[s.tier].rep);
    u.bar(rx + 24, CHIP_Y + 9, 70, 9, frac, C.accent);
    if (u.hover(rx + 6, CHIP_Y, 92, CHIP_H)) u.tip([{ text: `${tier.name}: reputation ${Math.floor(s.rep)} / ${next.rep}` }, { text: `Next: ${next.name}. ${next.unlocks}`, color: C.textDim }]);
  } else u.text(String(Math.floor(s.rep)), rx + 24, CHIP_Y + 6, C.accent);
  u.text(ICON.coin, rx + rw - 12 - coinW - 14, CHIP_Y + 6, C.coin);
  u.head(coins, rx + rw - 12, CHIP_Y + 6, C.strong, { align: 'right' });
}

function windowPills(app: App) {
  const u = app.ui;
  const s = app.state;
  const y = app.H - TOOLBAR_H + 6;
  const ready = s.letters.filter((l) => l.ready).length;
  const unread = s.letters.filter((l) => !l.read).length;
  const back = s.expeditions.filter((e) => e.finds).length;
  const wins: { id: NonNullable<App['window']>; label: string; badge?: number; tip: string }[] = [
    { id: 'letters', label: `${ICON.letter} Letters`, badge: ready || unread || undefined, tip: 'Letters from the people who visit' },
    { id: 'codex', label: 'Codex', tip: 'Every tank type, species and partnership you have found' },
    { id: 'trips', label: 'Trips', badge: back || undefined, tip: 'Collecting expeditions with Captain Wren' },
    { id: 'upgrades', label: 'Upgrades', tip: 'Improve the aquarium' },
    { id: 'guestbook', label: 'Guestbook', tip: 'What the visitors wrote' },
    { id: 'menu', label: ICON.cog, tip: 'Settings and saves (Esc)' },
  ];
  let x = 8;
  for (const w of wins) {
    const bw = textWidth(w.label) + 20;
    if (u.button(`win:${w.id}`, x, y, bw, 22, w.label, { active: app.window === w.id, style: 'flat', badge: w.badge, tip: w.tip })) {
      app.window = app.window === w.id ? null : w.id;
      if (w.id === 'letters') for (const l of s.letters) l.read = true;
    }
    x += bw + 4;
  }
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
  const g = app.game!;
  const bays = baysUnlocked(s, TIERS[s.tier].bays);
  const total = Math.max(bays + 1, s.tanks.length);
  const top = TOP_H + 8, bottom = app.H - TOOLBAR_H - 8;
  const cols = Math.min(5, Math.max(2, Math.ceil(Math.sqrt(total * 1.6))));
  const rows = Math.ceil(total / cols);
  const gap = 10;
  const cw = Math.floor((app.W - 16 - (cols - 1) * gap) / cols);
  const ch = Math.min(200, Math.floor((bottom - top - (rows - 1) * gap) / rows));
  // the bays hang in the middle of the wall
  const y0 = top + Math.max(0, Math.floor((bottom - top - rows * ch - (rows - 1) * gap) / 2));
  for (let i = 0; i < total; i++) {
    const x = 8 + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
    const t = s.tanks.find((q) => q.bay === i);
    u.panel(x, y, cw, ch, t ? 'card' : 'inset');
    if (t) {
      const v = app.viewFor(t);
      const st = g.stats.get(t.id);
      const iw = cw - 12, ih = ch - 46;
      const k = Math.min(iw / v.canvas.width, ih / v.canvas.height);
      const kk = k >= 1 ? Math.floor(k) : k;
      const dw = Math.round(v.canvas.width * kk), dh = Math.round(v.canvas.height * kk);
      const hour = (s.time % 1440) / 60;
      v.draw(t, st, { hour, lightsOn: hour >= t.set.lightOn && hour < t.set.lightOff, open: !!isOpen(s, s.time) });
      u.ctx.imageSmoothingEnabled = kk < 1;
      u.ctx.drawImage(v.canvas, x + 6 + Math.floor((iw - dw) / 2), y + 6 + Math.floor((ih - dh) / 2), dw, dh);
      u.ctx.imageSmoothingEnabled = false;
      u.head(t.name, x + 9, y + ch - 38, C.head, { maxW: cw - 80 });
      if (st) {
        u.stars(x + cw - 68, y + ch - 37, st.rating.stars);
        u.text(st.cls.best ? st.cls.best.def.name : 'Unrecognized', x + 9, y + ch - 21, st.cls.best ? C.text : C.textMute, { maxW: cw - 80 });
        u.text(`${ICON.coin} ${Math.round(st.coinsPerHour)}/h`, x + cw - 9, y + ch - 21, C.gold, { align: 'right' });
      }
      if (u.hover(x, y, cw, ch) && u.clicked) {
        u.eat();
        app.setTank(t.id);
      }
    } else if (i < bays) {
      u.head('Empty bay', x + cw / 2, y + ch / 2 - 24, C.textDim, { align: 'center' });
      if (u.button(`build${i}`, x + cw / 2 - 60, y + ch / 2, 120, M.btn, 'Build a tank', { style: 'good' })) {
        app.newTankBay = i;
        app.window = 'newtank';
      }
    } else {
      const nextTier = TIERS.find((tr) => tr.bays + (s.upgrades['extra_bays'] ?? 0) > i);
      u.head('Closed off', x + cw / 2, y + ch / 2 - 16, C.textMute, { align: 'center' });
      u.text(nextTier ? `Opens at ${nextTier.name}` : 'Buy Extra Bays', x + cw / 2, y + ch / 2 + 2, C.textDim, { align: 'center', maxW: cw - 12 });
    }
  }
}
