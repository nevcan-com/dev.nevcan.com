/** one line of terminal output: segments with a class, a link, or a command to run on click */
import type { Line, Seg } from '@/lib/shell';

export function SegView({ s, onExec }: { s: Seg; onExec?: (c: string) => void }) {
  const cls = s.c ? `t-${s.c}` : undefined;
  if (s.c === 'logo')
    return (
      <span className="t-logo">
        {s.t}
        <svg viewBox="316 253 251 262" aria-hidden="true">
          <path d="M350 283 533 485V283" />
          <circle cx="353" cy="478" r="27" />
        </svg>
      </span>
    );
  if (s.href)
    return (
      <a
        className={cls}
        href={s.href}
        target={s.href.startsWith('mailto:') ? undefined : '_blank'}
        rel="noopener"
      >
        {s.t}
      </a>
    );
  if (s.run && onExec)
    return (
      <button
        type="button"
        className={`t-run ${cls ?? ''}`}
        onClick={() => onExec(s.run!)}
        title={`Run: ${s.run}`}
      >
        {s.t}
      </button>
    );
  return <span className={cls}>{s.t}</span>;
}

export function LineView({ line, onExec }: { line: Line; onExec?: (c: string) => void }) {
  return (
    <div className="t-line">
      {line.map((s, i) => (
        <SegView key={i} s={s} onExec={onExec} />
      ))}
      {line.length === 0 && '​'}
    </div>
  );
}
