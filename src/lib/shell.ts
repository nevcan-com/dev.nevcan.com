/**
 * The terminal's shell: a pure function from a typed line to printed lines and side effects
 * (open a file in the editor, clear the screen, hide the terminal). No real code ever runs.
 *
 * Output is structured, not HTML: a line is a list of segments, and a segment can carry a class,
 * an external link, or a command to run when clicked. Clickable `ls` output is how visitors who
 * never type can still use the terminal.
 */
import { profile } from '@/data/profile';
import { fortunes } from '@/data/fun';
import { DEFAULT_THEME, THEMES, themeById } from '@/data/themes';
import { HOME, basename, displayPath, isDir, isFile, listDir, resolvePath, type Vfs } from './vfs';

export interface Seg {
  t: string;
  /** a class from ide.css: dir, file, err, muted, accent, h, code, link, cmd; `logo` draws the
   *  logo's N (neofetch) */
  c?: string;
  /** external link */
  href?: string;
  /** a command to run when clicked */
  run?: string;
}
export type Line = Seg[];

export interface ShellState {
  cwd: string;
  /** for `cd -` */
  prev: string;
  history: string[];
}

export type Effect =
  | { type: 'open'; path: string }
  | { type: 'clear' }
  | { type: 'terminal'; state: 'closed' }
  | { type: 'cookies' }
  /** pick a colour theme (and save it on this device) */
  | { type: 'theme'; id: string }
  /** a program that takes over the terminal for a while (lazy-loaded: programs/index.ts) */
  | { type: 'program'; name: ProgramName; args: string[] };

export type ProgramName =
  | 'top'
  | 'htop'
  | 'hire'
  | 'sl'
  | 'ping'
  | 'matrix'
  | 'aquarium'
  | 'typing'
  | 'snake'
  | 'career'
  | 'guess'
  | 'hangman';

export interface Result {
  lines: Line[];
  state: ShellState;
  effects: Effect[];
}

/** hidden files, only for `ls -a` and `cat` */
const HIDDEN: Record<string, string> = {
  '.plan': `Live:  dev.nevcan.com (you are here)
       dive.nevcan.com
       fit.nevcan.com
Next:  www.nevcan.com
       film.nevcan.com
       game.nevcan.com
       shop.nevcan.com`,
  '.social': `LinkedIn    linkedin.com/in/nevcanuludas
GitHub      github.com/nevcanuludas
GitLab      gitlab.com/nevcanuludas
GUE         gue.com/diver-training/gue-instructors/instructor-resume?id=20397
GUE TV      gue.tv/authors/nev?via=nev
Instagram   instagram.com/nevcanuludas
YouTube     youtube.com/nevcanuludas
Medium      medium.com/@nevcanuludas
            medium.com/neptunsualti
Sketchfab   sketchfab.com/nevcanuludas
X           x.com/nevcanuludas
Bluesky     nevcanuludas.bsky.social
Facebook    facebook.com/nevcanuludas
Card        hihello.com/p/2a5123b0-641a-4681-8852-c963488baf28`,
};

const txt = (t: string, c?: string): Seg => ({ t, c });
const line = (...segs: (Seg | string)[]): Line =>
  segs.map((s) => (typeof s === 'string' ? { t: s } : s));
const err = (t: string): Line[] => [[txt(t, 'err')]];
const muted = (t: string): Line => [txt(t, 'muted')];

const quote = (p: string) => (/\s/.test(p) ? `"${p}"` : p);

