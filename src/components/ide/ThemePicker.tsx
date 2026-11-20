/**
 * The color theme picker, like an editor's "Color Theme" quick pick: ↑ ↓ or the mouse hovering
 * preview a theme live,
 * Enter or a click picks it, Esc (or a click outside) goes back to the one you had. Previewing
 * saves nothing; picking saves the theme on this device (lib/theme.ts).
 */
import { useEffect, useRef, useState } from 'react';
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
  // the keys, wherever focus is (the terminal can take focus back as a program ends); capture,
  // so they never reach the page while the picker is open
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp')
        move(focus + (e.key === 'ArrowDown' ? 1 : -1));
      else if (e.key === 'Home' || e.key === 'End') move(e.key === 'Home' ? 0 : THEMES.length - 1);
      else if (e.key === 'Enter') pick(THEMES[focus]!);
      else if (e.key === 'Escape') cancel();
      else if (e.key !== 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  });

  return (
    <div ref={box} className="theme-pick" role="dialog" aria-label="Color theme">
      <p className="theme-pick-title">Color theme</p>
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
              // a mouse previews by hovering, as the arrows do; a touch has no hover. Only a real
              // move counts: a browser sends a still mouse over the list as the picker opens
              onPointerMove={(e) => {
                if (e.pointerType === 'mouse' && (e.movementX || e.movementY) && i !== focus)
                  move(i);
              }}
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
        <span className="hide-touch">
          Hover or ↑ ↓ to preview · click or Enter picks · Esc goes back ·{' '}
        </span>
        <strong>Saved on this device</strong> when you pick one
      </p>
    </div>
  );
}
