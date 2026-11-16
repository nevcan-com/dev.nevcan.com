/**
 * Cookie consent as part of the editor: a second editor group on the right (desktop), or a panel
 * under the editor (narrow screens). It never covers the content, so the site stays usable, but
 * on a first visit it has no close button: it goes away when the visitor chooses. Accept, Reject
 * and Save look the same (KVKK Çerez Rehberi 2025, p. 30).
 * Text as approved for dive.nevcan.com on 2026-11-12, with this site's cookie names.
 *
 * The classes are prefs-*, never cookie-*: blockers using EasyList Cookie (Brave, uBlock Origin)
 * hide `.cookie-pane` everywhere, and then the "Cookies" button seemed to do nothing.
 */
import { useEffect, useId, useState } from 'react';
import { ANALYTICS } from '@/data/analytics';

interface Props {
  /** first visit: no close button until a choice is made */
  required: boolean;
  /** the current choice, for the switch */
  analytics: boolean;
  onChoose: (analytics: boolean) => void;
  onClose: () => void;
  onOpenFile: (path: string) => void;
}

const cookieNames = `${ANALYTICS.cookiePrefix}_ga, ${ANALYTICS.cookiePrefix}_ga_…`;

export default function CookiePane({ required, analytics, onChoose, onClose, onOpenFile }: Props) {
  const [on, setOn] = useState(analytics);
  useEffect(() => setOn(analytics), [analytics]);
  const id = useId();
  const link = (path: string, label: string) => (
    <a
      href={'/' + path.replace(/\.md$/, '')}
      onClick={(e) => {
        e.preventDefault();
        onOpenFile(path);
      }}
    >
      {label}
    </a>
  );

  return (
    <section className="prefs-pane" aria-labelledby={`${id}-title`}>
      <div className="tabs">
        <div className="tab-list">
          <div className="tab active">
            <span className="tab-name">
              <span className="prefs-dot" aria-hidden="true" />
              cookie-settings
            </span>
            {required ? (
              <span className="tab-badge" title="Choose to close">
                choice needed
              </span>
            ) : (
              <button
                type="button"
                className="tab-close"
                onClick={onClose}
                aria-label="Close cookie settings"
              >
                <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="prefs-body">
        <h2 id={`${id}-title`}>Cookies, only if you agree</h2>
        <p>
          With your consent, this site uses Google Analytics to see which pages are visited. No
          advertising. Accepting also sends this data to Google in the US, which Türkiye has not
          found to protect data adequately; US authorities may be able to access it.{' '}
          {link('legal/privacy.md', 'How analytics works')}
        </p>

        <ul className="cc-list">
          <li>
            <div>
              <p className="cc-name">Necessary</p>
              <p className="cc-desc">
                Remembers your choice here, in your browser. Needs no consent.
              </p>
            </div>
            <span className="cc-always">Always on</span>
          </li>
          <li>
            <label className="cc-name" htmlFor={`${id}-analytics`}>
              Analytics
            </label>
            <p className="cc-desc" id={`${id}-desc`}>
              Google Analytics: which pages are visited, device type and approximate location.
              Cookies {cookieNames}, up to two years. {link('legal/cookies.md', 'Details')}
            </p>
            <input
              className="cc-switch"
              type="checkbox"
              role="switch"
              id={`${id}-analytics`}
              aria-describedby={`${id}-desc`}
              checked={on}
              onChange={(e) => setOn(e.target.checked)}
            />
          </li>
        </ul>

        <p className="cc-later">
          Change it any time: "Cookies" in the status bar, or type <code>cookies</code> in the
          terminal.
        </p>
      </div>

      <div className="prefs-foot">
        <div className="cc-actions">
          <button className="cc-btn" type="button" onClick={() => onChoose(true)}>
            Accept
          </button>
          <button className="cc-btn" type="button" onClick={() => onChoose(false)}>
            Reject
          </button>
          <button className="cc-btn" type="button" onClick={() => onChoose(on)}>
            Save choice
          </button>
        </div>
      </div>
    </section>
  );
}