/** whitespace split that keeps "quoted strings" together */
const tokenize = (s: string): string[] =>
  [...s.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');

interface Ctx {
  vfs: Vfs;
  state: ShellState;
  effects: Effect[];
  /** the text piped in (`fortune | cowsay`) */
  stdin?: string;
  /** output goes into a pipe: `ls` then prints one name per line, like the real one */
  piped?: boolean;
}
type Cmd = {
  desc: string;
  usage?: string;
  /** listed in `help` (jokes aren't) */
  hidden?: boolean;
  fn: (args: string[], ctx: Ctx) => Line[];
};

/** "-la x y" → flags {l, a}, rest [x, y] */
const parseFlags = (args: string[]) => {
  const flags = new Set<string>();
  const rest: string[] = [];
  for (const a of args)
    if (/^-[a-zA-Z]+$/.test(a)) for (const f of a.slice(1)) flags.add(f);
    else rest.push(a);
  return { flags, rest };
};

const size = (n: number) => (n < 1024 ? `${n}B` : `${(n / 1024).toFixed(1)}K`);

function lsLines(ctx: Ctx, dir: string, all: boolean, long: boolean): Line[] {
  const entries = listDir(ctx.vfs, dir);
  const hidden = all && dir === '' ? Object.keys(HIDDEN) : [];
  // clickable output may be clicked after another cd, so it always uses absolute paths
  const rel = (p: string) => `~/${p}`;
  const segOf = (e: { name: string; path: string; type: 'dir' | 'file' }): Seg =>
    e.type === 'dir'
      ? { t: e.name + '/', c: 'dir', run: `cd ${quote(rel(e.path))} && ls` }
      : { t: e.name, c: 'file', run: `open ${quote(rel(e.path))}` };

  if (long) {
    const out: Line[] = [];
    if (all) out.push(line(txt('drwxr-xr-x      -  ', 'muted'), txt('./', 'dir')));
    if (all) out.push(line(txt('drwxr-xr-x      -  ', 'muted'), txt('../', 'dir')));
    for (const h of hidden)
      out.push(line(txt(`-rw-r--r--  ${size(HIDDEN[h]!.length).padStart(5)}  `, 'muted'), h));
    for (const e of entries) {
      const meta =
        e.type === 'dir'
          ? 'drwxr-xr-x      -  '
          : `-rw-r--r--  ${size(ctx.vfs[e.path]!.binary?.bytes ?? ctx.vfs[e.path]!.raw.length).padStart(5)}  `;
      out.push(line(txt(meta, 'muted'), segOf(e)));
    }
    return out;
  }
  if (ctx.piped) return [...hidden.map((h) => [txt(h)]), ...entries.map((e) => [segOf(e)])];
  const segs: Seg[] = [];
  if (all) segs.push(txt('./', 'dir'), txt('  '), txt('../', 'dir'), txt('  '));
  for (const h of hidden) segs.push({ t: h, c: 'file', run: `cat ~/${h}` }, txt('  '));
  for (const e of entries) segs.push(segOf(e), txt('  '));
  return segs.length ? [segs] : [];
}

function treeLines(ctx: Ctx, dir: string, prefix = ''): Line[] {
  const entries = listDir(ctx.vfs, dir);
  return entries.flatMap((e, i) => {
    const last = i === entries.length - 1;
    const branch = txt(prefix + (last ? '└── ' : '├── '), 'muted');
    if (e.type === 'dir')
      return [
        line(branch, { t: e.name + '/', c: 'dir', run: `cd ~/${quote(e.path)} && ls` }),
        ...treeLines(ctx, e.path, prefix + (last ? '    ' : '│   ')),
      ];
    return [line(branch, { t: e.name, c: 'file', run: `open ~/${quote(e.path)}` })];
  });
}

/** Markdown source with light colouring, for `cat` */
const mdLines = (raw: string): Line[] =>
  raw
    .replace(/\n+$/, '')
    .split('\n')
    .map((l) => {
      if (/^#{1,6}\s/.test(l)) return [txt(l, 'h')];
      if (/^\s*[-*]\s/.test(l))
        return line(txt(l.match(/^\s*[-*]/)![0], 'accent'), l.replace(/^\s*[-*]/, ''));
      return [txt(l)];
    });

/** resolve a file argument, with the error message cat/open print when it isn't a file */
function fileArg(ctx: Ctx, cmd: string, arg: string): { path: string } | { error: Line[] } {
  const p = resolvePath(ctx.state.cwd, arg);
  if (p === null) return { error: err(`${cmd}: ${arg}: Permission denied`) };
  if (isFile(ctx.vfs, p)) return { path: p };
  if (p !== '' && isDir(ctx.vfs, p)) return { error: err(`${cmd}: ${arg}: Is a directory`) };
  return { error: err(`${cmd}: ${arg}: No such file or directory`) };
}

const program = (ctx: Ctx, name: ProgramName, args: string[] = []): Line[] => {
  ctx.effects.push({ type: 'program', name, args });
  return [];
};

/**
 * `nev-career` / `git log --graph`: the career as a git graph, oldest first. Software is `main`
 * (experience/*.md), diving a `diving` branch (experience/diving/*.md); a few milestones that have
 * no file of their own come from MILESTONES. Each row keeps its year, for the film's counter.
 */
export interface CareerRow {
  year: number;
  line: Line;
}
type CareerEvent = {
  year: number;
  branch: 'main' | 'diving' | 'merge';
  title: string;
  path: string;
  tag?: string;
  /** same year: lower goes first */
  order?: number;
};
const MILESTONES: CareerEvent[] = [
  { year: 2008, branch: 'diving', title: 'Started diving · OGÜSEA', path: 'education.md' },
  {
    year: 2011,
    branch: 'diving',
    title: 'Diving instructor',
    path: 'about/whoami.md',
    tag: 'instructor',
  },
  {
    year: 2025,
    branch: 'merge',
    title: "Merge branch 'diving': MA, underwater cultural heritage",
    path: 'education.md',
    order: -1,
  },
];
/** a stable, git-looking short hash */
const shortHash = (s: string) => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, 7);
};
/** `git lg`: the same graph the way git prints it, newest first (so the branch lines flip) */
export function careerLog(vfs: Vfs): Line[] {
  const flip: Record<string, string> = { '\\': '/', '/': '\\' };
  return careerGraph(vfs)
    .reverse()
    .map((r) => r.line.map((s) => (flip[s.t] ? { ...s, t: flip[s.t]! } : s)));
}
export function careerGraph(vfs: Vfs): CareerRow[] {
  const fromDir = (dir: string, branch: 'main' | 'diving'): CareerEvent[] =>
    listDir(vfs, dir)
      .filter((e) => e.type === 'file' && /^\d{4}/.test(e.name))
      .map((e) => ({ year: +e.name.slice(0, 4), branch, title: vfs[e.path]!.title, path: e.path }));
  const events = [
    ...fromDir('experience', 'main'),
    ...fromDir('experience/diving', 'diving'),
    ...MILESTONES,
  ].sort((a, b) => a.year - b.year || (a.order ?? 0) - (b.order ?? 0));
  const lastMain = events.filter((e) => e.branch !== 'diving').at(-1);
  const lastDiving = events.filter((e) => e.branch === 'diving').at(-1);

  const M = (t: string): Seg => txt(t, 'accent');
  const D = (t: string): Seg => txt(t, 'dir');
  const rows: CareerRow[] = [];
  let open = false; // the diving branch is drawn
  const commit = (graph: Seg[], e: CareerEvent) => {
    const refs = [
      e === lastMain ? 'HEAD -> main' : '',
      e === lastDiving ? 'diving' : '',
      e.tag ? `tag: ${e.tag}` : '',
    ].filter(Boolean);
    // Nev's own `git lg` alias: %Cred%h | %C(yellow)%d %s %Cgreen(%cr) %C(cyan)[%an]
    const ago = new Date().getFullYear() - e.year;
    rows.push({
      year: e.year,
      line: [
        ...graph,
        txt(shortHash(e.title + e.year), 'err'),
        txt(' | '),
        ...(refs.length ? [txt(` (${refs.join(', ')})`, 'cmd')] : []),
        txt(' '),
        { t: e.title, c: 'file', run: `open ~/${quote(e.path)}` },
        txt(
          ` (${ago === 0 ? 'this year' : ago === 1 ? '1 year ago' : `${ago} years ago`})`,
          'accent',
        ),
        txt(` [${profile.name}]`, 'dir'),
      ],
    });
  };
  for (const e of events) {
    if (e.branch === 'diving') {
      if (!open) rows.push({ year: e.year, line: [M('|'), D('\\')] });
      open = true;
      commit([M('| '), D('* ')], e);
    } else if (e.branch === 'merge') {
      if (open) rows.push({ year: e.year, line: [M('|'), D('/')] });
      open = false;
      commit([M('*   ')], e);
    } else commit(open ? [M('* '), D('| ')] : [M('*   ')], e);
  }
  return rows;
}

