// The game's two pixel typefaces, both made with PixelLab (create_font) and baked into glyph tables
// by scripts/font-build.ts: "Fronds Text", a rounded 2 px-stroke face for everything you read, and
// "Fronds Display", a bubbly bold face for titles, names and big numbers. Cells are 14 px tall
// with the baseline on row 10, so the two faces mix on one line. Glyphs PixelLab doesn't make
// (& < > [ ] | # ~ ^ and the inline icons) are drawn here in the same 2 px style.
// Glyphs are pre-rendered into an atlas once per face and color.
import { PALETTE } from '../data/palette';
import * as DISPLAY from './fonts/display16';
import * as TEXT from './fonts/text16';

export type Face = 'text' | 'display';

const pad =(top: number, body: string[], w = body[0].length) => {
  const blank = '.'.repeat(w);
  const out = [...Array(top).fill(blank), ...body];
  while (out.length < 14) out.push(blank);
  return out.join('|');
};

/** extra glyphs for the text face (rows 0-13, baseline row 10) */
const EXTRA: Record<string, string> = {
  '&': pad(1, ['..###...', '.##.##..', '.##.##..', '..###...', '.####.##', '##.####.', '##..##..', '##.####.', '.###.###', '........']),
  '<': pad(2, ['.....##', '...####', '.####..', '###....', '.####..', '...####', '.....##']),
  '>': pad(2, ['##.....', '####...', '..####.', '....###', '..####.', '####...', '##.....']),
  '[': pad(1, ['####', '##..', '##..', '##..', '##..', '##..', '##..', '##..', '##..', '##..', '##..', '####']),
  ']': pad(1, ['####', '..##', '..##', '..##', '..##', '..##', '..##', '..##', '..##', '..##', '..##', '####']),
  '|': pad(0, Array(13).fill('##')),
  '#': pad(2, ['.##.##.', '.##.##.', '#######', '.##.##.', '.##.##.', '#######', '.##.##.', '.##.##.']),
  '~': pad(4, ['.###..##', '##.####.', '........']),
  '^': pad(1, ['..##..', '.####.', '##..##']),
};

/** extra glyphs for the display face */
const EXTRA_DISPLAY: Record<string, string> = {
  '&': pad(1, ['..####....', '.######...', '.##..##...', '.######...', '..####..##', '.########.', '###.######', '###..####.', '##########', '.####..###']),
};

/** inline icons, drawn in the text color (use via ICON) */
const ICONS: Record<string, string> = {
  '\u0001': pad(1, ['.##...##.', '####.####', '#########', '#########', '#########', '.#######.', '..#####..', '...###...', '....#....']), // heart
  // the coin: a rim in the text color with a gold face inlaid (COIN_FACE), and a blank column so a
  // number never butts against it (a plain ring read as a zero: "Build for 025")
  '\u0002': pad(1, ['..#####...', '.##...##..', '##.....##.', '#.......#.', '#.......#.', '#.......#.', '##.....##.', '.##...##..', '..#####...']), // coin
  '\u0018': pad(1, ['..........', '...###....', '..#####...', '.###.###..', '.##.####..', '.#######..', '..#####...', '...###....', '..........']), // coin face
  '\u0003': pad(1, ['....###', '...###.', '..###..', '.######', '#######', '...###.', '..###..', '.###...', '.##....', '.#.....']), // bolt
  '\u0004': pad(1, ['.....#.....', '....###....', '....###....', '###########', '.#########.', '..#######..', '..#######..', '.####.####.', '.###...###.', '.#.......#.']), // star
  '\u0005': pad(1, ['..#####..', '.##...##.', '##..#..##', '#...#...#', '#...###.#', '#.......#', '##.....##', '.##...##.', '..#####..']), // clock
  '\u0006': pad(1, ['....#....', '...###...', '..#####..', '.#######.', '#########', '...###...', '...###...', '...###...', '...###...']), // up
  '\u0007': pad(1, ['...###...', '...###...', '...###...', '...###...', '#########', '.#######.', '..#####..', '...###...', '....#....']), // down
  '\u0008': pad(2, ['##.....', '####...', '######.', '#######', '######.', '####...', '##.....']), // right
  '\u000e': pad(2, ['.....##', '...####', '.######', '#######', '.######', '...####', '.....##']), // left
  '\u000f': pad(1, ['...###...', '.#.###.#.', '#########', '.##...##.', '###...###', '.##...##.', '#########', '.#.###.#.', '...###...']), // cog
  '\u0010': pad(3, ['...####...#', '.#######.##', '##.########', '##########.', '.#######.##', '...####...#']), // fish
  '\u0011': pad(1, ['...#...', '..###..', '..###..', '.#####.', '.#####.', '#######', '###.###', '#######', '.#####.', '..###..']), // drop
  '\u0012': pad(1, ['......###', '....#####', '..#######', '.####.###', '####.####', '###.####.', '##.####..', '#.####...', '.#.......', '#........']), // leaf
  '\u0013': pad(1, ['.###.', '.#.#.', '.#.#.', '.###.', '.###.', '.###.', '#####', '#####', '#####', '.###.']), // thermometer
  '\u0014': pad(2, ['###########', '##.......##', '#.#.....#.#', '#..#...#..#', '#...###...#', '#.........#', '###########']), // letter
  '\u0015': pad(2, ['....#....', '....#....', '...###...', '.#######.', '...###...', '....#....', '....#....']), // sparkle
  '\u0016': pad(2, ['...##...', '...##...', '########', '########', '...##...', '...##...']), // plus
  '\u0017': pad(1, ['..#####..', '.#.....#.', '#..##...#', '#.##....#', '#.......#', '#.......#', '#.......#', '.#.....#.', '..#####..']), // bubble
};

