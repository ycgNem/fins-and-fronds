// The title screen: the starter tank, clean and lit, under a sea-glass sign with the name in the
// display face.
import type { App } from '../app/app';
import { PALETTE, UI as C } from '../data/palette';
import { drawText, FONT_H, textWidth } from './font';
import { M } from './ui';

export function drawTitle(app: App) {
  const u = app.ui;
  const title = 'Fins & Fronds';
  const sc = app.W >= 900 ? 3 : 2;
  const tw = textWidth(title, 'display') * sc;
  const sub = 'a cozy aquarium of every kind';
  const sw = Math.max(tw, textWidth(sub)) + 56, sh = FONT_H * sc + 40;
  const sx = Math.floor((app.W - sw) / 2), sy = 14;
  u.panel(sx, sy, sw, sh, 'card', false);
  const tx = Math.floor((app.W - tw) / 2), ty = sy + 8;
  drawText(u.ctx, title, tx, ty + sc, PALETTE[C.edge], sc, null, 'display');
  drawText(u.ctx, title, tx, ty, PALETTE[C.head], sc, null, 'display');
  u.text(sub, app.W / 2, sy + sh - 22, C.textDim, { align: 'center' });

  const bw = 180, bx = Math.floor((app.W - bw) / 2);
  const save = app.hasSave();
  const ch = save ? 70 : 42;
  const cy = app.H - ch - 16;
  u.panel(bx - 12, cy, bw + 24, ch, 'chip', false);
  let by = cy + 10;
  if (save) {
    if (u.button('continue', bx, by, bw, M.btn + 2, 'Continue', { style: 'good' })) app.continueSave();
    by += M.btn + 6;
  }
  if (u.button('newgame', bx, by, bw, M.btn + 2, 'New aquarium')) app.startNew();
}