/** wraps text to a speech bubble, with a cow of our own drawing */
function cowsay(text: string): Line[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const rows: string[] = [];
  let row = '';
  for (const w of words) {
    if (row && (row + ' ' + w).length > 38) {
      rows.push(row);
      row = w;
    } else row = row ? `${row} ${w}` : w;
  }
  if (row) rows.push(row);
  const width = Math.max(...rows.map((r) => r.length));
  const edge = (l: string, r: string, i: number) =>
    rows.length === 1
      ? ['<', '>']
      : i === 0
        ? ['/', '\\']
        : i === rows.length - 1
          ? ['\\', '/']
          : [l, r];
  return [
    [txt(' ' + '_'.repeat(width + 2))],
    ...rows.map((r, i) => {
      const [a, b] = edge('|', '|', i);
      return [txt(`${a} ${r.padEnd(width)} ${b}`)];
    }),
    [txt(' ' + '-'.repeat(width + 2))],
    ...[
      '      \\    (__)',
      '       \\   (oo)______',
      '           (__)      )\\',
      '              ||---w|',
      '              ||   ||',
    ].map((l) => [txt(l, 'accent')]),
  ];
}

/** marks every occurrence of `needle` in a line */
function highlightMatches(text: string, needle: string, ci: boolean): Seg[] {
  const hay = ci ? text.toLowerCase() : text;
  const n = ci ? needle.toLowerCase() : needle;
  const out: Seg[] = [];
  let at = 0;
  for (let i = hay.indexOf(n); i !== -1; i = hay.indexOf(n, i + n.length)) {
    if (i > at) out.push(txt(text.slice(at, i)));
    out.push(txt(text.slice(i, i + n.length), 'match'));
    at = i + n.length;
  }
  if (at < text.length) out.push(txt(text.slice(at)));
  return out;
}

/** every text file under a path (a file is itself) */
const filesUnder = (vfs: Vfs, p: string): string[] =>
  isFile(vfs, p)
    ? [p]
    : Object.keys(vfs)
        .filter((f) => (p === '' || f.startsWith(p + '/')) && !vfs[f]!.binary)
        .sort();

/**
 * grep <text> [file|dir…]: like the real one, with two kindnesses. Without a file and without a
 * pipe it searches everything under the current directory (instead of waiting for input), and
 * directories are searched recursively without needing -r. Flags: -i, -n, -l (-r accepted).
 */
