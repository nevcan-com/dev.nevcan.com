/**
 * `guess`: find the hidden 4-character commit hash (hex, no character twice) in 12 tries. After
 * each try you learn how many characters are in the right place and how many are in the hash but
 * somewhere else (the old "bulls and cows" game). A hidden input takes the keys. Enter: try /
 * play again. q, Esc or Ctrl+C: quit (q is not a hex character, so it can't be a guess).
 */
import { useEffect, useRef, useState } from 'react';
import type { Line } from '@/lib/shell';
import { Hint, isQuit, useKeys, type ProgramProps } from './common';

const HEX = '0123456789abcdef';
const LEN = 4;
const TRIES = 12;

const newSecret = () => {
  const pool = [...HEX];
  let s = '';
  for (let i = 0; i < LEN; i++) s += pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
  return s;
};

interface Try {
  hash: string;
  inPlace: number;
  elsewhere: number;
}

const score = (secret: string, hash: string): Try => {
  let inPlace = 0;
  let elsewhere = 0;
  for (let i = 0; i < LEN; i++) {
    if (hash[i] === secret[i]) inPlace++;
    else if (secret.includes(hash[i]!)) elsewhere++;
  }
  return { hash, inPlace, elsewhere };
};

export default function Guess({ exit }: ProgramProps) {
  const [secret, setSecret] = useState(newSecret);
  const [tries, setTries] = useState<Try[]>([]);
  const [buffer, setBuffer] = useState('');
  const [error, setError] = useState('');
  const stats = useRef({ won: 0, lost: 0, best: 0 });
  const input = useRef<HTMLInputElement>(null);

  const won = tries.some((t) => t.inPlace === LEN);
  const over = won || tries.length >= TRIES;

  useEffect(() => input.current?.focus({ preventScroll: true }), [secret]);

  const summary = (): Line[] => {
    const { won: w, lost: l, best } = stats.current;
    if (!w && !l) return [[{ t: 'guess: the hash stays secret. For now.', c: 'muted' }]];
    return [
      [
        { t: `guess: ${w} found, ${l} lost`, c: 'muted' },
        ...(best ? [{ t: ` · best ${best} ${best === 1 ? 'try' : 'tries'}`, c: 'accent' }] : []),
      ],
    ];
  };

  const submit = () => {
    if (over) {
      setSecret(newSecret());
      setTries([]);
      setBuffer('');
      setError('');
      return;
    }
    if (buffer.length < LEN) return setError(`a hash here is ${LEN} characters`);
    if (new Set(buffer).size < LEN) return setError('no character twice');
    const t = score(secret, buffer);
    const next = [...tries, t];
    setTries(next);
    setBuffer('');
    setError('');
    if (t.inPlace === LEN) {
      stats.current.won++;
      if (!stats.current.best || next.length < stats.current.best) stats.current.best = next.length;
    } else if (next.length >= TRIES) stats.current.lost++;
  };

  useKeys((e) => {
    if (isQuit(e)) {
      e.preventDefault();
      exit(summary());
    } else if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  const onChange = (value: string) => {
    if (over) return;
    setBuffer(
      [...value.toLowerCase()]
        .filter((c) => HEX.includes(c))
        .join('')
        .slice(0, LEN),
    );
    setError('');
  };

  return (
    <div className="prog-text" onClick={() => input.current?.focus({ preventScroll: true })}>
      <p className="t-muted">
        A commit hash is hiding: {LEN} characters from <span className="t-cmd">0-9 a-f</span>, none
        twice. {TRIES} tries.
      </p>
      <pre className="game-log">
        {tries.map((t, i) => (
          <div key={i}>
            <span className="t-muted">{String(i + 1).padStart(2)} </span>
            <span className="t-cmd">{t.hash}</span>
            {'  '}
            <span className="t-accent">{'●'.repeat(t.inPlace)}</span>
            <span className="t-dir">{'○'.repeat(t.elsewhere)}</span>
            {' '.repeat(LEN - t.inPlace - t.elsewhere + 2)}
            <span className="t-muted">
              {t.inPlace} in place, {t.elsewhere} elsewhere
            </span>
          </div>
        ))}
        {!over && (
          <div>
            <span className="t-muted">{String(tries.length + 1).padStart(2)} </span>
            <span className="t-cmd">{buffer}</span>
            <span className="game-caret"> </span>
          </div>
        )}
      </pre>
      {error && <p className="t-err">{error}</p>}
      {won ? (
        <p>
          <span className="t-accent">
            Found it: {secret}, in {tries.length} {tries.length === 1 ? 'try' : 'tries'}.
          </span>
        </p>
      ) : over ? (
        <p>
          <span className="t-err">Out of tries. It was {secret}.</span>
        </p>
      ) : (
        <p className="t-muted">
          <span className="t-accent">●</span> right place · <span className="t-dir">○</span> in the
          hash, wrong place
        </p>
      )}
      <input
        ref={input}
        className="game-input"
        value={buffer}
        onChange={(e) => onChange(e.target.value)}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-label="Your guess"
      />
      <Hint
        keys={[
          ['enter', over ? 'again' : 'try'],
          ['q', 'quit'],
        ]}
      />
    </div>
  );
}
