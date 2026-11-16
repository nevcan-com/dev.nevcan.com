/**
 * `snake`: eat the braces, don't hit the walls or yourself. Each cell is two characters wide so
 * the board looks square. Arrows, WASD or hjkl steer (swipe on a phone), Space pauses, q/Esc
 * quits and prints your score. Speeds up a little with every brace. The best score is kept in
 * this browser only (localStorage, when it's allowed).
 */
import { useRef, useState, type ReactNode, type TouchEvent } from 'react';
import type { Line } from '@/lib/shell';
import { isQuit, useGrid, useKeys, useTick, type ProgramProps } from './common';

type P = { x: number; y: number };
type Dir = 'up' | 'down' | 'left' | 'right';
type Phase = 'ready' | 'play' | 'pause' | 'over';

const STEP: Record<Dir, P> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
const KEYS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
  k: 'up',
  j: 'down',
  h: 'left',
  l: 'right',
};
const MAX_W = 32;
const MAX_H = 20;
const BEST_KEY = 'snake-best';

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
};
const saveBest = (n: number) => {
  try {
    localStorage.setItem(BEST_KEY, String(n));
  } catch {
    /* private window or blocked storage: the best score just isn't kept */
  }
};

interface Game {
  w: number;
  h: number;
  snake: P[]; // head first
  dir: Dir;
  turns: Dir[]; // queued key presses, so two quick turns both count
  food: P;
  score: number;
}

const placeFood = (g: Pick<Game, 'w' | 'h' | 'snake'>): P => {
  const free: P[] = [];
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++)
      if (!g.snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
  return free[Math.floor(Math.random() * free.length)] ?? { x: -1, y: -1 };
};

const newGame = (w: number, h: number): Game => {
  const y = Math.floor(h / 2);
  const x = Math.floor(w / 3);
  // head first, body trailing to the left, so moving right is safe
  const snake = [0, 1, 2].map((i) => ({ x: x - i, y }));
  return { w, h, snake, dir: 'right', turns: [], food: placeFood({ w, h, snake }), score: 0 };
};