function grep(args: string[], ctx: Ctx): Line[] {
  const { flags, rest } = parseFlags(args);
  const needle = rest[0];
  if (!needle) return err('grep: usage: grep <text> [file]. Try: grep Dipnot');
  const ci = flags.has('i');
  const has = (l: string) =>
    ci ? l.toLowerCase().includes(needle.toLowerCase()) : l.includes(needle);
  const nothing = (): Line[] => (ctx.piped ? [] : [muted(`grep: no matches for "${needle}"`)]);

  // from a pipe
  if (ctx.stdin !== undefined && rest.length === 1) {
    const out = ctx.stdin
      .split('\n')
      .flatMap((l, i) =>
        has(l)
          ? [
              [
                ...(flags.has('n') ? [txt(`${i + 1}:`, 'muted')] : []),
                ...highlightMatches(l, needle, ci),
              ],
            ]
          : [],
      );
    return out.length ? out : nothing();
  }

  const targets = rest.length > 1 ? rest.slice(1) : ['.'];
  const files: string[] = [];
  const errors: Line[] = [];
  for (const t of targets) {
    const p = resolvePath(ctx.state.cwd, t);
    if (p === null) errors.push(...err(`grep: ${t}: Permission denied`));
    else if (!isFile(ctx.vfs, p) && !isDir(ctx.vfs, p))
      errors.push(...err(`grep: ${t}: No such file or directory`));
    else files.push(...filesUnder(ctx.vfs, p));
  }
  const many = files.length > 1;
  const base = ctx.state.cwd ? ctx.state.cwd + '/' : '';
  const label = (f: string) => (f.startsWith(base) ? f.slice(base.length) : `~/${f}`);
  const out: Line[] = [];
  for (const f of files) {
    const lines = ctx.vfs[f]!.raw.split('\n');
    const hits = lines.flatMap((l, i) => (has(l) ? [{ l, i }] : []));
    if (!hits.length) continue;
    const name: Seg = { t: label(f), c: 'dir', run: `open ~/${quote(f)}` };
    if (flags.has('l')) {
      out.push([name]);
      continue;
    }
    for (const { l, i } of hits)
      out.push([
        ...(many ? [name, txt(':', 'muted')] : []),
        ...(flags.has('n') || many ? [txt(`${i + 1}:`, 'muted')] : []),
        ...highlightMatches(l.trim(), needle, ci),
      ]);
  }
  if (out.length > 60) out.splice(60, out.length, muted(`… ${out.length - 60} more lines`));
  return [...errors, ...(out.length ? out : errors.length ? [] : nothing())];
}

/** `help`: commands by what they're for, in the order a visitor needs them */
const CATEGORIES: [string, string[]][] = [
  ['Get around', ['ls', 'cd', 'pwd', 'tree', 'open', 'cat', 'grep']],
  ['About me', ['whoami', 'git log', 'git lg', 'nev-career', 'contact', 'hire', 'top']],
  [
    'Just for fun',
    ['fortune', 'neofetch', 'matrix', 'aquarium', 'typing', 'snake', 'guess', 'hangman'],
  ],
  ['Terminal', ['help', 'history', 'clear', 'theme', 'cookies', 'exit']],
];

/** what `help --all` and `man` say about the hidden commands */
const SECRET_DESC: Record<string, string> = {
  htop: 'top, with bars',
  sl: 'for when you meant ls',
  ping: 'ping a nevcan.com host (try dive)',
  cowsay: 'a cow says it (try fortune | cowsay)',
  npm: 'npm install nevcan',
  sudo: 'go on, try it',
  rm: 'try it. Carefully.',
  vim: 'opens the file in the editor',
  vi: 'opens the file in the editor',
  nano: 'opens the file in the editor',
  emacs: 'opens the file in the editor',
  less: 'opens the file in the editor',
  code: 'opens the file in the editor',
  mkdir: 'read-only file system, sorry',
  touch: 'read-only file system, sorry',
  mv: 'read-only file system, sorry',
  cp: 'read-only file system, sorry',
  ll: 'ls -la',
  man: 'the manual for a command',
  echo: 'says it back',
  date: "today's date",
  hostname: 'where you are',
  uname: 'what this runs on',
  git: 'git status (or st), git log, git lg',
  dive: 'the other subdomain',
  hello: 'say hi',
  hi: 'say hi',
  fastfetch: "neofetch's successor",
  logout: 'same as exit',
};

function helpLines(all: boolean): Line[] {
  const listed = new Set(CATEGORIES.flatMap(([, names]) => names));
  const other = Object.keys(COMMANDS).filter(
    (n) => !COMMANDS[n]!.hidden && !listed.has(n) && !n.startsWith('-'),
  );
  const groups: [string, string[]][] = [
    ...CATEGORIES,
    ...(other.length ? ([['Other', other]] as [string, string[]][]) : []),
  ];
  const secrets = Object.keys(COMMANDS)
    .filter((n) => COMMANDS[n]!.hidden && !n.startsWith('-'))
    .sort();
  if (all) groups.push(['Secrets', secrets]);
  const label = (n: string) => COMMANDS[n]?.usage ?? n;
  const w = Math.max(...groups.flatMap(([, ns]) => ns.map((n) => label(n).length))) + 3;
  return [
    muted('Click a command or type it. Tab completes, ↑ ↓ walk the history.'),
    ...groups.flatMap(([title, names]) => [
      [],
      [txt(title, 'h')],
      ...names
        .filter((n) => COMMANDS[n])
        .map((n) =>
          line(
            { t: '  ' + label(n).padEnd(w), c: 'cmd', run: n },
            COMMANDS[n]!.desc || SECRET_DESC[n] || '',
          ),
        ),
    ]),
    [],
    all
      ? muted("That's all of them. Well, almost: one secret isn't a command.")
      : line(
          txt(`${secrets.length} more are hidden. `, 'muted'),
          { t: 'help --all', c: 'cmd', run: 'help --all' },
          txt(' spoils them.', 'muted'),
        ),
  ];
}

