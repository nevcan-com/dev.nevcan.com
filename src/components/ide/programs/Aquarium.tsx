/**
 * `aquarium`: ASCII fish, a jellyfish, bubbles and swaying seaweed, drawn as text about 8 times a
 * second. Our own drawings. With reduced motion it shows one still scene.
 */
import { useEffect, useRef, useState } from 'react';
import {
  Hint,
  isQuit,
  reducedMotion,
  useGrid,
  useKeys,
  useTick,
  type ProgramProps,
} from './common';

/** each fish: [facing right, facing left] */
const FISH: [string, string][] = [
  ['><>', '<><'],
  ['><(((°>', '<°)))><'],
  ['}-<(((*>', '<*)))>-{'],
  ['><=>', '<=><'],
  ['>))°>', '<°((<'],
];
const JELLY = [' .-. ', '(   )', ' )|( ', ' (|) '];

interface Fish {
  x: number;
  y: number;
  speed: number;
  kind: number;
  color: string;
}
interface Bubble {
  x: number;
  y: number;
}

const COLORS = ['accent', 'cmd', 'dir', 'file'];
const rnd = (n: number) => Math.floor(Math.random() * n);

type Cell = { ch: string; c?: string };

export default function Aquarium({ exit }: ProgramProps) {
  const box = useRef<HTMLDivElement>(null);
  const { cols, rows } = useGrid(box);
  const [t, setT] = useState(0);
  const fish = useRef<Fish[]>([]);
  const bubbles = useRef<Bubble[]>([]);
  const still = reducedMotion();

  useEffect(() => {
    if (!cols || !rows) return;
    const count = Math.max(3, Math.min(12, Math.floor((cols * rows) / 260)));
    fish.current = Array.from({ length: count }, () => ({
      x: rnd(cols),
      y: 1 + rnd(Math.max(1, rows - 4)),
      speed: (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6),
      kind: rnd(FISH.length),
      color: COLORS[rnd(COLORS.length)]!,
    }));
  }, [cols, rows]);

  useTick(
    120,
    () => {
      for (const f of fish.current) {
        f.x += f.speed;
        const w = FISH[f.kind]![0].length;
        if (f.x > cols + 2) f.x = -w;
        if (f.x < -w - 2) f.x = cols;
      }
      bubbles.current = bubbles.current.map((b) => ({ ...b, y: b.y - 0.5 })).filter((b) => b.y > 0);
      if (Math.random() < 0.3 && fish.current.length) {
        const f = fish.current[rnd(fish.current.length)]!;
        bubbles.current.push({
          x: Math.round(f.speed > 0 ? f.x + FISH[f.kind]![0].length : f.x - 1),
          y: f.y,
        });
      }
      setT((n) => n + 1);
    },
    !still,
  );
  useKeys((e) => {
    if (!isQuit(e)) return;
    e.preventDefault();
    exit();
  });

  // draw the scene into a grid of cells
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ ch: ' ' })),
  );
  const put = (x: number, y: number, s: string, c?: string) => {
    const yy = Math.round(y);
    if (yy < 0 || yy >= rows) return;
    for (let i = 0; i < s.length; i++) {
      const xx = Math.round(x) + i;
      if (xx >= 0 && xx < cols && s[i] !== ' ') grid[yy]![xx] = { ch: s[i]!, c };
    }
  };
  if (rows > 0) {
    // surface
    for (let x = 0; x < cols; x++) put(x, 0, (x + t) % 6 < 3 ? '~' : '-', 'dir');
    // seaweed
    for (let x = 3; x < cols; x += 9) {
      const h = 2 + ((x * 7) % 4);
      for (let k = 0; k < h; k++)
        put(
          x + ((k + Math.floor(t / 4)) % 2),
          rows - 2 - k,
          (k + Math.floor(t / 4)) % 2 ? ')' : '(',
          'accent',
        );
    }
    // sand
    for (let x = 0; x < cols; x++) put(x, rows - 1, x % 5 === 0 ? '.' : '_', 'muted');
    // jellyfish, bobbing
    const jx = Math.floor(cols * 0.7);
    const jy = 2 + Math.round((Math.sin(t / 10) + 1) * Math.max(1, (rows - 8) / 2));
    JELLY.forEach((l, i) => put(jx, jy + i, l, 'cmd'));
    for (const b of bubbles.current) put(b.x, b.y, Math.random() < 0.5 ? 'o' : '°', 'dir');
    for (const f of fish.current) put(f.x, f.y, FISH[f.kind]![f.speed > 0 ? 0 : 1], f.color);
  }

  return (
    <div className="prog-aquarium" ref={box} aria-label="An ASCII aquarium">
      <pre>
        {grid.map((row, y) => {
          // runs of the same color become one span
          const runs: { c?: string; s: string }[] = [];
          for (const cell of row) {
            const last = runs[runs.length - 1];
            if (last && last.c === cell.c) last.s += cell.ch;
            else runs.push({ c: cell.c, s: cell.ch });
          }
          return (
            <div key={y}>
              {runs.map((r, i) => (
                <span key={i} className={r.c ? `t-${r.c}` : undefined}>
                  {r.s}
                </span>
              ))}
            </div>
          );
        })}
      </pre>
      <Hint keys={[['q', 'quit']]} />
    </div>
  );
}
