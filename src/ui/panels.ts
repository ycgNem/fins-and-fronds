// The side panel for the current tank: folder tabs for the six modes on top of one sea-glass
// card holding the report card (Look), the scape catalog, the livestock order sheet, equipment,
// water tests and daily care. Every action goes through src/sim/actions.ts; the panel only reads
// the state.
import type { App, Mode } from '../app/app';
import { equip, item, species, substrate } from '../data';
import { UI as C } from '../data/palette';
import type { EquipDef, ItemCat, ItemDef, Slot, SpeciesDef } from '../data/types';
import { creatureFrame, itemFrame } from '../render/art/sprites';
import * as act from '../sim/actions';
import { equipForSale, itemsForSale, speciesForSale, substratesForSale } from '../sim/catalog';
import { facts, FLOW_NAMES, litersOf } from '../sim/facts';
import { PART_NAMES, type RatingParts } from '../sim/rating';
import { hourOf, type Tank, type WaterSource } from '../sim/state';
import { cycleProgress, SOURCES } from '../sim/water';
import { BAL } from '../sim/balance';
import { isStock, offers } from '../sim/sales';
import { type SpeciesMood, speciesMoods } from '../sim/wellbeing';
import { TOOLBAR_H, TOP_H } from './hud';
import { ICON, M, type TipLine, type UI } from './ui';

/** the side panel's width for this screen */
export function panelW(app: App) {
  return Math.max(290, Math.min(350, Math.round(app.W * 0.32)));
}

const TAB_H = 22;
const heights = new Map<string, number>();

/** A scrolling column: draw() lays rows out from y and returns the y it ended at. */
function column(u: UI, id: string, x: number, y: number, w: number, h: number, draw: (x: number, y: number, w: number) => number) {
  const off = u.scrollArea(id, x, y, w, h, heights.get(id) ?? h);
  u.clip(x, y, w, h);
  const end = draw(x, y - off, w - 8);
  u.unclip();
  heights.set(id, end + off - y + 6);
}

/** pill tabs laid out in rows of `per`, filling the width; returns the selected index */
function tabRows(u: UI, id: string, x: number, y: number, w: number, labels: string[], current: number, per: number, tips?: string[]): [number, number] {
  let out = current;
  const rows = Math.ceil(labels.length / per);
  for (let r = 0; r < rows; r++) {
    const row = labels.slice(r * per, r * per + per);
    const tw = Math.floor((w - (per - 1) * 3) / per);
    row.forEach((l, i) => {
      const k = r * per + i;
      if (u.button(`${id}:${k}`, x + i * (tw + 3), y + r * 21, tw, 19, l, { active: k === current, style: 'flat', tip: tips?.[k] })) out = k;
    });
  }
  return [out, rows * 21 + 3];
}

function moodColor(m: number) {
  return m >= 0.75 ? C.good : m >= 0.45 ? C.warn : C.bad;
}

const MODES: { id: Mode; label: string; title: string; tip: string }[] = [
  { id: 'look', label: 'Look', title: 'Report card', tip: 'Watch the tank and read its report card (1)' },
  { id: 'scape', label: 'Scape', title: 'Aquascape', tip: 'Stones, wood, plants, corals and the substrate (2)' },
  { id: 'stock', label: 'Stock', title: 'Livestock', tip: 'Order fish and invertebrates; they arrive in bags (3)' },
  { id: 'gear', label: 'Gear', title: 'Equipment', tip: 'Filters, heaters, lights, CO2 and flow (4)' },
  { id: 'water', label: 'Water', title: 'Water', tip: 'Test the water, change it, set the source and salt (5)' },
  { id: 'care', label: 'Care', title: 'Care', tip: 'Feed, scrape the glass, wipe nose prints (6)' },
];

export function drawPanel(app: App) {
  const t = app.tank!;
  const u = app.ui;
  const pw = panelW(app);
  const x = app.W - pw - 6, y = TOP_H + 2;
  const h = app.H - TOP_H - TOOLBAR_H - 4;
  const cur = MODES.findIndex((m) => m.id === app.mode);
  // the card first, then the tabs over its top edge
  u.panel(x, y + TAB_H, pw, h - TAB_H, 'card');
  const pick = u.folderTabs('modes', x + 6, y, pw - 12, MODES.map((m) => m.label), cur, MODES.map((m) => m.tip));
  if (pick !== cur) app.setMode(MODES[pick].id);
  u.head(MODES[cur].title, x + M.pad + 2, y + TAB_H + 8);
  const ix = x + M.pad + 2, iy = y + TAB_H + 28, iw = pw - M.pad * 2 - 2, ih = h - TAB_H - 34;
  switch (app.mode) {
    case 'look': look(app, t, ix, iy, iw, ih); break;
    case 'scape': scape(app, t, ix, iy, iw, ih); break;
    case 'stock': stock(app, t, ix, iy, iw, ih); break;
    case 'gear': gear(app, t, ix, iy, iw, ih); break;
    case 'water': water(app, t, ix, iy, iw, ih); break;
    case 'care': care(app, t, ix, iy, iw, ih); break;
  }
}

// ---------------------------------------------------------------- look