const yearsCoding = () => new Date().getFullYear() - profile.since;

const readOnly = (name: string): Cmd => ({
  desc: '',
  hidden: true,
  fn: () => err(`${name}: read-only file system. Everything here is look, don't touch.`),
});

const editorJoke = (name: string): Cmd => ({
  desc: '',
  hidden: true,
  fn: (args, ctx) => {
    if (!args[0]) return err(`${name}: which file? Try: ${name} contact.md`);
    const r = fileArg(ctx, name, args[0]);
    if ('error' in r) return r.error;
    ctx.effects.push({ type: 'open', path: r.path });
    return [
      muted(
        `Opened ${displayPath(r.path)} in the editor instead. No need to remember how to quit.`,
      ),
    ];
  },
});

export const COMMANDS: Record<string, Cmd> = {
  help: {
    desc: 'list the commands (--all shows the secret ones too)',
    usage: 'help',
    fn: (args) => {
      const all = args.some((a) => /^(-a|--all|all)$/.test(a));
      const topic = args.find((a) => !a.startsWith('-') && a !== 'all');
      if (topic) return COMMANDS.man!.fn([topic], {} as Ctx);
      return helpLines(all);
    },
  },
  whoami: {
    desc: 'who you are, and whose machine this is',
    fn: () => [
      [txt('guest')],
      muted(`…but this is ${profile.name.split(' ')[0]}'s machine:`),
      [],
      line(txt(profile.name, 'accent')),
      [txt(profile.headline)],
      [
        txt(
          `${yearsCoding()} years in software · ${profile.location} · also a GUE diving instructor`,
        ),
      ],
      [],
      line(txt('→ more: ', 'muted'), {
        t: 'cat about/whoami.md',
        c: 'cmd',
        run: 'cat ~/about/whoami.md',
      }),
    ],
  },
  ls: {
    desc: 'list files (-a hidden, -l details)',
    usage: 'ls [dir]',
    fn: (args, ctx) => {
      const { flags, rest } = parseFlags(args);
      const target = rest[0] ?? '.';
      const p = resolvePath(ctx.state.cwd, target);
      if (p === null) return err(`ls: ${target}: Permission denied`);
      if (isFile(ctx.vfs, p))
        return [[{ t: basename(p), c: 'file', run: `open ${quote(target)}` }]];
      if (!isDir(ctx.vfs, p)) return err(`ls: ${target}: No such file or directory`);
      return lsLines(ctx, p, flags.has('a'), flags.has('l'));
    },
  },
  ll: { desc: '', hidden: true, fn: (args, ctx) => COMMANDS.ls!.fn(['-la', ...args], ctx) },
  cd: {
    desc: 'change directory (.. goes up, ~ goes home)',
    usage: 'cd <dir>',
    fn: (args, ctx) => {
      const target = args[0] ?? '~';
      const p = target === '-' ? ctx.state.prev : resolvePath(ctx.state.cwd, target);
      if (p === null) return err(`cd: permission denied: ${target}. Only ~ is open to guests.`);
      if (isFile(ctx.vfs, p)) return err(`cd: not a directory: ${target}`);
      if (!isDir(ctx.vfs, p)) return err(`cd: no such file or directory: ${target}`);
      ctx.state = { ...ctx.state, prev: ctx.state.cwd, cwd: p };
      return [];
    },
  },
  pwd: {
    desc: 'where you are',
    fn: (_, ctx) => [[txt(HOME + (ctx.state.cwd ? '/' + ctx.state.cwd : ''))]],
  },
  cat: {
    desc: 'print a file',
    usage: 'cat <file>',
    fn: (args, ctx) => {
      if (!args.length) return err('cat: which file? Try: cat README.md');
      return args.flatMap((a) => {
        const hiddenName = resolvePath(ctx.state.cwd, a);
        if (hiddenName !== null && hiddenName in HIDDEN)
          return HIDDEN[hiddenName]!.split('\n').map((l) => [txt(l)]);
        const r = fileArg(ctx, 'cat', a);
        if ('error' in r) return r.error;
        if (ctx.vfs[r.path]!.binary)
          return [
            [
              txt(
                '����\u0010JFIF\u0001\u0001��C\u0008\u0006\u0006\u0007\u0006\u0005\u0008\u0007\u0007\u0007\t\t\u0008\n\u000c\u0014\r\u000c\u000b\u000b\u000c\u0019\u0012\u0013\u000f…',
                'muted',
              ),
            ],
            [txt("That's a photo. Terminals aren't great at those.")],
            line(txt('→ ', 'muted'), { t: `open ${a}`, c: 'cmd', run: `open ~/${quote(r.path)}` }),
          ];
        if (ctx.piped)
          return ctx.vfs[r.path]!.raw.replace(/\n+$/, '')
            .split('\n')
            .map((l) => [txt(l)]);
        return [
          ...mdLines(ctx.vfs[r.path]!.raw),
          line(txt('→ ', 'muted'), {
            t: `open ${a}`,
            c: 'cmd',
            run: `open ~/${quote(r.path)}`,
          }),
        ];
      });
    },
  },
  open: {
    desc: 'open a file in the editor',
    usage: 'open <file>',
    fn: (args, ctx) => {
      if (!args[0]) return err('open: which file? Try: open contact.md');
      const r = fileArg(ctx, 'open', args[0]);
      if ('error' in r) return r.error;
      ctx.effects.push({ type: 'open', path: r.path });
      return [];
    },
  },
  tree: {
    desc: 'every file at once',
    fn: (args, ctx) => {
      const p = resolvePath(ctx.state.cwd, args[0] ?? '.');
      if (p === null || !isDir(ctx.vfs, p)) return err(`tree: ${args[0]}: not a directory`);
      return [[txt(displayPath(p), 'dir')], ...treeLines(ctx, p)];
    },
  },
  'nev-career': {
    desc: 'twenty years as a git graph: a short film',
    fn: (_, ctx) => program(ctx, 'career', [JSON.stringify(careerGraph(ctx.vfs))]),
  },
  'git log': {
    desc: 'career history, as commits',
    usage: 'git log [--graph]',
    fn: (args, ctx) =>
      args.includes('--graph')
        ? careerLog(ctx.vfs)
        : listDir(ctx.vfs, 'experience')
            .filter((e) => e.type === 'file')
            .reverse()
            .flatMap((e, i) => {
              const f = ctx.vfs[e.path]!;
              const year = e.name.match(/^\d{4}/)?.[0] ?? '';
              return [
                line(txt(`commit ${year}`, 'accent'), i === 0 ? txt(' (HEAD -> main)', 'dir') : ''),
                line('    ', { t: f.title, c: 'link-cmd', run: `open ~/${quote(e.path)}` }),
                [],
              ];
            }),
  },
  'git lg': {
    desc: 'the same, as a graph (my own git alias)',
    fn: (_, ctx) => careerLog(ctx.vfs),
  },
  neofetch: {
    desc: 'the system, at a glance',
    fn: () => {
      // the N from the logo, drawn as the real SVG next to the lines (TermLine: c 'logo');
      // as text (pipes, copying) it is just blank space
      const width = 14;
      const art: Seg[][] = [[{ t: ' '.repeat(width), c: 'logo' }]];
      const info: Line[] = [
        line(txt('guest', 'accent'), '@', txt('dev.nevcan.com', 'accent')),
        muted('-------------------'),
        line(txt('Owner    ', 'accent'), profile.name),
        line(txt('Role     ', 'accent'), profile.current),
        line(
          txt('Uptime   ', 'accent'),
          `${yearsCoding()} years in software (since ${profile.since})`,
        ),
        line(txt('Locale   ', 'accent'), profile.languages),
        line(txt('Also     ', 'accent'), {
          t: 'dive.nevcan.com',
          href: 'https://dive.nevcan.com',
          c: 'link',
        }),
      ];
      return info.map((l, i) => [...(art[i] ?? [txt(' '.repeat(width))]), ...l]);
    },
  },
  contact: {
    desc: 'how to reach me',
    fn: () => [
      line(txt('E-mail'.padEnd(10), 'muted'), {
        t: profile.email,
        href: `mailto:${profile.email}`,
        c: 'link',
      }),
      ...profile.links.map((l) =>
        line(txt(l.label.padEnd(10), 'muted'), {
          t: l.href.replace(/^https:\/\/(www\.)?/, ''),
          href: l.href,
          c: 'link',
        }),
      ),
      line(txt('Time zone'.padEnd(10), 'muted'), profile.timezone),
      [],
      line(txt('Diving: ', 'muted'), {
        t: 'dive.nevcan.com',
        href: 'https://dive.nevcan.com',
        c: 'link',
      }),
      line(txt('Everything else: ', 'muted'), { t: 'cat .social', c: 'cmd', run: 'cat ~/.social' }),
    ],
  },
  theme: {
    desc: 'colour theme',
    usage: 'theme [name]',
    fn: (args, ctx) => {
      const name = args[0]?.toLowerCase();
      if (!name) {
        const now =
          typeof document === 'undefined' ? undefined : document.documentElement.dataset.theme;
        const current = themeById(now) ?? DEFAULT_THEME;
        return [
          ...THEMES.map((t) =>
            line(
              txt(t === current ? '* ' : '  ', 'accent'),
              { t: t.id.padEnd(16), c: 'cmd', run: `theme ${t.id}` },
              txt(
                t.label + (t === DEFAULT_THEME ? ' (default)' : '') + (t.light ? ', light' : ''),
                'muted',
              ),
            ),
          ),
          muted('theme <name> picks one and saves it on this device.'),
        ];
      }
      const t = themeById(name === 'default' || name === 'reset' ? DEFAULT_THEME.id : name);
      if (!t) return err(`theme: ${name}: no such theme. Try: theme`);
      ctx.effects.push({ type: 'theme', id: t.id });
      return [
        line(
          txt('Theme: '),
          txt(t.label, 'accent'),
          txt(t === DEFAULT_THEME ? '. Back to the default.' : '. Saved on this device.', 'muted'),
        ),
      ];
    },
  },
  cookies: {
    desc: 'cookie settings',
    fn: (_, ctx) => {
      ctx.effects.push({ type: 'cookies' });
      return [];
    },
  },
  top: {
    desc: "what's running right now",
    fn: (_, ctx) => program(ctx, 'top'),
  },
  htop: { desc: '', hidden: true, fn: (_, ctx) => program(ctx, 'htop') },
  hire: {
    desc: 'hire me',
    usage: 'hire nevcan',
    fn: (args, ctx) =>
      args[0]?.toLowerCase() === 'nevcan'
        ? program(ctx, 'hire')
        : err(`hire: ${args[0] ? `${args[0]}: no such developer` : 'whom?'}. Try: hire nevcan`),
  },
  npm: {
    desc: '',
    hidden: true,
    fn: (args, ctx) =>
      /^(i|install|add)$/.test(args[0] ?? '') && args[1]?.toLowerCase() === 'nevcan'
        ? program(ctx, 'hire')
        : err('npm: only one package lives here. Try: npm install nevcan'),
  },
  sl: { desc: '', hidden: true, fn: (_, ctx) => program(ctx, 'sl') },
  ping: {
    desc: '',
    hidden: true,
    fn: (args, ctx) => {
      const host = (args.find((a) => !a.startsWith('-')) ?? '').toLowerCase();
      if (!host) return err('ping: usage: ping <host>. Try: ping dive.nevcan.com');
      if (!/(^|\.)nevcan\.com$/.test(host))
        return err(`ping: cannot resolve ${host}: this terminal only knows nevcan.com hosts`);
      return program(ctx, 'ping', [host]);
    },
  },
  fortune: {
    desc: 'a random line of wisdom',
    fn: () => {
      const f = fortunes[Math.floor(Math.random() * fortunes.length)]!;
      return [[txt(f.text)], ...(f.by ? [muted(`    — ${f.by}`)] : [])];
    },
  },
  cowsay: {
    desc: '',
    hidden: true,
    fn: (args, ctx) => cowsay(args.join(' ') || ctx.stdin || 'Moo. Try: fortune | cowsay'),
  },
  grep: {
    desc: 'search the files (-i ignores case)',
    usage: 'grep <text> [file]',
    fn: (args, ctx) => grep(args, ctx),
  },
  matrix: {
    desc: 'follow the white rabbit',
    fn: (_, ctx) => program(ctx, 'matrix'),
  },
  aquarium: {
    desc: 'a few fish, swimming',
    fn: (_, ctx) => program(ctx, 'aquarium'),
  },
  typing: {
    desc: 'how fast do you type code?',
    fn: (_, ctx) => program(ctx, 'typing'),
  },
  snake: {
    desc: 'eat the braces, mind the walls',
    fn: (_, ctx) => program(ctx, 'snake'),
  },
  guess: {
    desc: 'find the hidden commit hash',
    fn: (_, ctx) => program(ctx, 'guess'),
  },
  hangman: {
    desc: 'guess the tech word before the servers burn',
    fn: (_, ctx) => program(ctx, 'hangman'),
  },
  history: {
    desc: 'what you typed',
    fn: (_, ctx) =>
      ctx.state.history.map((h, i) =>
        line(txt(String(i + 1).padStart(4) + '  ', 'muted'), { t: h, c: 'cmd', run: h }),
      ),
  },
  clear: {
    desc: 'clear the screen (Ctrl+L)',
    fn: (_, ctx) => {
      ctx.effects.push({ type: 'clear' });
      return [];
    },
  },
  exit: {
    desc: 'close the terminal (reader view)',
    fn: (_, ctx) => {
      ctx.effects.push({ type: 'terminal', state: 'closed' });
      return [];
    },
  },
  man: {
    desc: '',
    hidden: true,
    fn: (args) => {
      const c = args[0] && COMMANDS[args[0]];
      if (!c) return err(`No manual entry for ${args[0] ?? 'nothing'}. Try help.`);
      return [
        line(
          txt(c.usage ?? args[0]!, 'cmd'),
          ' — ',
          c.desc || SECRET_DESC[args[0]!] || 'a secret. You found it.',
        ),
      ];
    },
  },
  echo: { desc: '', hidden: true, fn: (args) => [[txt(args.join(' '))]] },
  date: { desc: '', hidden: true, fn: () => [[txt(new Date().toString())]] },
  hostname: { desc: '', hidden: true, fn: () => [[txt('dev.nevcan.com')]] },
  uname: {
    desc: '',
    hidden: true,
    fn: () => [[txt('nsh 1.0 dev.nevcan.com (Astro, React, Markdown)')]],
  },
  git: {
    desc: '',
    hidden: true,
    fn: (args, ctx) => {
      if (args[0] === 'lg') return COMMANDS['git lg']!.fn(args.slice(1), ctx);
      if (args[0] === 'status' || args[0] === 'st')
        return [[txt('On branch main')], [txt('nothing to commit, working tree clean')]];
      if (args[0] === 'log') return COMMANDS['git log']!.fn(args.slice(1), ctx);
      return err('git: this repository is read-only. Try git log.');
    },
  },
  sudo: {
    desc: '',
    hidden: true,
    fn: () => err('guest is not in the sudoers file. This incident will be reported.'),
  },
  rm: {
    desc: '',
    hidden: true,
    fn: (args) =>
      args.includes('-rf') || args.includes('-fr')
        ? [...err('rm: nice try.'), muted('Twenty years of work, gone in one command? Not today.')]
        : err("rm: read-only file system. Everything here is look, don't touch."),
  },
  mkdir: readOnly('mkdir'),
  touch: readOnly('touch'),
  mv: readOnly('mv'),
  cp: readOnly('cp'),
  vim: editorJoke('vim'),
  vi: editorJoke('vi'),
  nano: editorJoke('nano'),
  emacs: editorJoke('emacs'),
  less: editorJoke('less'),
  code: editorJoke('code'),
  dive: {
    desc: '',
    hidden: true,
    fn: () => [
      line('Wrong subdomain, but good instinct: ', {
        t: 'dive.nevcan.com',
        href: 'https://dive.nevcan.com',
        c: 'link',
      }),
    ],
  },
  hello: { desc: '', hidden: true, fn: () => [[txt('Hi! 👋 Type help, or just click around.')]] },
};
COMMANDS.hi = COMMANDS.hello!;
COMMANDS.logout = { ...COMMANDS.exit!, hidden: true };
// people type these too
COMMANDS['--help'] = { ...COMMANDS.help!, hidden: true };
COMMANDS['--help-all'] = { ...COMMANDS.help!, hidden: true, fn: () => helpLines(true) };
// neofetch's successor, for the people who already switched
COMMANDS.fastfetch = { ...COMMANDS.neofetch!, hidden: true };

