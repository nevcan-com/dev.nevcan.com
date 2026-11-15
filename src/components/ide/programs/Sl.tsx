/**
 * `sl`: you meant `ls`, so a train crosses the terminal. Like the original Unix joke it ignores
 * Ctrl+C (Esc still works). The drawing is our own: a locomotive pulling the nevcan.com sites.
 */
import { useRef, useState } from 'react';
import { isQuit, reducedMotion, useGrid, useKeys, useTick, type ProgramProps } from './common';

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
  const ctrlC = useRef(false);
  const still = reducedMotion();

  const leave = () =>
    exit(
      ctrlC.current
        ? [[{ t: "sl: trains don't stop for Ctrl+C. You meant ls.", c: 'muted' }]]
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
      ctrlC.current = true;
      return;
    }
    if (isQuit(e)) {
      e.preventDefault();
      leave();
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
