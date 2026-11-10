// Windows over the tank: the codex, letters, expeditions, upgrades, the guestbook, the menu and
// the new-tank order. Correspondents and the captain are never drawn; their letters are.
// A window is a sea-glass card with a teal title ribbon; letters and postcards are paper.
import type { App, WindowId } from '../app/app';
import { ARCHETYPES, correspondent, CORRESPONDENTS, item, REGIONS, request, REQUESTS, species, SPECIES, SYMBIOSES, TIERS, UPGRADES } from '../data';
import { CODEX_MILESTONES, PROJECTS } from '../data/progression';
import { RAMP, setCalmColors, UI as C } from '../data/palette';
import { markNotesSeen, PATCH_NOTES } from '../data/patchnotes';
import type { Family, RegionId, RequestCheck, RequestDef, ShellDef, SpeciesDef, UpgradeTrack, Water } from '../data/types';
import { creatureFrame, drawAt, importedFrame, itemFrame } from '../render/art/sprites';
import * as act from '../sim/actions';
import { canExpedition, catchable, expeditionHours, expeditionSlots, freshness, orderable } from '../sim/expeditions';
import { letterText } from '../sim/letters';
import { canFund, funded, fundProject, projectCost, projectLine, projectRep } from '../sim/projects';
import { codexHow, shellPrice, shellsForSale, watersAvailable } from '../sim/catalog';
import { BAL } from '../sim/balance';
import { deserialize, serialize } from '../sim/save';
import { clockText, dayOf } from '../sim/state';
import { drawIcon, drawPicture, hasArt } from '../render/icons';
import { TOOLBAR_H, TOP_H, WIN_ICON } from './hud';
import { homeChip, homeLine, letterProgress } from './hints';
import { tourShowing } from './tutorial';
import { ICON, M, type UI, wrapText } from './ui';

const heights = new Map<string, number>();

function column(u: UI, id: string, x: number, y: number, w: number, h: number, draw: (x: number, y: number, w: number) => number) {
  const off = u.scrollArea(id, x, y, w, h, heights.get(id) ?? h);
  u.clip(x, y, w, h);
  const end = draw(x, y - off, w - 8);
  u.unclip();
  heights.set(id, end + off - y + 6);
}

const TITLES: Record<WindowId, string> = {
  codex: 'Codex', letters: 'Letters', trips: 'Expeditions', upgrades: 'Upgrades', guestbook: 'Guestbook', menu: 'Menu', newtank: 'A new tank', news: "What's new",
};

const RIBBON = 30;

/** where the open window sits, in UI pixels */
export function windowRect(app: App): { x: number; y: number; w: number; h: number } {
  const menu = app.window === 'menu';
  // while Ida's tour is showing, the window leaves her the wall on its left for the note
  const gutter = tourShowing(app) ? Math.min(250, Math.max(0, app.W - 560)) : 0;
  const w = Math.min(app.W - 32 - gutter, menu ? 600 : 780), h = Math.min(app.H - TOP_H - TOOLBAR_H - 8, menu ? 400 : 500);
  return { x: gutter + Math.floor((app.W - gutter - w) / 2), y: TOP_H + Math.floor((app.H - TOP_H - TOOLBAR_H - h) / 2), w, h };
}

export function drawWindow(app: App) {
  const u = app.ui;
  const id = app.window!;
  const { x, y, w, h } = windowRect(app);
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
    case 'news': news(app, ix, iy, iw, ih); break;
  }
}

// ---------------------------------------------------------------- what's new

/** the patch notes, newest first; reading them counts as seen */
function news(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  markNotesSeen();
  column(u, 'news', x, y, w, h - M.btn - 10, (x, y, w) => {
    for (const n of PATCH_NOTES) {
      u.head(`${n.version}: ${n.title}`, x, y, C.head, { maxW: w - 90 });
      u.text(n.date, x + w, y + 1, C.textMute, { align: 'right' });
      y += M.row + 4;
      for (const sec of n.sections) {
        if (sec.head) {
          u.text(sec.head, x, y, C.accent);
          y += M.row;
        }
        for (const line of sec.lines) y += u.para(`${ICON.right} ${line}`, x + 4, y, w - 4, C.text) + 3;
        y += 4;
      }
      y += 10;
    }
    return y;
  });
  if (u.button('newsok', x + w - 150, y + h - M.btn - 2, 150, M.btn + 2, 'Back to the shop', { style: 'good' })) app.window = null;
}

