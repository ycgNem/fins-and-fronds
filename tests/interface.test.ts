// The interface's own rules, checked without a screen: the keepsake shelf keeps the newest on a
// small wall and counts the rest (and never shows fewer when one more is earned), letters never
// call a tank close to a type it cannot become, a codex picture of a big animal never comes out
// smaller than a small one, the rack says why its sick and named animals are not for sale, the
// new-chapter banner keeps clear of the toasts, and big gliders keep their whole body inside the
// glass while a school of rays moves together, and the pixel font keeps the accents in the
// correspondents' names.
import { describe, expect, it } from 'vitest';
import { shell, species } from '../src/data';
import { Game } from '../src/sim/Game';
import { newAnimal } from '../src/sim/life';
import { emptyTank, newGame, place } from '../src/sim/newgame';
import { geom } from '../src/sim/facts';
import type { GameState, Tank } from '../src/sim/state';
import { Agents } from '../src/render/agents';
import { couldBecome, heldBack, letterProgress, rackCount } from '../src/ui/hints';
import { bannerBox } from '../src/ui/hud';
import { layoutShelf, type ShelfItem } from '../src/ui/shelf';
import { codexZoom } from '../src/ui/windows';
import { clean, textWidth } from '../src/ui/font';

function shop(tier = 5): GameState {
  const s = newGame(4);
  s.tutorial.done = true;
  s.tier = tier;
  s.coins = 1e6;
  return s;
}

function tank(s: GameState, bay: number, sh: string, items: [string, number][], stock: [string, number][], water: 'fresh' | 'marine'): Tank {
  const t = emptyTank(s, bay, sh, water);
  t.chem.bacA = 1;
  t.chem.bacB = 1;
  t.ageDays = 30;
  for (const [id, fx] of items) place(s, t, id, Math.round(fx * shell(sh).w), 1);
  for (const [sp, n] of stock) for (let i = 0; i < n; i++) t.animals.push(newAnimal(s, sp));
  s.tanks.push(t);
  return t;
}

// the ten keepsakes' art at 1x (src/art/keepsakes.json), oldest first
const KEEPSAKES: ShelfItem[] = [
  ['tomas', 24, 26], ['reyes', 24, 22], ['junie', 24, 21], ['okafor', 20, 24], ['driftwood', 14, 27],
  ['wren', 25, 17], ['pip', 16, 23], ['abe', 16, 27], ['nwosu', 24, 19], ['ida', 18, 24],
].map(([id, w, h]) => ({ id: id as string, w: w as number, h: h as number }));

describe('keepsake shelf', () => {
  it('shows all ten on the wall a 1920x1080 hall has (UI 960x540, the window giving up some height)', () => {
    const shelf = layoutShelf(KEEPSAKES, 116, 111, [1.25, 1])!;
    expect(shelf.hidden).toBe(0);
    expect(shelf.spots.map((k) => k.id).sort()).toEqual(KEEPSAKES.map((k) => k.id).sort());
    // nothing overlaps and nothing leaves the wall
    for (const a of shelf.spots) {
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.w).toBeLessThanOrEqual(116);
      expect(shelf.planks[a.row] - a.h).toBeGreaterThanOrEqual(0);
      for (const b of shelf.spots) if (a !== b && a.row === b.row) expect(a.x + a.w <= b.x || b.x + b.w <= a.x).toBe(true);
    }
  });

  it('draws them at the props\' scale when the wall is roomy (1280x720)', () => {
    expect(layoutShelf(KEEPSAKES, 148, 190, [1.25, 1])?.scale).toBe(1.25);
  });

  it('keeps the newest on a small wall, with room for a "+N" for the rest', () => {
    const shelf = layoutShelf(KEEPSAKES, 116, 40, [1.25, 1])!;
    expect(shelf.hidden).toBeGreaterThan(0);
    expect(shelf.spots.length + shelf.hidden).toBe(KEEPSAKES.length);
    // the one just earned is always there
    expect(shelf.spots.map((k) => k.id)).toContain('ida');
    expect(shelf.more).toBeDefined();
    // the tag stands after the last keepsake on the last plank, not on a plank of its own
    const last = shelf.spots.filter((k) => k.row === shelf.more!.row).reduce((a, k) => Math.max(a, k.x + k.w), 0);
    expect(last).toBeGreaterThan(0);
    expect(shelf.more!.x).toBeGreaterThanOrEqual(last);
    expect(shelf.more!.row).toBe(shelf.planks.length - 1);
    expect(layoutShelf(KEEPSAKES, 116, 10, [1.25, 1])).toBeNull();
  });

  it('stands eight of the ten on the wall of a 1080p browser window (UI 960x464), tall ones together', () => {
    // in earned order the two 27 px keepsakes went on different planks, and 8 earned showed 4
    const shelf = layoutShelf(KEEPSAKES.slice(0, 8), 116, 70, [1.25, 1])!;
    expect(shelf.hidden).toBe(0);
    expect(shelf.planks[shelf.planks.length - 1] + 8).toBeLessThanOrEqual(70);
    expect(layoutShelf(KEEPSAKES, 116, 70, [1.25, 1])!.spots.length).toBe(8);
  });

  it('never shows fewer when one more is earned, in any order, on the walls the hall has', () => {
    // the hall's wall at 1920x900, 1366x657 at 150%, 1920x929, 1920x969, a small one and two roomy
    const walls: [number, number][] = [[116, 66], [116, 69], [116, 70], [116, 71], [116, 72], [116, 40], [148, 74], [148, 84]];
    let seed = 3;
    const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32;
    const orders = [KEEPSAKES, [...KEEPSAKES].reverse()];
    for (let i = 0; i < 25; i++) {
      const o = [...KEEPSAKES];
      for (let j = o.length - 1; j > 0; j--) {
        const k = Math.floor(rnd() * (j + 1));
        [o[j], o[k]] = [o[k], o[j]];
      }
      orders.push(o);
    }
    for (const [w, h] of walls) for (const order of orders) {
      let before = 0;
      for (let n = 1; n <= order.length; n++) {
        const shelf = layoutShelf(order.slice(0, n), w, h, [1.25, 1]);
        const shown = shelf?.spots.length ?? 0;
        expect(shown, `${w}x${h}, ${n} earned: ${order.map((k) => k.id).join(' ')}`).toBeGreaterThanOrEqual(before);
        if (shelf) {
          expect(shown + shelf.hidden).toBe(n);
          // nothing overlaps, nothing leaves the wall, and the tag stands after the last on its plank
          expect(shelf.planks[shelf.planks.length - 1] + 8).toBeLessThanOrEqual(h);
          for (const a of shelf.spots) {
            expect(a.x + a.w).toBeLessThanOrEqual(w - 5);
            expect(shelf.planks[a.row] - a.h).toBeGreaterThanOrEqual(a.row ? shelf.planks[a.row - 1] + 8 : 0);
            for (const b of shelf.spots) if (a !== b && a.row === b.row) expect(a.x + a.w <= b.x || b.x + b.w <= a.x).toBe(true);
          }
          if (shelf.more) for (const a of shelf.spots) if (a.row === shelf.more.row) expect(shelf.more.x).toBeGreaterThanOrEqual(a.x + a.w);
        }
        before = shown;
      }
    }
  });
});

