/**
 * Shared bits for terminal programs. A program owns the keyboard while it runs and hands its
 * final output (if any) back with `exit`. Every program is its own lazy chunk (index.ts), so none
 * of this is downloaded until a visitor runs one.
 *
 * The same keys everywhere:
 *   q, Esc, Ctrl+C  quit (where letters are typed, q is a letter: Esc and Ctrl+C only)
 *   Space           pause / go on; after a game ends, play again
 *   Enter           answer or next round, in the games you type into (typing, guess, hangman)
 *   arrows          move (WASD and hjkl too)
 * Programs that print into the scrollback (ping, hire) stop only for Ctrl+C, like the real ones:
 * in a shell, q and Esc would just be typed.
 * One exception, on purpose: `sl` stops for no key at all, like the Unix original.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Line, ProgramName } from '@/lib/shell';

export interface ProgramProps {
  name: ProgramName;
  args: string[];
  /** stop, and print these lines into the scrollback */
  exit: (lines?: Line[]) => void;
}

/** keydown for the whole page while the program runs (capture: before anything else) */
export function useKeys(fn: (e: KeyboardEvent) => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const h = (e: KeyboardEvent) => ref.current(e);
    addEventListener('keydown', h, true);
    return () => removeEventListener('keydown', h, true);
  }, []);
}

const plain = (e: KeyboardEvent) => !e.ctrlKey && !e.metaKey && !e.altKey;

/** Ctrl+C alone: for programs that print into the scrollback (ping, hire), as in a real shell */
export const isInterrupt = (e: KeyboardEvent) => e.ctrlKey && e.key.toLowerCase() === 'c';

/** q, Esc or Ctrl+C. `typing`: the program takes letters, so q is one of them and doesn't quit */
export const isQuit = (e: KeyboardEvent, typing = false) =>
  e.key === 'Escape' ||
  (e.ctrlKey && e.key.toLowerCase() === 'c') ||
  (!typing && e.key === 'q' && plain(e));

/** Space: pause and go on; after a game ends, play again */
export const isSpace = (e: KeyboardEvent) => e.key === ' ' && plain(e);

/** the key line in a program's bottom-right corner, the same in every program */
export function Hint({ keys }: { keys: [key: string, what: string][] }) {
  return (
    <div className="prog-hint">
      {keys.map(([k, what], i) => (
        <span key={k}>
          {i > 0 && ' · '}
          <kbd>{k}</kbd> {what}
        </span>
      ))}
    </div>
  );
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** calls fn every `ms` while mounted (setInterval; browsers slow it down in background tabs) */
export function useTick(ms: number, fn: () => void, enabled = true) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [ms, enabled]);
}

/** how many monospace characters fit in an element, kept up to date on resize */
export function useGrid(ref: RefObject<HTMLElement | null>) {
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const probe = document.createElement('span');
    probe.textContent = 'M'.repeat(10);
    probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
    el.append(probe);
    const cw = probe.getBoundingClientRect().width / 10;
    const ch = probe.getBoundingClientRect().height;
    probe.remove();
    const measure = () =>
      setGrid({
        cols: Math.max(10, Math.floor(el.clientWidth / cw)),
        rows: Math.max(4, Math.floor(el.clientHeight / ch)),
      });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return grid;
}