// ---------------------------------------------------------------- codex

const FAMILIES: Family[] = ['Community', 'Planted & Aquascape', 'Freshwater Biotope', 'Specialist', 'Coldwater', 'Brackish', 'Semi-aquatic', 'Marine', 'Reef', 'Public Exhibit'];

function codex(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const found = s.codex;
  const plaques = plaqueList();
  app.panel.codexTab = u.tabs('codextab', x, y, [`Tank types ${found.archetypes.length}/${ARCHETYPES.length}`, `Species ${found.species.length}/${SPECIES.length}`, `Partners ${found.symbioses.length}/${SYMBIOSES.length}`, `Plaques ${plaques.filter((p) => (s.milestones ?? []).includes(p.id)).length}/${plaques.length}`], app.panel.codexTab);
  y += 26;
  h -= 26;
  const lw = Math.floor(w * 0.42);
  // tank types and species are a list beside a page; partners and plaques are one list, full width
  u.panel(x, y, app.panel.codexTab <= 1 ? lw : w, h, 'inset', false);
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
    // every species: the ones not met yet as dark shapes, so a full codex has a map
    const got = (sp: SpeciesDef) => found.species.includes(sp.id);
    const list = [...SPECIES.filter(got), ...SPECIES.filter((sp) => !got(sp))];
    const notes = (s.story ?? []).includes('notebook');
    const top = y, bottom = y + h;
    column(u, 'cx-sp', x + 6, y + 6, lw - 8, h - 12, (x, y, w) => {
      if (!found.species.length) y += u.para('Species appear here as they arrive in your tanks.', x, y, w, C.textDim) + 6;
      for (const sp of list) {
        const known = got(sp);
        // (189 rows: only the ones in view are drawn)
        if (y + M.item < top || y > bottom) {
          y += M.item;
          continue;
        }
        if (u.row(x - 3, y - 2, w + 6, M.item, app.panel.codexSel === sp.id)) app.panel.codexSel = sp.id;
        silhouette(u.ctx, !known, () => u.sprite(creatureFrame(sp.id, 0), x, y, 32, 22));
        u.text(known ? sp.name : '?', x + 38, y + 4, known ? C.strong : C.textMute, { maxW: w - 120 });
        // where it comes from, the way the order list shows it; for one not met yet that is what
        // Reyes's notebooks add, so it waits for them
        if (known || notes) u.text(homeChip(sp), x + w, y + 4, C.textDim, { align: 'right', maxW: 76 });
        y += M.item;
      }
      return y;
    });
    const sel = list.find((q) => q.id === app.panel.codexSel);
    if (sel && !got(sel)) {
      // not met yet: where to look (from Reyes's notebooks), or a nudge toward them
      column(u, 'cx-spd', dx, y, dw, h, (x, y, w) => {
        y += codexPicture(u, sel.id, x, y, w, true) + 8;
        u.head('Not yet in your codex', x, y, C.head, { maxW: w });
        y += M.row + 4;
        y += u.para(notes ? `${sel.name}. ${codexHow(sel)}` : 'Dr. Reyes keeps field notebooks on every animal she has met. Perhaps she would share them.', x, y, w, C.textDim);
        return y + M.row;
      });
    }
    const sp = sel && got(sel) ? sel : list.find(got);
    if (sp && (!sel || got(sel))) {
      column(u, 'cx-spd', dx, y, dw, h, (x, y, w) => {
        y += codexPicture(u, sp.id, x, y, w, false) + 8;
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
        // where it lives in the wild: the biotope tank types ask for these places
        u.text('Home', x, y, C.textDim);
        y += u.para(homeLine(sp), x + 70, y, w - 70, C.strong) + 2;
        return y;
      });
    }
  } else if (app.panel.codexTab === 3) {
    // the keepsakes every finished story left (the hall's shelf shows as many as its wall has room
    // for; all of them are here), then the plaques: milestones for filling the codex, and one for
    // every family of tank types
    column(u, 'cx-plq', x + 6, y + 6, w - 12, h - 12, (x, y, w) => {
      const all = CORRESPONDENTS.filter((c) => REQUESTS.some((r) => r.from === c.id && r.keepsake));
      const earned = [...(s.keepsakes ?? [])].reverse().filter((id) => all.some((c) => c.id === id));
      u.head(`Keepsakes ${earned.length}/${all.length}`, x, y, C.head, { maxW: w });
      y += M.row + 4;
      for (const id of earned) {
        const who = correspondent(id), what = REQUESTS.find((r) => r.from === id && r.keepsake)?.keepsake ?? 'A keepsake';
        const fr = importedFrame(`ks:${id}`);
        if (fr) u.sprite(fr, x, y, 30, 28);
        u.text(what, x + 38, y + 1, C.strong, { maxW: w - 40 });
        u.text(`From ${who.name}, at the end of their story`, x + 38, y + 15, C.textDim, { maxW: w - 40 });
        y += 32;
      }
      const left = all.length - earned.length;
      if (left) y += u.para(earned.length ? `${left} more to come: each correspondent's story ends with one.` : 'Every correspondent\'s story ends with a keepsake for the shop. They are kept here, and stand on the shelf in the hall when the screen has room.', x, y, w, C.textDim);
      y += 12;
      u.head('Plaques', x, y, C.head);
      y += M.row + 4;
      for (const p of plaques) {
        const got = (s.milestones ?? []).includes(p.id);
        u.text(got ? ICON.star : '-', x, y, got ? C.coin : C.textMute);
        u.text(p.name, x + 16, y, got ? C.strong : C.textDim, { maxW: w - 200 });
        u.text(p.reward, x + w, y, got ? C.good : C.textMute, { align: 'right', maxW: 180 });
        y += M.row + 2;
      }
      return y;
    });
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
    case 'none': return 'Nothing: just read it and reply';
    case 'no_animals': return `A tank with no animals at all, 3 plants or more, rated ${c.stars} stars`;
    case 'trips': return `${c.min} expeditions home`;
    case 'wild': return `${c.min} wild-caught animals on show`;
    case 'part': return `One tank scoring ${c.min} on ${c.part}`;
    case 'codex': return `${c.min} ${c.kind === 'archetypes' ? 'tank types' : 'species'} in the codex`;
    case 'project': return c.id ? `Fund ${PROJECTS.find((p) => p.id === c.id)?.name ?? 'the project'}` : 'Fund a conservation project';
  }
}