/** two-word commands listed in help (`git log`) are dispatched as `git` + args */
const lookup = (name: string) => (name.includes(' ') ? undefined : COMMANDS[name]);

function runOne(input: string, ctx: Ctx): Line[] {
  const [name, ...args] = tokenize(input);
  if (!name) return [];
  const cmd = lookup(name);
  if (!cmd)
    return [
      ...err(`command not found: ${name}`),
      line(txt('Try ', 'muted'), { t: 'help', c: 'cmd', run: 'help' }),
    ];
  // `<command> --help` is the manual entry
  if (args.includes('--help') && name !== 'help' && !name.startsWith('-'))
    return COMMANDS.man!.fn([name], ctx);
  return cmd.fn(args, ctx);
}

export function run(input: string, state: ShellState, vfs: Vfs): Result {
  const trimmed = input.trim();
  const ctx: Ctx = {
    vfs,
    effects: [],
    state: trimmed ? { ...state, history: [...state.history, trimmed].slice(-100) } : state,
  };
  const lines: Line[] = [];
  // `a && b`: stop at the first command that printed an error; `a | b`: b reads a's text
  for (const part of trimmed.split('&&')) {
    let out: Line[] = [];
    let first = true;
    const stages = part.split('|');
    for (const [i, stage] of stages.entries()) {
      ctx.stdin = first ? undefined : out.map((l) => l.map((s) => s.t).join('')).join('\n');
      ctx.piped = i < stages.length - 1;
      out = runOne(stage.trim(), ctx);
      first = false;
      if (out.some((l) => l.some((s) => s.c === 'err'))) break;
    }
    ctx.stdin = undefined;
    ctx.piped = false;
    lines.push(...out);
    if (out.some((l) => l.some((s) => s.c === 'err'))) break;
  }
  return { lines, state: ctx.state, effects: ctx.effects };
}

