// The keepsake shelf's layout: which keepsakes go on which plank, at what size, in a patch of wall.
// Pure (no drawing), so the hall can ask how much wall it needs and the tests can check it at
// every screen size. The Codex (Plaques) lists every keepsake; the shelf shows what its wall has
// room for.

export interface ShelfItem {
  id: string;
  /** the art's size at 1x */
  w: number;
  h: number;
}

export interface ShelfSpot {
  id: string;
  x: number;
  /** the plank it stands on, 0 at the top */
  row: number;
  w: number;
  h: number;
}

export interface Shelf {
  /** the scale they are drawn at */
  scale: number;
  spots: ShelfSpot[];
  /** the y of each plank's top edge (where the keepsakes stand), from the top of the area */
  planks: number[];
  /** how many earned keepsakes did not fit (mostly the oldest) */
  hidden: number;
  /** where the "+N" tag for them goes, when some are hidden (none when the tag would take the
   *  place of a keepsake that stood before) */
  more?: { x: number; row: number };
}

/** space between keepsakes on a plank, the wall left at each end, the plank and its brackets under
 *  each row, and the most planks one patch of wall gets */
const GAP = 4, END = 5, PLANK = 8;
export const SHELF_ROWS = 3;

/** room for the "+N" tag: its text and a little air */
export function tagW(n: number): number {
  return 8 + 6 * String(n).length;
}

/**
 * Lay the keepsakes (oldest first, as earned) on up to three planks across a w x h patch of wall:
 * all of them at the first scale that fits; else as many as fit at the last scale, with room
 * beside them for a "+N" tag for the rest. One more keepsake never leaves fewer on the shelf: the
 * ones hidden are the oldest that let the most stand (a tall newest one can be among them), and
 * when the tag itself would cost a place it is left off (each keepsake's tip still says how many
 * more the Codex has). Null when not even one fits.
 */
export function layoutShelf(items: ShelfItem[], w: number, h: number, scales: number[]): Shelf | null {
  if (!items.length) return null;
  // (the hall asks every frame, for several window heights: the answer only changes with the wall)
  const key = `${w}x${h}|${scales.join(',')}|${items.map((k) => `${k.id}:${k.w}:${k.h}`).join(' ')}`;
  const known = memo.get(key);
  if (known !== undefined) return known;
  const shelf = layout(items, w, h, scales);
  if (memo.size > 400) memo.clear();
  memo.set(key, shelf);
  return shelf;
}

const memo = new Map<string, Shelf | null>();

function layout(items: ShelfItem[], w: number, h: number, scales: number[]): Shelf | null {
  for (const scale of scales) {
    const all = place(items, w, h, scale, 0);
    if (all) return { ...all, hidden: 0 };
  }
  const scale = scales[scales.length - 1];
  const most = (tag: boolean): Shelf | null => {
    for (let n = items.length - 1; n >= 1; n--) {
      const hidden = items.length - n;
      for (const out of combos(items.length, hidden)) {
        const some = place(items.filter((_, i) => !out.includes(i)), w, h, scale, tag ? tagW(hidden) : 0);
        if (some) return { ...some, hidden };
      }
    }
    return null;
  };
  const tagged = most(true), shown = tagged?.spots.length ?? 0;
  if (tagged && shown >= items.length - 1) return tagged;
  // fewer than stood before the newest was earned: those still fit, without the tag
  const before = items.length > 1 ? (layoutShelf(items.slice(0, -1), w, h, scales)?.spots.length ?? 0) : 0;
  return tagged && shown >= before ? tagged : most(false);
}

/** every way to pick k of 0..n-1, the oldest first (lexicographic order) */
function* combos(n: number, k: number): Generator<number[]> {
  const c = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield c;
    let i = k - 1;
    while (i >= 0 && c[i] === n - k + i) i--;
    if (i < 0) return;
    c[i]++;
    for (let j = i + 1; j < k; j++) c[j] = c[j - 1] + 1;
  }
}