function look(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const st = app.game!.stats.get(t.id);
  if (!st) return;
  u.mark('report', x, y, w, Math.min(h, 120));
  column(u, 'look', x, y, w, h, (x, y, w) => {
    if (isStock(t)) y = salesCard(app, t, x, y, w);
    const best = st.cls.best;
    u.text(best ? best.def.name : 'Unrecognized tank', x, y, best ? C.strong : C.textDim, { maxW: w });
    if (best && u.hover(x, y, w, M.line)) u.tip([{ text: best.def.blurb }, { text: best.def.real, color: C.textDim }], 260);
    y += M.line;
    u.text(best ? best.def.family : st.cls.near[0] ? `Close to: ${st.cls.near[0].def.name}` : 'Add life and a scape', x, y, C.textDim, { maxW: w });
    y += M.line + 6;
    u.stars(x, y, st.rating.stars);
    u.head(`${Math.round(st.rating.total)}`, x + w - 34, y, C.strong, { align: 'right' });
    u.text('/100', x + w, y, C.textDim, { align: 'right' });
    y += M.row + 4;
    for (const k of Object.keys(PART_NAMES) as (keyof RatingParts)[]) {
      const v = st.rating.parts[k];
      u.text(PART_NAMES[k], x, y, C.text);
      u.bar(x + 100, y + 3, w - 132, 10, v / 100, v >= 75 ? C.good : v >= 50 ? C.accent : v >= 30 ? C.warn : C.bad);
      u.text(String(Math.round(v)), x + w, y, C.strong, { align: 'right' });
      if (u.hover(x, y, w, M.row)) u.tip([{ text: PART_NAMES[k] }, { text: st.rating.notes[k] ?? 'Looking good.' }]);
      y += M.row;
    }
    y += 4;
    u.text(`${ICON.fish} ${Math.round(st.visitorsPerHour)} visitors/h`, x, y, C.text);
    u.text(`${ICON.coin} ${Math.round(st.coinsPerHour)}/h`, x + w, y, C.gold, { align: 'right' });
    y += M.row + 4;
    // advice: what keeps this from being more true to its type, or what would make it one
    const hints = best ? best.hints.slice(0, 3) : st.cls.near.slice(0, 2).flatMap((n) => n.hints.slice(0, 1).map((hh) => `${n.def.name}: ${hh}`));
    const notes = (Object.keys(st.rating.notes) as (keyof RatingParts)[]).filter((k) => st.rating.parts[k] < 60).map((k) => st.rating.notes[k]!).slice(0, 2);
    if (hints.length || notes.length) {
      u.divider(x, y, w);
      y += 6;
      u.head('Ideas', x, y);
      y += M.row + 2;
      for (const s of new Set([...notes, ...hints])) y += u.para(`${ICON.right} ${s}`, x, y, w, C.text) + 3;
    }
    y += 3;
    u.divider(x, y, w);
    y += 6;
    // the selected creature or item
    const sel = app.select;
    if (sel?.kind === 'agent') {
      const a = t.animals.find((q) => q.uid === sel.uid);
      if (a) y = speciesCard(app, species(a.sp), st.moods.get(a.sp), x, y, w, a.fry ? 'young, born here' : a.bornHere ? 'born here' : undefined);
    } else if (sel?.kind === 'item') {
      const p = t.items.find((q) => q.uid === sel.uid);
      if (p) y = itemCard(app, item(p.id), x, y, w, p.size, p.health);
    }
    if (!sel) {
      u.head(`Residents ${t.animals.length}`, x, y);
      y += M.row + 4;
      if (!t.animals.length) y += u.para('No animals yet. Cycle the water first (Water), then order livestock (Stock).', x, y, w, C.textDim);
      for (const [sp, m] of st.moods) {
        const s = species(sp);
        if (u.row(x - 3, y - 2, w + 6, M.item, false, [{ text: s.name }, ...m.reasons.slice(0, 5).map((r) => ({ text: (r.good ? '+ ' : '- ') + r.text, color: r.good ? C.good : C.warn }))])) {
          const a = t.animals.find((q) => q.sp === sp);
          if (a) app.select = { kind: 'agent', uid: a.uid };
        }
        u.sprite(creatureFrame(sp, 0), x, y, 32, 22);
        u.text(s.name, x + 38, y + 4, C.strong, { maxW: w - 110 });
        u.text(`x${m.count}`, x + w - 40, y + 4, C.textDim, { align: 'right' });
        u.bar(x + w - 34, y + 7, 34, 8, m.mood, moodColor(m.mood));
        y += M.item;
      }
      if (t.pests.snails >= 1) {
        y += 4;
        y += u.para(`${Math.ceil(t.pests.snails)} pest snails on the glass.`, x, y, w, C.warn);
      }
      // the tank itself: a new name, or take it down and free the bay
      y += 8;
      u.divider(x, y, w);
      y += 8;
      const hw = Math.floor((w - 6) / 2);
      if (u.button('rename', x, y, hw, M.btnS + 2, 'Rename', { style: 'flat', tip: 'Give this tank a name of its own' })) {
        const name = window.prompt('Name this tank', t.name);
        if (name) act.rename(app.game!, t, name.trim());
      }
      const c = app.panel.confirmDismantle === t.id;
      const why = t.animals.length || t.bags.length ? 'Net the animals into holding first (Stock, In tank)' : '';
      if (u.button('dismantle', x + hw + 6, y, hw, M.btnS + 2, c ? 'Sure? Click again' : 'Dismantle', { style: 'bad', disabled: !!why, tip: why || 'Take the tank down: half its price back, stones and wood to storage' })) {
        if (c) {
          app.panel.confirmDismantle = 0;
          app.run(act.dismantleTank(app.game!, t));
        } else app.panel.confirmDismantle = t.id;
      }
      if (c && !u.hover(x + hw + 6, y, hw, M.btnS + 2)) app.panel.confirmDismantle = 0;
      y += M.btnS + 6;
    }
    return y;
  });
}

/** a stock tank: what is for sale, the breeders it keeps back, and today's takings */
function salesCard(app: App, t: Tank, x: number, y: number, w: number): number {
  const u = app.ui;
  const st = app.game!.stats.get(t.id);
  u.head('For sale', x, y);
  u.text(`today ${ICON.coin} ${Math.round(app.state.stats.salesToday ?? 0)}`, x + w, y + 1, C.gold, { align: 'right' });
  y += M.row + 2;
  const keep = t.keep ?? BAL.keepDefault;
  const d = u.stepper('keep', x, y, `keep ${keep}`, 90);
  if (d) act.setKeep(app.game!, t, keep + d);
  u.text('of each as breeders', x + 96, y + 1, C.textDim, { maxW: w - 96 });
  y += M.btnS + 6;
  const os = offers(t, st?.moods);
  if (!os.length) y += u.para(t.animals.length ? 'Nothing to sell yet. Customers buy healthy adults above the breeders you keep; fry sell once they grow up.' : 'Stock it from the supplier or breed fish here; customers will buy them. Overgrown plants are cut into cuttings for sale.', x, y, w, C.textDim) + 4;
  for (const o of os) {
    u.sprite(creatureFrame(o.sp, 0), x, y, 32, 22);
    u.text(species(o.sp).name, x + 38, y + 4, C.strong, { maxW: w - 120 });
    u.text(`${o.n} x ${ICON.coin}${o.each}`, x + w, y + 4, C.gold, { align: 'right' });
    y += M.item;
  }
  y += 4;
  u.divider(x, y, w);
  return y + 8;
}

