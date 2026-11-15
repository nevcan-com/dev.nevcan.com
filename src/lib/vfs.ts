/**
 * The virtual file system, shared by the build (load-fs.ts) and the browser (the IDE island).
 * Paths are relative to the home directory (~ = /home/nevcan) and never start with a slash:
 * "README.md", "about/whoami.md". The home directory itself is "".
 */

export interface VFile {
  /** "about/whoami.md" */
  path: string;
  /** the Markdown source, shown in Source view and by `cat` */
  raw: string;
  /** rendered HTML, shown in Preview; internal .md links already point at routes */
  html: string;
  /** the first "# " heading, or the file name */
  title: string;
  /** the page URL: "/" for README.md, "/about/whoami", "/skills" for skills/README.md */
  route: string;
  /** binary files (photos): what Source view and `ls -l` say instead of the content */
  binary?: { bytes: number; width: number; height: number; format: string };
}

export type Vfs = Record<string, VFile>;

export interface Entry {
  name: string;
  path: string;
  type: 'dir' | 'file';
}

export const HOME = '/home/nevcan';
export const USER = 'nevcan';
export const HOST = 'dev';

export type Lang = 'markdown' | 'svg' | 'image';

const IMAGE = /\.(jpe?g|png|webp)$/i;

/** the extension decides the route, the Source view, the icon and the status bar */
export const langOf = (path: string): Lang =>
  path.endsWith('.svg') ? 'svg' : IMAGE.test(path) ? 'image' : 'markdown';

export const routeOf = (path: string): string => {
  const r = path.replace(/\.(md|svg|jpe?g|png|webp)$/i, '').replace(/(^|\/)README$/, '');
  return '/' + r.replace(/\/$/, '');
};

export const basename = (path: string): string => path.split('/').pop() ?? path;
export const dirname = (path: string): string => path.split('/').slice(0, -1).join('/');

export const isFile = (vfs: Vfs, path: string): boolean => path in vfs;
export const isDir = (vfs: Vfs, path: string): boolean =>
  path === '' || Object.keys(vfs).some((p) => p.startsWith(path + '/'));

/** directories first, then files, both alphabetical (like `ls --group-directories-first`) */
export function listDir(vfs: Vfs, dir: string): Entry[] {
  const prefix = dir ? dir + '/' : '';
  const dirs = new Set<string>();
  const files: Entry[] = [];
  for (const p of Object.keys(vfs)) {
    if (!p.startsWith(prefix)) continue;
    const rest = p.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash === -1) files.push({ name: rest, path: p, type: 'file' });
    else dirs.add(rest.slice(0, slash));
  }
  const byName = (a: Entry, b: Entry) => a.name.localeCompare(b.name);
  return [
    ...[...dirs].map((name): Entry => ({ name, path: prefix + name, type: 'dir' })).sort(byName),
    ...files.sort(byName),
  ];
}

/**
 * Resolves what a visitor typed against the current directory. Returns the normalised path, or
 * null when it leaves the home directory (the rest of the machine is off limits).
 */
export function resolvePath(cwd: string, input: string): string | null {
  let s = input.trim();
  let parts: string[];
  if (s === '~' || s.startsWith('~/')) {
    parts = [];
    s = s.slice(1);
  } else if (s.startsWith('/')) {
    if (s === HOME || s.startsWith(HOME + '/')) {
      parts = [];
      s = s.slice(HOME.length);
    } else return null;
  } else parts = cwd ? cwd.split('/') : [];

  for (const seg of s.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(seg);
  }
  return parts.join('/');
}

/** "~/about" for the prompt and the title bar */
export const displayPath = (path: string): string => (path ? `~/${path}` : '~');

/** the file a page URL shows; unknown URLs give null */
export function pathForRoute(vfs: Vfs, route: string): string | null {
  const clean = '/' + route.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '');
  return Object.values(vfs).find((f) => f.route === clean)?.path ?? null;
}