/** hand fixes to the generated tables (PixelLab drew these a row off or with a stray pixel) */
function fixText(g: Record<string, string>) {
  const j = g['J'].split('|');
  g['J'] = ['.'.repeat(j[0].length), ...j.slice(0, -1)].join('|');
  const one = g['1'].split('|');
  g['1'] = [...one.slice(1), '.'.repeat(one[0].length)].join('|');
}
function fixDisplay(g: Record<string, string>) {
  const a = g['a'].split('|');
  a[11] = '.'.repeat(a[0].length);
  g['a'] = a.join('|');
}

export const ICON = {
  heart: '\u0001', coin: '\u0002', bolt: '\u0003', star: '\u0004', clock: '\u0005',
  up: '\u0006', down: '\u0007', right: '\u0008', left: '\u000e', cog: '\u000f',
  fish: '\u0010', drop: '\u0011', leaf: '\u0012', temp: '\u0013', letter: '\u0014', sparkle: '\u0015', plus: '\u0016', bubble: '\u0017',
};

/** the gold face inlaid in every coin glyph, whatever color the text around it */
const COIN_FACE = { ch: '\u0018', color: PALETTE[18] };

export const FONT_H = 14; // cell height incl. descenders; caps sit on rows 1-10
export const LINE_H = 15;

interface Glyph { w: number; rows: string[]; ax: number; ay: number }
interface FaceData { glyphs: Map<string, Glyph>; space: number; atlas: HTMLCanvasElement | null; tinted: Map<string, HTMLCanvasElement> }

function build(src: Record<string, string>, space: number): FaceData {
  const glyphs = new Map<string, Glyph>();
  for (const [ch, def] of Object.entries(src)) {
    const r = def.split('|');
    while (r.length < FONT_H) r.push('.'.repeat(r[0].length));
    glyphs.set(ch, { w: r[0].length, rows: r.slice(0, FONT_H), ax: 0, ay: 0 });
  }
  return { glyphs, space, atlas: null, tinted: new Map() };
}

/** accents over lowercase letters, two rows tall on rows 0-1 (empty above the x-height), so names
 *  like Tomás, Lucía and Señor keep them */
const MARKS = { acute: ['..##', '.##.'], tilde: ['.###.##', '##.###.'], diaeresis: ['##..##', '##..##'] };
const ACCENTED: [string, string, keyof typeof MARKS][] = [
  ['á', 'a', 'acute'], ['é', 'e', 'acute'], ['í', 'i', 'acute'], ['ó', 'o', 'acute'], ['ú', 'u', 'acute'],
  ['ñ', 'n', 'tilde'], ['ü', 'u', 'diaeresis'],
];

/** add the accented letters to a face (the accents it cannot fit are left to clean()) */
function addAccents(g: Record<string, string>): Set<string> {
  const made = new Set<string>();
  for (const [ch, base, mark] of ACCENTED) {
    if (!g[base]) continue;
    let rows = g[base].split('|');
    // the dot of an i makes way for its accent, and a narrow i widens to hold it
    if (base === 'i') rows = rows.map((r, y) => (y < 3 ? '.'.repeat(r.length) : r));
    const m = MARKS[mark];
    if (rows[0].length < m[0].length) {
      const l = Math.floor((m[0].length - rows[0].length) / 2), r = m[0].length - rows[0].length - l;
      rows = rows.map((row) => '.'.repeat(l) + row + '.'.repeat(r));
    }
    if (rows.slice(0, 3).some((r) => r.includes('#'))) continue;
    const off = Math.floor((rows[0].length - m[0].length) / 2);
    for (let y = 0; y < m.length; y++) rows[y] = rows[y].slice(0, off) + m[y] + rows[y].slice(off + m[y].length);
    g[ch] = rows.join('|');
    made.add(ch);
  }
  return made;
}

