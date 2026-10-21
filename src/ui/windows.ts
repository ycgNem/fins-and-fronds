// Windows over the tank: the codex, letters, expeditions, upgrades, the guestbook, the menu and
// the new-tank order. Correspondents and the captain are never drawn; their letters are.
// A window is a sea-glass card with a teal title ribbon; letters and postcards are paper.
import type { App, WindowId } from '../app/app';
import { ARCHETYPES, correspondent, item, REGIONS, request, species, SPECIES, SYMBIOSES, TIERS, UPGRADES } from '../data';
import { RAMP, setCalmColors, UI as C } from '../data/palette';
import type { Family, RegionId, RequestCheck, UpgradeTrack, Water } from '../data/types';
import { creatureFrame, itemFrame } from '../render/art/sprites';
import * as act from '../sim/actions';
import { canExpedition, expeditionHours, expeditionSlots } from '../sim/expeditions';
import { shellPrice, shellsForSale, watersAvailable } from '../sim/catalog';
import { BAL } from '../sim/balance';
import { deserialize, serialize } from '../sim/save';
import { clockText, dayOf } from '../sim/state';
import { drawIcon, drawPicture, hasArt } from '../render/icons';
import { TOOLBAR_H, TOP_H, WIN_ICON } from './hud';
import { ICON, M, type UI } from './ui';

const heights = new Map<string, number>();

function column(u: UI, id: string, x: number, y: number, w: number, h: number, draw: (x: number, y: number, w: number) => number) {
  const off = u.scrollArea(id, x, y, w, h, heights.get(id) ?? h);
  u.clip(x, y, w, h);
  const end = draw(x, y - off, w - 8);
  u.unclip();
  heights.set(id, end + off - y + 6);
}

const TITLES: Record<WindowId, string> = {
  codex: 'Codex', letters: 'Letters', trips: 'Expeditions', upgrades: 'Upgrades', guestbook: 'Guestbook', menu: 'Menu', newtank: 'A new tank',
};

const RIBBON = 30;

export function drawWindow(app: App) {
  const u = app.ui;
  const id = app.window!;
  const w = Math.min(app.W - 32, id === 'menu' ? 600 : 780), h = Math.min(app.H - TOP_H - TOOLBAR_H - 8, id === 'menu' ? 400 : 500);
  const x = Math.floor((app.W - w) / 2), y = TOP_H + Math.floor((app.H - TOP_H - TOOLBAR_H - h) / 2);
  u.modal();
  u.fill(0, 0, app.W, app.H - TOOLBAR_H, 0, 0.3);
  u.block(0, 0, app.W, app.H);
  u.panel(x, y, w, h, 'window');
  u.rr(x + 4, y + 4, w - 8, RIBBON - 4, 3, C.head);
  u.fill(x + 7, y + 5, w - 14, 1, 40);
  const titled = drawIcon(u.ctx, `ui:${WIN_ICON[id]}`, x + 10, y + 7, 16);
  u.head(id === 'newtank' && app.newTankBay >= BAL.rackBay ? 'A stock tank' : TITLES[id], x + (titled ? 32 : 14), y + 8, 9);
  if (u.button('wclose', x + w - 30, y + 7, 22, 20, 'x', { style: 'flat', tip: 'Close (Esc)' })) app.window = null;
  const ix = x + 14, iy = y + RIBBON + 10, iw = w - 28, ih = h - RIBBON - 20;
  switch (id) {
    case 'codex': codex(app, ix, iy, iw, ih); break;
    case 'letters': letters(app, ix, iy, iw, ih); break;
    case 'trips': trips(app, ix, iy, iw, ih); break;
    case 'upgrades': upgrades(app, ix, iy, iw, ih); break;
    case 'guestbook': guestbook(app, ix, iy, iw, ih); break;
    case 'menu': menu(app, ix, iy, iw, ih); break;
    case 'newtank': newTank(app, ix, iy, iw, ih); break;
  }
}

// ---------------------------------------------------------------- codex

