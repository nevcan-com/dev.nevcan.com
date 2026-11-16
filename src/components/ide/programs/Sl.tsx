/**
 * `sl`: you meant `ls`, so a train crosses the terminal. Like the original Unix joke it doesn't
 * stop for any key (the one exception to the keys in common.tsx); it takes a few seconds, and with
 * reduced motion it stands still for 2.5 s instead. The drawing is our own: a locomotive pulling the nevcan.com sites.
 */
import { useRef, useState } from 'react';
import { reducedMotion, useGrid, useKeys, useTick, type ProgramProps } from './common';

const TRAIN = [
  '      (  )  (   )   )                                         ',
  '    (    )   (  )                                             ',
  '     _||____         __________________    __________________ ',
  '  __|  [__] |       |  dev   ▢ ▢ ▢ ▢   |  |  dive  ▢ ▢ ▢ ▢   |',
  ' |   N E V  |=======|                  |==|                  |',
  ' |__________|       |__________________|  |__________________|',
  '  O=O    O=O          O=O        O=O        O=O        O=O    ',
];
const WIDTH = Math.max(...TRAIN.map((l) => l.length));

export default function Sl({ exit }: ProgramProps) {
  const box = useRef<HTMLDivElement>(null);
  const { cols } = useGrid(box);
  const [x, setX] = useState<number | null>(null);
  /** what they tried, for the parting line */
  const tried = useRef<string | null>(null);
  const still = reducedMotion();

  const leave = () =>
    exit(
      tried.current
        ? [[{ t: `sl: trains don't stop for ${tried.current}. You meant ls.`, c: 'muted' }]]
        : [[{ t: 'sl: you meant ls.', c: 'muted' }]],
    );

  useTick(
    30,
    () => {
      if (!cols) return;
      const next = (x ?? cols) - 2;
      if (next < -WIDTH) leave();
      else setX(next);
    },
    !still,
  );
  useTick(2500, leave, still);
  useKeys((e) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      tried.current = 'Ctrl+C';
    } else if (e.key === 'q') {
      e.preventDefault();
      tried.current = 'q';
    } else if (e.key === 'Escape') {
      e.preventDefault();
      tried.current = 'Esc';
    }
  });

  const pos = still ? 2 : (x ?? cols);
  const rows = TRAIN.map((l) => {
    const shifted = pos >= 0 ? ' '.repeat(pos) + l : l.slice(-pos);
    return shifted.slice(0, cols);
  });
  return (
    <div className="prog-sl" ref={box} aria-label="A train passes by">
      <pre className="t-accent">{rows.join('\n')}</pre>
    </div>
  );
}