function speciesCard(app: App, s: SpeciesDef, m: SpeciesMood | undefined, x: number, y: number, w: number, note?: string): number {
  const u = app.ui;
  u.panel(x, y, w, 60, 'inset', false);
  u.sprite(creatureFrame(s.id, Math.floor(u.time * 3) % 4), x + 4, y + 4, w - 8, 52);
  y += 66;
  u.head(s.name, x, y, C.head, { maxW: w });
  y += M.line + 2;
  u.text(s.sci, x, y, C.textDim, { maxW: w });
  y += M.line + 2;
  u.text(`${s.cm} cm, ${s.temper}, ${s.zone}${note ? ` (${note})` : ''}`, x, y, C.text, { maxW: w });
  y += M.line;
  u.text(`${s.temp[0]}-${s.temp[1]}C  pH ${s.ph[0]}-${s.ph[1]}${s.gh ? `  GH ${s.gh[0]}-${s.gh[1]}` : ''}${s.sg ? `  SG ${s.sg[0]}` : ''}`, x, y, C.text, { maxW: w });
  y += M.line + 4;
  y += u.para(s.fact, x, y, w, C.textDim) + 4;
  if (m) {
    u.text(`Mood ${Math.round(m.mood * 100)}%`, x, y, moodColor(m.mood));
    y += M.line;
    for (const r of m.reasons.slice(0, 6)) y += u.para((r.good ? '+ ' : '- ') + r.text, x, y, w, r.good ? C.good : C.warn);
  }
  if (u.button('desel', x, y + 4, 70, M.btnS + 2, 'Close', { style: 'flat' })) app.select = null;
  return y + 28;
}

function itemTip(it: ItemDef): TipLine[] {
  const lines: TipLine[] = [{ text: it.name }, { text: it.blurb, color: C.textDim }];
  if (it.plant) {
    const p = it.plant;
    lines.push({ text: `Light ${['', 'low', 'medium', 'high'][p.light]}, CO2 ${['none', 'helps', 'required'][p.co2]}, growth ${p.growth}/5${p.epiphyte ? ', ties onto wood or rock' : ''}${p.rooted ? ', rooted' : ''}`, color: C.accent });
  }
  if (it.coral) {
    const c = it.coral;
    lines.push({ text: `${c.type.toUpperCase()}, PAR ${c.par[0]}-${c.par[1]}, flow ${FLOW_NAMES[c.flow[0]]}-${FLOW_NAMES[c.flow[1]]}${c.sting ? `, stings ${c.sting}px` : ''}${c.host ? ', clownfish host' : ''}, care ${c.care}/5`, color: C.accent });
  }
  const fx = it.fx;
  if (fx) {
    const bits: string[] = [];
    if (fx.ph) bits.push(`pH ${fx.ph > 0 ? '+' : ''}${fx.ph}`);
    if (fx.gh) bits.push(`hardness ${fx.gh > 0 ? 'up' : 'down'}`);
    if (fx.tannin) bits.push('tannins');
    if (fx.bio) bits.push('extra bio-filtration');
    if (fx.pests) bits.push('may carry hitchhikers');
    if (bits.length) lines.push({ text: bits.join(', '), color: C.warn });
  }
  return lines;
}

function itemCard(app: App, it: ItemDef, x: number, y: number, w: number, size: number, health: number): number {
  const u = app.ui;
  u.panel(x, y, w, 66, 'inset', false);
  u.sprite(itemFrame(it.id, 1, 1, Math.floor(u.time * 2)), x + 4, y + 4, w - 8, 58);
  y += 72;
  u.head(it.name, x, y, C.head, { maxW: w });
  y += M.row;
  if (it.plant || it.coral) {
    u.text(`Size ${Math.round(size * 100)}%   Health ${Math.round(health * 100)}%`, x, y, moodColor(health));
    y += M.row;
  }
  y += u.para(it.blurb, x, y, w, C.text) + 4;
  if (u.button('desel', x, y, 70, M.btnS + 2, 'Close', { style: 'flat' })) app.select = null;
  return y + 26;
}

// ---------------------------------------------------------------- scape

const SCAPE_TABS: { label: string; cats?: ItemCat[]; tip: string }[] = [
  { label: 'Rock', cats: ['rock'], tip: 'Stones' },
  { label: 'Wood', cats: ['wood'], tip: 'Driftwood and roots' },
  { label: 'Plant', cats: ['plant'], tip: 'Plants, mosses and macroalgae' },
  { label: 'Coral', cats: ['coral'], tip: 'Corals, anemones and clams' },
  { label: 'Decor', cats: ['botanical', 'decor', 'land'], tip: 'Botanicals, land and decor' },
  { label: 'Kept', tip: 'Cuttings, frags and stones in storage' },
  { label: 'Sand', tip: 'Substrate and slope' },
];

