/**
 * Source view: the file (Markdown or SVG) with line numbers and light syntax coloring. A small
 * line-based tokenizer is enough for the handful of constructs these files use.
 */
import { Fragment, type ReactNode } from 'react';
import type { Lang, VFile } from '@/lib/vfs';

const INLINE = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)]+\))|(_[^_\s][^_]*_)/g;

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const [tok] = m;
    if (m[1]) out.push(<span className="tk-code">{tok}</span>);
    else if (m[2]) out.push(<span className="tk-strong">{tok}</span>);
    else if (m[3]) {
      const [, label, url] = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      out.push(
        <span className="tk-punct">[</span>,
        <span className="tk-link">{label}</span>,
        <span className="tk-punct">](</span>,
        <span className="tk-url">{url}</span>,
        <span className="tk-punct">)</span>,
      );
    } else out.push(<span className="tk-em">{tok}</span>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

function highlight(line: string): ReactNode {
  if (/^#{1,6}\s/.test(line)) return <span className="tk-h">{line}</span>;
  if (/^\|.*\|$/.test(line.trim())) {
    if (/^[\s|:-]+$/.test(line)) return <span className="tk-punct">{line}</span>;
    return line.split(/(\|)/).map((p, i) =>
      p === '|' ? (
        <span key={i} className="tk-punct">
          |
        </span>
      ) : (
        <Fragment key={i}>{inline(p)}</Fragment>
      ),
    );
  }
  const list = line.match(/^(\s*)([-*]|\d+\.)(\s.*)$/);
  if (list)
    return (
      <>
        {list[1]}
        <span className="tk-list">{list[2]}</span>
        {inline(list[3]!)}
      </>
    );
  return inline(line);
}

/** SVG / XML: comments, tag names, attribute names and values */
const XML = /(<!--.*?-->)|(<\/?)([\w:-]+)|([\w:-]+)(=)("[^"]*")|(\/?>)/g;

function highlightXml(line: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of line.matchAll(XML)) {
    if (m.index > last) out.push(line.slice(last, m.index));
    if (m[1]) out.push(<span className="tk-comment">{m[1]}</span>);
    else if (m[2])
      out.push(<span className="tk-punct">{m[2]}</span>, <span className="tk-tag">{m[3]}</span>);
    else if (m[4])
      out.push(
        <span className="tk-attr">{m[4]}</span>,
        <span className="tk-punct">{m[5]}</span>,
        <span className="tk-str">{m[6]}</span>,
      );
    else out.push(<span className="tk-punct">{m[7]}</span>);
    last = m.index + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out.map((n, i) => <Fragment key={i}>{n}</Fragment>);
}

export default function SourceView({
  raw,
  lang,
  binary,
  onPreview,
}: {
  raw: string;
  lang: Lang;
  binary?: VFile['binary'];
  onPreview?: () => void;
}) {
  if (lang === 'image')
    return (
      <div className="binary-note">
        <p>
          The file is not displayed in the text editor because it is binary
          {binary
            ? ` (${binary.format.toUpperCase()}, ${(binary.bytes / 1024).toFixed(0)} KB, ${binary.width}×${binary.height})`
            : ''}
          .
        </p>
        {onPreview && (
          <button type="button" className="btn" onClick={onPreview}>
            Open in Preview
          </button>
        )}
      </div>
    );
  const lines = raw.replace(/\n+$/, '').split('\n');
  const hl = lang === 'svg' ? highlightXml : highlight;
  return (
    <pre className="source" aria-label={`${lang === 'svg' ? 'SVG' : 'Markdown'} source`}>
      <code>
        {lines.map((l, i) => (
          <span className="src-row" key={i}>
            <span className="src-ln" aria-hidden="true">
              {i + 1}
            </span>
            <span className="src-text">{hl(l) || '​'}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}
