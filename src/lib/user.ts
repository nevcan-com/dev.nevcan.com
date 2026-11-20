/**
 * The visitor's chosen username (`login <name>`, or Settings → Log in…). It replaces "guest" in
 * the title bar, the prompt and a few commands. Stored only in this browser, written only when
 * the visitor logs in, never sent anywhere: not in the page title or URL, so analytics never see
 * it. Listed in legal/cookies.md and legal/privacy.md, like the theme (notes/legal.md, item 12).
 */
import { fold } from './search';

export const GUEST = 'guest';

export const USER_STORAGE = {
  key: 'dev-user',
  /** after this the name is forgotten, like the theme and the cookie choice */
  months: 12,
} as const;

const MAX = 20;

/** why a name can't be used, or null when it can */
export function badName(name: string): string | null {
  if (!name) return 'Type a name.';
  if (name.length > MAX) return `Up to ${MAX} characters.`;
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]*$/u.test(name))
    return 'Letters and digits, and _ . - inside: no spaces.';
  return null;
}

/** names that answer back instead of logging in (case and accents don't matter) */
export function reservedName(name: string): string | null {
  const n = fold(name);
  if (n === GUEST) return `${name}: that's everyone's. To go back to it: logout.`;
  if (n === 'root' || n === 'admin') return `${name}: nice try.`;
  if (['nev', 'nevcan', 'nevcanuludas'].includes(n))
    return `${name}: that one's taken. Pick your own.`;
  return null;
}

/** the saved name, or null (none, expired, or storage blocked) */
export function loadUser(): string | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE.key);
    if (!raw) return null;
    const { name, at } = JSON.parse(raw) as { name?: unknown; at?: unknown };
    const fresh = typeof at === 'number' && Date.now() - at < USER_STORAGE.months * 30.44 * 864e5;
    if (typeof name !== 'string' || badName(name) || !fresh) {
      localStorage.removeItem(USER_STORAGE.key);
      return null;
    }
    return name;
  } catch {
    return null;
  }
}

export function saveUser(name: string | null) {
  try {
    if (name === null || name === GUEST) localStorage.removeItem(USER_STORAGE.key);
    else localStorage.setItem(USER_STORAGE.key, JSON.stringify({ name, at: Date.now() }));
  } catch {
    /* blocked storage: the name holds for this page only */
  }
}
