/**
 * The whole site: an editor window with a file explorer, tabs, a Preview/Source view and a
 * terminal. Every page route renders this with a different file open, so the first paint (and
 * what search engines read) is that file's rendered Markdown.
 *
 * Panels: `auto` lets CSS decide by screen width (desktop: explorer and terminal open; phone:
 * both collapsed, the reader comes first). A click makes the choice explicit.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Terminal, { type TermItem, type TerminalHandle } from './Terminal';
import SourceView from './SourceView';
import CookiePane from './CookiePane';
import ThemePicker from './ThemePicker';
import SearchPanel from './SearchPanel';
import { findRanges, type Hit } from '@/lib/search';
import { GUEST, loadUser, saveUser } from '@/lib/user';
import UserDialog from './UserDialog';
import { pickTheme } from '@/lib/theme';
import { themeById } from '@/data/themes';
import CrashView from './CrashView';
import ContextMenu, { type MenuItem } from './ContextMenu';
import { applyChoice, readChoice, saveChoice } from '@/components/consent/consent';
import { COMMANDS, complete, run, type Line, type ProgramName, type ShellState } from '@/lib/shell';
import { basename, dirname, displayPath, langOf, listDir, pathForRoute, type Vfs } from '@/lib/vfs';
import { profile } from '@/data/profile';
import { analyticsOn } from '@/data/analytics';

type Panel = 'auto' | 'open' | 'closed';

interface Props {
  vfs: Vfs;
  initialPath: string;
  /** the 404 page: report the missing path in the terminal */
  notFound?: boolean;
}

const welcomeLine = (user = GUEST): Line =>
  user === GUEST
    ? [{ t: `Welcome to dev.nevcan.com, ${profile.name}'s home directory.`, c: 'accent' }]
    : [{ t: `Welcome back, ${user}. This is ${profile.name}'s home directory.`, c: 'accent' }];
const welcome = (): Line[] => [
  welcomeLine(),
  [
    {
      t: 'The files are on the left. This terminal works too: type a command, or click one.',
      c: 'muted',
    },
  ],
  [],
  [
    { t: 'whoami', c: 'chip', run: 'whoami' },
    { t: ' ' },
    { t: 'ls', c: 'chip', run: 'ls' },
    { t: ' ' },
    { t: 'git log', c: 'chip', run: 'git log' },
    { t: ' ' },
    { t: 'neofetch', c: 'chip', run: 'neofetch' },
    { t: ' ' },
    { t: 'help', c: 'chip', run: 'help' },
  ],
  [],
];

let nextId = 0;
const outItems = (lines: Line[]): TermItem[] =>
  lines.map((segs) => ({ id: nextId++, kind: 'out', segs }));

