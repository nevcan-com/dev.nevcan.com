# dev.nevcan.com

Software site of Nevcan Uludaş, built as a small code editor: a file explorer, tabs, a
Preview/Source view and a working (pretend) terminal. One of the nevcan.com sites (dive, dev, film,
shop).

## Stack

- [Astro 7](https://astro.build) (static output) + one React island, TypeScript
- Fonts self-hosted (Inter, JetBrains Mono; the same subset files as dive.nevcan.com)
- Hosting: GitHub Pages, deployed by GitHub Actions (`.github/workflows/deploy.yml`)

## Development

Node 24 (`.nvmrc`).

```sh
nvm use
npm install
npm run dev     # http://localhost:4321
npm run build   # astro check + static build to dist/
npm run format
```

### Smoke test

`scripts/smoke.mjs` drives the site in headless Chrome with real key events: the cookie pane
(also with a cookie-notice blocker's rules in place), every terminal program's keys, and the
touch-only layout. No dependencies; it needs Chrome (set `CHROME=` if it isn't found). Run it
before a deploy:

```sh
npm run build && npm run preview   # one terminal
npm run smoke                      # another; or: npm run smoke -- https://dev.nevcan.com/
```

It chooses "Reject" in the cookie pane on every visit, so it never sends anything to analytics.
Add a check when something breaks, so it can't break the same way twice.

## How it works

| Piece                                                       | File                                |
| ----------------------------------------------------------- | ----------------------------------- |
| The content: one Markdown file per "file" in the explorer   | `src/fs/**`                         |
| Reading `src/fs` into the virtual file system (build time)  | `src/lib/load-fs.ts`                |
| Paths, `ls`, `cd` resolution (shared by build and browser)  | `src/lib/vfs.ts`                    |
| Every terminal command                                      | `src/lib/shell.ts`                  |
| Short facts the terminal prints (whoami, neofetch, contact) | `src/data/profile.ts`               |
| The editor window                                           | `src/components/ide/Ide.tsx`        |
| Terminal panel and keys                                     | `src/components/ide/Terminal.tsx`   |
| Markdown Source view                                        | `src/components/ide/SourceView.tsx` |
| All styles                                                  | `src/styles/ide.css`                |

- **Add a page** by adding a Markdown file under `src/fs/`. It appears in the explorer, in `ls`
  and `tree`, and gets its own URL (`src/fs/projects/x.md` → `/projects/x`; a folder's
  `README.md` → `/folder`). Link between files with relative `.md` links.
- Files under `experience/` start with the year; `git log` lists them as commits, newest first.
- Every URL is a server-rendered page with that file open in Preview, so the content is readable
  without JavaScript and by search engines. Clicking around updates the URL; back/forward work.
- Clicks in the explorer and the preview run through the shell (`open ~/…`), so the terminal shows
  the command for what the visitor just did.
- Panels default to `auto`: on desktop the explorer and terminal are open; on phones the reader
  comes first and the explorer is a drawer.
- Touch-only devices (no `any-pointer: fine`: phones, most tablets) get no terminal at all, since
  it needs a keyboard; the status bar says so. This is a pointer check, not a width check, so an
  iPad with a trackpad or a narrow desktop window keeps it.

## Fun commands

- Content (fortunes, `top`'s processes, typing snippets, hangman words) lives in
  `src/data/fun.ts`.
- Commands that take over the terminal for a while (`top`, `htop`, `hire nevcan`, `ping`, `sl`,
  `matrix`, `aquarium`, `typing`, `snake`, `guess`, `hangman`) are programs in
  `src/components/ide/programs/`, one lazy chunk each: nothing is downloaded until someone runs
  one. Animations respect reduced motion.
- The same keys in every program (`programs/common.tsx`): q, Esc or Ctrl+C quit (where letters
  are typed, q is a letter, so only Esc and Ctrl+C); Space pauses games and, after one ends, plays
  again; Enter answers in the games you type into; arrows move. Each shows them with `<Hint>` in
  the bottom-right corner. Programs that print into the scrollback (`ping`, `hire`) stop only
  for Ctrl+C, like the real ones. `sl` stops for no key at all, on purpose.
- Pipes work for text: `fortune | cowsay`, `ls | grep exp`. `grep <text> [file|dir]` also
  searches files directly (directories recursively; with no file, everything under the current
  directory). The Konami code (↑↑↓↓←→←→BA) sends
  bubbles up the screen.
- `src/fs/media/` holds images. Photos are re-encoded to WebP by astro:assets; originals stay in
  the git-ignored `source-media/`.
- The 404 page is `CrashView.tsx`: a fake runtime error with a "Did you mean" for the closest
  real page.

## Colour themes

- Every palette lives in `src/data/themes.ts`; `Base.astro` writes them as CSS (`:root` is the
  default, the others go by `data-theme` on `<html>`). Colours in `ide.css` are tokens or
  `color-mix()` of tokens; add a theme by adding a palette, nothing else.
- Picked from the icon under GitHub in the activity bar (the title bar on phones), from the
  right-click menu, or with `theme <name>`. ↑ ↓ preview live without saving; Enter or a click
  picks.
- A pick is stored in localStorage (`dev-theme`, 12 months) only when the visitor makes it;
  picking the default removes the entry (`notes/legal.md`, item 12). An inline script in
  `Base.astro` applies it before the first paint, so the page never flashes the default.
- Keep small text at WCAG AA (4.5:1) on the editor background when adding or changing a palette.

## Right-click menu

`ContextMenu.tsx`, with items chosen in `Ide.tsx` by what was clicked (a file or folder in the
explorer, a tab, a link, the page, the terminal) plus a common part (copy e-mail, LinkedIn,
GitHub, terminal, cookie settings). Shift + right-click and text fields keep the browser's menu.

## Analytics, cookies, legal

- Google Analytics 4 runs only after the visitor accepts (Consent Mode Basic, same setup as
  dive.nevcan.com). Settings: `src/data/analytics.ts`; consent logic:
  `src/components/consent/consent.ts`. Cookies are `dev_ga…` on dev.nevcan.com only.
- The choice is made in `src/components/ide/CookiePane.tsx`, a second editor group (on the right
  on wide screens, under the editor on narrower ones). On a first visit it has no close button
  and stays until the visitor chooses; it never covers the content. It reopens from "Cookies" in
  the status bar, the `cookies` command, and any `[text](#cookie-settings)` link in a Markdown
  file.
- Privacy notice, cookie list and terms of use are files too: `src/fs/legal/`. Change them
  together with anything that adds cookies, storage, embeds, forms or third-party requests.
- `live` in `analytics.ts` is off until the GA4 measurement ID exists. The legal files already
  describe GA4, so CI refuses to build while it is off (`astro.config.mjs`).

## Deploy

As dive.nevcan.com: Pages source **GitHub Actions**, custom domain set in the repository's Pages
settings, DNS `dev` CNAME → `nevcan-com.github.io`.