function scape(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const [tab, used] = tabRows(u, 'stab', x, y, w, SCAPE_TABS.map((q) => q.label), app.panel.scapeTab, 4, SCAPE_TABS.map((q) => q.tip));
  if (tab !== app.panel.scapeTab) {
    app.panel.scapeTab = tab;
    app.placing = null;
    app.tool = null;
  }
  y += used;
  h -= used;
  // the selected item: layer, flip, trim, frag, remove
  const sel = app.select?.kind === 'item' ? t.items.find((p) => p.uid === app.select!.uid) : undefined;
  if (sel) {
    const it = item(sel.id);
    const ch = 74;
    u.panel(x, y, w, ch, 'inset', false);
    u.sprite(itemFrame(sel.id, sel.size, sel.seed, Math.floor(u.time * 2), sel.health), x + 4, y + 4, 44, 44);
    u.text(it.name, x + 54, y + 4, C.strong, { maxW: w - 58 });
    u.text(it.plant || it.coral ? `size ${Math.round(sel.size * 100)}%  health ${Math.round(sel.health * 100)}%` : 'drag it to move', x + 54, y + 19, C.textDim, { maxW: w - 58 });
    let bx = x + 54;
    ['Back', 'Mid', 'Front'].forEach((l, i) => {
      if (u.button(`lay${i}`, bx, y + 35, 44, M.btnS, l, { active: sel.layer === i, style: 'flat' })) app.run(act.moveItem(g, t, sel.uid, sel.x, i as 0 | 1 | 2));
      bx += 46;
    });
    if (u.button('flip', bx, y + 35, w - (bx - x) - 4, M.btnS, 'Flip', { style: 'flat' })) sel.flip = !sel.flip;
    let by = x + 4;
    if (it.plant && u.button('trim', by, y + 54, 56, M.btnS, 'Trim', { tip: 'Cut it back; cuttings go to storage' })) app.run(act.trimPlant(g, t, sel.uid));
    if (it.plant) by += 60;
    if (it.coral && u.button('frag', by, y + 54, 56, M.btnS, 'Frag', { tip: 'Cut a frag to grow on (needs Coral Fragging)' })) app.run(act.fragCoral(g, t, sel.uid));
    if (u.button('remove', x + w - 78, y + 54, 74, M.btnS, 'Remove', { style: 'bad', tip: it.cat === 'plant' || it.cat === 'coral' ? 'Rehome it for a little money' : 'Back into storage' })) {
      app.run(act.removeItem(g, t, sel.uid));
      app.select = null;
    }
    y += ch + 6;
    h -= ch + 6;
  }
  if (app.placing) {
    const ph = 44;
    u.rr(x, y, w, ph, 3, C.pick, 0.45);
    u.text(`Placing ${item(app.placing.id).name}`, x + 6, y + 3, C.strong, { maxW: w - 12 });
    let bx = x + 6;
    ['Back', 'Mid', 'Front'].forEach((l, i) => {
      if (u.button(`play${i}`, bx, y + 21, 48, M.btnS + 2, l, { active: app.layer === i, style: 'flat', tip: `Depth layer (${'QWE'[i]})` })) app.layer = i as 0 | 1 | 2;
      bx += 51;
    });
    if (u.button('pcancel', x + w - 62, y + 21, 56, M.btnS + 2, 'Done', { tip: 'Stop placing (right click / Esc)' })) app.placing = null;
    y += ph + 6;
    h -= ph + 6;
  }
  const cur = SCAPE_TABS[app.panel.scapeTab];
  if (cur.label === 'Sand') return ground(app, t, x, y, w, h);
  if (cur.label === 'Kept') {
    const on = u.toggle('sellcut', x, y, 'Sell cuttings and frags to customers', !!s.settings.sellCuttings);
    if (on !== !!s.settings.sellCuttings) s.settings.sellCuttings = on;
    y += M.row + 4;
    h -= M.row + 4;
  }
  let list: { it: ItemDef; n?: number }[];
  if (cur.label === 'Kept') list = Object.entries(s.inventory).filter(([id, n]) => n > 0 && item(id)).map(([id, n]) => ({ it: item(id), n }));
  else list = itemsForSale(s, t.water).filter((it) => cur.cats!.includes(it.cat)).map((it) => ({ it }));
  column(u, `scape${app.panel.scapeTab}`, x, y, w, h, (x, y, w) => {
    if (!list.length) y += u.para(cur.label === 'Kept' ? 'Nothing in storage. Trimmed cuttings, coral frags and expedition finds land here.' : 'Nothing of this kind for this water yet.', x, y, w, C.textDim);
    for (const { it, n } of list) {
      const why = act.canPlace(t, it.id);
      const active = app.placing?.id === it.id;
      const rh = M.item + 6;
      if (u.row(x - 3, y - 2, w + 6, rh, active, [...itemTip(it), ...(why ? [{ text: why, color: C.bad }] : [])])) {
        if (why) app.toast(why, 'bad');
        else {
          app.placing = { id: it.id, fromInventory: n !== undefined };
          app.select = null;
          app.layer = it.cat === 'plant' && it.plant!.kind === 'carpet' ? 2 : it.cat === 'rock' || it.cat === 'wood' ? 1 : app.layer;
        }
      }
      u.sprite(itemFrame(it.id, 1, 1, 0), x, y, 32, 28);
      u.text(it.name, x + 38, y, why ? C.textMute : C.strong, { maxW: w - 96 });
      const sub = it.plant ? `${['', 'low', 'medium', 'high'][it.plant.light]} light${it.plant.co2 === 2 ? ', CO2' : ''}` : it.coral ? `${it.coral.type}, PAR ${it.coral.par[0]}+` : it.fx?.tannin ? 'tannins' : it.fx?.gh ? 'hardens water' : it.cat;
      u.text(sub, x + 38, y + M.line, C.textDim, { maxW: w - 96 });
      u.text(n !== undefined ? `x${n}` : `${ICON.coin} ${it.price}`, x + w, y, n !== undefined ? C.text : C.gold, { align: 'right' });
      y += rh;
    }
    return y;
  });
}

function ground(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const cur = substrate(t.substrate);
  u.text(`Now: ${cur.name}`, x, y, C.strong, { maxW: w });
  y += M.row + 2;
  const d = u.stepper('slope', x, y, `Slope ${Math.round(t.slope * 100)}%`, 130);
  if (d) act.setSlope(g, t, t.slope + d * 0.1);
  if (u.button('sculpt', x + 138, y, w - 138, M.btnS, app.tool === 'sculpt' ? 'Sculpting' : 'Sculpt', { active: app.tool === 'sculpt', tip: 'Drag in the tank to pile the substrate up or rake it down' })) app.tool = app.tool === 'sculpt' ? null : 'sculpt';
  y += M.btnS + 8;
  column(u, 'ground', x, y, w, h - (M.row + M.btnS + 10), (x, y, w) => {
    for (const sub of substratesForSale(s, t.water)) {
      const cost = Math.round(sub.price * (litersOf(t) / 60));
      const tip: TipLine[] = [{ text: sub.name }, { text: sub.blurb, color: C.textDim }];
      if (sub.fx.ph) tip.push({ text: `pH ${sub.fx.ph > 0 ? '+' : ''}${sub.fx.ph}${sub.rich ? `, nutrients ${sub.rich}/3` : ''}`, color: C.accent });
      if (u.row(x - 3, y - 1, w + 6, M.row + 2, sub.id === t.substrate, tip) && sub.id !== t.substrate) app.run(act.setSubstrate(g, t, sub.id));
      u.text(sub.name, x, y + 1, C.strong, { maxW: w - 60 });
      u.text(`${ICON.coin} ${cost}`, x + w, y + 1, C.gold, { align: 'right' });
      y += M.row + 2;
    }
    return y;
  });
}

// ---------------------------------------------------------------- stock

const predictions = new Map<string, { mood: number; reasons: string[]; hurts: string[] }>();
let predictionKey = '';