/** the codex plaques: milestones, then one per family of tank types */
function plaqueList(): { id: string; name: string; reward: string }[] {
  return [
    ...CODEX_MILESTONES.map((m) => ({ id: m.id, name: m.name, reward: `${ICON.coin} ${m.coins}  ${ICON.sparkle} ${m.rep}` })),
    ...FAMILIES.map((f) => {
      const n = ARCHETYPES.filter((a) => a.family === f).length;
      return { id: `fam:${f}`, name: `Every ${f} tank (${n})`, reward: `${ICON.sparkle} ${BAL.familyPlaqueRep * n}` };
    }),
  ];
}

/** the tallest picture a codex page gives a creature */
const CODEX_PIC_H = 136;

/**
 * The zoom a codex picture draws art of fw x fh at, in a box w x h: 2x, as the tanks show them, or
 * when that does not fit, the largest zoom that does, however uneven. A whole-number step down
 * (2x to 1x) drew the 38 cm lionfish (90x84) smaller than the 15 cm discus (50x53) at 2x; this way
 * bigger art fills the box in the direction it is cut short, so it never comes out smaller than art
 * that is smaller in both directions.
 */
export function codexZoom(fw: number, fh: number, w: number, h: number): number {
  return Math.min(2, w / fw, h / fh);
}

/**
 * A creature's codex picture, on an inset as tall as it needs, at codexZoom (the same 2x for every
 * species that fits, so the pages keep the sizes the tanks show: fitting each one to the box drew
 * the 35 cm stingray at 2x and the 80 cm cownose ray beside it at 1x). Returns the height used.
 */
function codexPicture(u: UI, sp: string, x: number, y: number, w: number, dark: boolean): number {
  const fr = creatureFrame(sp, dark ? 0 : Math.floor(u.time * 3) % 4);
  const z = codexZoom(fr.w, fr.h, w - 8, CODEX_PIC_H);
  const dw = Math.round(fr.w * z), dh = Math.round(fr.h * z), h = Math.max(48, dh + 8);
  u.panel(x, y, w, h, 'inset', false);
  silhouette(u.ctx, dark, () => drawAt(u.ctx, fr, x + Math.floor((w - dw) / 2), y + Math.floor((h - dh) / 2), dw, dh));
  return h;
}