interface Row {
  /** the tallest on it (the first placed: they go tallest first) */
  h: number;
  /** the width taken, gaps included */
  used: number;
  at: { id: string; i: number; w: number; h: number }[];
}

/**
 * One try at one scale: which plank each keepsake stands on. A plank is as tall as the tallest on
 * it, so they are sorted by height and the planks searched (a few keepsakes, at most three planks)
 * for a split that fits: filled in earned order, the two 27 px keepsakes landed on different
 * planks and eight needed 74 px of wall, where a plank of the tall ones over one of the short
 * ones fits them in 69 (a 1080p browser window's wall is 116x70). A reserve
 * keeps room for the tag beside the keepsakes on one plank (never alone on a plank of its own),
 * and that plank goes at the bottom. On a plank they stand oldest first.
 */
function place(items: ShelfItem[], w: number, h: number, scale: number, reserve: number): Omit<Shelf, 'hidden'> | null {
  const inner = w - END * 2;
  const sized = items
    .map((k, i) => ({ id: k.id, i, w: Math.round(k.w * scale), h: Math.round(k.h * scale) }))
    .sort((a, b) => b.h - a.h || b.w - a.w || a.i - b.i);
  if (sized.some((k) => k.w > inner)) return null;
  // what is still to place, in width (each with the gap before it), from item i on
  const rest: number[] = [];
  for (let i = sized.length - 1, sum = 0; i >= 0; i--) rest[i] = sum += sized[i].w + GAP;
  const lowest = sized[sized.length - 1].h;
  const rows: Row[] = [];
  const tall = (r: Row) => r.h + 2 + PLANK;
  let tagRow = -1;
  const fits = (i: number, usedH: number): boolean => {
    if (i === sized.length) {
      if (!reserve) return true;
      // the tag beside the keepsakes on a plank with room left for it
      tagRow = rows.findIndex((r) => r.used + GAP + reserve <= inner && usedH - tall(r) + Math.max(r.h, 12) + 2 + PLANK <= h);
      return tagRow >= 0;
    }
    // not enough plank left for the rest, even on the planks that could still go up
    const more = Math.min(SHELF_ROWS - rows.length, Math.floor((h - usedH) / (lowest + 2 + PLANK)));
    let room = more * (inner + GAP);
    for (const r of rows) room += inner - r.used;
    if (rest[i] + (reserve ? reserve + GAP : 0) > room) return false;
    const k = sized[i];
    const tried = new Set<string>();
    for (const r of rows) {
      const same = `${r.h}:${r.used}`;
      if (r.used + GAP + k.w > inner || tried.has(same)) continue;
      tried.add(same);
      r.used += GAP + k.w;
      r.at.push(k);
      if (fits(i + 1, usedH)) return true;
      r.at.pop();
      r.used -= GAP + k.w;
    }
    if (rows.length < SHELF_ROWS && usedH + k.h + 2 + PLANK <= h) {
      rows.push({ h: k.h, used: k.w, at: [k] });
      if (fits(i + 1, usedH + k.h + 2 + PLANK)) return true;
      rows.pop();
    }
    return false;
  };
  if (!fits(0, 0)) return null;
  // tallest plank at the top, and the tag's at the bottom
  const order = rows.map((r, n) => ({ r, n })).sort((a, b) => Number(a.n === tagRow) - Number(b.n === tagRow) || b.r.h - a.r.h).map((q) => q.r);
  const spots: ShelfSpot[] = [];
  const planks: number[] = [];
  let y = 0, more: Shelf['more'];
  order.forEach((r, row) => {
    let x = END;
    for (const k of [...r.at].sort((a, b) => a.i - b.i)) {
      spots.push({ id: k.id, x, row, w: k.w, h: k.h });
      x += k.w + GAP;
    }
    if (r === rows[tagRow]) more = { x, row };
    y += Math.max(r.h, r === rows[tagRow] ? 12 : 0) + 2;
    planks.push(y);
    y += PLANK;
  });
  return { scale, spots, planks, more };
}