const FAMILIES: Family[] = ['Community', 'Planted & Aquascape', 'Freshwater Biotope', 'Specialist', 'Coldwater', 'Brackish', 'Semi-aquatic', 'Marine', 'Reef', 'Public Exhibit'];

function codex(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const found = s.codex;
  app.panel.codexTab = u.tabs('codextab', x, y, [`Tank types ${found.archetypes.length}/${ARCHETYPES.length}`, `Species ${found.species.length}/${SPECIES.length}`, `Partners ${found.symbioses.length}/${SYMBIOSES.length}`], app.panel.codexTab);
  y += 26;
  h -= 26;
  const lw = Math.floor(w * 0.42);
  u.panel(x, y, lw, h, 'inset', false);
  const dx = x + lw + 14, dw = w - lw - 14;
  if (app.panel.codexTab === 0) {
    column(u, 'cx-arch', x + 6, y + 6, lw - 8, h - 12, (x, y, w) => {
      for (const fam of FAMILIES) {
        const list = ARCHETYPES.filter((a) => a.family === fam);
        if (!list.length) continue;
        u.head(fam, x, y, C.head, { maxW: w });
        y += M.row + 2;
        for (const a of list) {
          const got = found.archetypes.includes(a.id);
          if (u.row(x - 3, y - 1, w + 6, M.row, app.panel.codexSel === a.id)) app.panel.codexSel = a.id;
          if (got) u.text(ICON.star, x, y, C.coin);
          u.text(a.name, x + 16, y, got ? C.strong : a.tier > s.tier ? C.textMute : C.textDim, { maxW: w - 18 });
          y += M.row;
        }
        y += 6;
      }
      return y;
    });
    const a = ARCHETYPES.find((q) => q.id === app.panel.codexSel) ?? ARCHETYPES.find((q) => found.archetypes.includes(q.id)) ?? ARCHETYPES[0];
    const got = found.archetypes.includes(a.id);
    column(u, 'cx-archd', dx, y, dw, h, (x, y, w) => {
      if (hasArt(`pl:${a.id}`)) {
        // the plate: in color once recognized, faded until then
        u.panel(x, y, w, 136, 'inset', false);
        drawPicture(u.ctx, `pl:${a.id}`, x + 4, y + 4, w - 8, 128, got ? 1 : 0.35);
        if (!got) u.text('Not yet recognized', x + w / 2, y + 116, C.textDim, { align: 'center' });
        y += 144;
      }
      u.head(a.name, x, y, C.head, { maxW: w });
      y += M.row + 2;
      u.text(`${a.family}${got ? ', recognized!' : a.tier > s.tier ? `, from ${TIERS[a.tier].name}` : ''}`, x, y, got ? C.good : C.textDim, { maxW: w });
      y += M.row + 4;
      y += u.para(a.blurb, x, y, w, C.text) + 8;
      u.head('In the real hobby', x, y);
      y += M.row + 2;
      y += u.para(a.real, x, y, w, C.textDim) + 8;
      u.head('How it is recognized', x, y);
      y += M.row + 2;
      for (const r of a.rules) y += u.para(`${r.hard ? ICON.right : '-'} ${r.hint}`, x, y, w, r.hard ? C.strong : C.textDim) + 2;
      y += 6;
      u.text(`Visitor appeal x${a.appeal.toFixed(2)}`, x, y, C.gold);
      return y + M.row;
    });
  } else if (app.panel.codexTab === 1) {
    const list = SPECIES.filter((sp) => found.species.includes(sp.id));
    column(u, 'cx-sp', x + 6, y + 6, lw - 8, h - 12, (x, y, w) => {
      if (!list.length) y += u.para('Species appear here as they arrive in your tanks.', x, y, w, C.textDim);
      for (const sp of list) {
        if (u.row(x - 3, y - 2, w + 6, M.item, app.panel.codexSel === sp.id)) app.panel.codexSel = sp.id;
        u.sprite(creatureFrame(sp.id, 0), x, y, 32, 22);
        u.text(sp.name, x + 38, y + 4, C.strong, { maxW: w - 40 });
        y += M.item;
      }
      return y;
    });
    const sp = list.find((q) => q.id === app.panel.codexSel) ?? list[0];
    if (sp) {
      column(u, 'cx-spd', dx, y, dw, h, (x, y, w) => {
        u.panel(x, y, w, 90, 'inset', false);
        u.sprite(creatureFrame(sp.id, Math.floor(u.time * 3) % 4), x + 4, y + 4, w - 8, 82);
        y += 98;
        u.head(sp.name, x, y, C.head, { maxW: w });
        y += M.row + 2;
        u.text(sp.sci, x, y, C.textDim, { maxW: w });
        y += M.row + 4;
        y += u.para(sp.fact, x, y, w, C.text) + 8;
        const rows = [
          ['Size', `${sp.cm} cm`], ['Water', `${sp.water}, ${sp.temp[0]}-${sp.temp[1]}C, pH ${sp.ph[0]}-${sp.ph[1]}`], ['Tank', `${sp.minL} L or more`],
          ['Lives', sp.zone], ['Temper', sp.temper], ['Group', sp.school > 1 ? `${sp.school}+` : 'fine alone'], ['Breeds', sp.breed.type === 'none' ? 'not in aquariums' : sp.breed.type],
        ];
        for (const [k, v] of rows) {
          u.text(k, x, y, C.textDim);
          u.text(v, x + 70, y, C.strong, { maxW: w - 70 });
          y += M.row;
        }
        return y;
      });
    }
  } else {
    column(u, 'cx-sym', x + 6, y + 6, w - 12, h - 12, (x, y, w) => {
      for (const sy of SYMBIOSES) {
        const got = found.symbioses.includes(sy.id);
        u.text(got ? ICON.heart : '?', x, y, got ? C.bad : C.textMute);
        u.text(sy.name, x + 16, y, got ? C.strong : C.textMute);
        y += M.row;
        y += u.para(got ? sy.text : 'Not yet seen in your aquarium.', x + 16, y, w - 16, got ? C.textDim : C.textMute) + 8;
      }
      return y;
    });
  }
}