/** What would happen if n of this species went in: the real mood model, run on a copy. */
function predict(app: App, t: Tank, sp: string, n: number) {
  const key = `${t.id}|${t.animals.length}|${t.items.length}|${t.equip.join()}|${t.substrate}|${Math.round(t.chem.temp)}|${Math.round(t.chem.ph * 5)}|${Math.round(t.chem.gh)}`;
  if (key !== predictionKey) {
    predictions.clear();
    predictionKey = key;
  }
  const k = `${sp}|${n}`;
  let p = predictions.get(k);
  if (!p) {
    const clone: Tank = {
      ...t,
      animals: [...t.animals, ...Array.from({ length: n }, (_, i) => ({ uid: -1 - i, sp, age: 30, health: 1, mood: 1, fry: false, bornHere: false, grade: 2 }))],
    };
    const hour = hourOf(app.state.time);
    const ctx = { fedRecently: true, gentle: app.state.settings.gentle };
    const before = app.game!.stats.get(t.id)?.moods;
    const moods = speciesMoods(clone, facts(clone, hour), ctx);
    const mine = moods.get(sp);
    const hurts: string[] = [];
    for (const [id, m] of moods) {
      if (id === sp) continue;
      const was = before?.get(id)?.mood ?? 1;
      if (was - m.mood > 0.08) hurts.push(`${species(id).name} would be unhappier`);
    }
    p = { mood: mine?.mood ?? 0, reasons: (mine?.reasons ?? []).filter((r) => !r.good).map((r) => r.text), hurts };
    predictions.set(k, p);
  }
  return p;
}

function stock(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const [tab, used] = tabRows(u, 'stocktab', x, y, w, ['Order', 'In tank', `Holding ${s.holding.length}`], app.panel.stockTab, 3);
  app.panel.stockTab = tab;
  y += used;
  h -= used;
  if (app.panel.stockTab === 0) {
    const list = speciesForSale(s, t.water).sort((a, b) => a.tier - b.tier || a.price - b.price);
    const buyH = app.panel.buySp ? 84 : 0;
    u.mark('stocklist', x, y, w, Math.min(h - buyH, 90));
    column(u, 'stock', x, y, w, h - buyH, (x, y, w) => {
      for (const sp of list) {
        const p = predict(app, t, sp.id, Math.max(1, sp.school));
        const tip: TipLine[] = [{ text: `${sp.name} (${sp.sci})` }, { text: sp.fact, color: C.textDim }, { text: `${sp.cm} cm, ${sp.temper}, needs ${sp.minL} L+${sp.school > 1 ? `, groups of ${sp.school}+` : ''}`, color: C.accent }, { text: `Predicted mood here: ${Math.round(p.mood * 100)}%`, color: moodColor(p.mood) }, ...p.reasons.slice(0, 3).map((r) => ({ text: `- ${r}`, color: C.warn })), ...p.hurts.slice(0, 2).map((r) => ({ text: `! ${r}`, color: C.bad }))];
        const rh = M.item + 6;
        if (u.row(x - 3, y - 2, w + 6, rh, app.panel.buySp === sp.id, tip)) {
          app.panel.buySp = sp.id;
          app.panel.buyN = Math.max(1, Math.min(sp.max ?? 99, sp.school));
        }
        u.sprite(creatureFrame(sp.id, 0), x, y, 34, 28);
        u.text(sp.name, x + 40, y, C.strong, { maxW: w - 100 });
        u.text(sp.kind === 'fish' ? sp.temper : sp.kind, x + 40, y + M.line, C.textDim, { maxW: w - 100 });
        u.text(`${ICON.coin} ${sp.price}`, x + w, y, C.gold, { align: 'right' });
        const mark = p.hurts.length || p.mood < 0.45 ? 'no' : p.mood < 0.75 ? 'maybe' : 'good fit';
        u.text(mark, x + w, y + M.line, mark === 'good fit' ? C.good : mark === 'maybe' ? C.warn : C.bad, { align: 'right' });
        y += rh;
      }
      return y;
    });
    if (app.panel.buySp) {
      const sp = species(app.panel.buySp);
      const by = y + h - buyH + 4;
      u.panel(x - 2, by, w + 4, buyH - 4, 'chip', false);
      u.text(sp.name, x + 6, by + 5, C.strong, { maxW: w - 34 });
      if (u.button('ordx', x + w - 18, by + 4, M.btnS, M.btnS, 'x', { style: 'flat' })) app.panel.buySp = '';
      const d = u.stepper('qty', x + 6, by + 25, `x${app.panel.buyN}`, 90);
      if (d) app.panel.buyN = Math.max(1, Math.min(sp.max ?? 50, app.panel.buyN + d));
      const cost = sp.price * app.panel.buyN;
      u.text(`${ICON.coin} ${cost}`, x + 106, by + 26, s.coins >= cost ? C.gold : C.bad);
      if (u.button('order', x + 6, by + 48, w - 12, M.btn + 2, 'Order (arrives in a bag)', { style: 'good', disabled: s.coins < cost })) {
        const msg = act.buyAnimals(g, t, sp.id, app.panel.buyN);
        if (msg) app.toast(msg, 'bad');
        else app.toast(`${app.panel.buyN} ${sp.name} on the way: they float for half an hour to acclimate.`, 'info');
      }
    }
  } else if (app.panel.stockTab === 1) {
    const st = g.stats.get(t.id);
    column(u, 'intank', x, y, w, h, (x, y, w) => {
      if (!t.animals.length) y += u.para('Nobody lives here yet.', x, y, w, C.textDim);
      for (const [sp, m] of st?.moods ?? []) {
        const s0 = species(sp);
        u.sprite(creatureFrame(sp, 0), x, y, 34, 28);
        u.text(s0.name, x + 40, y, C.strong, { maxW: w - 110 });
        u.text(`x${m.count}  mood ${Math.round(m.mood * 100)}%`, x + 40, y + M.line, moodColor(m.mood));
        if (u.button(`net${sp}`, x + w - 86, y + 5, 48, M.btnS + 2, 'Net 1', { style: 'flat', tip: 'Move one to the holding tank' })) {
          const a = t.animals.find((q) => q.sp === sp && !q.fry) ?? t.animals.find((q) => q.sp === sp);
          if (a) app.run(act.moveToHolding(g, t, [a.uid]));
        }
        if (u.button(`netall${sp}`, x + w - 34, y + 5, 34, M.btnS + 2, 'All', { style: 'flat', tip: 'Net every one of them (fry too) into holding' })) {
          app.run(act.moveToHolding(g, t, t.animals.filter((q) => q.sp === sp).map((q) => q.uid)));
        }
        y += M.item + 6;
      }
      return y;
    });
  } else {
    column(u, 'holding', x, y, w, h, (x, y, w) => {
      if (!s.holding.length) y += u.para('The holding tank is empty. Expedition finds and netted fish wait here.', x, y, w, C.textDim);
      const groups = new Map<string, number[]>();
      for (const a of s.holding) groups.set(a.sp, [...(groups.get(a.sp) ?? []), a.uid]);
      for (const [sp, uids] of groups) {
        const s0 = species(sp);
        u.sprite(creatureFrame(sp, 0), x, y, 34, 28);
        u.text(s0.name, x + 40, y, C.strong, { maxW: w - 160 });
        u.text(`x${uids.length}`, x + 40, y + M.line, C.textDim);
        const no = act.cannotHouse(t, sp);
        if (u.button(`hadd${sp}`, x + w - 150, y + 5, 40, M.btnS + 2, 'Add', { style: 'good', disabled: !!no, tip: no || 'Float one into this tank' })) app.run(act.placeFromHolding(g, t, [uids[0]]));
        if (u.button(`haddall${sp}`, x + w - 106, y + 5, 38, M.btnS + 2, 'All', { style: 'good', disabled: !!no, tip: no || 'Float them all into this tank' })) app.run(act.placeFromHolding(g, t, uids));
        if (u.button(`hsell${sp}`, x + w - 64, y + 5, 64, M.btnS + 2, 'Rehome', { style: 'flat', tip: 'Give them all to local hobbyists for a little money' })) app.run(act.sellHolding(g, uids));
        y += M.item + 6;
      }
      return y;
    });
  }
}

