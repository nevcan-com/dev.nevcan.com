/**
 * `⎇ main` in the status bar: the live nevcan.com sites as branches (data/branches.ts), like an
 * editor's branch quick pick. A pick runs `git checkout <name>` in the terminal, so it shows what
 * happened; the other sites open in this tab, main and dev stay here.
 * ↑ ↓ or the mouse move, Enter or a click picks, Esc or a click outside goes back.
 */
import { useEffect, useRef, useState } from 'react';
import { BRANCHES, CURRENT } from '@/data/branches';

export default function BranchPicker({
  onPick,
  onClose,
}: {
  onPick: (name: string) => void;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);

  const pick = (name: string) => {
    onClose();
    onPick(name);
  };

  useEffect(() => {
    list.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[focus]?.focus();
  }, [focus]);

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) onClose();
    };
    addEventListener('pointerdown', away, true);
    return () => removeEventListener('pointerdown', away, true);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = BRANCHES.length;
      if (e.key === 'ArrowDown') setFocus((f) => (f + 1) % n);
      else if (e.key === 'ArrowUp') setFocus((f) => (f + n - 1) % n);
      else if (e.key === 'Enter') pick(BRANCHES[focus]!.name);
      else if (e.key === 'Escape') onClose();
      else if (e.key !== 'Tab') return;
      e.preventDefault();
      e.stopPropagation();
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  });

  return (
    <div ref={box} className="theme-pick branch-pick" role="dialog" aria-label="Switch branch">
      <p className="theme-pick-title">Switch branch</p>
      <div ref={list} role="listbox" aria-label="Branches">
        {BRANCHES.map((b, i) => (
          <button
            key={b.name}
            type="button"
            role="option"
            aria-selected={b.name === CURRENT}
            className={`theme-opt${i === focus ? ' focused' : ''}`}
            onClick={() => pick(b.name)}
            onFocus={() => setFocus(i)}
            onPointerMove={(e) => {
              if (e.pointerType === 'mouse' && (e.movementX || e.movementY) && i !== focus)
                setFocus(i);
            }}
          >
            <span className="branch-name">⎇ {b.name}</span>
            <span className="branch-host">{b.url ? b.host : ''}</span>
            {b.note && <span className="theme-note">{b.note}</span>}
            {b.name === CURRENT && (
              <span className="theme-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        ))}
      </div>
      <p className="theme-pick-foot">
        The other nevcan.com sites open in this tab. Here: <code>git branch</code>,{' '}
        <code>git checkout</code>.
      </p>
    </div>
  );
}
