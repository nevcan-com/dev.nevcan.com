/**
 * After `rm -rf`: the site is gone, and one button brings it back. "Restore from backup" fills a
 * bar, then reloads the home page, so everything is as on a first visit. Nothing was ever deleted;
 * the note at the bottom says so for anyone who isn't sure.
 */
import { useEffect, useRef, useState } from 'react';

export default function Wiped() {
  const [pct, setPct] = useState<number | null>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    button.current?.focus();
  }, []);

  useEffect(() => {
    if (pct === null) return;
    if (pct >= 100) {
      location.assign('/');
      return;
    }
    const t = setTimeout(() => setPct((p) => Math.min(100, (p ?? 0) + 7 + Math.random() * 12)), 90);
    return () => clearTimeout(t);
  }, [pct]);

  const width = 24;
  const filled = Math.round(((pct ?? 0) / 100) * width);

  return (
    <div className="wiped" role="alertdialog" aria-labelledby="wiped-title">
      <p className="wiped-cmd">
        <span className="t-muted">$</span> rm -rf /{' '}
        <span className="wiped-cursor" aria-hidden="true" />
      </p>
      <h1 id="wiped-title" className="wiped-title">
        The whole site is gone.
      </h1>
      <p className="wiped-sub">Twenty years of work, one command. Now what?</p>
      {pct === null ? (
        <button ref={button} type="button" className="btn" onClick={() => setPct(0)}>
          Restore from backup
        </button>
      ) : (
        <p className="wiped-bar" aria-live="polite">
          Restoring from backup… [{'█'.repeat(filled)}
          <span className="t-muted">{'░'.repeat(width - filled)}</span>] {Math.floor(pct)}%
        </p>
      )}
      <p className="wiped-note">
        Only pretend: nothing was really deleted, here or on your computer.
      </p>
    </div>
  );
}