/** draw something as a dark shape (an animal not met yet) */
function silhouette(ctx: CanvasRenderingContext2D, on: boolean, draw: () => void) {
  if (!on) return draw();
  const f = ctx.filter;
  ctx.filter = 'brightness(0) opacity(0.45)';
  draw();
  ctx.filter = f;
}

const STAMPS = ['frond', 'fish', 'lighthouse', 'shell', 'shrimp', 'cichlid', 'ship', 'coral', 'lily'];

function hashOf(s: string) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** the room a line beside the stamp leaves it (the postmark reaches 44 px in, then some air), and
 *  how far down the pair reaches from the letter's top */
const STAMP_W = 64;
const STAMP_H = 36;

/**
 * A stamp, with the postmark over its corner, at the top right of a letter or a postcard. It is
 * drawn on the sheet inside the scrolling column (right, top: the column's top right corner, as
 * scrolled), so it scrolls away with the first lines like a real letter would: drawn fixed under
 * the column, the text scrolled up across it. Returns how far down it reaches (0 without the art);
 * lines beside it stay STAMP_W short of the edge, and full-width lines start below it.
 */
function stamp(u: UI, name: string, right: number, top: number): number {
  if (!drawIcon(u.ctx, `st:${name}`, right - 28, top - 2, 32)) return 0;
  drawIcon(u.ctx, 'ui:postmark', right - 46, top + 6, 32, 0.7);
  return STAMP_H;
}

/** the letters window's tab (open letters or kept ones) and the kept letter being reread */
let letterTab = 0;
let keptSel = '';

function letters(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  const lw = 230;
  const kept = Object.entries(s.lettersKept ?? {}).sort((a, b) => b[1].at - a[1].at);
  if (kept.length) {
    letterTab = u.tabs('lettab', x, y, [`Open ${s.letters.length}`, `Kept ${kept.length}`], letterTab);
    y += 26;
    h -= 26;
    if (letterTab === 1) return keptLetters(app, kept, x, y, w, h);
  }
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
  if (!kept.length) u.text(`Answered: ${s.lettersDone.length}`, x, y + h - M.line, C.textMute);
  const l = s.letters.find((q) => q.id === app.panel.letterSel) ?? s.letters[0];
  const r = request(l.id);
  paper(app, r, l, x + lw + 14, y, w - lw - 14, h - 40);
  // a letter not ready yet says what it is waiting for (the same words as the paper's last lines)
  const bx = x + w - 140, by = y + h - 32;
  const why = !l.ready && u.hover(bx, by, 126, M.btn + 2) ? [{ text: 'Not ready yet' }, { text: `Wanted: ${describe(r.check)}`, color: C.textDim }, { text: letterProgress(r.check, s, app.game!.stats).text, color: C.textDim }] : undefined;
  if (u.button('claim', bx, by, 126, M.btn + 2, l.ready ? 'Send reply' : 'Not yet', { style: l.ready ? 'good' : 'paper', disabled: !l.ready, tip: l.ready ? 'Send your reply and collect the reward' : why })) app.run(act.claimLetter(app.game!, l.id));
}