describe('codex pictures', () => {
  // every imported creature's art at 1x
  const sheets = import.meta.glob('../src/art/creatures-*.json', { eager: true, import: 'default' }) as Record<string, { frames: Record<string, { w: number; h: number }> }>;
  const art = Object.values(sheets).flatMap((sh) => Object.entries(sh.frames).filter(([k]) => k.endsWith(':0')).map(([k, f]) => ({ sp: k.split(':')[1], w: f.w, h: f.h })));

  it('never draws a big animal smaller than one whose art is smaller both ways', () => {
    expect(art.length).toBeGreaterThan(150);
    // the page at 960x540 (415 wide), a narrower and a wider one, in an inset 136 tall
    for (const page of [415, 340, 520]) {
      const drawn = art.map((a) => {
        const z = codexZoom(a.w, a.h, page - 8, 136);
        return { ...a, dw: Math.round(a.w * z), dh: Math.round(a.h * z) };
      });
      for (const big of drawn) {
        expect(big.dw).toBeLessThanOrEqual(page - 8);
        expect(big.dh).toBeLessThanOrEqual(136);
        for (const small of drawn) {
          if (small.w > big.w || small.h > big.h) continue;
          expect(big.dw >= small.dw || big.dh >= small.dh, `${big.sp} (${big.w}x${big.h}) drawn ${big.dw}x${big.dh}, ${small.sp} (${small.w}x${small.h}) ${small.dw}x${small.dh}`).toBe(true);
        }
      }
    }
    const tall = (sp: string) => {
      const a = art.find((q) => q.sp === sp)!;
      return a.h * codexZoom(a.w, a.h, 407, 136);
    };
    expect(tall('lionfish')).toBeGreaterThan(tall('discus'));
    expect(tall('red_king_crab')).toBeGreaterThan(tall('koi'));
  });
});

describe('the rack', () => {
  it('counts the sick and the named apart, since the counter sells neither', () => {
    const s = shop(4);
    const t = tank(s, 0, 'std_20l', [], [['cherry_shrimp', 15], ['guppy', 12]], 'fresh');
    for (const a of t.animals) a.fry = false;
    t.animals.filter((a) => a.sp === 'cherry_shrimp').slice(0, 6).forEach((a) => (a.health = 0.4));
    t.animals.filter((a) => a.sp === 'guppy').slice(0, 9).forEach((a, i) => (a.name = `Pet ${i}`));
    expect(rackCount(t, 'cherry_shrimp')).toEqual({ well: 9, sick: 6, pets: 0 });
    expect(rackCount(t, 'guppy')).toEqual({ well: 3, sick: 0, pets: 9 });
    // the sick join the breeders first: with 10 kept back, 9 well and 6 sick, 5 of the 6 sell once well
    expect(heldBack(rackCount(t, 'cherry_shrimp'), 10)).toBe('6 sick: 5 of them sell once well');
    expect(heldBack(rackCount(t, 'cherry_shrimp'), 2)).toBe('6 sick: they sell once well');
    expect(heldBack(rackCount(t, 'cherry_shrimp'), 20)).toBe('6 sick: they join the breeders once well');
    expect(heldBack({ well: 0, sick: 1, pets: 0 }, 0)).toBe('1 sick: it sells once well');
    expect(heldBack(rackCount(t, 'guppy'))).toBe('9 named: pets are never sold');
    expect(heldBack({ well: 0, sick: 2, pets: 3 })).toBe('2 sick and 3 pets are not for sale');
    expect(heldBack({ well: 4, sick: 0, pets: 0 })).toBe('');
  });
});