const Icon = ({ d, label }: { d: string; label?: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden={label ? undefined : true}
    aria-label={label}
  >
    <path
      d={d}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ICON = {
  files: 'M4 4.5h6l2 2h8v13H4zM4 9h16',
  terminal: 'M3.5 4.5h17v15h-17zM7 9.5l3 2.5-3 2.5M12.5 15h4.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 6l6 6-6 6',
  max: 'M6 14l6-6 6 6',
  min: 'M6 10l6 6 6-6',
  dive: 'M3 15c2 0 2-1.5 4-1.5S9 15 11 15s2-1.5 4-1.5 2 1.5 4 1.5M3 19c2 0 2-1.5 4-1.5S9 19 11 19s2-1.5 4-1.5 2 1.5 4 1.5M12 3v7M9 7l3 3 3-3',
  linkedin:
    'M4.5 4.5h15v15h-15zM8.5 10.5V16M8.5 7.8v.1M11.5 16v-5.5M11.5 13c0-1.6 1-2.6 2.3-2.6s2.2.9 2.2 2.6V16',
  svg: 'M4.5 4.5h15v15h-15zM4.5 16l4.5-4.5 3.5 3.5 2.5-2.5 4.5 4.5M15 9h.01',
  github:
    'M7 4.5v10M7 14.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM7 4.5a0 0 0 0 0 0 0M17 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM17 9.5c0 4-10 2-10 5',
  md: 'M3.5 6.5h17v11h-17zM6.5 14.5v-5l2 2.5 2-2.5v5M15.5 9.5v5M13.5 12.5l2 2 2-2',
  collapseAll: 'M8 4.5h11.5V16M4.5 8h11.5v11.5H4.5zM7.5 13.75h5',
  expandAll: 'M8 4.5h11.5V16M4.5 8h11.5v11.5H4.5zM7.5 13.75h5M10 11.25v5',
  search: 'M10.5 4.5a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM15 15l5 5',
  settings:
    'M18.1 10.6L20.5 10.9L20.5 13.1L18.1 13.4L17.3 15.4L18.8 17.2L17.2 18.8L15.4 17.3L13.4 18.1L13.1 20.5L10.9 20.5L10.6 18.1L8.6 17.3L6.8 18.8L5.2 17.2L6.7 15.4L5.9 13.4L3.5 13.1L3.5 10.9L5.9 10.6L6.7 8.6L5.2 6.8L6.8 5.2L8.6 6.7L10.6 5.9L10.9 3.5L13.1 3.5L13.4 5.9L15.4 6.7L17.2 5.2L18.8 6.8L17.3 8.6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
};

function Tree({
  vfs,
  dir,
  depth,
  active,
  expanded,
  onToggle,
  onOpen,
}: {
  vfs: Vfs;
  dir: string;
  depth: number;
  active: string | null;
  expanded: Set<string>;
  onToggle: (d: string) => void;
  onOpen: (p: string) => void;
}) {
  return (
    <ul role={depth ? 'group' : 'tree'} aria-label={depth ? undefined : 'Files'}>
      {listDir(vfs, dir).map((e) => {
        const pad = { paddingLeft: `${0.75 + depth * 0.9}rem` };
        if (e.type === 'dir') {
          const isOpen = expanded.has(e.path);
          return (
            <li key={e.path} role="treeitem" aria-expanded={isOpen}>
              <button
                type="button"
                className="tree-row is-dir"
                data-path={e.path}
                data-kind="dir"
                style={pad}
                onClick={() => onToggle(e.path)}
              >
                <span className={`chev ${isOpen ? 'open' : ''}`}>
                  <Icon d={ICON.chevron} />
                </span>
                {e.name}
              </button>
              {isOpen && (
                <Tree
                  vfs={vfs}
                  dir={e.path}
                  depth={depth + 1}
                  active={active}
                  expanded={expanded}
                  onToggle={onToggle}
                  onOpen={onOpen}
                />
              )}
            </li>
          );
        }
        return (
          <li key={e.path} role="treeitem" aria-selected={active === e.path}>
            <a
              className={`tree-row is-file ${active === e.path ? 'active' : ''}`}
              data-path={e.path}
              data-kind="file"
              style={pad}
              href={vfs[e.path]!.route}
              onClick={(ev) => {
                if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
                ev.preventDefault();
                onOpen(e.path);
              }}
            >
              <span className="file-ico">
                <Icon d={ICON[langOf(e.path) === 'markdown' ? 'md' : 'svg']} />
              </span>
              {e.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** the Konami reward: bubbles rise across the window for a few seconds (CSS only) */
function bubbles() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const box = document.createElement('div');
  box.className = 'bubbles';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 36; i++) {
    const b = document.createElement('span');
    const size = 6 + Math.random() * 22;
    b.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-delay:${Math.random() * 1.6}s;animation-duration:${2.6 + Math.random() * 2}s`;
    box.append(b);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 5200);
}

/** folders that start closed in the explorer: there to be found, not pointed at */
const FOUND_LATER = ['legal', 'media', 'projects', 'trainings', 'experience/diving'];
/** a path's folders, outermost first: 'a/b/c.md' → ['a', 'a/b'] */
const ancestors = (p: string) =>
  p
    .split('/')
    .slice(0, -1)
    .map((_, i, a) => a.slice(0, i + 1).join('/'));

export default function Ide({ vfs, initialPath, notFound = false }: Props) {
  const [tabs, setTabs] = useState<string[]>(notFound ? [] : [initialPath]);
  const [active, setActive] = useState<string | null>(notFound ? null : initialPath);
  /** the 404 "crash" tab: shown while no file is active, until closed */
  const [crash, setCrash] = useState(notFound);
  const [view, setView] = useState<'preview' | 'source'>('preview');
  const [term, setTerm] = useState<Panel>('auto');
  const [termMax, setTermMax] = useState(false);
  const [explorer, setExplorer] = useState<Panel>('auto');
  /** what the side bar shows: the file tree or Search */
  const [side, setSide] = useState<'files' | 'search'>('files');
  const [query, setQuery] = useState('');
  /** the search result clicked last: the document scrolls to it and marks it */
  const [jump, setJump] = useState<{ path: string; hit: Hit; id: number } | null>(null);
  const [searchFocus, setSearchFocus] = useState(0);
  const [termHeight, setTermHeight] = useState<number | null>(null);
  // every folder starts open except the ones to discover (FOUND_LATER), unless the page that
  // was opened lives in one of them
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const open = new Set(Object.keys(vfs).flatMap(ancestors));
    for (const d of FOUND_LATER) open.delete(d);
    if (!notFound) for (const d of ancestors(initialPath)) open.add(d);
    return open;
  });
  const [items, setItems] = useState<TermItem[]>(() => outItems(welcome()));
  const [shell, setShell] = useState<ShellState>({
    cwd: '',
    prev: '',
    history: [],
    user: GUEST,
  });
  /** the log-in dialog (UserDialog.tsx) */
  const [userPick, setUserPick] = useState(false);
  /** the cookie pane: null = closed; required = first visit, closes only with a choice */
  const [cookiePane, setCookiePane] = useState<{ required: boolean } | null>(null);
  /** the colour theme picker (ThemePicker.tsx) */
  const [themePick, setThemePick] = useState(false);
  const [consent, setConsent] = useState(false);
  const shellRef = useRef(shell);
  shellRef.current = shell;
  const termRef = useRef<TerminalHandle>(null);
  const linkedin = profile.links.find((l) => l.label === 'LinkedIn')!.href;
  const github = profile.links.find((l) => l.label === 'GitHub')!.href;
  const closeMenu = useCallback(() => setMenu(null), []);
  const [program, setProgram] = useState<{ id: number; name: ProgramName; args: string[] } | null>(
    null,
  );
  const programRef = useRef(program);
  programRef.current = program;
  const rootRef = useRef<HTMLDivElement>(null);

  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  /** touch-only (phones, most tablets): the terminal is hidden there (ide.css, .only-touch) */
  const keyboardless = () => !window.matchMedia('(any-pointer: fine)').matches;
  /** what `auto` currently means on this screen */
  const termOpen = () => term === 'open' || (term === 'auto' && !isMobile());

  const openFile = useCallback(
    (path: string, push = true) => {
      setTabs((t) => (t.includes(path) ? t : [...t, path]));
      setActive(path);
      // a file opened from a link or the terminal shows where it lives
      setExpanded((x) =>
        ancestors(path).every((d) => x.has(d)) ? x : new Set([...x, ...ancestors(path)]),
      );
      setTermMax(false);
      if (push && location.pathname !== vfs[path]!.route)
        history.pushState({ path }, '', vfs[path]!.route);
      if (isMobile()) setExplorer('closed');
    },
    [vfs],
  );

  const exec = useCallback(
    (cmd: string) => {
      const before = shellRef.current;
      const res = run(cmd, before, vfs);
      shellRef.current = res.state;
      setShell(res.state);
      const cleared = res.effects.some((e) => e.type === 'clear');
      setItems((it) => [
        ...(cleared ? [] : it),
        ...(cleared
          ? []
          : [{ id: nextId++, kind: 'prompt' as const, cwd: before.cwd, cmd, user: before.user }]),
        ...outItems(res.lines),
      ]);
      for (const e of res.effects) {
        if (e.type === 'open') openFile(e.path);
        if (e.type === 'terminal') setTerm('closed');
        if (e.type === 'program') {
          setProgram({ id: nextId++, name: e.name, args: e.args });
          setTerm((t) => (t === 'closed' || (t === 'auto' && isMobile()) ? 'open' : t));
        }
        if (e.type === 'user') saveUser(e.name);
        if (e.type === 'theme') {
          const t = themeById(e.id);
          if (t) pickTheme(t);
        }
        if (e.type === 'cookies') {
          if (analyticsOn) setCookiePane((c) => c ?? { required: false });
          else
            setItems((it) => [
              ...it,
              ...outItems([[{ t: 'No cookies here: this site sets none right now.', c: 'muted' }]]),
            ]);
        }
      }
    },
    [vfs, openFile],
  );

  /** clicks in the explorer and the preview run through the shell, so the terminal teaches */
  const openViaShell = useCallback((path: string) => exec(`open ~/${path}`), [exec]);

  /** keep only these tabs; if the open one goes, `focus` (or its nearest neighbour) takes over */
  const keepTabs = (keep: string[], focus?: string) => {
    setTabs(keep);
    if (active && keep.includes(active)) return;
    const i = active ? tabs.indexOf(active) : 0;
    const left = tabs.slice(0, i).filter((t) => keep.includes(t));
    const next = focus ?? tabs.slice(i).find((t) => keep.includes(t)) ?? left.at(-1) ?? null;
    setActive(next);
    if (next) history.replaceState({ path: next }, '', vfs[next]!.route);
  };
  const closeTab = (path: string) => keepTabs(tabs.filter((t) => t !== path));

  // back / forward
  useEffect(() => {
    const onPop = () => {
      const p = pathForRoute(vfs, location.pathname);
      if (p) openFile(p, false);
    };
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, [vfs, openFile]);

  useEffect(() => {
    if (!notFound) return;
    setItems((it) => [
      ...it,
      {
        id: nextId++,
        kind: 'prompt',
        cwd: '',
        cmd: `open ${location.pathname}`,
        user: shellRef.current.user,
      },
      ...outItems([
        [{ t: `open: ${location.pathname}: No such file or directory`, c: 'err' }],
        [{ t: '[process exited with code 404]', c: 'muted' }],
        [
          { t: 'Try ', c: 'muted' },
          { t: 'ls', c: 'cmd', run: 'ls' },
          { t: ' or ', c: 'muted' },
          { t: 'tree', c: 'cmd', run: 'tree' },
        ],
      ]),
    ]);
  }, [notFound]);

  const file = active ? vfs[active] : undefined;
  // a newly opened file starts at its top
  useEffect(() => {
    rootRef.current?.querySelector('.doc')?.scrollTo(0, 0);
  }, [active]);

  // while the Search view is open, its matches are marked in the open document; the result
  // clicked last is scrolled to (once) and marked more strongly. CSS Custom Highlight API: the
  // document itself is not touched. Browsers without it still scroll to the match.
  const jumped = useRef(0);
  useEffect(() => {
    const hl = typeof CSS !== 'undefined' && 'highlights' in CSS ? CSS.highlights : null;
    hl?.delete('search');
    hl?.delete('search-now');
    const doc = rootRef.current?.querySelector<HTMLElement>('.doc');
    if (!doc || !file || side !== 'search') return;
    const source = view === 'source';
    const ranges = findRanges(doc, query, source ? '.src-text' : '.prose');
    if (hl && ranges.length) hl.set('search', new Highlight(...ranges));
    if (!jump || jump.path !== active) return;
    let now: Range | undefined;
    if (source) {
      // the source shows every line as it is: go by the line
      const row = doc.querySelectorAll('.src-row')[jump.hit.line];
      now = ranges.find((r) => row?.contains(r.startContainer));
    } else now = ranges[Math.min(jump.hit.nth, ranges.length - 1)];
    if (now) hl?.set('search-now', new Highlight(now));
    if (jumped.current === jump.id) return;
    jumped.current = jump.id;
    const box = now?.getBoundingClientRect();
    if (!box) return;
    const d = doc.getBoundingClientRect();
    doc.scrollTo({ top: doc.scrollTop + box.top - d.top - d.height / 3 });
  }, [active, file, view, query, jump, side]);

  // Ctrl+Shift+F (⌘⇧F): Search, as in the editor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || !e.shiftKey || e.key.toLowerCase() !== 'f') return;
      e.preventDefault();
      setSide('search');
      setExplorer('open');
      setSearchFocus((n) => n + 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    document.title =
      file && file.route !== '/'
        ? `${file.title} · dev.nevcan.com`
        : `${profile.name} · dev.nevcan.com`;
  }, [file]);

  // ↑ ↑ ↓ ↓ ← → ← → B A
  useEffect(() => {
    const code = [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ];
    let at = 0;
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      at = k === code[at] ? at + 1 : k === code[0] ? 1 : 0;
      if (at < code.length) return;
      at = 0;
      setItems((it) => [
        ...it,
        ...outItems([
          [{ t: '↑ ↑ ↓ ↓ ← → ← → B A', c: 'accent' }],
          [{ t: 'Cheat code accepted. Unlimited air for this session. 🫧' }],
          [{ t: '(Please still plan your dives.)', c: 'muted' }],
        ]),
      ]);
      bubbles();
      // the B and A just typed may sit in the prompt
      requestAnimationFrame(() => termRef.current?.clear());
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  }, []);

  // start typing anywhere and it goes to the terminal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1 || e.key === ' ') return;
      if (t.closest('input,textarea,select,[contenteditable]')) return;
      if (programRef.current) return;
      if (!termOpen()) setTerm('open');
      termRef.current?.focus();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // `whoami` in the prose is a button: it runs in the terminal
  const proseRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (keyboardless()) return;
    proseRef.current?.querySelectorAll('code').forEach((c) => {
      const name = c.textContent?.trim().split(/\s+/)[0] ?? '';
      if (!(name in COMMANDS) || c.closest('a')) return;
      c.classList.add('runnable');
      c.title = `Run in the terminal: ${c.textContent}`;
    });
  }, [file, view]);

  // a name saved by `login` on an earlier visit: the prompt, title bar and welcome use it
  useEffect(() => {
    const u = loadUser();
    if (!u) return;
    shellRef.current = { ...shellRef.current, user: u };
    setShell((s) => ({ ...s, user: u }));
    setItems((it) =>
      it.map((x, i) => (i === 0 && x.kind === 'out' ? { ...x, segs: welcomeLine(u) } : x)),
    );
  }, []);

  // the stored cookie choice: applied on load; no choice yet opens the pane
  useEffect(() => {
    if (!analyticsOn) return;
    const c = readChoice();
    applyChoice(c);
    setConsent(!!c?.analytics);
    if (!c) setCookiePane({ required: true });
  }, []);
  const openCookies = () => exec('cookies');
  const chooseCookies = (analytics: boolean) => {
    applyChoice(saveChoice(analytics));
    setConsent(analytics);
    setCookiePane(null);
  };

  // links inside the preview: our files open in the editor, the rest in a new tab
  const onPreviewClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('a[href="#cookie-settings"]')) {
      e.preventDefault();
      openCookies();
      return;
    }
    const code = (e.target as HTMLElement).closest('code.runnable');
    if (code) {
      if (!termOpen()) setTerm('open');
      exec(code.textContent ?? '');
      return;
    }
    const a = (e.target as HTMLElement).closest('a');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) {
      e.preventDefault();
      window.open(url.href, '_blank', 'noopener');
      return;
    }
    const p = pathForRoute(vfs, url.pathname);
    if (p) {
      e.preventDefault();
      openViaShell(p);
    }
  };

  const startResize = (e: ReactPointerEvent) => {
    const root = rootRef.current;
    if (!root) return;
    e.preventDefault();
    const bottom = root.querySelector('.work')!.getBoundingClientRect().bottom;
    const move = (ev: PointerEvent) =>
      setTermHeight(
        Math.round(Math.min(window.innerHeight * 0.8, Math.max(120, bottom - ev.clientY))),
      );
    const up = () => {
      removeEventListener('pointermove', move);
      removeEventListener('pointerup', up);
    };
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  const crumbs = useMemo(() => (active ? ['~', ...active.split('/')] : []), [active]);
  const toggleTerm = () => {
    setTerm(termOpen() ? 'closed' : 'open');
    setTermMax(false);
  };
  // ---------- right-click menu ----------
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const flashTimer = useRef(0);
  const notify = (msg: string) => {
    setFlash(msg);
    clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 1800);
  };
  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`Copied ${what}`);
    } catch {
      notify('Copy failed: the browser blocked the clipboard');
    }
  };
  const download = (path: string) => {
    const f = vfs[path]!;
    const a = document.createElement('a');
    if (f.binary) {
      // the photo as the site serves it (WebP, 1200 px)
      a.href = f.html.match(/src="([^"]+)"/)?.[1] ?? '';
      a.download = basename(path).replace(/\.\w+$/, '.webp');
    } else {
      a.href = URL.createObjectURL(new Blob([f.raw], { type: 'text/plain;charset=utf-8' }));
      a.download = basename(path);
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    a.click();
  };
  /** the button by the root: close every folder, or (when all are closed) open them all */
  const toggleAllDirs = () =>
    setExpanded((x) => (x.size ? new Set() : new Set(Object.keys(vfs).flatMap(ancestors))));
  const toggleDir = (d: string) =>
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(d)) n.delete(d);
      else n.add(d);
      return n;
    });
  const openInTerminal = (cmd: string) => {
    if (!termOpen()) setTerm('open');
    exec(cmd);
  };
  const onContextMenu = (e: MouseEvent) => {
    const t = e.target as HTMLElement;
    // Shift keeps the browser's menu, and so do text fields (paste)
    if (e.shiftKey || t.closest('input, textarea')) return;
    e.preventDefault();
    const items: MenuItem[] = [];
    const selection = window.getSelection()?.toString() ?? '';
    if (selection)
      items.push(
        { label: 'Copy', hint: '⌘C', action: () => copy(selection, 'selection') },
        'separator',
      );

    const el = t.closest<HTMLElement>('[data-path]');
    const link = t.closest('a');
    const tab = el?.classList.contains('tab') ? el.dataset.path! : null;
    if (tab) {
      // the tab's own menu, as in the editor
      const i = tabs.indexOf(tab);
      items.push(
        { label: 'Close', action: () => closeTab(tab) },
        {
          label: 'Close others',
          disabled: tabs.length < 2,
          action: () => keepTabs([tab], tab),
        },
        {
          label: 'Close to the right',
          disabled: i === tabs.length - 1,
          action: () => keepTabs(tabs.slice(0, i + 1), tab),
        },
        { label: 'Close all', action: () => keepTabs([]) },
        'separator',
        { label: 'Copy link', action: () => copy(location.origin + vfs[tab]!.route, 'link') },
        { label: 'Copy path', action: () => copy(`~/${tab}`, 'path') },
        'separator',
      );
    } else if (el) {
      const path = el.dataset.path!;
      const term = !keyboardless();
      if (el.dataset.kind === 'file')
        items.push(
          { label: 'Open', action: () => openViaShell(path) },
          ...(term
            ? [
                {
                  label: 'Open in terminal',
                  action: () => openInTerminal(`cd ~/${dirname(path)} && ls`),
                },
              ]
            : []),
          { label: 'Copy link', action: () => copy(location.origin + vfs[path]!.route, 'link') },
          { label: 'Copy path', action: () => copy(`~/${path}`, 'path') },
          { label: 'Download', action: () => download(path) },
          'separator',
        );
      else
        items.push(
          { label: expanded.has(path) ? 'Collapse' : 'Expand', action: () => toggleDir(path) },
          ...(term
            ? [{ label: 'Open in terminal', action: () => openInTerminal(`cd ~/${path} && ls`) }]
            : []),
          { label: 'Copy path', action: () => copy(`~/${path}`, 'path') },
          'separator',
        );
    } else if (link && t.closest('.prose, .crash')) {
      items.push(
        { label: 'Open link', action: () => link.click() },
        { label: 'Copy link address', action: () => copy(link.href, 'link') },
        'separator',
      );
    } else if (t.closest('.doc') && file) {
      items.push(
        {
          label: view === 'preview' ? 'View source' : 'View preview',
          action: () => setView((v) => (v === 'preview' ? 'source' : 'preview')),
        },
        { label: 'Copy page link', action: () => copy(location.origin + file.route, 'link') },
        { label: 'Download', action: () => download(file.path) },
        'separator',
      );
    } else if (t.closest('.terminal')) {
      items.push(
        { label: 'Clear terminal', hint: 'Ctrl+L', action: () => setItems([]) },
        {
          label: termMax ? 'Restore terminal' : 'Maximise terminal',
          action: () => setTermMax((m) => !m),
        },
        'separator',
      );
    }
    items.push(
      { label: 'Copy e-mail address', action: () => copy(profile.email, 'e-mail address') },
      { label: 'Open LinkedIn', action: () => window.open(linkedin, '_blank', 'noopener') },
      { label: 'Open GitHub', action: () => window.open(github, '_blank', 'noopener') },
      'separator',
      ...(keyboardless()
        ? []
        : [{ label: termOpen() ? 'Hide terminal' : 'Show terminal', action: toggleTerm }]),
      { label: 'Colour theme…', action: () => setThemePick(true) },
      ...(analyticsOn ? [{ label: 'Cookie settings', action: openCookies }] : []),
    );
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  /** the settings menu (the gear), opened beside the button that asked for it */
  const openSettings = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const beside = r.left < 60; // the activity bar: to its right; the title bar: below it
    setMenu({
      x: beside ? r.right + 4 : r.left,
      y: beside ? r.bottom : r.bottom + 4,
      items: [
        { label: 'Colour theme…', action: () => setThemePick(true) },
        {
          label: shell.user === GUEST ? 'Log in…' : `Logged in as ${shell.user}…`,
          action: () => setUserPick(true),
        },
        ...(analyticsOn ? [{ label: 'Cookie settings', action: openCookies }] : []),
      ],
    });
  };

  const sideOpen = () => explorer === 'open' || (explorer === 'auto' && !isMobile());
  /** the activity bar buttons: open the side bar on that view; on the view it shows, close it */
  const showSide = (v: 'files' | 'search') => {
    if (sideOpen() && side === v) return setExplorer('closed');
    setSide(v);
    setExplorer('open');
    if (v === 'search') setSearchFocus((n) => n + 1);
  };
  const openHit = (path: string, hit: Hit) => {
    if (active !== path) openViaShell(path);
    setJump({ path, hit, id: nextId++ });
  };

  return (
    <div
      ref={rootRef}
      onContextMenu={onContextMenu}
      className="ide"
      data-term={term}
      data-term-max={termMax || undefined}
      data-explorer={explorer}
      style={termHeight ? ({ '--term-h': `${termHeight}px` } as CSSProperties) : undefined}
    >
      <header className="titlebar">
        <div className="lights" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <button
          type="button"
          className="tb-btn only-mobile"
          onClick={() => showSide('files')}
          aria-label="Files"
        >
          <Icon d={ICON.files} />
        </button>
        <button
          type="button"
          className="tb-btn only-mobile"
          onClick={() => showSide('search')}
          aria-label="Search"
        >
          <Icon d={ICON.search} />
        </button>
        <a
          className="tb-logo"
          href="/"
          aria-label={`${profile.name}, home`}
          onClick={(e) => {
            e.preventDefault();
            openViaShell('README.md');
          }}
        >
          <svg viewBox="316 253 771 262" aria-hidden="true">
            <path
              d="M350 283 533 485V283M624 283h159M624 384h159M624 485h159M874 283v202l183-202"
              fill="none"
              stroke="currentColor"
              strokeWidth="40"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="353" cy="478" r="27" style={{ fill: 'var(--accent)' }} />
          </svg>
          <span className="tb-tag" aria-hidden="true">
            dev
          </span>
        </a>
        <p className="title">
          <span className="title-user">{shell.user}@dev.nevcan.com</span>
          <span className="title-path">{active ? ` — ${displayPath(active)}` : ''}</span>
        </p>
        <button
          type="button"
          className="tb-btn only-mobile"
          onClick={openSettings}
          aria-label="Settings"
          aria-haspopup="menu"
        >
          <Icon d={ICON.settings} />
        </button>
      </header>

      <div className="body">
        <nav className="activity" aria-label="Panels">
          <button
            type="button"
            className="act-btn act-files"
            onClick={() => showSide('files')}
            title="Explorer"
            aria-label="Explorer"
            aria-pressed={side === 'files' && explorer !== 'closed'}
          >
            <Icon d={ICON.files} />
          </button>
          <button
            type="button"
            className="act-btn act-term"
            onClick={toggleTerm}
            title="Terminal"
            aria-label="Terminal"
          >
            <Icon d={ICON.terminal} />
          </button>
          <button
            type="button"
            className="act-btn"
            onClick={() => showSide('search')}
            title="Search"
            aria-label="Search"
            aria-pressed={side === 'search' && explorer !== 'closed'}
          >
            <Icon d={ICON.search} />
          </button>
          {/* panels above the line, links that leave the site below it */}
          <span className="act-sep" aria-hidden="true" />
          <a
            className="act-btn"
            href={github}
            target="_blank"
            rel="me noopener"
            title="GitHub"
            aria-label="GitHub"
          >
            <Icon d={ICON.github} />
          </a>
          <a
            className="act-btn"
            href={linkedin}
            target="_blank"
            rel="me noopener"
            title="LinkedIn"
            aria-label="LinkedIn"
          >
            <Icon d={ICON.linkedin} />
          </a>
          {/* until the branch picker takes it over (⎇ main → diving) */}
          <a
            className="act-btn"
            href="https://dive.nevcan.com"
            title="dive.nevcan.com"
            aria-label="dive.nevcan.com"
          >
            <Icon d={ICON.dive} />
          </a>
          <span className="act-spacer" />
          <button
            type="button"
            className="act-btn"
            onClick={openSettings}
            title="Settings"
            aria-label="Settings"
            aria-haspopup="menu"
          >
            <Icon d={ICON.settings} />
          </button>
        </nav>

        <aside className="explorer" aria-label={side === 'search' ? 'Search' : 'Explorer'}>
          <div className="panel-head">
            <span>{side === 'search' ? 'Search' : 'Explorer'}</span>
            <button
              type="button"
              className="icon-btn only-mobile"
              onClick={() => setExplorer('closed')}
              aria-label={side === 'search' ? 'Close search' : 'Close files'}
            >
              <Icon d={ICON.close} />
            </button>
          </div>
          {side === 'search' ? (
            <SearchPanel
              vfs={vfs}
              query={query}
              onQuery={(q) => {
                setQuery(q);
                setJump(null);
              }}
              onOpen={openHit}
              focusKey={searchFocus}
              icons={{ md: <Icon d={ICON.md} />, chevron: <Icon d={ICON.chevron} /> }}
            />
          ) : (
            <>
              <div className="tree-root">
                <span>dev.nevcan.com</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={toggleAllDirs}
                  title={expanded.size ? 'Collapse folders' : 'Expand folders'}
                  aria-label={expanded.size ? 'Collapse folders' : 'Expand folders'}
                >
                  <Icon d={expanded.size ? ICON.collapseAll : ICON.expandAll} />
                </button>
              </div>
              <Tree
                vfs={vfs}
                dir=""
                depth={0}
                active={active}
                expanded={expanded}
                onToggle={toggleDir}
                onOpen={openViaShell}
              />
            </>
          )}
        </aside>
        <div
          className="scrim only-mobile"
          onClick={() => setExplorer('closed')}
          aria-hidden="true"
        />

        <main className="work" id="main">
          <div className="editor-row" data-split={cookiePane ? true : undefined}>
            <section className="editor" aria-label="Editor">
              <div className="tabs">
                <div className="tab-list" role="tablist">
                  {crash && (
                    <div className={`tab tab-crash ${active ? '' : 'active'}`} role="presentation">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={!active}
                        className="tab-name"
                        onClick={() => setActive(null)}
                      >
                        <span className="crash-dot" aria-hidden="true" />
                        404.error
                      </button>
                      <button
                        type="button"
                        className="tab-close"
                        onClick={() => {
                          setCrash(false);
                          if (!active) openViaShell('README.md');
                        }}
                        aria-label="Close the error"
                      >
                        <Icon d={ICON.close} />
                      </button>
                    </div>
                  )}
                  {tabs.map((p) => (
                    <div
                      key={p}
                      data-path={p}
                      data-kind="file"
                      className={`tab ${p === active ? 'active' : ''}`}
                      role="presentation"
                      // a middle click closes it, as in the editor
                      onAuxClick={(e) => {
                        if (e.button === 1) closeTab(p);
                      }}
                      onMouseDown={(e) => {
                        if (e.button === 1) e.preventDefault(); // no autoscroll
                      }}
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={p === active}
                        className="tab-name"
                        onClick={() => openFile(p)}
                        title={displayPath(p)}
                      >
                        <span className="file-ico">
                          <Icon d={ICON[langOf(p) === 'markdown' ? 'md' : 'svg']} />
                        </span>
                        {basename(p)}
                      </button>
                      <button
                        type="button"
                        className="tab-close"
                        onClick={() => closeTab(p)}
                        aria-label={`Close ${basename(p)}`}
                      >
                        <Icon d={ICON.close} />
                      </button>
                    </div>
                  ))}
                </div>
                {file && (
                  <div className="view-toggle" role="group" aria-label="View">
                    <button
                      type="button"
                      aria-pressed={view === 'preview'}
                      onClick={() => setView('preview')}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'source'}
                      onClick={() => setView('source')}
                    >
                      Source
                    </button>
                  </div>
                )}
              </div>
              {file && (
                <nav className="crumbs" aria-label="Path">
                  {crumbs.map((c, i) => (
                    <span key={i}>
                      {i > 0 && <span className="crumb-sep">›</span>}
                      {c}
                    </span>
                  ))}
                </nav>
              )}
              <div className="doc">
                {!file && crash ? (
                  <CrashView vfs={vfs} onOpen={openViaShell} onRun={exec} />
                ) : !file ? (
                  <div className="empty">
                    <p>No file open.</p>
                    <p>
                      Pick one from the explorer, or type <code>open README.md</code>.
                    </p>
                    <button type="button" className="btn" onClick={() => openViaShell('README.md')}>
                      Open README.md
                    </button>
                  </div>
                ) : view === 'preview' ? (
                  <article
                    ref={proseRef}
                    className="prose"
                    onClick={onPreviewClick}
                    dangerouslySetInnerHTML={{ __html: file.html }}
                  />
                ) : (
                  <SourceView
                    raw={file.raw}
                    lang={langOf(file.path)}
                    binary={file.binary}
                    onPreview={() => setView('preview')}
                  />
                )}
              </div>
            </section>
            {cookiePane && (
              <CookiePane
                required={cookiePane.required}
                analytics={consent}
                onChoose={chooseCookies}
                onClose={() => setCookiePane(null)}
                onOpenFile={openViaShell}
              />
            )}
          </div>

          <section className="terminal" aria-label="Terminal">
            <div className="resize" onPointerDown={startResize} aria-hidden="true" />
            <div className="panel-head term-head">
              <button type="button" className="term-title" onClick={toggleTerm}>
                Terminal
              </button>
              <span className="term-hint">{`nsh · ${displayPath(shell.cwd)}`}</span>
              <span className="head-actions">
                <button
                  type="button"
                  className="icon-btn hide-closed"
                  onClick={() => setTermMax((m) => !m)}
                  aria-label={termMax ? 'Restore terminal' : 'Maximise terminal'}
                >
                  <Icon d={termMax ? ICON.min : ICON.max} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={toggleTerm}
                  aria-label="Toggle terminal"
                >
                  <Icon d={ICON.close} />
                </button>
              </span>
            </div>
            <Terminal
              ref={termRef}
              items={items}
              cwd={shell.cwd}
              user={shell.user}
              history={shell.history}
              open={term !== 'closed'}
              onExec={exec}
              onComplete={(v) => complete(v, shellRef.current, vfs)}
              onShowOptions={(v, opts) =>
                setItems((it) => [
                  ...it,
                  {
                    id: nextId++,
                    kind: 'prompt',
                    cwd: shellRef.current.cwd,
                    cmd: v,
                    user: shellRef.current.user,
                  },
                  ...outItems([
                    opts.flatMap((o) => [
                      { t: o, c: o.endsWith('/') ? 'dir' : undefined },
                      { t: '  ' },
                    ]),
                  ]),
                ])
              }
              onClear={() => setItems([])}
              program={program}
              onProgramExit={(lines) => {
                setProgram(null);
                if (lines?.length) setItems((it) => [...it, ...outItems(lines)]);
                requestAnimationFrame(() => termRef.current?.focus());
              }}
              onInterrupt={(v) =>
                setItems((it) => [
                  ...it,
                  {
                    id: nextId++,
                    kind: 'prompt',
                    cwd: shellRef.current.cwd,
                    cmd: v + '^C',
                    user: shellRef.current.user,
                  },
                ])
              }
            />
          </section>
        </main>
      </div>

      {menu && <ContextMenu {...menu} onClose={closeMenu} />}
      {themePick && <ThemePicker onClose={() => setThemePick(false)} />}
      {userPick && (
        <UserDialog
          user={shell.user}
          onSubmit={(cmd) => exec(cmd)}
          onClose={() => setUserPick(false)}
        />
      )}
      <footer className="statusbar">
        <span className="sb-item sb-accent hide-mobile">⎇ main</span>
        <span className="sb-item sb-flash" aria-live="polite">
          {flash}
        </span>
        <span className="sb-item hide-touch">{displayPath(shell.cwd)}</span>
        <span
          className="sb-item sb-note only-touch"
          title="The terminal needs a keyboard: try it on a computer"
        >
          ⌨ terminal: desktop
        </span>
        <span className="sb-spacer" />
        {file && !file.binary && (
          <span className="sb-item hide-mobile">
            {view === 'preview' ? 'Preview' : `Ln ${file.raw.split('\n').length - 1}`}
          </span>
        )}
        {file && (
          <span className="sb-item hide-mobile">
            {{ markdown: 'Markdown', svg: 'SVG', image: 'Image' }[langOf(file.path)]}
          </span>
        )}
        <span className="sb-item hide-mobile">UTF-8</span>
        <a
          className="sb-item sb-link"
          href="/legal/privacy"
          onClick={(e) => {
            e.preventDefault();
            openViaShell('legal/privacy.md');
          }}
        >
          Privacy
        </a>
        <a
          className="sb-item sb-link"
          href="/legal/terms"
          onClick={(e) => {
            e.preventDefault();
            openViaShell('legal/terms.md');
          }}
        >
          Terms
        </a>
        {analyticsOn && (
          <button type="button" className="sb-item sb-link" onClick={openCookies}>
            Cookies
          </button>
        )}
      </footer>
    </div>
  );
}
