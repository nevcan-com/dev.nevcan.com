/**
 * `hangman`: guess the tech word one letter at a time. Every wrong letter takes a server light
 * down; six and the rack is on fire. The words and hints live in data/fun.ts. A hidden input takes
 * the keys, so phone keyboards work. Enter: next word. Esc: quit (every letter is a guess, so q
 * doesn't quit here).
 */
import { useEffect, useRef, useState } from 'react';
import { words } from '@/data/fun';
import type { Line } from '@/lib/shell';
import { useKeys, type ProgramProps } from './common';

const LIVES = 6;

const pick = (not?: string) => {
  const pool = words.filter((w) => w.word !== not);
  return pool[Math.floor(Math.random() * pool.length)]!;
};

/** the server rack: one light per life, smoke and then fire as they go out */
function Rack({ wrong }: { wrong: number }) {
  const smoke =
    wrong >= 6 ? ' (  )\\( ) ( )/ ' : wrong >= 4 ? '   ~   ~  ~    ' : '               ';
  const flame =
    wrong >= 6 ? '  )\\/(  )\\/(   ' : wrong >= 5 ? '    ~    ~     ' : '               ';
  const light = (i: number) =>
    i < wrong ? <span className="t-err">✕</span> : <span className="t-accent">●</span>;
  return (
    <pre className="game-art" aria-label={`${LIVES - wrong} of ${LIVES} servers still up`}>
      <div className={wrong >= 6 ? 't-err' : 't-muted'}>{smoke}</div>
      <div className={wrong >= 6 ? 't-cmd' : 't-muted'}>{flame}</div>
      <div className="t-muted"> .-----------. </div>
      {[0, 2, 4].map((i) => (
        <div key={i}>
          <span className="t-muted"> | </span>
          {light(i)} {light(i + 1)}
          <span className="t-muted"> ▭▭▭▭ | </span>
        </div>
      ))}
      <div className="t-muted"> '-----------' </div>
    </pre>
  );
}

export default function Hangman({ exit }: ProgramProps) {
  const [entry, setEntry] = useState(() => pick());
  const [guessed, setGuessed] = useState<string[]>([]);
  const stats = useRef({ won: 0, lost: 0 });
  const input = useRef<HTMLInputElement>(null);

  const word = entry.word.toLowerCase();
  const wrong = guessed.filter((c) => !word.includes(c)).length;
  const won = [...word].every((c) => !/[a-z]/.test(c) || guessed.includes(c));
  const lost = wrong >= LIVES;
  const over = won || lost;

  useEffect(() => input.current?.focus({ preventScroll: true }), [entry]);

  const summary = (): Line[] => {
    const { won: w, lost: l } = stats.current;
    if (!w && !l) return [[{ t: 'hangman: the servers live another day.', c: 'muted' }]];
    return [
      [
        { t: 'hangman: ', c: 'muted' },
        { t: `${w} saved`, c: 'accent' },
        { t: `, ${l} burnt`, c: 'muted' },
      ],
    ];
  };

  const guess = (c: string) => {
    if (over || guessed.includes(c)) return;
    const next = [...guessed, c];
    setGuessed(next);
    const nextWrong = next.filter((g) => !word.includes(g)).length;
    if ([...word].every((ch) => !/[a-z]/.test(ch) || next.includes(ch))) stats.current.won++;
    else if (nextWrong >= LIVES) stats.current.lost++;
  };

  const again = () => {
    setEntry((e) => pick(e.word));
    setGuessed([]);
  };

  useKeys((e) => {
    if (e.key === 'Escape' || (e.ctrlKey && e.key.toLowerCase() === 'c')) {
      e.preventDefault();
      exit(summary());
    } else if (e.key === 'Enter' && over) {
      e.preventDefault();
      again();
    }
  });

  return (
    <div className="prog-text" onClick={() => input.current?.focus({ preventScroll: true })}>
      <p className="t-muted">
        Guess the word, a letter at a time. Hint: <span className="t-file">{entry.hint}</span>
      </p>
      <Rack wrong={wrong} />
      <p className="game-word" aria-label={over ? word : `${word.length} letters`}>
        {[...word].map((c, i) =>
          !/[a-z]/.test(c) ? (
            <span key={i}>{c}</span>
          ) : guessed.includes(c) ? (
            <span key={i} className="t-accent">
              {c}
            </span>
          ) : lost ? (
            <span key={i} className="t-err">
              {c}
            </span>
          ) : (
            <span key={i} className="t-muted">
              _
            </span>
          ),
        )}
      </p>
      <p className="t-muted">
        tried:{' '}
        {guessed.length
          ? guessed.map((c) => (
              <span key={c} className={word.includes(c) ? 't-accent' : 't-err'}>
                {c}{' '}
              </span>
            ))
          : '—'}
      </p>
      {won ? (
        <p>
          <span className="t-accent">Deployed. The servers are safe.</span>{' '}
          <span className="t-muted">Enter: next word · Esc: quit</span>
        </p>
      ) : lost ? (
        <p>
          <span className="t-err">The rack is on fire. It was {word}.</span>{' '}
          <span className="t-muted">Enter: next word · Esc: quit</span>
        </p>
      ) : (
        <p className="t-muted">
          {LIVES - wrong} {LIVES - wrong === 1 ? 'server' : 'servers'} still up · type a letter
        </p>
      )}
      <input
        ref={input}
        className="game-input"
        value=""
        onChange={(e) => {
          const c = e.target.value.toLowerCase().slice(-1);
          if (/[a-z]/.test(c)) guess(c);
        }}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-label="Type a letter"
      />
      <button type="button" className="game-quit" onClick={() => exit(summary())}>
        quit (Esc)
      </button>
    </div>
  );
}
