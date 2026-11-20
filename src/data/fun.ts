/**
 * Content for the terminal's fun commands. Edit freely; nothing else needs to change.
 */

/** `fortune`: one at random. Add your own with `by` left out. */
export const fortunes: { text: string; by?: string }[] = [
  { text: 'Talk is cheap. Show me the code.', by: 'Linus Torvalds' },
  { text: 'Premature optimization is the root of all evil.', by: 'Donald Knuth' },
  {
    text: 'There are only two hard things in computer science: cache invalidation and naming things.',
    by: 'Phil Karlton',
  },
  {
    text: 'Programs must be written for people to read, and only incidentally for machines to execute.',
    by: 'Harold Abelson',
  },
  { text: 'Simplicity is prerequisite for reliability.', by: 'Edsger W. Dijkstra' },
  { text: 'Make it work, make it right, make it fast.', by: 'Kent Beck' },
  {
    text: 'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    by: 'Martin Fowler',
  },
  { text: 'Plan your dive, dive your plan.' },
  { text: 'Works on my machine. Ships in a container.' },
];

/**
 * `top` / `htop`: what is "running" in Nev's life. `since` is the year it started (TIME+ counts
 * from it); `state` R = running, S = sleeping (finished roles). CPU and memory are random
 * and move every second: it's a joke, not a claim.
 */
export const processes: { command: string; since: number; until?: number; state: 'R' | 'S' }[] = [
  { command: 'dipnot --cofounder --tech', since: 2025, state: 'R' },
  { command: 'thesis --amphorae --ai', since: 2025, state: 'R' },
  { command: 'dev.nevcan.com', since: 2026, state: 'R' },
  { command: 'gue --instructor-trainer', since: 2026, state: 'R' },
  { command: 'neptun-dive-center', since: 2014, state: 'R' },
  { command: 'frontend-architect --sabancidx', since: 2019, until: 2021, state: 'S' },
  { command: 'frontend-architect --dogus', since: 2017, until: 2019, state: 'S' },
  { command: 'frontend-dev --dr --idefix', since: 2015, until: 2017, state: 'S' },
  { command: 'freelance --sites=140', since: 2006, until: 2016, state: 'S' },
];

/** `typing`: code to type. Short, real-looking, and in this site's own style. */
export const snippets: string[] = [
  `const route = (path) =>
  '/' + path.replace(/\\.md$/, '');`,
  `for (const file of files) {
  if (file.draft) continue;
  publish(file);
}`,
  `export function depth(bar) {
  return Math.round(bar * 10);
}`,
  `const greet = (name = 'guest') =>
  \`Hello, \${name}!\`;`,
  `if (!consent) return;
loadAnalytics();`,
];

/** `hangman`: one at random. Letters only (anything else is shown as is); the hint is shown. */
export const words: { word: string; hint: string }[] = [
  { word: 'kubernetes', hint: 'it runs your containers, and your weekends' },
  { word: 'idempotent', hint: 'run it twice, same result' },
  { word: 'refactor', hint: 'same behavior, better code' },
  { word: 'semaphore', hint: 'only so many at a time' },
  { word: 'hydration', hint: 'server HTML comes alive in the browser' },
  { word: 'debounce', hint: 'wait until they stop typing' },
  { word: 'monorepo', hint: 'every project, one repository' },
  { word: 'regression', hint: 'it worked yesterday' },
  { word: 'middleware', hint: 'between the request and the response' },
  { word: 'accessibility', hint: 'a11y, spelled out' },
  { word: 'typescript', hint: 'JavaScript that checks your types' },
  { word: 'deadlock', hint: 'two of them, each waiting for the other' },
  { word: 'websocket', hint: 'a connection that stays open' },
  { word: 'algorithm', hint: 'a recipe for a computer' },
  { word: 'recursion', hint: 'see: recursion' },
];