export default function Snake({ exit }: ProgramProps) {
  const box = useRef<HTMLDivElement>(null);
  const { cols, rows } = useGrid(box);
  const game = useRef<Game | null>(null);
  const [phase, setPhase] = useState<Phase>('ready');
  const [, redraw] = useState(0);
  const best = useRef(readBest());
  const played = useRef(0);
  const touch = useRef<P | null>(null);

  // board size: two characters per cell, room for the borders, the status line and the hint
  const w = Math.min(MAX_W, Math.floor((cols - 2) / 2));
  const h = Math.min(MAX_H, rows - 4);
  if (cols && rows && w >= 6 && h >= 4 && (!game.current || phase === 'ready'))
    if (!game.current || game.current.w !== w || game.current.h !== h) game.current = newGame(w, h);
  const g = game.current;

  const speed = g ? Math.max(55, 140 - g.score * 4) : 140;

  useTick(
    speed,
    () => {
      if (!g) return;
      while (g.turns.length) {
        const t = g.turns.shift()!;
        if (t !== g.dir && t !== OPPOSITE[g.dir]) {
          g.dir = t;
          break;
        }
      }
      const head = g.snake[0]!;
      const next = { x: head.x + STEP[g.dir].x, y: head.y + STEP[g.dir].y };
      const eats = next.x === g.food.x && next.y === g.food.y;
      const body = eats ? g.snake : g.snake.slice(0, -1); // the tail moves out of the way
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= g.w ||
        next.y >= g.h ||
        body.some((s) => s.x === next.x && s.y === next.y)
      ) {
        played.current++;
        if (g.score > best.current) {
          best.current = g.score;
          saveBest(g.score);
        }
        setPhase('over');
        return;
      }
      g.snake = [next, ...body];
      if (eats) {
        g.score++;
        g.food = placeFood(g);
      }
      redraw((n) => n + 1);
    },
    phase === 'play',
  );

  const steer = (d: Dir) => {
    if (!g) return;
    if (phase === 'over') return;
    if (phase !== 'play') setPhase('play');
    if (g.turns.length < 3) g.turns.push(d);
  };
  const restart = () => {
    if (!g) return;
    game.current = newGame(g.w, g.h);
    setPhase('play');
  };

  const summary = (): Line[] => {
    const score = g?.score ?? 0;
    if (!played.current && !score) return [[{ t: 'snake: maybe next time.', c: 'muted' }]];
    return [
      [
        { t: 'snake: score ', c: 'muted' },
        { t: String(score), c: 'accent' },
        { t: `, best ${Math.max(best.current, score)}`, c: 'muted' },
      ],
    ];
  };

  useKeys((e) => {
    if (isQuit(e)) {
      e.preventDefault();
      exit(summary());
      return;
    }
    const d = KEYS[e.key] ?? KEYS[e.key.toLowerCase()];
    if (d) {
      e.preventDefault();
      if (phase === 'over') return;
      steer(d);
    } else if (e.key === ' ' || e.key === 'p' || e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'over') restart();
      else if (phase === 'play') setPhase('pause');
      else setPhase('play');
    }
  });

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]!;
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touch.current;
    const t = e.changedTouches[0];
    touch.current = null;
    if (!start || !t) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) {
      // a tap: start, pause or play again
      if (phase === 'over') restart();
      else setPhase(phase === 'play' ? 'pause' : 'play');
      return;
    }
    if (Math.abs(dx) > Math.abs(dy)) steer(dx > 0 ? 'right' : 'left');
    else steer(dy > 0 ? 'down' : 'up');
  };

  let board: ReactNode = null;
  if (g) {
    const cells: { s: string; c?: string }[][] = [];
    for (let y = 0; y < g.h; y++) {
      const row: { s: string; c?: string }[] = [];
      for (let x = 0; x < g.w; x++) row.push({ s: '  ' });
      cells.push(row);
    }
    g.snake.forEach((p, i) => {
      if (cells[p.y]?.[p.x]) cells[p.y]![p.x] = { s: '██', c: i === 0 ? 'cmd' : 'accent' };
    });
    if (cells[g.food.y]?.[g.food.x]) cells[g.food.y]![g.food.x] = { s: '{}', c: 'file' };

    const message =
      phase === 'ready'
        ? 'press an arrow key to start'
        : phase === 'pause'
          ? 'paused · Space to go on'
          : phase === 'over'
            ? `game over · ${g.score} · Space: again · q: quit`
            : '';
    // the message sits on the middle row, over the board
    const mid = Math.floor(g.h / 2) - (phase === 'ready' ? 2 : 0);
    const inner = g.w * 2;

    board = (
      <pre>
        <div>
          <span className="t-muted">score </span>
          <span className="t-accent">{g.score}</span>
          <span className="t-muted"> · best {Math.max(best.current, g.score)}</span>
        </div>
        <div className="t-muted">{'┌' + '─'.repeat(inner) + '┐'}</div>
        {cells.map((row, y) => {
          if (message && y === mid) {
            const m = ` ${message} `.slice(0, inner);
            const left = Math.floor((inner - m.length) / 2);
            return (
              <div key={y}>
                <span className="t-muted">│</span>
                {' '.repeat(left)}
                <span className="snake-msg">{m}</span>
                {' '.repeat(inner - left - m.length)}
                <span className="t-muted">│</span>
              </div>
            );
          }
          const runs: { c?: string; s: string }[] = [];
          for (const cell of row) {
            const last = runs[runs.length - 1];
            if (last && last.c === cell.c) last.s += cell.s;
            else runs.push({ ...cell });
          }
          return (
            <div key={y}>
              <span className="t-muted">│</span>
              {runs.map((r, i) => (
                <span key={i} className={r.c ? `t-${r.c}` : undefined}>
                  {r.s}
                </span>
              ))}
              <span className="t-muted">│</span>
            </div>
          );
        })}
        <div className="t-muted">{'└' + '─'.repeat(inner) + '┘'}</div>
      </pre>
    );
  } else if (cols && rows) {
    board = (
      <p className="t-muted">snake: the terminal is too small. Make it bigger and try again.</p>
    );
  }

  return (
    <div
      className="prog-snake"
      ref={box}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-label={`Snake. Score ${g?.score ?? 0}.`}
    >
      {board}
      <div className="prog-hint">arrows / wasd / hjkl · space pauses · q quits</div>
    </div>
  );
}
