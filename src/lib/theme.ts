/**
 * The colour theme on the page. Base.astro's inline script applies a saved pick before the first
 * paint; this module previews and saves. Previewing never writes anything; only `pickTheme` does,
 * and picking the default removes the entry instead (notes/legal.md, item 12).
 */
import { DEFAULT_THEME, THEME_STORAGE, themeById, type Theme } from '@/data/themes';

/** the theme on the page now */
export function currentTheme(): Theme {
  return themeById(document.documentElement.dataset.theme) ?? DEFAULT_THEME;
}

/** show a theme without saving it (the picker's live preview) */
export function showTheme(t: Theme) {
  const root = document.documentElement;
  if (t === DEFAULT_THEME) delete root.dataset.theme;
  else root.dataset.theme = t.id;
  document
    .querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', t.colors.bg);
  dispatchEvent(new CustomEvent('themechange', { detail: t }));
}

/** the visitor picked this theme: show it and remember it on this device */
export function pickTheme(t: Theme) {
  showTheme(t);
  try {
    if (t === DEFAULT_THEME) localStorage.removeItem(THEME_STORAGE.key);
    else localStorage.setItem(THEME_STORAGE.key, JSON.stringify({ id: t.id, at: Date.now() }));
  } catch {
    /* blocked storage: the theme holds for this page only */
  }
}