/** one letter on its stationery: the text, the signature, and what it asks for */
function paper(app: App, r: RequestDef, l: { vars?: Record<string, string>; met?: boolean; ready?: boolean; answered?: number }, px: number, y: number, pw: number, h: number) {
  const u = app.ui;
  const who = correspondent(r.from);
  u.panel(px, y, pw, h + 40, 'paper', false);
  // an open letter shows how close the aquarium is (kept letters were answered)
  const progress = l.ready === false ? letterProgress(r.check, app.state, app.game!.stats) : undefined;
  const ramp = RAMP[who.stationery];
  u.fill(px + 2, y + 2, pw - 4, 6, ramp[ramp.length - 2]);
  column(u, 'letter', px + 14, y + 18, pw - 24, h - 16, (x, y, w) => {
    const top = y;
    const sh = stamp(u, STAMPS[hashOf(who.name) % STAMPS.length], x + w, y);
    // the title wraps beside the stamp rather than being cut short (beside Ida's note the paper is narrow)
    const tw = w - (sh ? STAMP_W : 0);
    const title = wrapText(r.title, tw, 'display');
    title.forEach((t, i) => u.head(t, x, y + i * M.row, C.paperInk, { maxW: tw }));
    y = Math.max(y + title.length * M.row + 6, top + sh + 3);
    y += u.para(letterText(r, l), x, y, w, C.paperInk) + 10;
    u.text(who.signoff, x + w, y, C.paperInk, { align: 'right' });
    y += M.row + 4;
    y += u.para(`(${who.name}: ${who.role})`, x, y, w, 3) + 8;
    // a thank-you or a reply asks for nothing more; a kept letter was answered, and says when
    if (r.check.t !== 'none' && !l.met) {
      if (l.ready === undefined) y += u.para(`Answered${l.answered !== undefined ? ` on day ${dayOf(l.answered)}` : ''}: ${describe(r.check)}`, x, y, w, 3) + 2;
      else {
        y += u.para(`Wanted: ${describe(r.check)}`, x, y, w, l.ready ? C.good : 19) + 2;
        // how close the aquarium is, from the tank that comes closest
        if (progress) y += u.para(progress.text, x, y, w, 3) + 2;
      }
    }
    // (wrapped: beside Ida's note the paper is narrow, and a keepsake makes it long)
    if (l.ready !== undefined) y += u.para(`Reward: ${ICON.coin} ${r.reward.coins} and ${r.reward.rep} reputation${r.reward.unlock ? ', and a surprise' : ''}${r.keepsake ? ', and a keepsake' : ''}`, x, y, w, C.paperInk) + 2;
    return y;
  });
  // the codex page that explains how
  if (progress?.codex && u.button('lhow', px + 14, y + h + 8, 70, M.btn + 2, 'How?', { style: 'paper', tip: 'Open the codex where it says how' })) {
    app.window = 'codex';
    app.panel.codexTab = progress.codex.tab;
    if (progress.codex.sel) app.panel.codexSel = progress.codex.sel;
  }
}

