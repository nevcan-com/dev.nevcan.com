/**
 * Settings → Log in…: an editor-style input box for a username, the same as `login <name>` (the
 * only way on a phone, which has no terminal). Runs the command through the shell, so the
 * terminal shows what happened. Enter saves, Esc or a click outside goes back.
 */
import { useEffect, useRef, useState } from 'react';
import { GUEST, badName, reservedName } from '@/lib/user';

interface Props {
  user: string;
  onSubmit: (cmd: string) => void;
  onClose: () => void;
}

export default function UserDialog({ user, onSubmit, onClose }: Props) {
  const [name, setName] = useState(user === GUEST ? '' : user);
  const [problem, setProblem] = useState<string | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  // a click outside goes back
  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) onClose();
    };
    addEventListener('pointerdown', away, true);
    return () => removeEventListener('pointerdown', away, true);
  }, [onClose]);

  const save = () => {
    const n = name.trim();
    const why = badName(n) ?? reservedName(n);
    if (why) return setProblem(why);
    onSubmit(`login ${n}`);
    onClose();
  };

  return (
    <div ref={box} className="theme-pick user-pick" role="dialog" aria-label="Log in">
      <p className="theme-pick-title">Username</p>
      <form
        className="user-row"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <input
          ref={input}
          className="search-input"
          value={name}
          maxLength={20}
          placeholder="A name to call you"
          aria-label="Username"
          aria-invalid={problem ? true : undefined}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          onChange={(e) => {
            setName(e.target.value);
            setProblem(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation();
              onClose();
            }
          }}
        />
        <button type="submit" className="btn">
          Save
        </button>
      </form>
      {problem && <p className="user-problem">{problem}</p>}
      <p className="theme-pick-foot">
        Replaces “guest” here. <strong>Saved on this device</strong> only, never sent anywhere.
        {user !== GUEST && (
          <>
            {' '}
            <button
              type="button"
              className="user-out"
              onClick={() => {
                onSubmit('logout');
                onClose();
              }}
            >
              Log out
            </button>
          </>
        )}
      </p>
    </div>
  );
}
