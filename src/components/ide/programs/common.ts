/**
 * Shared bits for terminal programs. A program owns the keyboard while it runs and hands its
 * final output (if any) back with `exit`. Every program is its own lazy chunk (index.ts), so none
 * of this is downloaded until a visitor runs one.
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

export const isQuit = (e: KeyboardEvent) =>
  e.key === 'q' || e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c');

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
