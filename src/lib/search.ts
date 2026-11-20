/**
 * The Search panel's engine: finds text in the Markdown files, the way a reader sees them
 * (link targets and HTML tags left out), and marks the same matches in the open document.
 *
 * Matching ignores case and accents, so "uludas" finds "Uludaş" and "istanbul" finds
 * "İstanbul". fold() keeps every string the same length, so an index in the folded text is an
 * index in the original.
 */
import { langOf, type Vfs } from './vfs';

const foldChar = (c: string): string => {
  if (c === 'ı') return 'i';
  const base = c.normalize('NFD')[0] ?? c;
  const f = (base < '\x80' ? base : c).toLowerCase();
  return f.length === 1 ? f : c;
};

/** lower case without accents, one character for one character */
export const fold = (s: string): string =>
  s.replace(/[A-Z]/g, (c) => c.toLowerCase()).replace(/[^\x00-\x7f]/g, foldChar);

/** what a reader sees of a Markdown line: no link targets, HTML tags, bold or code marks,
 *  heading, quote or list markers */
export const visible = (line: string): string =>
  line
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, '')
    .replace(/\*\*|__|`/g, '')
    .replace(/^\s*(#{1,6}\s+|>\s?|[-*+]\s+|\d+\.\s+)/, '');

export interface Hit {
  /** 0-based line in the file */
  line: number;
  /** the line as shown, and where the match sits in it */
  text: string;
  start: number;
  /** which match this is in the rendered document (Preview); Source goes by the line */
  nth: number;
}

export interface FileHits {
  path: string;
  hits: Hit[];
}

export interface Results {
  files: FileHits[];
  total: number;
  /** more matches than shown */
  capped: boolean;
}

export const MIN_QUERY = 2;

export function searchFiles(vfs: Vfs, query: string, limit = 300): Results {
  const n = fold(query.trim());
  const res: Results = { files: [], total: 0, capped: false };
  if (n.length < MIN_QUERY) return res;
  const paths = Object.keys(vfs)
    .filter((p) => !vfs[p]!.binary && langOf(p) === 'markdown')
    .sort();
  for (const path of paths) {
    const hits: Hit[] = [];
    let seen = 0;
    vfs[path]!.raw.split('\n').forEach((raw, line) => {
      const text = visible(raw);
      const hay = fold(text);
      let k = 0;
      for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length), k++) {
        res.total++;
        if (res.total > limit) res.capped = true;
        else hits.push({ line, text, start: i, nth: seen + k });
      }
      seen += k;
    });
    if (hits.length) res.files.push({ path, hits });
  }
  return res;
}

/** every match of the query in the text under `root` (only inside `within`, when given) */
export function findRanges(root: Element, query: string, within?: string): Range[] {
  const n = fold(query.trim());
  if (n.length < MIN_QUERY) return [];
  const ranges: Range[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      within && !node.parentElement?.closest(within)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const hay = fold(node.nodeValue ?? '');
    for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length)) {
      const r = document.createRange();
      r.setStart(node, i);
      r.setEnd(node, i + n.length);
      ranges.push(r);
    }
  }
  return ranges;
}