// ---------------------------------------------------------------- letters

function describe(c: RequestCheck): string {
  switch (c.t) {
    case 'rating': return `A tank rated ${c.stars} stars`;
    case 'archetype': return c.id ? `A recognized ${ARCHETYPES.find((a) => a.id === c.id)?.name ?? c.id}` : `A ${c.family} tank`;
    case 'school': return `A school of ${c.size} of one species`;
    case 'tag': return `${c.min} ${c.tag.replace('_', ' ')} animals in one tank`;
    case 'kind': return `${c.min} ${c.kind}`;
    case 'species': return `${c.min} ${species(c.id).name}`;
    case 'plant_species': return `${c.min} kinds of plant in one tank`;
    case 'no_fish': return 'A fishless planted tank, 2 stars';
    case 'big_fish': return `A fish at least ${c.cm} cm long`;
    case 'region_tank': return `A biotope from ${c.continent}`;
    case 'fry': return 'Babies born in your care';
    case 'water': return `A ${c.is} tank rated ${c.stars} stars`;
    case 'corals': return `${c.min} corals in one tank`;
    case 'symbiosis': return 'Two partner species together';
    case 'night': return 'A moonlit tank with night creatures';
    case 'decor_set': return 'The complete decor set';
    case 'pests_clear': return 'A tank cleared of pest snails';
  }
}

const STAMPS = ['frond', 'fish', 'lighthouse', 'shell', 'shrimp', 'cichlid', 'ship', 'coral', 'lily'];

