// The title screen: the starter tank, clean and lit, under a sea-glass sign with the name in the
// display face.
import type { App } from '../app/app';
import { PALETTE, UI as C } from '../data/palette';
import { drawIcon, hasArt } from '../render/icons';
import { drawText, FONT_H, textWidth } from './font';
import { M } from './ui';

/** "New shop" over an existing save asks first: starting over erases it */
let confirming = false;

export function drawTitle(app: App) {
  const u = app.ui;
  const title = 'Fins & Fronds';
  const sc = app.W >= 900 ? 3 : 2;
  const tw = textWidth(title, 'display') * sc;
  const sub = 'a little fish shop, and every tank in it';
  const sh = FONT_H * sc + 40;
  const em = hasArt('ui:logo') ? (sh - 12 >= 60 ? 64 : 32) : 0;
  const sw = Math.max(tw, textWidth(sub)) + 56 + (em ? em + 12 : 0);
  const sx = Math.floor((app.W - sw) / 2), sy = 14;
  u.panel(sx, sy, sw, sh, 'card', false);
  if (em) drawIcon(u.ctx, 'ui:logo', sx + 16, sy + Math.floor((sh - em) / 2), em);
  const mid = Math.floor(app.W / 2 + (em ? (em + 12) / 2 : 0));
  const tx = Math.floor(mid - tw / 2), ty = sy + 8;
  drawText(u.ctx, title, tx, ty + sc, PALETTE[C.edge], sc, null, 'display');
  drawText(u.ctx, title, tx, ty, PALETTE[C.head], sc, null, 'display');
  u.text(sub, mid, sy + sh - 22, C.textDim, { align: 'center' });

  const ask = 'Start over? Your shop will be lost.';
  const save = app.hasSave();
  const bw = save && confirming ? Math.max(180, textWidth(ask)) : 180, bx = Math.floor((app.W - bw) / 2);
  const ch = save ? (confirming ? 92 : 70) : 42;
  const cy = app.H - ch - 16;
  u.panel(bx - 12, cy, bw + 24, ch, 'chip', false);
  let by = cy + 10;
  if (save && confirming) {
    u.text(ask, app.W / 2, by, C.strong, { align: 'center' });
    by += 20;
    if (u.button('erase', bx, by, bw, M.btn + 2, 'Yes, start a new shop', { style: 'bad' })) {
      confirming = false;
      app.startNew();
    }
    by += M.btn + 6;
    if (u.button('keep', bx, by, bw, M.btn + 2, 'No, keep my shop', { style: 'good' })) confirming = false;
    return;
  }
  if (save) {
    if (u.button('continue', bx, by, bw, M.btn + 2, 'Continue', { style: 'good' })) app.continueSave();
    by += M.btn + 6;
  }
  if (u.button('newgame', bx, by, bw, M.btn + 2, 'New shop')) {
    if (save) confirming = true;
    else app.startNew();
  }
}