/** letters already answered, newest first, to read again */
function keptLetters(app: App, kept: [string, { at: number; vars: Record<string, string>; met?: boolean }][], x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const lw = 230;
  u.panel(x, y, lw, h, 'inset', false);
  column(u, 'kept', x + 4, y + 4, lw - 8, h - 8, (x, y, w) => {
    for (const [id, k] of kept) {
      const r = request(id);
      const who = correspondent(r.from);
      if (u.row(x - 2, y - 1, w + 4, 36, keptSel === id || (!keptSel && id === kept[0][0]))) keptSel = id;
      const ramp = RAMP[who.stationery];
      u.rr(x + 2, y + 3, 5, 28, 2, ramp[ramp.length - 2]);
      u.text(who.name, x + 12, y + 2, C.strong, { maxW: w - 70 });
      // (one answered before letters were kept, in a save from before 0.3, has no day: at 0)
      if (k.at > 0) u.text(`day ${dayOf(k.at)}`, x + w, y + 2, C.textMute, { align: 'right' });
      u.text(r.title, x + 12, y + 18, C.textDim, { maxW: w - 14 });
      y += 38;
    }
    return y;
  });
  const sel = kept.find(([id]) => id === keptSel) ?? kept[0];
  paper(app, request(sel[0]), { vars: sel[1].vars, met: sel[1].met, answered: sel[1].at > 0 ? sel[1].at : undefined }, x + lw + 14, y, w - lw - 14, h - 40);
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
    column(u, 'postcard', x + 16, y + 18, w - 32, h - 56, (x, y, w) => {
      const top = y;
      const sh = stamp(u, STAMPS[hashOf(reg.id) % STAMPS.length], x + w, y);
      // the picture stays left of the stamp; the words start below whichever is taller
      const ph = drawPicture(u.ctx, `pc:${reg.id}`, x, y, Math.min(w - 70, 300), 180);
      if (ph) y += ph + 10;
      u.head(`A postcard from the ${reg.name}`, x, y, C.paperInk, { maxW: w - (y < top + sh ? STAMP_W : 0) });
      y = Math.max(y + M.row + 6, top + sh + 3);
      y += u.para(back.postcard ?? '', x, y, w, C.paperInk) + 10;
      u.text('Fair winds, Wren', x + w, y, C.paperInk, { align: 'right' });
      y += M.row + 6;
      u.head('In the hold', x, y, C.paperInk);
      y += M.row + 4;
      for (const f of back.finds!) {
        if (f.kind === 'species') {
          u.sprite(creatureFrame(f.id, 0), x, y, 32, 22);
          u.text(`${f.n} x ${species(f.id).name} (to holding)${f.first ? '  new!' : ''}`, x + 38, y + 4, C.paperInk, { maxW: w - 40 });
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
  // regions holding an animal an open letter asks for get a letter mark
  const wanted = new Set(s.letters.map((l) => request(l.id).check).flatMap((c) => (c.t === 'species' ? species(c.id).regions : [])));
  column(u, 'regions', x + 6, top + 6, lw - 8, listH - 12, (x, y, w) => {
    for (const r of regions) {
      const locked = r.expedition.tier > s.tier;
      if (u.row(x - 3, y - 1, w + 6, M.row, app.panel.tripSel === r.id)) app.panel.tripSel = r.id;
      const mark = wanted.has(r.id as RegionId) ? 16 : 0;
      if (mark) u.text(ICON.letter, x, y, C.accent);
      u.text(r.name, x + mark, y, locked ? C.textMute : C.strong, { maxW: w - 64 - mark });
      u.text(`${ICON.coin} ${r.expedition.cost}`, x + w, y, locked ? C.textMute : C.gold, { align: 'right' });
      y += M.row;
    }
    return y;
  });
  const r = REGIONS.find((q) => q.id === app.panel.tripSel) ?? regions[0];
  if (!r) return;
  const dx = x + lw + 14, dw = w - lw - 14;
  // why it cannot sail yet sits beside the button, as tall as it needs, above the window's foot
  const why = canExpedition(s, r.id as RegionId);
  const whyH = why ? u.paraHeight(why, dw - 190) : 0;
  const foot = Math.max(M.btn + 6, whyH + 4);
  column(u, 'regiond', dx, top, dw, listH - foot - 6, (x, y, w) => {
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
    y += M.row;
    const fresh = freshness(s, r.id as RegionId);
    if (fresh < 1) {
      y += u.para(`Fished lately: the nets would come up ${Math.round((1 - fresh) * 100)}% lighter. It recovers in a few days.`, x, y, w, C.warn);
    }
    y += 6;
    // what the crew can bring back: dark shapes for animals not in the codex yet, a star for
    // finds no supplier sells
    const { animals, items } = catchable(s, r.id as RegionId);
    u.head('What the nets might bring', x, y);
    y += M.row + 2;
    for (const sp of animals) {
      const known = s.codex.species.includes(sp.id);
      silhouette(u.ctx, !known, () => u.sprite(creatureFrame(sp.id, 0), x, y, 32, 22));
      const only = !orderable(s, sp);
      u.text(`${known ? sp.name : 'Not in your codex yet'}${only ? `  ${ICON.star}` : ''}`, x + 38, y + 4, known ? C.strong : C.textDim, { maxW: w - 40 });
      y += M.item;
    }
    for (const it of items) {
      u.sprite(itemFrame(it.id, 1, 1, 0), x, y, 32, 22);
      const only = it.source === 'expedition' && !s.unlocked.items.includes(it.id);
      u.text(`${it.name}${only ? `  ${ICON.star}` : ''}`, x + 38, y + 4, C.strong, { maxW: w - 40 });
      y += M.item;
    }
    y += u.para(`${ICON.star} not sold by the supplier: only a trip brings it home.`, x, y + 2, w, C.textMute);
    return y + M.row;
  });
  if (why) u.para(why, dx, top + listH - whyH, dw - 190, C.warn);
  if (u.button('sail', dx + dw - 180, top + listH - M.btn - 2, 180, M.btn + 2, `Set sail ${ICON.coin}${r.expedition.cost}`, { style: why ? 'flat' : 'good', disabled: !!why, tip: why ?? 'Captain Wren will bring back animals, plants and stones from here' })) app.run(act.sendExpedition(g, r.id as RegionId));
}

// ---------------------------------------------------------------- upgrades

const TRACKS: { id: UpgradeTrack; label: string }[] = [
  { id: 'tanks', label: 'Tanks' }, { id: 'care', label: 'Care' }, { id: 'visitors', label: 'Visitors' }, { id: 'expeditions', label: 'Trips' }, { id: 'decor', label: 'Decor' }, { id: 'husbandry', label: 'Breeding' },
];

function upgrades(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  app.panel.upgradeTab = u.tabs('uptab', x, y, [...TRACKS.map((t) => t.label), 'Projects'], app.panel.upgradeTab);
  y += 26;
  h -= 26;
  if (app.panel.upgradeTab >= TRACKS.length) return projects(app, x, y, w, h);
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
        const locked = next.tier > s.tier, short = s.coins < next.cost;
        const tip = locked ? `Needs the ${TIERS[next.tier].name} tier` : short ? [{ text: `Not enough coins: ${next.cost} needed` }, { text: next.text, color: C.textDim }] : next.text;
        if (u.button(`up${up.id}`, x + w - 138, y + 12, 128, M.btn + 2, locked ? 'Locked' : `${ICON.coin} ${next.cost}`, { style: locked ? 'flat' : 'good', disabled: locked || short, tip })) app.run(act.buyUpgrade(app.game!, up.id));
      } else u.text('Done', x + w - 14, y + 15, C.good, { align: 'right' });
      y += ch + 6;
    }
    return y;
  });
}