function hashOf(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function letters(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const lw = 230;
  if (!s.letters.length) {
    const used = u.para('No letters right now. People write when they have something to ask; keep the aquarium open and they will.', x, y, w, C.textDim);
    u.text(`Answered so far: ${s.lettersDone.length}`, x, y + used + 10, C.textMute);
    return;
  }
  let ly = y;
  for (const l of s.letters) {
    const r = request(l.id);
    const who = correspondent(r.from);
    const sel = app.panel.letterSel === l.id || (!s.letters.some((q) => q.id === app.panel.letterSel) && l === s.letters[0]);
    if (u.row(x, ly, lw, 40, sel)) app.panel.letterSel = l.id;
    const ramp = RAMP[who.stationery];
    u.rr(x + 6, ly + 5, 6, 30, 2, ramp[ramp.length - 2]);
    u.text(who.name, x + 18, ly + 4, C.strong, { maxW: lw - 24 });
    u.text(r.title, x + 18, ly + 20, C.textDim, { maxW: lw - (l.ready ? 74 : 24) });
    if (l.ready) {
      u.rr(x + lw - 56, ly + 20, 50, 15, 3, C.good);
      u.text('Ready', x + lw - 31, ly + 20, 9, { align: 'center' });
    }
    ly += 44;
  }
  u.text(`Answered: ${s.lettersDone.length}`, x, y + h - M.line, C.textMute);
  const l = s.letters.find((q) => q.id === app.panel.letterSel) ?? s.letters[0];
  const r = request(l.id);
  const who = correspondent(r.from);
  const px = x + lw + 14, pw = w - lw - 14;
  u.panel(px, y, pw, h, 'paper', false);
  const ramp = RAMP[who.stationery];
  u.fill(px + 2, y + 2, pw - 4, 6, ramp[ramp.length - 2]);
  const stamp = STAMPS[hashOf(who.name) % STAMPS.length];
  const stamped = drawIcon(u.ctx, `st:${stamp}`, px + pw - 46, y + 14, 32);
  if (stamped) drawIcon(u.ctx, 'ui:postmark', px + pw - 64, y + 22, 32, 0.7);
  column(u, 'letter', px + 14, y + 18, pw - 24, h - 56, (x, y, w) => {
    u.head(r.title, x, y, C.paperInk, { maxW: w - (stamped ? 64 : 0) });
    y += M.row + 6 + (stamped ? 16 : 0);
    y += u.para(r.text, x, y, w, C.paperInk) + 10;
    u.text(who.signoff, x + w, y, C.paperInk, { align: 'right' });
    y += M.row + 4;
    y += u.para(`(${who.name}: ${who.role})`, x, y, w, 3) + 8;
    u.text(`Wanted: ${describe(r.check)}`, x, y, l.ready ? 30 : 19, { maxW: w });
    y += M.row;
    u.text(`Reward: ${ICON.coin} ${r.reward.coins}   ${ICON.sparkle} ${r.reward.rep}${r.reward.unlock ? '   + a surprise' : ''}`, x, y, C.paperInk, { maxW: w });
    return y + M.row;
  });
  if (u.button('claim', px + pw - 140, y + h - 32, 126, M.btn + 2, l.ready ? 'Send reply' : 'Not yet', { style: l.ready ? 'good' : 'paper', disabled: !l.ready })) app.run(act.claimLetter(app.game!, l.id));
}

// ---------------------------------------------------------------- expeditions

function trips(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const g = app.game!;
  // returned postcards first
  const back = s.expeditions.find((e) => e.finds);
  if (back) {
    const reg = REGIONS.find((r) => r.id === back.region)!;
    u.panel(x, y, w, h, 'paper', false);
    u.fill(x + 2, y + 2, w - 4, 6, 40);
    const stamped = drawIcon(u.ctx, `st:${STAMPS[hashOf(reg.id) % STAMPS.length]}`, x + w - 46, y + 14, 32);
    if (stamped) drawIcon(u.ctx, 'ui:postmark', x + w - 64, y + 22, 32, 0.7);
    column(u, 'postcard', x + 16, y + 18, w - 32, h - 56, (x, y, w) => {
      const ph = drawPicture(u.ctx, `pc:${reg.id}`, x, y, Math.min(w - 70, 300), 180);
      if (ph) y += ph + 10;
      u.head(`A postcard from the ${reg.name}`, x, y, C.paperInk, { maxW: w - (ph ? 0 : 64) });
      y += M.row + 6;
      y += u.para(back.postcard ?? '', x, y, w, C.paperInk) + 10;
      u.text('Fair winds, Wren', x + w, y, C.paperInk, { align: 'right' });
      y += M.row + 6;
      u.head('In the hold', x, y, C.paperInk);
      y += M.row + 4;
      for (const f of back.finds!) {
        if (f.kind === 'species') {
          u.sprite(creatureFrame(f.id, 0), x, y, 32, 22);
          u.text(`${f.n} x ${species(f.id).name} (to holding)`, x + 38, y + 4, C.paperInk, { maxW: w - 40 });
        } else {
          u.sprite(itemFrame(f.id, 1, 1, 0), x, y, 32, 22);
          u.text(`${item(f.id).name} (to storage)`, x + 38, y + 4, C.paperInk, { maxW: w - 40 });
        }
        y += M.item;
      }
      return y;
    });
    if (u.button('file', x + w - 120, y + h - 32, 106, M.btn + 2, 'File it', { style: 'paper' })) act.dismissExpedition(g, back.id);
    return;
  }
  const out = s.expeditions.filter((e) => !e.finds);
  u.text(`Crew out: ${out.length}/${expeditionSlots(s)}`, x, y, C.textDim);
  let oy = y + M.row + 2;
  for (const e of out) {
    const reg = REGIONS.find((r) => r.id === e.region)!;
    u.text(reg.name, x, oy, C.strong, { maxW: 180 });
    u.bar(x + 190, oy + 3, w - 380, 10, (s.time - e.start) / (e.end - e.start), C.accent);
    u.text(`back ${clockText(e.end)}, day ${dayOf(e.end)}`, x + w, oy, C.textDim, { align: 'right' });
    oy += M.row;
  }
  const top = oy + 6;
  const listH = Math.max(90, y + h - top);
  const lw = Math.floor(w * 0.45);
  u.panel(x, top, lw, listH, 'inset', false);
  const regions = REGIONS.filter((r) => r.expedition.tier <= s.tier + 1);
  column(u, 'regions', x + 6, top + 6, lw - 8, listH - 12, (x, y, w) => {
    for (const r of regions) {
      const locked = r.expedition.tier > s.tier;
      if (u.row(x - 3, y - 1, w + 6, M.row, app.panel.tripSel === r.id)) app.panel.tripSel = r.id;
      u.text(r.name, x, y, locked ? C.textMute : C.strong, { maxW: w - 64 });
      u.text(`${ICON.coin} ${r.expedition.cost}`, x + w, y, locked ? C.textMute : C.gold, { align: 'right' });
      y += M.row;
    }
    return y;
  });
  const r = REGIONS.find((q) => q.id === app.panel.tripSel) ?? regions[0];
  if (!r) return;
  const dx = x + lw + 14, dw = w - lw - 14;
  column(u, 'regiond', dx, top, dw, listH - 32, (x, y, w) => {
    const ph = drawPicture(u.ctx, `pc:${r.id}`, x, y, w, 180, r.expedition.tier > s.tier ? 0.4 : 1);
    if (ph) y += ph + 8;
    u.head(r.name, x, y, C.head, { maxW: w });
    y += M.row + 2;
    u.text(`${r.continent}, ${r.water}`, x, y, C.textDim);
    y += M.row + 4;
    y += u.para(r.blurb, x, y, w, C.text) + 8;
    u.text(`${r.temp[0]}-${r.temp[1]}C  pH ${r.ph[0]}-${r.ph[1]}${r.gh ? `  GH ${r.gh[0]}-${r.gh[1]}` : ''}${r.sg ? `  SG ${r.sg[0]}` : ''}`, x, y, C.accent, { maxW: w });
    y += M.row + 4;
    y += u.para(`A faithful biotope: ${r.scape}`, x, y, w, C.textDim) + 8;
    u.text(`${expeditionHours(s, r.id as RegionId).toFixed(1)} game hours away`, x, y, C.textDim);
    return y + M.row;
  });
  const why = canExpedition(s, r.id as RegionId);
  if (why) u.para(why, dx, top + listH - M.btn - 4, dw - 190, C.warn);
  if (u.button('sail', dx + dw - 180, top + listH - M.btn - 2, 180, M.btn + 2, `Set sail ${ICON.coin}${r.expedition.cost}`, { style: why ? 'flat' : 'good', disabled: !!why, tip: why ?? 'Captain Wren will bring back animals, plants and stones from here' })) app.run(act.sendExpedition(g, r.id as RegionId));
}

// ---------------------------------------------------------------- upgrades

const TRACKS: { id: UpgradeTrack; label: string }[] = [
  { id: 'tanks', label: 'Tanks' }, { id: 'care', label: 'Care' }, { id: 'visitors', label: 'Visitors' }, { id: 'expeditions', label: 'Trips' }, { id: 'decor', label: 'Decor' }, { id: 'husbandry', label: 'Breeding' },
];

function upgrades(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  app.panel.upgradeTab = u.tabs('uptab', x, y, TRACKS.map((t) => t.label), app.panel.upgradeTab);
  y += 26;
  h -= 26;
  const track = TRACKS[app.panel.upgradeTab].id;
  column(u, 'ups', x, y, w, h, (x, y, w) => {
    for (const up of UPGRADES.filter((q) => q.track === track)) {
      const lvl = s.upgrades[up.id] ?? 0;
      const next = up.levels[lvl];
      const ch = 46;
      u.panel(x, y, w, ch, 'inset', false);
      u.text(`${up.name}${up.levels.length > 1 ? `  ${lvl}/${up.levels.length}` : lvl ? '  (owned)' : ''}`, x + 10, y + 5, C.strong, { maxW: w - 160 });
      const text = next ? next.text : up.levels[up.levels.length - 1].text;
      u.text(text, x + 10, y + 23, next ? C.textDim : C.good, { maxW: w - 160 });
      if (next) {
        const locked = next.tier > s.tier;
        if (u.button(`up${up.id}`, x + w - 138, y + 12, 128, M.btn + 2, locked ? 'Locked' : `${ICON.coin} ${next.cost}`, { style: locked ? 'flat' : 'good', disabled: locked || s.coins < next.cost, tip: locked ? `Needs the ${TIERS[next.tier].name} tier` : next.text })) app.run(act.buyUpgrade(app.game!, up.id));
      } else u.text('Done', x + w - 14, y + 15, C.good, { align: 'right' });
      y += ch + 6;
    }
    return y;
  });
}

// ---------------------------------------------------------------- guestbook

function guestbook(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  u.panel(x, y, w, h, 'paper', false);
  column(u, 'guest', x + 14, y + 10, w - 22, h - 16, (x, y, w) => {
    if (!s.guestbook.length) y += u.para('The guestbook is empty. Visitors write in it while the aquarium is open.', x, y, w, C.paperInk);
    for (const e of s.guestbook) {
      const t = s.tanks.find((q) => q.id === e.tank);
      y += u.para(`"${e.text}"`, x, y, w, C.paperInk);
      u.text(`${e.who}${t ? `, at ${t.name}` : ''}, day ${dayOf(e.time)}`, x + w, y, 3, { align: 'right', maxW: w });
      y += M.row + 8;
    }
    return y;
  });
}

// ---------------------------------------------------------------- menu

function menu(app: App, x: number, y: number, w: number, h: number) {
  // two columns when there is room (the game on the left, settings on the right), one otherwise;
  // either way it scrolls on a short screen
  const two = w >= 520;
  const cw = two ? Math.floor((w - 28) / 2) : w - 8;
  column(app.ui, 'menu', x, y, w, h, (x, y) => {
    const left = menuGame(app, x, y, cw);
    const right = two ? menuSettings(app, x + cw + 20, y, cw) : menuSettings(app, x, left + 10, cw);
    return Math.max(left, right);
  });
}

function menuGame(app: App, x: number, y: number, w: number): number {
  const u = app.ui;
  const s = app.state;
  if (u.button('resume', x, y, w, M.btn + 4, 'Back to the shop', { style: 'good' })) app.window = null;
  y += M.btn + 10;
  const hw = Math.floor((w - 6) / 2);
  if (u.button('replaytut', x, y, hw, M.btn, 'Replay the tour', { tip: 'Ida walks you through every feature again' })) {
    s.tutorial = { step: 0, done: false };
    app.window = null;
  }
  if (u.button('replayintro', x + hw + 6, y, hw, M.btn, 'Watch the intro', { tip: 'The night you got the keys' })) {
    app.window = null;
    app.playScene('intro', true);
  }
  y += M.btn + 10;
  if (u.button('savenow', x, y, hw, M.btn, 'Save')) {
    app.save();
    app.toast('Saved.', 'good');
  }
  if (u.button('export', x + hw + 6, y, hw, M.btn, 'Export', { tip: 'Download the save as a file' })) {
    const blob = new Blob([serialize(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `fins-and-fronds-day${dayOf(s.time)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  y += M.btn + 6;
  if (u.button('import', x, y, hw, M.btn, 'Import', { tip: 'Load a save file' })) {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = async () => {
      const f = inp.files?.[0];
      if (!f) return;
      try {
        const st = deserialize(await f.text());
        localStorage.setItem('fins-and-fronds/save', JSON.stringify(st));
        app.continueSave();
        app.toast('Save loaded.', 'good');
      } catch {
        app.toast('That file is not a Fins & Fronds save.', 'bad');
      }
    };
    inp.click();
  }
  if (u.button('title', x + hw + 6, y, hw, M.btn, 'Title screen')) {
    app.save();
    app.screen = 'title';
    app.window = null;
  }
  y += M.btn + 12;
  const c = app.panel.confirmNew;
  if (u.button('newgame', x, y, w, M.btn, c ? 'Really start over? Click again' : 'New game', { style: 'bad' })) {
    if (c) {
      app.panel.confirmNew = 0;
      app.startNew();
    } else app.panel.confirmNew = 1;
  }
  if (!u.hover(x, y, w, M.btn)) app.panel.confirmNew = 0;
  y += M.btn + 12;
  y += u.para('Keys: 1-6 modes, Space pause, F feed, H hall, V watch, [ ] tanks, Q W E depth, Esc. On a touchscreen: pinch to zoom, two fingers to pan, hold for help.', x, y, w, C.textDim);
  return y;
}

function menuSettings(app: App, x: number, y: number, w: number): number {
  const u = app.ui;
  const s = app.state;
  u.head('Settings', x, y);
  y += M.row + 6;
  const gentle = u.toggle('gentle', x, y, 'Gentle mode (no deaths)', s.settings.gentle);
  if (gentle !== s.settings.gentle) {
    s.settings.gentle = gentle;
    app.game!.refreshAll(false);
  }
  y += M.row + 6;
  const d = u.stepper('vol', x, y, `Volume ${Math.round(s.settings.volume * 100)}%`, Math.min(w, 190));
  if (d) {
    s.settings.volume = Math.max(0, Math.min(1, Math.round((s.settings.volume + d * 0.1) * 10) / 10));
    app.audio.setVolume(s.settings.volume);
  }
  y += M.btnS + 6;
  const amb = s.settings.ambience ?? 0.7;
  const da = u.stepper('amb', x, y, `Ambience ${Math.round(amb * 100)}%`, Math.min(w, 190));
  if (da) {
    s.settings.ambience = Math.max(0, Math.min(1, Math.round((amb + da * 0.1) * 10) / 10));
    app.audio.setAmbience(s.settings.ambience);
  }
  y += M.btnS + 10;
  const big = u.toggle('bigui', x, y, 'Larger interface', (s.settings.textSize ?? 0) > 0);
  if (big !== (s.settings.textSize ?? 0) > 0) {
    s.settings.textSize = big ? 1 : 0;
    app.resize();
  }
  y += M.row;
  y += u.para('Fills the screen at an uneven pixel scale: bigger text, slightly softer pixels.', x + 18, y, w - 18, C.textDim) + 6;
  const calm = u.toggle('calm', x, y, 'Colorblind-safe colors', !!s.settings.calmColors);
  if (calm !== !!s.settings.calmColors) {
    s.settings.calmColors = calm;
    setCalmColors(calm);
  }
  y += M.row;
  y += u.para('Good and bad show as blue and orange instead of green and red.', x + 18, y, w - 18, C.textDim) + 6;
  return y;
}

// ---------------------------------------------------------------- new tank

function newTank(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const shells = shellsForSale(s);
  const lw = Math.floor(w * 0.5);
  u.panel(x, y, lw, h, 'inset', false);
  u.mark('shells', x, y, lw, h);
  column(u, 'shells', x + 6, y + 6, lw - 8, h - 12, (x, y, w) => {
    for (const sh of shells) {
      const rh = M.line * 2 + 6;
      if (u.row(x - 3, y - 2, w + 6, rh, app.panel.shellSel === sh.id)) app.panel.shellSel = sh.id;
      u.text(sh.name, x, y, C.strong, { maxW: w - 70 });
      u.text(`${sh.gal ? `${sh.gal} gal, ` : `${Math.round(sh.liters / 3.785)} gal, `}${sh.liters} L, ${sh.cm[0]}x${sh.cm[1]}x${sh.cm[2]} cm`, x, y + M.line, C.textDim, { maxW: w - 70 });
      u.text(`${ICON.coin} ${shellPrice(s, sh)}`, x + w, y, C.gold, { align: 'right' });
      y += rh;
    }
    return y;
  });
  const sh = shells.find((q) => q.id === app.panel.shellSel) ?? shells[0];
  const dx = x + lw + 14, dw = w - lw - 14;
  let dy = y;
  u.head(sh.name, dx, dy, C.head, { maxW: dw });
  dy += M.row + 4;
  dy += u.para(sh.blurb, dx, dy, dw, C.text) + 8;
  const tags = sh.tags.filter((t) => t !== 'exhibit').map((t) => t.replace('_', ' '));
  if (tags.length) {
    u.text(tags.join(', '), dx, dy, C.accent, { maxW: dw });
    dy += M.row + 4;
  }
  u.head('Water', dx, dy);
  dy += M.row + 2;
  const waters = watersAvailable(s).filter((wt) => !sh.water || sh.water.includes(wt));
  if (!waters.includes(app.panel.waterSel)) app.panel.waterSel = waters[0] ?? 'fresh';
  let bx = dx;
  for (const wt of ['fresh', 'brackish', 'marine'] as Water[]) {
    const ok = waters.includes(wt);
    const bw = Math.floor((dw - 6) / 3);
    if (u.button(`water${wt}`, bx, dy, bw, M.btn, wt, { active: app.panel.waterSel === wt, disabled: !ok, style: 'flat', tip: ok ? undefined : wt === 'brackish' ? 'Brackish opens at the Aquarium Store tier' : 'Saltwater opens at the Town Aquarium tier' })) app.panel.waterSel = wt;
    bx += bw + 3;
  }
  dy += M.btn + 10;
  const cost = shellPrice(s, sh);
  const rack = app.newTankBay >= BAL.rackBay;
  u.para(rack ? 'A stock tank for the back room. Breed fish and grow plants in it; customers buy the healthy adults (above the breeders you keep) and the cuttings.' : 'It arrives filled and empty. Add a filter, let the nitrogen cycle establish, then scape and stock it.', dx, dy, dw, rack ? C.accent : C.textDim);
  if (u.button('build', dx, y + h - M.btn - 4, dw, M.btn + 4, `Build for ${ICON.coin}${cost}`, { style: 'good', disabled: s.coins < cost })) {
    const msg = act.buildTank(app.game!, app.newTankBay, sh.id, app.panel.waterSel);
    if (msg) app.toast(msg, 'bad');
    else {
      const t = s.tanks.find((q) => q.bay === app.newTankBay);
      app.window = null;
      if (t) {
        app.setTank(t.id);
        app.setMode('gear');
      }
    }
  }
}
