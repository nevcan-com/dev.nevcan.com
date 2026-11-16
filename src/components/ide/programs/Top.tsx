/** `top` and `htop`: roles as processes. CPU and memory are random and move every second. */
import { useState } from 'react';
import { processes } from '@/data/fun';
import { profile } from '@/data/profile';
import { Hint, isQuit, isSpace, useKeys, useTick, type ProgramProps } from './common';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function snapshot() {
  return processes
    .map((p, i) => ({
      ...p,
      pid: 1000 + i * 137,
      cpu: p.state === 'R' ? rand(4, 62) : 0,
      mem: p.state === 'R' ? rand(3, 18) : rand(0.1, 1.2),
    }))
    .sort((a, b) => b.cpu - a.cpu);
}

const bar = (pct: number, width: number) => {
  const n = Math.round((pct / 100) * width);
  return '|'.repeat(n) + ' '.repeat(width - n);
};

export default function Top({ name, exit }: ProgramProps) {
  const [rows, setRows] = useState(snapshot);
  const [now, setNow] = useState(() => new Date());
  const [paused, setPaused] = useState(false);
  useTick(
    1000,
    () => {
      setRows(snapshot());
      setNow(new Date());
    },
    !paused,
  );
  useKeys((e) => {
    if (isQuit(e)) {
      e.preventDefault();
      exit();
    } else if (isSpace(e)) {
      e.preventDefault();
      setPaused((p) => !p);
    }
  });

  const year = now.getFullYear();
  const running = rows.filter((r) => r.state === 'R');
  const load = (running.reduce((s, r) => s + r.cpu, 0) / 100).toFixed(2);
  const htop = name === 'htop';
  const time = now.toTimeString().slice(0, 8);

  return (
    <div className="prog-top" role="status" aria-label={`${name}: what is running`}>
      {htop ? (
        <div className="top-meters">
          {running.slice(0, 4).map((r, i) => (
            <div key={r.pid}>
              <span className="t-muted">{String(i + 1).padStart(2)} </span>[
              <span className="t-accent">{bar(r.cpu, 24)}</span>
              <span className="t-muted">{r.cpu.toFixed(1).padStart(5)}%</span>]
            </div>
          ))}
        </div>
      ) : null}
      <div>
        {name} - {time} up {year - profile.since} years, 1 user (you), load average: {load}
      </div>
      <div>
        Tasks: {rows.length} total, <span className="t-accent">{running.length} running</span>,{' '}
        {rows.length - running.length} sleeping
      </div>
      <div>&nbsp;</div>
      <div className="top-head">
        {['  PID', 'USER    ', 'S', ' %CPU', '%MEM', '   TIME+', 'COMMAND'].join(' ').padEnd(80)}
      </div>
      {rows.map((r) => (
        <div key={r.pid} className={r.state === 'R' ? '' : 't-muted'}>
          {[
            String(r.pid).padStart(5),
            'nevcan'.padEnd(8),
            r.state,
            r.cpu.toFixed(1).padStart(5),
            r.mem.toFixed(1).padStart(4),
            `${(r.until ?? year) - r.since}y`.padStart(8),
            '',
          ].join(' ')}
          <span className={r.state === 'R' ? 't-accent' : undefined}>{r.command}</span>
        </div>
      ))}
      <Hint
        keys={[
          ['space', paused ? 'go on' : 'pause'],
          ['q', 'quit'],
        ]}
      />
    </div>
  );
}