/** conservation and breeding projects: fund one again and again, for more each time */
function projects(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  column(u, 'projects', x, y, w, h, (x, y, w) => {
    y += u.para('Put the takings to work outside the walls. Every project can be funded again for a little more; each funding earns reputation and brings a few more visitors (up to three times each).', x, y, w, C.textDim) + 8;
    for (const p of PROJECTS) {
      const n = funded(s, p.id);
      const locked = p.tier > s.tier;
      const text = n ? `"${projectLine(p, n)}"` : p.blurb;
      const tw = w - 166;
      const ch = Math.max(52, 26 + u.paraHeight(text, tw) + 6);
      // an inset card, drawn by hand: the list scrolls, and a card half out of view is clipped
      // (the audit cuts text to the scroll area, but not panels)
      u.rr(x, y, w, ch, 3, C.panelLo, 0.55);
      u.fill(x + 3, y, w - 6, 1, C.panelLo);
      const ramp = RAMP[correspondent(p.from).stationery];
      u.rr(x + 4, y + 5, 4, ch - 10, 2, ramp[ramp.length - 2]);
      u.text(`${p.name}${n ? `  funded ${n}x` : ''}`, x + 14, y + 5, C.strong, { maxW: tw });
      u.para(text, x + 14, y + 23, tw, n ? C.good : C.textDim);
      const cost = projectCost(s, p);
      const why = canFund(s, p);
      const what = `Fund it: +${projectRep(s, p)} reputation${p.effect.unlock ? `, and ${species(p.effect.unlock).name} for the supplier's list` : ''}`;
      // a greyed-out button says why first (the tier, or the coins short), then what it would do
      const tip = locked ? `Opens at the ${TIERS[p.tier].name} tier` : why ? [{ text: s.coins < cost ? `Not enough coins: ${cost} needed` : why }, { text: what, color: C.textDim }] : what;
      if (u.button(`fund${p.id}`, x + w - 138, y + 8, 128, M.btn + 2, locked ? 'Locked' : `${ICON.coin} ${cost}`, { style: locked ? 'flat' : 'good', disabled: !!why, tip })) app.run(fundProject(app.game!, p.id));
      if (!locked) u.text(`${ICON.sparkle} +${projectRep(s, p)}`, x + w - 74, y + 12 + M.btn, C.accent, { align: 'center' });
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
      // (no comma after "first visit!")
      u.text(`${e.who}${t ? `${/[!?]$/.test(e.who) ? '' : ','} at ${t.name}` : ''}, day ${dayOf(e.time)}`, x + w, y, 3, { align: 'right', maxW: w });
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
    app.tutorialPeek = null;
    app.window = null;
  }
  if (u.button('replayintro', x + hw + 6, y, hw, M.btn, 'Watch the intro', { tip: 'The night you got the keys' })) {
    app.window = null;
    app.playScene('intro', true);
  }
  y += M.btn + 6;
  if (u.button('whatsnew', x, y, w, M.btn, "What's new", { tip: 'What changed in each update' })) app.window = 'news';
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
  if (u.disarmed(x, y, w, M.btn)) app.panel.confirmNew = 0;
  y += M.btn + 12;
  y += u.para('Keys: 1-6 modes, Space pause, F feed, H hall, V watch, [ ] or Tab tanks, Q W E depth, R / Shift+R tilt, Esc. On a touchscreen: pinch to zoom, two fingers to pan, hold for help.', x, y, w, C.textDim);
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

/** the size Ida would start someone on: a 20 gallon long for the window, a 10 gallon for the rack */
const suggestedShell = (app: App) => (app.newTankBay >= BAL.rackBay ? 'std_10' : 'std_20l');

/** the size the new-tank window shows: the one picked, else the suggested one */
export function pickedShell(app: App): ShellDef {
  const shells = shellsForSale(app.state);
  return shells.find((q) => q.id === app.panel.shellSel) ?? shells.find((q) => q.id === suggestedShell(app)) ?? shells[0];
}

/** u.time when the new-tank window was last drawn, to tell when it has just opened */
let newTankDrawn = -1;

function newTank(app: App, x: number, y: number, w: number, h: number) {
  const u = app.ui;
  const s = app.state;
  // while Ida's tour runs, each time the window opens it starts on the size her note recommends
  if (newTankDrawn < u.time - u.dt - 1e-4 && tourShowing(app)) app.panel.shellSel = suggestedShell(app);
  newTankDrawn = u.time;
  const shells = shellsForSale(s);
  const cur = pickedShell(app);
  const lw = Math.floor(w * 0.5);
  u.panel(x, y, lw, h, 'inset', false);
  u.mark('shells', x, y, lw, h);
  column(u, 'shells', x + 6, y + 6, lw - 8, h - 12, (x, y, w) => {
    for (const sh of shells) {
      const rh = M.line * 2 + 6;
      // (every row is marked, so the tour can point at one size)
      u.mark(`shell:${sh.id}`, x - 3, y - 2, w + 6, rh);
      if (u.row(x - 3, y - 2, w + 6, rh, sh === cur)) app.panel.shellSel = sh.id;
      u.text(sh.name, x, y, C.strong, { maxW: w - 70 });
      u.text(`${sh.gal ? `${sh.gal} gal, ` : `${Math.round(sh.liters / 3.785)} gal, `}${sh.liters} L, ${sh.cm[0]}x${sh.cm[1]}x${sh.cm[2]} cm`, x, y + M.line, C.textDim, { maxW: w - 70 });
      u.text(`${ICON.coin} ${shellPrice(s, sh)}`, x + w, y, C.gold, { align: 'right' });
      y += rh;
    }
    return y;
  });
  const sh = pickedShell(app);
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
    // why a water is greyed out: this tank does not take it, else the tier has not opened it yet
    const opens = TIERS.findIndex((_, i) => watersAvailable({ ...s, tier: i }).includes(wt));
    const why = ok ? undefined : sh.water && !sh.water.includes(wt) ? `The ${sh.name} only takes ${sh.water.join(' or ')} water`
      : `${wt === 'brackish' ? 'Brackish' : 'Saltwater'} opens at the ${TIERS[Math.max(0, opens)].name} tier`;
    if (u.button(`water${wt}`, bx, dy, bw, M.btn, wt, { active: app.panel.waterSel === wt, disabled: !ok, style: 'flat', tip: why })) app.panel.waterSel = wt;
    bx += bw + 3;
  }
  dy += M.btn + 10;
  const cost = shellPrice(s, sh);
  const rack = app.newTankBay >= BAL.rackBay;
  u.para(rack ? 'A stock tank for the back room. Breed fish and grow plants in it; customers buy the healthy adults (above the breeders you keep) and the cuttings.' : 'It arrives filled and empty. Add a filter, let the nitrogen cycle establish, then scape and stock it.', dx, dy, dw, rack ? C.accent : C.textDim);
  if (u.button('build', dx, y + h - M.btn - 4, dw, M.btn + 4, `Build for ${ICON.coin}${cost}`, { style: 'good', disabled: s.coins < cost, tip: s.coins < cost ? `Not enough coins: ${cost} needed` : undefined })) {
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
