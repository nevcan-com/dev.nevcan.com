/**
 * The right-click menu, drawn like the editor's own. Ide.tsx decides the items from what was
 * clicked; this only shows them, keeps them on screen, and handles keys (↑ ↓ Enter Esc).
 * Shift + right-click and right-clicks in text fields keep the browser's own menu.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export type MenuItem =
  { label: string; hint?: string; action: () => void; disabled?: boolean } | 'separator';

interface Props {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
  /** open upwards: (x, y) is the menu's bottom-left corner (the settings gear) */
  up?: boolean;
}

export default function ContextMenu({ x, y, items, onClose, up = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // keep it inside the window
  useLayoutEffect(() => {
    const el = ref.current!;
    const { width, height } = el.getBoundingClientRect();
    setPos({
      left: Math.max(4, Math.min(x, innerWidth - width - 4)),
      top: Math.max(4, Math.min(up ? y - height : y, innerHeight - height - 4)),
    });
    el.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
  }, [x, y, up]);

  useEffect(() => {
    const close = (e: Event) => {
      if (e.type === 'pointerdown' && ref.current?.contains(e.target as Node)) return;
      onClose();
    };
    addEventListener('pointerdown', close, true);
    addEventListener('resize', close);
    addEventListener('blur', close);
    addEventListener('scroll', close, true);
    return () => {
      removeEventListener('pointerdown', close, true);
      removeEventListener('resize', close);
      removeEventListener('blur', close);
      removeEventListener('scroll', close, true);
    };
  }, [onClose]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const buttons = [...ref.current!.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = buttons.length;
      buttons[(i + (e.key === 'ArrowDown' ? 1 : n - 1)) % n]?.focus();
    }
  };

  return (
    <div
      ref={ref}
      className="ctx-menu"
      role="menu"
      style={{ left: pos.left, top: pos.top }}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it === 'separator' ? (
          <div key={i} className="ctx-sep" role="separator" />
        ) : (
          <button
            key={i}
            type="button"
            role="menuitem"
            className="ctx-item"
            disabled={it.disabled}
            onClick={() => {
              onClose();
              it.action();
            }}
          >
            <span>{it.label}</span>
            {it.hint && <span className="ctx-hint">{it.hint}</span>}
          </button>
        ),
      )}
    </div>
  );
}
