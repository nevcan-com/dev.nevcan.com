/**
 * `nev-career` (also `git log --graph`): the career graph from shell.ts, played as a short film.
 * Rows appear one by one while a year counter and a timeline run along the top. Space pauses,
 * ← → step through it, q / Esc / Ctrl+C quit. Quitting prints the whole graph into the scrollback,
 * where every commit opens its file. With reduced motion it starts at the end.
 */
import { useEffect, useRef, useState } from 'react';
import type { CareerRow, Line } from '@/lib/shell';
import { LineView } from '../TermLine';
import {
  Hint,
  isQuit,
  isSpace,
  reducedMotion,
  useKeys,
  useTick,
  type ProgramProps,
} from './common';

/** ms a row stays before the next: commits get time to be read, connectors just pass */
const pace = (row: CareerRow) => (row.line.some((s) => s.run) ? 1100 : 350);
const BAR = 28;

export default function Career({ args, exit }: ProgramProps) {
  const [rows] = useState<CareerRow[]>(() => JSON.parse(args[0] ?? '[]'));
  const first = rows[0]?.year ?? 2006;
  const last = rows.at(-1)?.year ?? first;
  const [shown, setShown] = useState(() => (reducedMotion() ? rows.length : 1));
  const [paused, setPaused] = useState(false);
  const done = shown >= rows.length;
  const box = useRef<HTMLDivElement>(null);
  const since = useRef(Date.now());

  const lines = (): Line[] => [
    ...rows.map((r) => r.line),
    [],
    [{ t: 'to be continued…', c: 'muted' }],
  ];

  // one row at a time, each at its own pace
  useTick(
    100,
    () => {
      const row = rows[shown - 1];
      if (!row || Date.now() - since.current < pace(row)) return;
      since.current = Date.now();
      setShown((n) => Math.min(rows.length, n + 1));
    },
    !paused && !done,
  );

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [shown]);

  const step = (by: number) => {
    setPaused(true);
    setShown((n) => Math.max(1, Math.min(rows.length, n + by)));
  };

  useKeys((e) => {
    if (isQuit(e)) {
      e.preventDefault();
      exit(lines());
    } else if (isSpace(e)) {
      e.preventDefault();
      if (done) {
        setShown(1);
        setPaused(false);
      } else setPaused((p) => !p);
      since.current = Date.now();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      step(e.key === 'ArrowRight' ? 1 : -1);
    }
  });

  const year = rows[shown - 1]?.year ?? first;
  const filled = last === first ? BAR : Math.round(((year - first) / (last - first)) * BAR);

  return (
    <div className="prog-career">
      <div className="career-head">
        <span className="t-muted">nev-career</span>
        <span className="career-bar" aria-hidden="true">
          <span className="t-muted">{first} </span>
          <span className="t-accent">{'━'.repeat(filled)}</span>
          <span className="t-accent">●</span>
          <span className="t-muted">{'─'.repeat(BAR - filled)}</span>
          <span className="t-muted"> {last}</span>
        </span>
        <span className="career-year" aria-live="polite">
          {year}
        </span>
      </div>
      <div className="career-graph" ref={box}>
        {rows.slice(0, shown).map((r, i) => (
          <div key={i} className={i === shown - 1 && !done ? 'career-new' : undefined}>
            <LineView line={r.line} />
          </div>
        ))}
        {done && (
          <>
            <LineView line={[]} />
            <LineView line={[{ t: 'to be continued…', c: 'muted' }]} />
          </>
        )}
      </div>
      <Hint
        keys={[
          ['space', done ? 'replay' : paused ? 'play' : 'pause'],
          ['← →', 'step'],
          ['q', 'quit'],
        ]}
      />
    </div>
  );
}