// ---------------------------------------------------------------- gear

const GEAR_TABS: { label: string; slots: Slot[] }[] = [
  { label: 'Filter', slots: ['filter', 'media'] },
  { label: 'Heat', slots: ['heater', 'chiller'] },
  { label: 'Light', slots: ['light', 'moon'] },
  { label: 'Air', slots: ['co2', 'air', 'flow'] },
  { label: 'Reef', slots: ['skimmer', 'refugium', 'uv', 'doser', 'ato'] },
  { label: 'Other', slots: ['lid', 'feeder', 'ro', 'mister'] },
];

function equipStat(e: EquipDef): string {
  if (e.slot === 'filter') return `bio ${e.bio ?? 0} L, ${e.lph ?? 0} L/h`;
  if (e.slot === 'heater' || e.slot === 'chiller') return `${e.watts} W`;
  if (e.slot === 'light') return `PAR ${e.par}${e.tint ? `, ${e.tint}` : ''}`;
  if (e.slot === 'flow') return `${e.lph} L/h`;
  if (e.slot === 'co2') return `+${e.co2} ppm`;
  return e.slot;
}

function gear(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const bottom = y + h;
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const st = g.stats.get(t.id);
  const f = st?.facts;
  // installed
  u.text('Installed', x, y, C.head);
  if (f) u.text(`bioload ${Math.round(f.bioload)}/${Math.round(f.bioCap)}, ${FLOW_NAMES[f.flow]}`, x + w, y, f.bioload > f.bioCap ? C.bad : C.textDim, { align: 'right' });
  y += M.row;
  for (const id of t.equip) {
    const e = equip(id);
    u.text(e.name, x + 4, y, C.strong, { maxW: w - 30 });
    if (u.button(`rm${id}`, x + w - M.btnS, y - 1, M.btnS, M.btnS, 'x', { style: 'flat', tip: `Remove (refund ${Math.round(e.price * 0.5)})` })) app.run(act.removeEquip(g, t, id));
    y += M.row;
  }
  if (!t.equip.length) {
    u.text('Nothing: the water is still.', x + 4, y, C.bad);
    y += M.row;
  }
  y += 4;
  // settings
  const hasHeat = t.equip.some((e) => equip(e).slot === 'heater' || equip(e).slot === 'chiller');
  if (hasHeat) {
    const d = u.stepper('heat', x, y, `${t.set.heater}C`, 80);
    if (d) act.setHeater(g, t, t.set.heater + d);
    u.text('thermostat', x + 88, y + 1, C.textDim);
    y += M.btnS + 4;
  }
  const half = Math.floor((w - 6) / 2);
  const dOn = u.stepper('lon', x, y, `on ${t.set.lightOn}:00`, half);
  const dOff = u.stepper('loff', x + half + 6, y, `off ${t.set.lightOff}:00`, half);
  if (dOn || dOff) act.setLights(g, t, t.set.lightOn + dOn, t.set.lightOff + dOff);
  y += M.btnS + 4;
  if (t.equip.some((e) => equip(e).slot === 'co2')) {
    const on = u.toggle('co2', x, y + 1, 'CO2 on with the lights', t.set.co2);
    if (on !== t.set.co2) act.toggleCo2(g, t);
    y += M.row;
  }
  y += 4;
  const [tab, used] = tabRows(u, 'geartab', x, y, w, GEAR_TABS.map((gt) => gt.label), app.panel.gearTab, 3);
  app.panel.gearTab = tab;
  y += used;
  const slots = GEAR_TABS[app.panel.gearTab].slots;
  const list = equipForSale(s, t.water).filter((e) => slots.includes(e.slot));
  u.mark('gearlist', x, y, w, Math.min(bottom - y, 90));
  column(u, `gear${app.panel.gearTab}`, x, y, w, bottom - y, (x, y, w) => {
    for (const e of list) {
      const has = t.equip.includes(e.id);
      const rh = M.line * 2 + 4;
      if (u.row(x - 3, y - 2, w + 6, rh, has, [{ text: e.name }, { text: e.blurb, color: C.textDim }, { text: equipStat(e), color: C.accent }, ...(e.needsShell ? [{ text: `Needs a ${e.needsShell} tank`, color: C.warn }] : []), ...(has ? [{ text: 'Installed. Remove it with the x in the list above.', color: C.good }] : [])]) && !has) app.run(act.buyEquip(g, t, e.id));
      u.text(e.name, x, y, C.strong, { maxW: w - 60 });
      u.text(equipStat(e), x, y + M.line, C.textDim, { maxW: w - 60 });
      u.text(has ? 'installed' : `${ICON.coin} ${e.price}`, x + w, y, has ? C.good : C.gold, { align: 'right' });
      y += rh;
    }
    return y;
  });
}

// ---------------------------------------------------------------- water

