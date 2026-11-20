/**
 * The Search view of the side bar, like an editor's: type, and every line that matches shows
 * under its file. A click opens the file at that match (Ide.tsx marks it in the document).
 * Searches what the files say, not their link targets; case and accents don't matter.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { MIN_QUERY, searchFiles, type Hit } from '@/lib/search';
import { basename, dirname, type Vfs } from '@/lib/vfs';

interface Props {
  vfs: Vfs;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (path: string, hit: Hit) => void;
  /** bumped each time the view is shown, so the field takes focus */
  focusKey: number;
  icons: { md: React.ReactNode; chevron: React.ReactNode };
}

/** the line around the match, with the match marked */
function Snippet({ hit, len }: { hit: Hit; len: number }) {
  const lead = hit.text.slice(0, hit.start).trimStart();
  // keep the match in view: only a few words before it
  const before = lead.length > 16 ? '…' + lead.slice(-12).trimStart() : lead;
  return (
    <>
      {before}
      <mark>{hit.text.slice(hit.start, hit.start + len)}</mark>
      {hit.text.slice(hit.start + len)}
    </>
  );
}

export default function SearchPanel({ vfs, query, onQuery, onOpen, focusKey, icons }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const res = useMemo(() => searchFiles(vfs, query), [vfs, query]);
  const len = query.trim().length;

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, [focusKey]);

  const toggle = (p: string) =>
    setClosed((c) => {
      const n = new Set(c);
      if (!n.delete(p)) n.add(p);
      return n;
    });

  const first = res.files[0];
  return (
    <div className="search">
      <input
        ref={input}
        className="search-input"
        type="search"
        value={query}
        placeholder="Search"
        aria-label="Search the files"
        spellCheck={false}
        autoComplete="off"
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && first) onOpen(first.path, first.hits[0]!);
          else if (e.key === 'Escape' && query) {
            e.stopPropagation();
            onQuery('');
          }
        }}
      />
      <p className="search-sum" aria-live="polite">
        {len === 0
          ? 'Words, names, places: e.g. React, Dubai, GUE.'
          : len < MIN_QUERY
            ? 'Keep typing…'
            : res.total === 0
              ? 'No results.'
              : `${res.total} result${res.total === 1 ? '' : 's'} in ${res.files.length} file${res.files.length === 1 ? '' : 's'}${res.capped ? ' (showing the first ones)' : ''}`}
      </p>
      <ul className="search-files">
        {res.files.map((f) => {
          const open = !closed.has(f.path);
          return (
            <li key={f.path}>
              <button
                type="button"
                className="search-file"
                aria-expanded={open}
                onClick={() => toggle(f.path)}
                title={`~/${f.path}`}
              >
                <span className={`chev${open ? ' open' : ''}`}>{icons.chevron}</span>
                <span className="file-ico">{icons.md}</span>
                <span className="search-name">{basename(f.path)}</span>
                <span className="search-dir">{dirname(f.path)}</span>
                <span className="search-count">{f.hits.length}</span>
              </button>
              {open && (
                <ul>
                  {f.hits.map((h) => (
                    <li key={`${h.line}:${h.start}`}>
                      <button
                        type="button"
                        className="search-hit"
                        onClick={() => onOpen(f.path, h)}
                      >
                        <Snippet hit={h} len={len} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