const textSrc = { ...TEXT.GLYPHS };
fixText(textSrc);
const displaySrc = { ...DISPLAY.GLYPHS };
fixDisplay(displaySrc);
const textAccents = addAccents(textSrc), displayAccents = addAccents(displaySrc);
/** accented letters both faces draw (the rest lose their accent, see clean) */
const KEEP = new Set([...textAccents].filter((ch) => displayAccents.has(ch)));
const FACES: Record<Face, FaceData> = {
  text: build({ ...textSrc, ...EXTRA, ...ICONS }, 5),
  // the display face borrows the text face's punctuation and icons where it has none
  display: build({ ...EXTRA, ...ICONS, ...displaySrc, ...EXTRA_DISPLAY }, 6),
};
for (const [ch, g] of FACES.text.glyphs) if (!FACES.display.glyphs.has(ch)) FACES.display.glyphs.set(ch, { ...g });

function glyph(ch: string, face: Face): Glyph {
  const f = FACES[face];
  return f.glyphs.get(ch) ?? f.glyphs.get('?')!;
}

export function glyphWidth(ch: string, face: Face = 'text'): number {
  return ch === ' ' ? FACES[face].space : glyph(ch, face).w;
}

/** keep the accented letters the faces have (á, ñ...) and strip the accent from any other, so
 *  everything draws with the glyphs there are */
export function clean(s: string): string {
  if (!/[^\x00-\x7f]/.test(s)) return s;
  let out = '';
  for (const ch of s.normalize('NFC')) out += ch < '\x80' || KEEP.has(ch) ? ch : ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return out;
}

export function textWidth(s: string, face: Face = 'text'): number {
  s = clean(s);
  let w = 0;
  for (let i = 0; i < s.length; i++) w += glyphWidth(s[i], face) + 1;
  return Math.max(0, w - 1);
}

/** Cut text to fit a pixel width, ending in '..' when it had to be shortened. */
export function ellipsize(s: string, maxW: number, face: Face = 'text'): string {
  if (textWidth(s, face) <= maxW) return s;
  let t = s;
  while (t.length > 1 && textWidth(t.trimEnd() + '..', face) > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '..';
}

/** Word-wrap text to a pixel width. Respects explicit '\n'. */
export function wrapText(s: string, maxW: number, face: Face = 'text'): string[] {
  const out: string[] = [];
  for (const para of s.split('\n')) {
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (textWidth(test, face) > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

// ---- atlas rendering (browser only) ----

const ATLAS_COLS = 16;

function buildAtlas(f: FaceData): HTMLCanvasElement {
  const chars = [...f.glyphs.keys()];
  const CELL_W = Math.max(...[...f.glyphs.values()].map((g) => g.w)) + 1;
  const rowsN = Math.ceil(chars.length / ATLAS_COLS);
  const c = document.createElement('canvas');
  c.width = ATLAS_COLS * CELL_W;
  c.height = rowsN * FONT_H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  chars.forEach((ch, i) => {
    const g = f.glyphs.get(ch)!;
    g.ax = (i % ATLAS_COLS) * CELL_W;
    g.ay = Math.floor(i / ATLAS_COLS) * FONT_H;
    g.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] === '#') ctx.fillRect(g.ax + x, g.ay + y, 1, 1);
    });
  });
  return c;
}

function atlasFor(face: Face, color: string): HTMLCanvasElement {
  const f = FACES[face];
  if (!f.atlas) f.atlas = buildAtlas(f);
  let a = f.tinted.get(color);
  if (!a) {
    a = document.createElement('canvas');
    a.width = f.atlas.width;
    a.height = f.atlas.height;
    const ctx = a.getContext('2d')!;
    ctx.drawImage(f.atlas, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, a.width, a.height);
    f.tinted.set(color, a);
  }
  return a;
}

/** Draw pixel text. `scale` is an integer multiplier in current transform units. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  color: string,
  scale = 1,
  shadow: string | null = null,
  face: Face = 'text',
): number {
  s = clean(s);
  if (shadow) drawRaw(ctx, s, x, y + scale, shadow, scale, face, false);
  return drawRaw(ctx, s, x, y, color, scale, face, true);
}

function drawRaw(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string, scale: number, face: Face, inlay: boolean): number {
  const atlas = atlasFor(face, color);
  let cx = x;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') {
      cx += (FACES[face].space + 1) * scale;
      continue;
    }
    const g = glyph(s[i], face);
    ctx.drawImage(atlas, g.ax, g.ay, g.w, FONT_H, cx, y, g.w * scale, FONT_H * scale);
    if (inlay && s[i] === ICON.coin) {
      const f = glyph(COIN_FACE.ch, face);
      ctx.drawImage(atlasFor(face, COIN_FACE.color), f.ax, f.ay, f.w, FONT_H, cx, y, f.w * scale, FONT_H * scale);
    }
    cx += (g.w + 1) * scale;
  }
  return cx - x;
}