/** a test strip reads in steps; liquid kits read exactly */
function strip(v: number, steps: number[]): string {
  let best = steps[0];
  for (const s of steps) if (Math.abs(s - v) < Math.abs(best - v)) best = s;
  return `~${best}`;
}

function water(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const ch = t.chem;
  const kits = (s.upgrades['test_kits'] ?? 0) > 0;
  const st = g.stats.get(t.id);
  // the ranges the current residents like (intersection), to color readings
  const sps = [...(st?.facts.bySpecies.keys() ?? [])].map((id) => species(id));
  const range = (get: (sp: SpeciesDef) => readonly [number, number] | undefined): [number, number] | null => {
    let lo = -Infinity, hi = Infinity, any = false;
    for (const sp of sps) {
      const r = get(sp);
      if (!r) continue;
      any = true;
      lo = Math.max(lo, r[0]);
      hi = Math.min(hi, r[1]);
    }
    return any ? [lo, hi] : null;
  };
  column(u, 'water', x, y, w, h, (x, y, w) => {
    const rows: [string, string, number, string][] = [];
    const inR = (v: number, r: [number, number] | null) => (!r ? C.strong : v >= r[0] && v <= r[1] ? C.good : C.warn);
    const tr = range((sp) => sp.temp), pr = range((sp) => sp.ph), gr = range((sp) => sp.gh), sr = range((sp) => sp.sg);
    rows.push([`${ICON.temp} Temperature`, `${ch.temp.toFixed(1)}C`, inR(ch.temp, tr), tr ? `Residents like ${tr[0]}-${tr[1]}C` : 'Most tropical fish like 24-27C']);
    rows.push(['pH', kits ? ch.ph.toFixed(2) : strip(ch.ph, [5.5, 6, 6.5, 7, 7.5, 8, 8.5]), inR(ch.ph, pr), pr ? `Residents like pH ${pr[0]}-${pr[1]}` : 'Acidity: soft water, wood and leaves lower it; limestone raises it']);
    if (t.water !== 'marine') rows.push(['GH / KH', kits ? `${ch.gh.toFixed(1)} / ${ch.kh.toFixed(1)}` : `${strip(ch.gh, [0, 3, 6, 10, 14, 20])} / ${strip(ch.kh, [0, 3, 6, 10, 15])}`, inR(ch.gh, gr), 'General and carbonate hardness (degrees). KH buffers pH.']);
    if (t.water !== 'fresh') rows.push(['Salinity', `SG ${ch.sg.toFixed(3)}`, inR(ch.sg, sr), `Target ${t.set.salt.toFixed(3)}. Evaporation leaves salt behind: top off with fresh water.`]);
    const toxic = (v: number, warn: number, bad: number) => (v >= bad ? C.bad : v >= warn ? C.warn : C.good);
    rows.push(['Ammonia', kits ? ch.nh3.toFixed(2) : strip(ch.nh3, [0, 0.25, 0.5, 1, 2, 4]), toxic(ch.nh3, 0.1, 0.5), 'NH3/NH4 from waste and food. Toxic. Eaten by the first bacteria.']);
    rows.push(['Nitrite', kits ? ch.no2.toFixed(2) : strip(ch.no2, [0, 0.25, 0.5, 1, 2, 5]), toxic(ch.no2, 0.1, 0.5), 'NO2: the middle of the cycle. Toxic. Eaten by the second bacteria.']);
    rows.push(['Nitrate', kits ? ch.no3.toFixed(0) : strip(ch.no3, [0, 10, 20, 40, 80, 160]), toxic(ch.no3, 30, 60), 'NO3: the end of the cycle. Mild; plants use it, water changes remove it.']);
    rows.push(['Oxygen', `${ch.o2.toFixed(1)} mg/L`, ch.o2 >= 6 ? C.good : ch.o2 >= 4 ? C.warn : C.bad, 'Warm water holds less. Surface movement and air pumps add it.']);
    if (ch.tannin > 0.02) rows.push(['Tannins', `${Math.round(ch.tannin * 100)}%`, C.strong, 'Tea-colored humic acids from wood, leaves and peat.']);
    for (const [label, val, col, tip] of rows) {
      u.row(x - 3, y - 1, w + 6, M.row, false, tip);
      u.text(label, x, y, C.text);
      u.text(val, x + w, y, col, { align: 'right' });
      y += M.row;
    }
    if (!kits) {
      u.text('Strip readings (Upgrades: test kits)', x, y + 1, C.textMute, { maxW: w });
      y += M.row;
    }
    y += 4;
    const cyc = cycleProgress(ch);
    u.mark('cycle', x - 2, y - 2, w + 4, M.row + 2);
    u.text('Nitrogen cycle', x, y, C.text);
    u.bar(x + 112, y + 3, w - 150, 10, cyc, cyc > 0.9 ? C.good : C.warn);
    u.text(`${Math.round(cyc * 100)}%`, x + w, y, C.strong, { align: 'right' });
    if (u.hover(x, y, w, M.row)) u.tip([{ text: 'The nitrogen cycle' }, { text: 'Bacteria in the filter turn toxic ammonia into nitrite, then into much safer nitrate. A new tank needs about three weeks to grow them: dose ammonia with no fish (a fishless cycle), or seed it with media from a mature filter.', color: C.textDim }], 260);
    y += M.row + 6;
    // water changes
    u.divider(x, y, w);
    y += 6;
    u.head('Water change', x, y);
    y += M.row + 2;
    const third = Math.floor((w - 8) / 3);
    let bx = x;
    for (const frac of [0.1, 0.25, 0.5]) {
      const cost = Math.round(litersOf(t) * frac * (0.01 + (t.water === 'fresh' ? 0 : 0.03)));
      if (u.button(`wc${frac}`, bx, y, third, M.btn, `${frac * 100}% ${ICON.coin}${cost}`, { tip: 'Swap old water for new: lowers nitrate and pulls the chemistry toward the source water' })) app.run(act.doWaterChange(g, t, frac));
      bx += third + 4;
    }
    y += M.btn + 8;
    // source and salt
    u.head('Source water', x, y);
    y += M.row + 2;
    const srcs = (Object.keys(SOURCES) as WaterSource[]).filter((k) => SOURCES[k].water === t.water);
    bx = x;
    for (const k of srcs) {
      const bw = Math.floor((w - (srcs.length - 1) * 3) / srcs.length);
      if (u.button(`src${k}`, bx, y, bw, M.btnS + 2, SOURCES[k].name.replace(' water', ''), { active: t.set.source === k, style: 'flat', tip: [{ text: SOURCES[k].name }, { text: SOURCES[k].blurb, color: C.textDim }, ...(SOURCES[k].needs ? [{ text: `Needs: ${equip(SOURCES[k].needs!).name}`, color: C.warn }] : [])] })) app.run(act.setSource(g, t, k));
      bx += bw + 3;
    }
    y += M.btnS + 10;
    if (t.water !== 'fresh') {
      const d = u.stepper('salt', x, y, `SG ${t.set.salt.toFixed(3)}`, 120);
      if (d) act.setSalt(g, t, t.set.salt + d * 0.001);
      if (u.button('topoff', x + 128, y, w - 128, M.btnS, 'Top off', { tip: 'Replace evaporated water with fresh' })) act.topOff(g, t);
      y += M.btnS + 8;
    }
    u.head('Cycling', x, y);
    y += M.row + 2;
    const hw = Math.floor((w - 4) / 2);
    const donor = act.seedSource(g, t);
    if (cyc < 0.7) {
      if (u.button('seed', x, y, w, M.btn, donor ? `Seed from ${donor.name}` : 'Seed from a mature filter', { style: 'good', disabled: !donor, tip: donor ? 'Move a sponge of bacteria-rich media from a mature filter: free, and nearly instant' : 'Needs another tank of the same water with a filter that is fully cycled' })) app.run(act.seedFilter(g, t));
      y += M.btn + 4;
    }
    if (u.button('bact', x, y, hw, M.btn, `Bacteria ${ICON.coin}15`, { tip: 'Bottled nitrifying bacteria: jump-start the cycle' })) app.run(act.dose(g, t, 'bacteria'));
    if (u.button('amm', x + hw + 4, y, hw, M.btn, `Ammonia ${ICON.coin}3`, { tip: 'Feed the bacteria in an empty tank: a fishless cycle' })) app.run(act.dose(g, t, 'ammonia'));
    y += M.btn + 6;
    return y;
  });
}

