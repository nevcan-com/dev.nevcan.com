/**
 * Editor color themes. The page's color tokens come from here (Base.astro writes them as CSS),
 * so a palette lives in one place. Nev Style (`nev-style`) is the default and is what visitors see until they
 * pick another one; the pick is kept in localStorage (`dev-theme`) only when they make it.
 *
 * The palettes follow the published color schemes (all MIT licensed): Atom's One Dark, Dracula,
 * Solarized (Ethan Schoonover) and GitHub's Primer. Only color values are used, no logos. Some
 * muted grays are a little brighter (or darker, on light) than the originals so small text
 * passes WCAG AA contrast (4.5:1) on the editor background.
 */

export interface Palette {
  /** editor background */
  bg: string;
  /** title bar, status bar, activity bar */
  chrome: string;
  /** side bar and terminal */
  panel: string;
  /** raised things on a panel: menus, badges */
  'panel-2': string;
  hover: string;
  line: string;
  text: string;
  'text-strong': string;
  /** secondary text: must stay readable */
  muted: string;
  /** decoration only: punctuation, hints, rules */
  faint: string;
  /** the theme's own color: headings, prompt, links */
  accent: string;
  /** directories and links in the terminal */
  dir: string;
  err: string;
  /** strings, emphasis, inline code */
  warm: string;
  /** text on an accent / warm / err background */
  'on-accent': string;
  'on-warm': string;
  'on-err': string;
  /** drop shadows of menus and drawers */
  shadow: string;
}

export interface Theme {
  id: string;
  label: string;
  light: boolean;
  colors: Palette;
}

export const THEMES: Theme[] = [
  {
    id: 'nev-style',
    label: 'Nev Style',
    light: false,
    colors: {
      bg: '#0b0f14',
      chrome: '#0e131a',
      panel: '#10161e',
      'panel-2': '#141b24',
      hover: '#1a232e',
      line: '#1f2934',
      text: '#d7dee7',
      'text-strong': '#f3f6f9',
      muted: '#7f8c9b',
      faint: '#4f5b68',
      accent: '#6ff7e0',
      dir: '#8ab4ff',
      err: '#ff7b72',
      warm: '#ffcf7a',
      'on-accent': '#062420',
      'on-warm': '#1b1405',
      'on-err': '#1a0f0f',
      shadow: 'rgb(0 0 0 / 0.5)',
    },
  },
  {
    id: 'one-dark',
    label: 'One Dark',
    light: false,
    colors: {
      bg: '#282c34',
      chrome: '#21252b',
      panel: '#21252b',
      'panel-2': '#2c313a',
      hover: '#333842',
      line: '#181a1f',
      text: '#abb2bf',
      'text-strong': '#e6e9ef',
      muted: '#8f96a1',
      faint: '#5c6370',
      accent: '#61afef',
      dir: '#c678dd',
      err: '#e8737c',
      warm: '#e5c07b',
      'on-accent': '#1b2129',
      'on-warm': '#2a2215',
      'on-err': '#2a1215',
      shadow: 'rgb(0 0 0 / 0.45)',
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    light: false,
    colors: {
      bg: '#282a36',
      chrome: '#21222c',
      panel: '#21222c',
      'panel-2': '#343746',
      hover: '#44475a',
      line: '#191a21',
      text: '#f8f8f2',
      'text-strong': '#ffffff',
      muted: '#9ea8d4',
      faint: '#6272a4',
      accent: '#bd93f9',
      dir: '#8be9fd',
      err: '#ff5555',
      warm: '#f1fa8c',
      'on-accent': '#1e1530',
      'on-warm': '#282a36',
      'on-err': '#1f0a0a',
      shadow: 'rgb(0 0 0 / 0.45)',
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    light: false,
    colors: {
      bg: '#002b36',
      chrome: '#00212a',
      panel: '#00252f',
      'panel-2': '#073642',
      hover: '#0a404d',
      line: '#0b3a46',
      text: '#93a1a1',
      'text-strong': '#eee8d5',
      muted: '#839496',
      faint: '#586e75',
      accent: '#2aa198',
      dir: '#3d9ae0',
      err: '#f0625d',
      warm: '#c69a1a',
      'on-accent': '#002b36',
      'on-warm': '#002b36',
      'on-err': '#002b36',
      shadow: 'rgb(0 0 0 / 0.45)',
    },
  },
  {
    id: 'github-light',
    label: 'GitHub Light',
    light: true,
    colors: {
      bg: '#ffffff',
      chrome: '#f6f8fa',
      panel: '#f6f8fa',
      'panel-2': '#ffffff',
      hover: '#eaeef2',
      line: '#d0d7de',
      text: '#1f2328',
      'text-strong': '#010409',
      muted: '#59636e',
      faint: '#8c959f',
      accent: '#0969da',
      dir: '#8250df',
      err: '#cf222e',
      warm: '#9a6700',
      'on-accent': '#ffffff',
      'on-warm': '#ffffff',
      'on-err': '#ffffff',
      shadow: 'rgb(31 35 40 / 0.16)',
    },
  },
];

export const DEFAULT_THEME = THEMES[0]!;
export const themeById = (id: string | null | undefined) => THEMES.find((t) => t.id === id);

/** the localStorage entry, written only when a visitor picks a theme (notes/legal.md, item 12) */
export const THEME_STORAGE = {
  key: 'dev-theme',
  /** after this the pick is forgotten, like the cookie choice */
  months: 12,
} as const;

/** the CSS for every theme: `:root` is the default, the others go by `data-theme` on <html> */
export function themeCss(): string {
  const block = (t: Theme) =>
    Object.entries(t.colors)
      .map(([k, v]) => `--${k}:${v};`)
      .join('') + `color-scheme:${t.light ? 'light' : 'dark'};`;
  return THEMES.map((t) =>
    t === DEFAULT_THEME ? `:root{${block(t)}}` : `:root[data-theme='${t.id}']{${block(t)}}`,
  ).join('\n');
}
