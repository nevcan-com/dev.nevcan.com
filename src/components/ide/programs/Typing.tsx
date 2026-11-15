/**
 * `typing`: type a short snippet as fast as you can; words per minute and accuracy at the end.
 * A hidden textarea takes the input, so phone keyboards work too. Indentation after a line break
 * is typed for you. Enter: next snippet. Esc: quit (prints your best).
 */
import { useEffect, useRef, useState } from 'react';
import { snippets } from '@/data/fun';
import type { Line } from '@/lib/shell';
import { useKeys, type ProgramProps } from './common';

interface Result {
  wpm: number;
  accuracy: number;
  seconds: number;
}

const pick = (not?: string) => {
  const pool = snippets.filter((s) => s !== not);
  return pool[Math.floor(Math.random() * pool.length)]!;
};

export default function Typing({ exit }: ProgramProps) {
  const [text, setText] = useState(() => pick());
  const [typed, setTyped] = useState('');
  const [start, setStart] = useState<number | null>(null);
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const best = useRef<Result | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => area.current?.focus({ preventScroll: true }), [text]);

  const summary = (): Line[] =>
    best.current
      ? [
          [
            { t: 'typing: best ', c: 'muted' },
            { t: `${best.current.wpm} wpm`, c: 'accent' },
            { t: `, ${best.current.accuracy}% accuracy`, c: 'muted' },
          ],
        ]
      : [[{ t: 'typing: no snippet finished. Next time!', c: 'muted' }]];

  const next = () => {
    setText((t) => pick(t));
    setTyped('');
    setStart(null);
    setErrors(0);
    setResult(null);
  };

  useKeys((e) => {
    if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      exit(summary());
    } else if (result && e.key === 'Enter') {
      e.preventDefault();
      next();
    }
  });

  const onChange = (value: string) => {
    if (result) return;
    let v = value.slice(0, text.length);
    // after a line break, type the next line's indentation for them
    if (v.endsWith('\n') && v.length > typed.length) {
      const indent = text.slice(v.length).match(/^ */)![0];
      v += indent;
    }
    if (v.length > typed.length) {
      const added = v.slice(typed.length);
      const expected = text.slice(typed.length, v.length);
      for (let i = 0; i < added.length; i++) if (added[i] !== expected[i]) setErrors((n) => n + 1);
    }
    const t0 = start ?? Date.now();
    if (start === null) setStart(t0);
    setTyped(v);
    if (v === text) {
      const seconds = Math.max(1, (Date.now() - t0) / 1000);
      const r = {
        wpm: Math.round(text.length / 5 / (seconds / 60)),
        accuracy: Math.max(0, Math.round((1 - errors / text.length) * 100)),
        seconds: Math.round(seconds * 10) / 10,
      };
      setResult(r);
      if (!best.current || r.wpm > best.current.wpm) best.current = r;
    }
  };

  return (
    <div className="prog-typing" onClick={() => area.current?.focus({ preventScroll: true })}>
      <p className="t-muted">Type the code below. It starts when you do.</p>
      <pre className="typing-text" aria-label={text}>
        {[...text].map((ch, i) => {
          const state =
            i >= typed.length
              ? i === typed.length
                ? 'caret'
                : 'todo'
              : typed[i] === ch
                ? 'ok'
                : 'bad';
          return (
            <span key={i} className={`ty-${state}`}>
              {ch === '\n' ? (state === 'bad' ? '↵\n' : '\n') : ch}
            </span>
          );
        })}
      </pre>
      <textarea
        ref={area}
        className="typing-input"
        value={typed}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Type the code here"
      />
      {result ? (
        <p>
          <span className="t-accent">{result.wpm} wpm</span> · {result.accuracy}% accuracy ·{' '}
          {result.seconds}s <span className="t-muted">· Enter: next · Esc: quit</span>
        </p>
      ) : (
        <p className="t-muted">Esc to quit</p>
      )}
    </div>
  );
}