const commonPrefix = (xs: string[]) =>
  xs.reduce((a, b) => {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  });

/** Tab: completes a command name, or a path for the last argument */
export function complete(
  input: string,
  state: ShellState,
  vfs: Vfs,
): { value: string; options: string[] } {
  const m = input.match(/^(.*?)(\S*)$/)!;
  const head = m[1]!;
  const word = m[2]!;
  const isCommand = !head.trim() || /&&\s*$/.test(head);

  let candidates: { label: string; insert: string }[];
  if (isCommand) {
    candidates = Object.keys(COMMANDS)
      .filter((n) => !n.includes(' ') && n.startsWith(word) && (word || !COMMANDS[n]!.hidden))
      .map((n) => ({ label: n, insert: n + ' ' }));
  } else {
    const slash = word.lastIndexOf('/');
    const dirPart = slash === -1 ? '' : word.slice(0, slash + 1);
    const base = word.slice(slash + 1);
    const dir = resolvePath(state.cwd, dirPart || '.');
    if (dir === null || !isDir(vfs, dir)) return { value: input, options: [] };
    const hidden = base.startsWith('.') && dir === '' ? Object.keys(HIDDEN) : [];
    candidates = [
      ...listDir(vfs, dir).map((e) => (e.type === 'dir' ? e.name + '/' : e.name)),
      ...hidden,
    ]
      .filter((n) => n.startsWith(base))
      .map((n) => ({ label: n, insert: dirPart + n + (n.endsWith('/') ? '' : ' ') }));
  }

  if (candidates.length === 1) return { value: head + candidates[0]!.insert, options: [] };
  if (!candidates.length) return { value: input, options: [] };
  const prefix = commonPrefix(candidates.map((c) => c.insert.trimEnd()));
  return {
    value: head + (prefix.length > word.length ? prefix : word),
    options: candidates.map((c) => c.label),
  };
}
