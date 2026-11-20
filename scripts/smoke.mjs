/**
 * Smoke test: drives the site in headless Chrome with real key events and checks the things that
 * have broken before. No dependencies: it talks to Chrome over the DevTools protocol (Node 22+
 * has fetch and WebSocket built in).
 *
 *   npm run build && npm run preview     (in one terminal)
 *   npm run smoke                        (in another; default http://localhost:4321/)
 *   npm run smoke -- https://dev.nevcan.com/
 *
 * Chrome is found in the usual places; set CHROME=/path/to/chrome to use another. Every visit
 * starts with a fresh profile and chooses "Reject" in the cookie pane, so nothing is ever sent to
 * analytics. Exits with 1 if any check fails.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] ?? 'http://localhost:4321/';
const CHROMES = [
  process.env.CHROME,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);
const CHROME = CHROMES.find((p) => existsSync(p));
if (!CHROME) {
  console.error('smoke: no Chrome found. Set CHROME=/path/to/chrome');
  process.exit(2);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, ok, got) => {
  if (ok) console.log(`  ✓ ${name}`);
  else {
    failures++;
    console.log(`  ✗ ${name}${got === undefined ? '' : `  (got: ${JSON.stringify(got)})`}`);
  }
};

/** a fresh headless Chrome with one page; `touch` makes it a phone without a mouse */
async function open({ touch = false } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const profile = mkdtempSync(join(tmpdir(), 'smoke-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--window-size=1400,900',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );
  let page;
  for (let i = 0; i < 75 && !page; i++) {
    await sleep(200);
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      page = targets.find((t) => t.type === 'page');
    } catch {
      /* not up yet */
    }
  }
  if (!page) throw new Error('Chrome did not start');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      exceptions.push(d.exception?.description ?? d.text);
    }
  };
  const send = (method, params = {}) =>
    new Promise((r) => {
      pending.set(++id, r);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const ev = async (expression) =>
    (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;

  await send('Runtime.enable');
  await send('Page.enable');
  if (touch) {
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 3,
      mobile: true,
    });
  }
  // what cookie-notice blockers do (EasyList Cookie has a generic ##.cookie-pane rule)
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '.cookie-pane, .cookie-settings, .cookie-banner, #cookie-banner { display: none !important }';
      document.head.append(s);
    })`,
  });
  await send('Page.navigate', { url: URL_ });
  for (let i = 0; i < 50 && !(await ev(`!!document.querySelector('.statusbar')`)); i++)
    await sleep(200);
  await sleep(500);

  const KEYS = {
    Escape: { code: 'Escape', keyCode: 27 },
    ArrowDown: { code: 'ArrowDown', keyCode: 40 },
    ArrowUp: { code: 'ArrowUp', keyCode: 38 },
    Enter: { code: 'Enter', keyCode: 13, text: '\r' },
    ' ': { code: 'Space', keyCode: 32, text: ' ' },
  };
  /** press a key; `ctrl` for Ctrl+<key> */
  const key = async (k, ctrl = false) => {
    const d = KEYS[k] ?? {
      code: 'Key' + k.toUpperCase(),
      keyCode: k.toUpperCase().charCodeAt(0),
      text: ctrl ? undefined : k,
    };
    const base = {
      key: k,
      code: d.code,
      windowsVirtualKeyCode: d.keyCode,
      modifiers: ctrl ? 2 : 0,
    };
    await send('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: d.text });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    await sleep(150);
  };
  /** type a command at the prompt and press Enter */
  const run = async (cmd) => {
    await ev(`document.querySelector('.t-input')?.focus()`);
    await send('Input.insertText', { text: cmd });
    await key('Enter');
    await sleep(700);
  };
  /** a program is running: full-screen ones cover the terminal, the others hide the prompt */
  const running = () =>
    ev(`!!document.querySelector('.prog-full') || !document.querySelector('.t-input')`);
  const hint = () => ev(`document.querySelector('.prog-full .prog-hint')?.textContent ?? null`);
  const lastLine = () =>
    ev(`[...document.querySelectorAll('.term-out .t-line')].at(-1)?.textContent ?? ''`);
  const pane = () =>
    ev(`(() => { const p = document.querySelector('[aria-labelledby$="-title"]');
      return !!p && p.getBoundingClientRect().width > 0 && getComputedStyle(p).display !== 'none' })()`);
  const reject = () =>
    ev(
      `[...document.querySelectorAll('button')].find(b => /^reject/i.test(b.textContent.trim()))?.click()`,
    );
  const close = async () => {
    ws.close();
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  };
  const reload = async () => {
    await send('Page.reload');
    for (let i = 0; i < 50 && !(await ev(`!!document.querySelector('.statusbar')`)); i++)
      await sleep(200);
    await sleep(500);
  };
  /** the server-rendered page shows before React takes over; things it opens come a moment
   *  later (on a cold CDN, after a deploy, a few seconds) */
  const waitFor = async (fn, ms = 8000) => {
    for (const t0 = Date.now(); Date.now() - t0 < ms; await sleep(200)) if (await fn()) return true;
    return false;
  };
  /** move a real mouse over the middle of the element (hover, pointerenter) */
  const hover = async (sel) => {
    const r =
      await ev(`(() => { const b = document.querySelector('${sel}')?.getBoundingClientRect();
      return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 } })()`);
    if (!r) return;
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x - 40, y: r.y });
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...r });
    await sleep(200);
  };
  /** type into whatever has focus */
  const type = async (text) => {
    await send('Input.insertText', { text });
    await sleep(250);
  };
  return {
    ev,
    key,
    hover,
    type,
    run,
    running,
    hint,
    lastLine,
    pane,
    reject,
    reload,
    waitFor,
    exceptions,
    close,
  };
}

// ---------- desktop ----------
console.log(`smoke: ${URL_}\n\ndesktop`);
{
  const p = await open();

  check(
    'cookie pane shows on a first visit, even with a cookie-notice blocker',
    await p.waitFor(p.pane),
  );
  await p.reject();
  await sleep(300);
  check('Reject closes it', !(await p.pane()));
  await p.ev(
    `[...document.querySelectorAll('.statusbar button')].find(b => b.textContent.trim() === 'Cookies')?.click()`,
  );
  await sleep(400);
  check('"Cookies" in the status bar opens it again', await p.pane());
  await p.reject();
  await sleep(300);

  check(
    'the title bar has no terminal button (the activity bar and the panel have one)',
    !(await p.ev(
      `!!document.querySelector('.titlebar .tb-term, .titlebar [aria-label="Terminal"]')`,
    )),
  );
  {
    const order = await p.ev(
      `[...document.querySelectorAll('.activity .act-btn')].map(b => b.getAttribute('aria-label')).join(', ')`,
    );
    check(
      'activity bar: panels, then GitHub and LinkedIn, Settings at the bottom',
      /^Explorer, Terminal, Search, GitHub, LinkedIn, .*Settings$/.test(order),
      order,
    );
  }
  check(
    'a "dev" tag next to the logo',
    (await p.ev(`document.querySelector('.tb-logo .tb-tag')?.textContent.trim()`)) === 'dev',
  );
  check(
    'the logo and its tag are not underlined',
    (await p.ev(`getComputedStyle(document.querySelector('.tb-logo')).textDecorationLine`)) ===
      'none',
  );
  await p.run('date');
  {
    const out = await p.ev(
      `[...document.querySelectorAll('.term-out .t-line')].slice(-2).map(l => l.textContent).join('\\n')`,
    );
    check(
      "`date` shows your time and says how it relates to Nev's",
      /your time/.test(out) && /Istanbul/.test(out),
      out,
    );
  }

  check(
    'commands in the text are runnable',
    (await p.ev(`document.querySelectorAll('code.runnable').length`)) > 0,
  );

  // things to watch, not games: they only quit, and Space does nothing
  for (const [prog, quit, label] of [
    ['matrix', ['q'], 'q'],
    ['aquarium', ['Escape'], 'Esc'],
    ['top', ['c', true], 'Ctrl+C'],
  ]) {
    await p.run(prog);
    await p.key('x');
    await p.key(' ');
    check(
      `${prog}: other keys and Space do nothing`,
      (await p.running()) && (await p.hint()) === 'q quit',
      await p.hint(),
    );
    await p.key(...quit);
    check(`${prog}: ${label} quits`, !(await p.running()));
  }

  await p.run('snake');
  await p.key(' ');
  check('snake: Space starts', (await p.hint())?.includes('space pause'), await p.hint());
  await p.key(' ');
  check('snake: Space pauses', (await p.hint())?.includes('space go'), await p.hint());
  await p.key('c', true);
  check(
    'snake: Ctrl+C quits with a score line',
    (await p.lastLine()).startsWith('snake:'),
    await p.lastLine(),
  );

  await p.run('hangman');
  await p.key('q');
  check('hangman: q is a guess, not quit', await p.running());
  await p.key('Escape');
  check('hangman: Esc quits', !(await p.running()));

  await p.run('typing');
  await p.key('q');
  check('typing: q is typed, not quit', await p.running());
  await p.key('Escape');
  check('typing: Esc quits', !(await p.running()));

  await p.run('guess');
  await p.key('q');
  check('guess: q quits', !(await p.running()));

  await p.run('ping dive.nevcan.com');
  await p.key('q');
  await p.key('Escape');
  check('ping: q and Esc do not stop it', await p.running());
  await p.key('c', true);
  check(
    'ping: Ctrl+C stops it with statistics',
    /packet loss/.test(await p.lastLine()) || /safety stop/.test(await p.lastLine()),
    await p.lastLine(),
  );

  await p.run('hire nevcan');
  await p.key('q');
  await p.key('Escape');
  check('hire: q and Esc do not stop it', await p.running());
  for (let i = 0; i < 40 && (await p.running()); i++) await sleep(250);
  check(
    'hire: ends with LinkedIn first, then the e-mail',
    /^next: LinkedIn · \S+@\S+$/.test(await p.lastLine()),
    await p.lastLine(),
  );

  await p.run('sl');
  const t0 = Date.now();
  await p.key('q');
  await p.key('c', true);
  await p.key('Escape');
  check('sl: q, Ctrl+C and Esc do not stop the train', await p.running());
  while ((await p.running()) && Date.now() - t0 < 15000) await sleep(200);
  check(
    'sl: the train leaves by itself',
    /^sl: trains don't stop/.test(await p.lastLine()),
    await p.lastLine(),
  );

  // the film: plays, Space pauses, q prints the whole graph with HEAD on the newest role
  await p.run('nev-career');
  check(
    'nev-career plays',
    (await p.running()) && /space pause/.test(await p.hint()),
    await p.hint(),
  );
  await p.key(' ');
  check('nev-career: Space pauses', /space play/.test(await p.hint()), await p.hint());
  await p.key('q');
  const graph = await p.ev(
    `[...document.querySelectorAll('.term-out .t-line')].map(l => l.textContent).join('\\n')`,
  );
  check(
    'nev-career: q prints the graph, HEAD on the newest role',
    !(await p.running()) && /HEAD -> main/.test(graph) && /Merge branch 'diving'/.test(graph),
  );

  await p.run('git lg');
  const lg = await p.ev(
    `[...document.querySelectorAll('.term-out .t-line')].slice(-3).map(l => l.textContent).join('\\n')`,
  );
  check(
    'git lg prints the graph newest first, in the alias format',
    /^\*\s+[0-9a-f]{7} \| /m.test(lg) && /\[Nevcan Uludaş\]/.test(lg),
    lg,
  );

  // the explorer: some folders start closed; the button by the root closes or opens them all
  const openDirs = () =>
    p.ev(`document.querySelectorAll('.explorer [aria-expanded="true"]').length`);
  const closedAtStart = await p.ev(
    `['legal', 'media', 'projects', 'trainings', 'diving'].every(n => [...document.querySelectorAll('.explorer [aria-expanded="false"]')].some(li => li.textContent.trim().startsWith(n)))`,
  );
  check('legal, media, projects, trainings and diving start closed', closedAtStart);
  await p.ev(`document.querySelector('.tree-root .icon-btn').click()`);
  await sleep(200);
  check('the root button collapses every folder', (await openDirs()) === 0, await openDirs());
  await p.ev(`document.querySelector('.tree-root .icon-btn').click()`);
  await sleep(200);
  check(
    'pressed again, it opens them all',
    (await p.ev(`document.querySelectorAll('.explorer [aria-expanded="false"]').length`)) === 0,
  );

  // the Search view
  {
    const sum = () => p.ev(`document.querySelector('.search-sum')?.textContent ?? ''`);
    await p.ev(`document.querySelector('.act-btn[aria-label="Search"]').click()`);
    await sleep(300);
    check(
      'Search opens with its field focused',
      await p.ev(`document.activeElement?.classList.contains('search-input')`),
    );
    await p.type('dubai');
    check(
      'it finds text across the files',
      /results? in \d+ files?/.test(await sum()),
      await sum(),
    );
    await p.ev(`document.querySelector('.search-input').select()`);
    await p.type('uludas');
    check(
      'case and accents don\'t matter ("uludas" finds "Uludaş")',
      /results? in/.test(await sum()),
      await sum(),
    );
    const target = await p.ev(`document.querySelectorAll('.search-file')[1]?.title`);
    await p.ev(
      `document.querySelectorAll('.search-file')[1]?.nextElementSibling?.querySelector('.search-hit')?.click()`,
    );
    await sleep(500);
    check(
      'a result opens its file',
      (await p.ev(`'~/' + document.querySelector('.tab.active')?.dataset.path`)) === target,
      target,
    );
    check(
      'the match is marked in the document',
      await p.ev(
        `!('highlights' in CSS) || (CSS.highlights.has('search-now') && CSS.highlights.has('search'))`,
      ),
    );
    await p.ev(`document.querySelector('.act-btn[aria-label="Explorer"]').click()`);
    await sleep(200);
    check(
      'Explorer brings the files back and the marks go',
      (await p.ev(`!!document.querySelector('.explorer .tree-root')`)) &&
        (await p.ev(`!('highlights' in CSS) || !CSS.highlights.has('search')`)),
    );
  }

  // login: a name instead of "guest", only in this browser
  {
    const stored = () => p.ev(`localStorage.getItem('dev-user')`);
    const title = () => p.ev(`document.querySelector('.title-user')?.textContent`);
    check('no name stored before a login', (await stored()) === null, await stored());
    await p.run('login <b>x</b>');
    check('a name with markup is refused', (await stored()) === null, await stored());
    await p.run('login root');
    check('root is refused', (await stored()) === null, await stored());
    await p.run('login ada');
    check(
      '`login ada` stores it and the title bar says ada',
      /"name":"ada"/.test(await stored()) && (await title()) === 'ada@dev.nevcan.com',
      [await stored(), await title()],
    );
    check(
      'the prompt says ada',
      (await p.ev(`document.querySelector('.t-input-row .p-user')?.textContent`)) === 'ada@dev',
    );
    check('the page title never has the name', !/ada/.test(await p.ev('document.title')));
    await p.reload();
    check(
      'the name is there after a reload',
      (await title()) === 'ada@dev.nevcan.com',
      await title(),
    );
    check(
      'the welcome says welcome back',
      /Welcome back, ada\./.test(
        await p.ev(`document.querySelector('.term-out .t-line')?.textContent`),
      ),
    );
    await p.run('whoami');
    check(
      'whoami says ada',
      /^ada/.test(
        await p.ev(`[...document.querySelectorAll('.term-out .t-line')].at(-9)?.textContent ?? ''`),
      ) ||
        (await p.ev(
          `[...document.querySelectorAll('.term-out .t-line')].some(l => l.textContent === 'ada')`,
        )),
    );
    await p.run('logout');
    check(
      '`logout` forgets it: guest again, nothing stored',
      (await stored()) === null && (await title()) === 'guest@dev.nevcan.com',
      [await stored(), await title()],
    );
    // the same from Settings
    await p.ev(`document.querySelector('.act-btn[aria-label="Settings"]').click()`);
    await sleep(200);
    await p.ev(
      `[...document.querySelectorAll('.ctx-item')].find(b => b.textContent.startsWith('Log in'))?.click()`,
    );
    await sleep(300);
    check(
      'Settings → Log in… opens the box, focused',
      await p.ev(`document.activeElement?.getAttribute('aria-label') === 'Username'`),
    );
    await p.type('grace');
    await p.key('Enter');
    check('Enter there logs in', (await title()) === 'grace@dev.nevcan.com', await title());
    await p.run('logout');
  }

  // colour themes: a preview saves nothing, only a pick does (notes/legal.md, item 12)
  const stored = () => p.ev(`localStorage.getItem('dev-theme')`);
  const theme = () => p.ev(`document.documentElement.dataset.theme ?? 'default'`);
  const openPicker = async () => {
    await p.ev(`document.querySelector('.act-btn[aria-label="Settings"]').click()`);
    await sleep(200);
    await p.ev(
      `[...document.querySelectorAll('.ctx-item')].find(b => b.textContent.startsWith('Colour theme'))?.click()`,
    );
    await sleep(300);
  };
  check('no theme stored before a pick', (await stored()) === null, await stored());
  await openPicker();
  check(
    'the picker says picks are saved on this device',
    /Saved on this device/.test(
      await p.ev(`document.querySelector('.theme-pick')?.textContent ?? ''`),
    ),
  );
  await p.key('ArrowDown');
  check('↓ previews the next theme', (await theme()) === 'one-dark', await theme());
  check('a preview stores nothing', (await stored()) === null, await stored());
  await p.key('Escape');
  check('Esc goes back to the theme you had', (await theme()) === 'default', await theme());
  check('Esc stores nothing', (await stored()) === null, await stored());
  await openPicker();
  await p.hover('.theme-opt:nth-child(3)');
  check('hovering a theme previews it', (await theme()) === 'dracula', await theme());
  check('a hover stores nothing', (await stored()) === null, await stored());
  await p.key('Escape');
  check('Esc after a hover goes back', (await theme()) === 'default', await theme());
  await openPicker();
  check(
    'a still mouse over the list previews nothing',
    (await theme()) === 'default',
    await theme(),
  );
  await p.key('ArrowDown');
  await p.key('ArrowDown');
  await p.key('Enter');
  check(
    'Enter picks and stores it',
    JSON.parse((await stored()) ?? '{}').id === 'dracula',
    await stored(),
  );
  await p.reload();
  check('a picked theme is there after a reload', (await theme()) === 'dracula', await theme());
  await p.run('theme github-light');
  check(
    '`theme github-light` picks it',
    (await theme()) === 'github-light' && /github-light/.test(await stored()),
    await stored(),
  );
  await p.run('theme default');
  check(
    '`theme default` goes back and removes the entry',
    (await theme()) === 'default' && (await stored()) === null,
    await stored(),
  );

  check('no exceptions', p.exceptions.length === 0, p.exceptions);
  await p.close();
}

// ---------- touch-only (a phone) ----------
console.log('\ntouch-only');
{
  const p = await open({ touch: true });
  const shown = (sel) =>
    p.ev(
      `(() => { const e = document.querySelector('${sel}'); return !!e && getComputedStyle(e).display !== 'none' })()`,
    );
  check('cookie pane shows on a first visit', await p.waitFor(p.pane));
  await p.reject();
  check('no terminal', !(await shown('.terminal')));
  check('no terminal button in the title bar', !(await shown('.tb-term')));
  check('a search button in the title bar', await shown('.tb-btn[aria-label="Search"]'));
  check('a settings button in the title bar', await shown('.tb-btn[aria-label="Settings"]'));
  await p.ev(`document.querySelector('.tb-btn[aria-label="Settings"]').click()`);
  await sleep(300);
  check(
    'it opens a menu with the colour theme',
    (
      await p.ev(`[...document.querySelectorAll('.ctx-item')].map(b => b.textContent).join('|')`)
    )?.includes('Colour theme'),
  );
  await p.key('Escape');
  check('the status bar says the terminal needs a keyboard', await shown('.only-touch'));
  check(
    'commands in the text are not runnable',
    (await p.ev(`document.querySelectorAll('code.runnable').length`)) === 0,
  );
  check(
    'every status bar link fits on the screen (Cookies too)',
    await p.ev(
      `[...document.querySelectorAll('.statusbar .sb-link')].every(l => { const r = l.getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth })`,
    ),
  );
  check('no exceptions', p.exceptions.length === 0, p.exceptions);
  await p.close();
}

console.log(failures ? `\n${failures} failed` : '\nall passed');
process.exit(failures ? 1 : 0);
