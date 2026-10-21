// The game palette: Resurrect 64 by Kerrie Lake (https://lospec.com/palette-list/resurrect-64),
// the same palette as Sprocket & Sprout. Every sprite pixel comes from this list; only scene-level
// light and water grading (tints, god rays, night) may blend off-palette. Rules: STYLE.md.

export const PALETTE = [
  // 0-4 warm neutrals (plum-black up to taupe)
  '#2e222f', '#3e3546', '#625565', '#966c6c', '#ab947a',
  // 5-9 cool neutrals (mauve up to white)
  '#694f62', '#7f708a', '#9babb2', '#c7dcd0', '#ffffff',
  // 10-13 reds, 14-15 crimson
  '#6e2727', '#b33831', '#ea4f36', '#f57d4a', '#ae2334', '#e83b3b',
  // 16-18 orange to gold
  '#fb6b1d', '#f79617', '#f9c22b',
  // 19-23 rust to amber
  '#7a3045', '#9e4539', '#cd683d', '#e6904e', '#fbb954',
  // 24-28 olive to pale yellow
  '#4c3e24', '#676633', '#a2a947', '#d5e04b', '#fbff86',
  // 29-33 greens
  '#165a4c', '#239063', '#1ebc73', '#91db69', '#cddf6c',
  // 34-38 sage
  '#313638', '#374e4a', '#547e64', '#92a984', '#b2ba90',
  // 39-43 teals
  '#0b5e65', '#0b8a8f', '#0eaf9b', '#30e1b9', '#8ff8e2',
  // 44-48 blues
  '#323353', '#484a77', '#4d65b4', '#4d9be6', '#8fd3ff',
  // 49-53 purples
  '#45293f', '#6b3e75', '#905ea9', '#a884f3', '#eaaded',
  // 54-57 roses
  '#753c54', '#a24b6f', '#cf657f', '#ed8099',
  // 58-63 magenta to peach
  '#831c5d', '#c32454', '#f04f78', '#f68181', '#fca790', '#fdcbb0',
] as const;

export const PALETTE_RGB: [number, number, number][] = PALETTE.map((h) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]);

export function col(i: number): string {
  return PALETTE[i];
}

export function rgba(i: number, a: number): string {
  const [r, g, b] = PALETTE_RGB[i];
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Named material ramps, dark to light. Species, plants, corals and stones name a ramp instead of
 * raw indices, so a recolor is one edit here. 3-5 steps each; shadows lean plum, lights lean warm.
 */
export const RAMP = {
  ink: [0, 1, 2],
  black: [0, 1, 5, 2],
  slate: [1, 2, 6, 7],
  silver: [2, 6, 7, 8, 9],
  pearl: [6, 7, 8, 9],
  taupe: [1, 2, 3, 4],
  sand: [3, 4, 38, 63],
  gold_sand: [20, 21, 22, 23],
  red: [10, 11, 15, 13],
  crimson: [19, 14, 15, 61],
  orange: [20, 16, 17, 23],
  gold: [21, 17, 18, 28],
  yellow: [25, 26, 27, 28],
  olive: [24, 25, 26, 27],
  green: [29, 30, 31, 32],
  lime: [30, 31, 32, 33],
  sage: [34, 35, 36, 37, 38],
  teal: [39, 40, 41, 42, 43],
  aqua: [40, 41, 42, 43],
  navy: [0, 44, 45, 46],
  blue: [44, 45, 46, 47],
  sky: [46, 47, 48, 9],
  purple: [49, 50, 51, 52],
  lilac: [50, 51, 52, 53],
  rose: [54, 55, 56, 57],
  pink: [55, 57, 62, 63],
  magenta: [58, 59, 60, 61],
  peach: [21, 22, 62, 63],
  brown: [49, 24, 20, 21],
  wood: [49, 19, 20, 21, 22],
  pale_wood: [3, 4, 22, 63],
  bone: [4, 38, 8, 9],
  glass: [44, 7, 8, 9],
} as const satisfies Record<string, readonly number[]>;

export type RampName = keyof typeof RAMP;

export function ramp(name: RampName): readonly number[] {
  return RAMP[name];
}

/** Index n steps along a ramp, clamped (0 = darkest). Negative counts from the light end. */
export function rampAt(name: RampName, n: number): number {
  const r = RAMP[name];
  const i = n < 0 ? r.length + n : n;
  return r[Math.max(0, Math.min(r.length - 1, i))];
}

/**
 * UI colors (indices), so windows never use raw numbers. The interface is light: sea-glass panels
 * with dark ink, on a sage wall (STYLE.md, Interface). Text colors are chosen to read on `panel`.
 */
export const UI: Record<'ink' | 'panel' | 'panelHi' | 'panelLo' | 'edge' | 'text' | 'strong' | 'textDim' | 'textMute' | 'head' | 'accent' | 'gold' | 'coin' | 'good' | 'warn' | 'bad' | 'pick' | 'pickLo' | 'paper' | 'paperInk' | 'onDark' | 'wallTop' | 'wallBottom' | 'floor', number> = {
  ink: 0,
  /** sea glass: the panel face, its highlight and its shadow */
  panel: 8,
  panelHi: 9,
  panelLo: 7,
  /** panel and button outlines */
  edge: 35,
  /** body text, names and values, quieter text, disabled text */
  text: 1,
  strong: 0,
  textDim: 2,
  textMute: 6,
  /** headings (display face) and accents */
  head: 39,
  accent: 40,
  /** prices in text; the coin itself */
  gold: 20,
  coin: 18,
  good: 30,
  warn: 21,
  bad: 14,
  /** selected things: tabs, toggles, rows */
  pick: 18,
  pickLo: 17,
  paper: 63,
  paperInk: 49,
  /** text drawn over the tank or the wall */
  onDark: 9,
  /** the room: wall top and bottom, wainscot, floor */
  wallTop: 36,
  wallBottom: 35,
  floor: 24,
};

/** Good and bad as blue and orange (told apart with any common color blindness) instead of green
 *  and red. Status colors are read at draw time, so flipping this restyles everything at once. */
export function setCalmColors(on: boolean) {
  UI.good = on ? 47 : 30;
  UI.warn = on ? 23 : 21;
  UI.bad = on ? 16 : 14;
}
