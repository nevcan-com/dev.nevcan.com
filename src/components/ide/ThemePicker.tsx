/**
 * The colour theme picker, like an editor's "Color Theme" quick pick: ↑ ↓ preview a theme live,
 * Enter or a click picks it, Esc (or a click outside) goes back to the one you had. Previewing
 * saves nothing; picking saves the theme on this device (lib/theme.ts).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { DEFAULT_THEME, THEMES, type Theme } from '@/data/themes';
import { currentTheme, pickTheme, showTheme } from '@/lib/theme';

export default function ThemePicker({ onClose }: { onClose: () => void }) {
  const original = useRef(currentTheme());
  const [focus, setFocus] = useState(() => THEMES.indexOf(original.current));
  const list = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);

  const cancel = () => {
    showTheme(original.current);
    onClose();
  };
  const pick = (t: Theme) => {
    pickTheme(t);
    onClose();
  };

  useEffect(() => {
    list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[focus]?.focus();
  }, [focus]);

  // a click outside cancels, like Esc
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) cancel();
    };
    addEventListener('pointerdown', away, true);
    return () => removeEventListener('pointerdown', away, true);
  });

  const move = (to: number) => {
    const i = (to + THEMES.length) % THEMES.length;
    setFocus(i);
    showTheme(THEMES[i]!);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      move(focus + (e.key === 'ArrowDown' ? 1 : -1));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      move(e.key === 'Home' ? 0 : THEMES.length - 1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
    // keep these keys away from the page (the terminal, open programs)
    e.stopPropagation();
  };

  return (
    <div
      ref={box}
      className="theme-pick"
      role="dialog"
      aria-label="Colour theme"
      onKeyDown={onKeyDown}
    >
      <p className="theme-pick-title">Colour theme</p>
      <div ref={list} role="listbox" aria-label="Themes">
        {THEMES.map((t, i) => {
          const c = t.colors;
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t === original.current}
              className={`theme-opt${i === focus ? ' focused' : ''}`}
              onClick={() => pick(t)}
              onFocus={() => setFocus(i)}
            >
              <span className="theme-swatch" style={{ background: c.bg, borderColor: c.line }}>
                {[c.accent, c.dir, c.warm, c.err].map((x) => (
                  <i key={x} style={{ background: x }} />
                ))}
              </span>
              <span className="theme-name">
                {t.label}
                {t === DEFAULT_THEME && <span className="theme-note"> default</span>}
                {t.light && <span className="theme-note"> light</span>}
              </span>
              {t === original.current && (
                <span className="theme-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="theme-pick-foot">
        <span className="hide-touch">↑ ↓ preview · Enter picks · Esc goes back · </span>
        <strong>Saved on this device</strong> when you pick one
      </p>
    </div>
  );
}
