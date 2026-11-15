/**
 * The 404 page, shown in the editor as if the site had crashed: an error overlay with a stack
 * trace that is mostly jokes, the closest real page ("Did you mean"), and ways out.
 * The static 404.html can't know the URL, so the path is filled in after load.
 */
import { useEffect, useState } from 'react';
import { profile } from '@/data/profile';
import type { Vfs } from '@/lib/vfs';

/** edit distance, for "Did you mean" */
function distance(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]!;
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]!;
      d[j] = Math.min(d[j]! + 1, d[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length]!;
}

interface Props {
  vfs: Vfs;
  onOpen: (path: string) => void;
  onRun: (cmd: string) => void;
}

export default function CrashView({ vfs, onOpen, onRun }: Props) {
  const [url, setUrl] = useState('/this-page');
  useEffect(() => {
    // a malformed URL (/%E0%A4%A) must not crash the crash page
    try {
      setUrl(decodeURIComponent(location.pathname));
    } catch {
      setUrl(location.pathname);
    }
  }, []);

  const files = Object.values(vfs).filter((f) => f.route !== '/');
  const guess = files
    .map((f) => ({ f, d: distance(url.toLowerCase(), f.route) }))
    .sort((a, b) => a.d - b.d)[0];
  const suggestion = guess && guess.d <= Math.max(4, url.length / 2) ? guess.f : null;
  const year = new Date().getFullYear();

  const frames = [
    ['Router.resolve', 'src/router.ts', '404:1'],
    ['Visitor.typedTheUrlByHand', 'keyboard.ts', '42:7'],
    ['Nevcan.movedFilesAroundAgain', 'refactor.ts', `${year}:11`],
    ['Intern.renamedItInProduction', 'friday-deploy.ts', '17:59'],
    ['async Coffee.brew', 'kitchen.ts', '∞'],
  ];

  return (
    <div className="crash" role="alert">
      <p className="crash-big" aria-hidden="true">
        404
      </p>
      <h1 className="crash-human">Page not found</h1>
      <p className="crash-sub">
        There&apos;s nothing at <code>{url}</code>. It may have moved, or never existed. The site
        took it personally:
      </p>

      <div className="crash-head">
        <span className="crash-badge">Unhandled Runtime Error</span>
        <span className="crash-count">1 of 1 error · 0 files harmed</span>
      </div>

      <h2 className="crash-title">
        FileNotFoundError: ENOENT: no such file or directory, open &apos;~{url}&apos;
      </h2>

      <p className="crash-label">Source</p>
      <pre className="crash-code">
        <span className="t-muted">{'  401 | '}</span>
        {'export function open(url: string) {\n'}
        <span className="t-muted">{'  402 | '}</span>
        {'  const file = vfs[url];\n'}
        <span className="t-muted">{'  403 | '}</span>
        {'  // TODO: handle pages that do not exist\n'}
        <span className="crash-line">
          <span>{'> 404 | '}</span>
          {'  return file.render(); // 💥 file is undefined\n'}
        </span>
        <span className="t-muted">{'      |                ^\n'}</span>
        <span className="t-muted">{'  405 | '}</span>
        {'}'}
      </pre>

      <p className="crash-label">Call stack</p>
      <ol className="crash-stack">
        {frames.map(([fn, file, pos]) => (
          <li key={fn}>
            <span className="crash-fn">{fn}</span>
            <span className="t-muted">
              {' '}
              {file}:{pos}
            </span>
          </li>
        ))}
      </ol>

      {suggestion && (
        <p className="crash-hint">
          Did you mean{' '}
          <a
            href={suggestion.route}
            onClick={(e) => {
              e.preventDefault();
              onOpen(suggestion.path);
            }}
          >
            ~/{suggestion.path}
          </a>
          ?
        </p>
      )}

      <div className="crash-actions">
        <button type="button" className="btn" onClick={() => onOpen('README.md')}>
          cd ~
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onRun('tree')}>
          Show every file
        </button>
        <a
          className="btn btn-ghost"
          href={`mailto:${profile.email}?subject=${encodeURIComponent(`Bug report: ${url}`)}&body=${encodeURIComponent(`I expected to find something at ${url}.\n\nSteps to reproduce:\n1. `)}`}
        >
          Report a bug
        </a>
      </div>
    </div>
  );
}