// ---------------------------------------------------------------- care

function care(app: App, t: Tank, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const g = app.game!;
  const s = app.state;
  const st = g.stats.get(t.id);
  column(u, 'care', x, y, w, h, (x, y, w) => {
    const since = (s.time - t.fedAt) / 60;
    const auto = (s.upgrades['auto_feeders'] ?? 0) > 0 || t.equip.includes('auto_feeder');
    if (u.button('feed', x, y, w, M.btn + 4, `${ICON.fish} Feed (F)`, { style: 'good', tip: 'Once or twice a day is plenty: leftovers rot into ammonia' })) app.run(act.feed(g, t));
    y += M.btn + 10;
    u.text(auto ? 'Fed automatically at 8:00' : `Last fed ${since < 1 ? 'just now' : `${Math.floor(since)} h ago`}`, x, y, since > 24 && !auto ? C.warn : C.textDim);
    y += M.row + 4;
    u.divider(x, y, w);
    y += 6;
    u.head('Glass', x, y);
    y += M.row + 2;
    u.text(`Algae film ${Math.round(t.chem.glass * 100)}%`, x, y, t.chem.glass > 0.3 ? C.warn : C.text);
    u.text(`Nose prints ${Math.round(t.smudge * 100)}%`, x + w, y, t.smudge > 0.4 ? C.warn : C.text, { align: 'right' });
    y += M.row + 2;
    const hw = Math.floor((w - 4) / 2);
    if (u.button('scrape', x, y, hw, M.btn, 'Scraper', { active: app.tool === 'scrape', tip: 'Drag across the glass to scrape off algae' })) app.tool = app.tool === 'scrape' ? null : 'scrape';
    if (u.button('wipe', x + hw + 4, y, hw, M.btn, 'Cloth', { active: app.tool === 'wipe', tip: 'Drag to wipe off visitor fingerprints and nose prints' })) app.tool = app.tool === 'wipe' ? null : 'wipe';
    y += M.btn + 8;
    // plants
    const over = t.items.filter((p) => item(p.id).plant && p.size >= 1.2);
    if (over.length) {
      u.text(`${over.length} plant${over.length > 1 ? 's' : ''} overgrown`, x, y + 2, C.warn);
      if (u.button('trimall', x + w - 80, y, 80, M.btnS + 2, 'Trim all', { tip: 'Cut back every overgrown plant; cuttings go to storage' })) for (const p of over) app.run(act.trimPlant(g, t, p.uid));
      y += M.row + 6;
    }
    // pests
    u.divider(x, y, w);
    y += 6;
    u.head('Pests', x, y);
    y += M.row + 2;
    const p = t.pests;
    if (p.snails < 1 && p.aiptasia < 1 && p.bubble < 1) {
      u.text(p.had ? 'All clear!' : 'None seen.', x, y, C.good);
      y += M.row;
    }
    if (p.snails >= 1) {
      y += u.para(`${Math.ceil(p.snails)} pest snails (bladder and ramshorn) breeding on leftovers. Assassin snails hunt them; feeding less helps.`, x, y, w, C.text) + 4;
      if (u.button('assassins', x, y, w, M.btn, 'Order assassin snails', { tip: 'Clea helena: eats pest snails, leaves fish and shrimp alone' })) {
        app.mode = 'stock';
        app.panel.stockTab = 0;
        app.panel.buySp = 'assassin_snail';
        app.panel.buyN = 3;
      }
      y += M.btn + 6;
    }
    if (p.aiptasia >= 1) y += u.para(`${Math.ceil(p.aiptasia)} Aiptasia anemones spreading over the rock. Peppermint shrimp and filefish eat them.`, x, y, w, C.text) + 6;
    if (p.bubble >= 1) y += u.para('Bubble algae on the rock. Emerald crabs graze it.', x, y, w, C.text) + 6;
    // unhappy residents
    const sad = [...(st?.moods.values() ?? [])].filter((m) => m.mood < 0.6);
    if (sad.length) {
      u.divider(x, y, w);
      y += 6;
      u.head('Needs attention', x, y);
      y += M.row + 2;
      for (const m of sad) {
        const r = m.reasons.find((q) => !q.good);
        y += u.para(`${species(m.sp).name}: ${r ? r.text : 'unsettled'}`, x, y, w, moodColor(m.mood)) + 3;
      }
    }
    return y;
  });
}