describe('the new-chapter banner', () => {
  // the tier toast it comes with: three lines in the 380 px column, as at 800x450
  const toast = { maxW: 380, boxes: [{ x: 8, y: 40, w: 380, h: 55 }] };
  const clear = (b: { x: number; y: number; w: number; h: number }) => toast.boxes.every((q) => b.x >= q.x + q.w || q.x >= b.x + b.w || b.y >= q.y + q.h || q.y >= b.y + b.h);

  it('stands beside the toasts on an 800-wide screen, below them on a narrower one, centred when they leave room', () => {
    const b800 = bannerBox(800, 328, toast);
    expect(clear(b800)).toBe(true);
    expect(b800.x + b800.w).toBeLessThanOrEqual(792);
    const b700 = bannerBox(700, 328, toast);
    expect(clear(b700)).toBe(true);
    expect(b700.y).toBeGreaterThanOrEqual(95);
    expect(bannerBox(1280, 328, toast)).toMatchObject({ x: 476, y: 80 });
    expect(bannerBox(800, 328, { maxW: 380, boxes: [] })).toMatchObject({ x: 236, y: 80 });
    // and it never hops back up as the toast above it goes
    expect(bannerBox(700, 328, { maxW: 380, boxes: [] }, b700.y).y).toBe(b700.y);
  });
});

describe('letter progress', () => {
  it('never calls a freshwater tank close to a Seahorse Tank, however many ribbon plants it has', () => {
    const s = shop(4);
    const t = tank(s, 0, 'std_20l', [['vallisneria', 0.3], ['vallisneria', 0.6], ['jungle_val', 0.8]], [['neon_tetra', 8]], 'fresh');
    const g = new Game(s);
    g.refreshAll();
    const st = g.stats.get(t.id)!;
    expect(st.cls.near.filter((r) => r.def.id === 'seahorse' && couldBecome(r, t))).toEqual([]);
    expect(letterProgress({ t: 'archetype', id: 'seahorse' }, s, g.stats).text).not.toMatch(/is close\. Next/);
  });
});

describe('creature motion', () => {
  it('keeps every ray inside the glass and a school of cownose rays together', () => {
    const s = shop(4);
    const t = tank(s, 0, 'ray_lagoon', [], [['cownose_ray', 5], ['blue_spotted_stingray', 1]], 'marine');
    const g = geom(t);
    const ag = new Agents();
    ag.sync(t, g, new Set());
    const waterR = Math.min(g.landX, g.w) - 3;
    const ctx = { t, g, lightsOn: true, flow: 1, kreisel: false, caves: [], perches: [] };
    let spread = 0, samples = 0;
    for (let i = 0; i < 60 * 90; i++) {
      ag.update(1 / 60, ctx);
      for (const a of ag.list) {
        expect(a.x - a.len / 2).toBeGreaterThanOrEqual(0);
        expect(a.x + a.len / 2).toBeLessThanOrEqual(waterR + 3);
      }
      if (i % 30 === 0 && i > 60 * 10) {
        const xs = ag.list.filter((a) => a.sp === 'cownose_ray').map((a) => a.x);
        spread += Math.max(...xs) - Math.min(...xs);
        samples++;
      }
    }
    // five rays a body or so apart (they were scattered over most of the 760 px lagoon)
    expect(spread / samples).toBeLessThan(species('cownose_ray').px * 2.5);
  });
});

describe('pixel font', () => {
  it('keeps the accents it can draw and drops the rest', () => {
    expect(clean('Grandpa Tomás')).toBe('Grandpa Tomás');
    expect(clean('Lucía, Señor Sonrisa, igapó, Pátzcuaro, café, Müller')).toBe('Lucía, Señor Sonrisa, igapó, Pátzcuaro, café, Müller');
    // no glyph for these: the plain letter instead of a '?'
    expect(clean('Zoë Åsa Çelik')).toBe('Zoe Asa Celik');
    // a decomposed accent counts the same as a composed one
    expect(clean('Tomás')).toBe('Tomás');
    for (const face of ['text', 'display'] as const) {
      expect(textWidth('Tomás', face)).toBe(textWidth('Tomas', face));
      expect(textWidth('ñ', face)).toBeGreaterThanOrEqual(textWidth('n', face));
    }
  });
});
