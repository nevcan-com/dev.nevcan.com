/**
 * The terminal panel: scrollback, the prompt line and its keys (Enter, Tab, ↑ ↓, Ctrl+L,
 * Ctrl+C). What a command does is decided in lib/shell.ts; this only draws and forwards.
 */
import {
  Suspense,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { displayPath, HOST } from '@/lib/vfs';
import type { Line, ProgramName, Seg } from '@/lib/shell';
import { SegView } from './TermLine';
import { PROGRAMS } from './programs';

export type TermItem =
  /** user: who typed it, so a later login doesn't rewrite earlier lines */
  | { id: number; kind: 'prompt'; cwd: string; cmd: string; user: string }
  | { id: number; kind: 'out'; segs: Seg[] };

export interface TerminalHandle {
  focus: () => void;
  /** empty the prompt line */
  clear: () => void;
}

interface Props {
  items: TermItem[];
  cwd: string;
  user: string;
  history: string[];
  open: boolean;
  onExec: (cmd: string) => void;
  onComplete: (input: string) => { value: string; options: string[] };
  onShowOptions: (input: string, options: string[]) => void;
  onClear: () => void;
  onInterrupt: (input: string) => void;
  /** a running program owns the terminal until it exits */
  program: { id: number; name: ProgramName; args: string[] } | null;
  onProgramExit: (lines?: Line[]) => void;
}

export const Prompt = ({ cwd, user }: { cwd: string; user: string }) => (
  <span className="prompt" aria-hidden="true">
    <span className="p-user">
      {user}@{HOST}
    </span>
    <span className="p-sep">:</span>
    <span className="p-path">{displayPath(cwd)}</span>
    <span className="p-sep">$</span>{' '}
  </span>
);

const Terminal = forwardRef<TerminalHandle, Props>(function Terminal(
  {
    items,
    cwd,
    user,
    history,
    onExec,
    onComplete,
    onShowOptions,
    onClear,
    onInterrupt,
    program,
    onProgramExit,
  },
  ref,
) {
  const [value, setValue] = useState('');
  /** position while walking the history with ↑ ↓; history.length = the line being typed */
  const [cursor, setCursor] = useState<number | null>(null);
  const draft = useRef('');
  const input = useRef<HTMLInputElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => input.current?.focus({ preventScroll: true }),
    clear: () => setValue(''),
  }));

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  });

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onExec(value);
      setValue('');
      setCursor(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const r = onComplete(value);
      if (r.options.length > 1 && r.value === value) onShowOptions(value, r.options);
      setValue(r.value);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      if (!history.length) return;
      e.preventDefault();
      const at = cursor ?? history.length;
      if (cursor === null) draft.current = value;
      const next = Math.min(history.length, Math.max(0, at + (e.key === 'ArrowUp' ? -1 : 1)));
      setCursor(next === history.length ? null : next);
      setValue(next === history.length ? draft.current : history[next]!);
    } else if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onClear();
    } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      onInterrupt(value);
      setValue('');
      setCursor(null);
    }
  };

  const prog = program ? PROGRAMS[program.name] : null;
  const running = prog && program && (
    <Suspense fallback={<div className="t-line t-muted">loading {program.name}…</div>}>
      <prog.C key={program.id} name={program.name} args={program.args} exit={onProgramExit} />
    </Suspense>
  );

  return (
    <div className="term-wrap">
      <div
        className="term-body"
        ref={scroller}
        onClick={(e) => {
          // a click on empty space focuses the prompt; selecting text doesn't
          if ((e.target as HTMLElement).closest('a,button')) return;
          if (!window.getSelection()?.toString()) input.current?.focus({ preventScroll: true });
        }}
      >
        <div className="term-out" role="log" aria-live="polite" aria-label="Terminal output">
          {items.map((it) =>
            it.kind === 'prompt' ? (
              <div className="t-line" key={it.id}>
                <Prompt cwd={it.cwd} user={it.user} />
                <span className="t-typed">{it.cmd}</span>
              </div>
            ) : (
              <div className="t-line" key={it.id}>
                {it.segs.map((s, i) => (
                  <SegView key={i} s={s} onExec={onExec} />
                ))}
                {it.segs.length === 0 && '​'}
              </div>
            ),
          )}
        </div>
        {running && !prog.full ? running : null}
        {!program && (
          <label className="t-line t-input-row">
            <Prompt cwd={cwd} user={user} />
            <input
              ref={input}
              className="t-input"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setCursor(null);
              }}
              onKeyDown={onKeyDown}
              aria-label="Terminal command"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              placeholder={history.length ? undefined : 'type help, or click a command above'}
            />
          </label>
        )}
      </div>
      {running && prog.full ? <div className="prog-full">{running}</div> : null}
    </div>
  );
});

export default Terminal;
