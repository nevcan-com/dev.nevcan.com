/** `hire nevcan` / `npm install nevcan`: a fake install that ends with how to get in touch */
import { useState } from 'react';
import { profile } from '@/data/profile';
import type { Line } from '@/lib/shell';
import { LineView } from '../TermLine';
import { isInterrupt, useKeys, useTick, type ProgramProps } from './common';

const version = `${new Date().getFullYear() - profile.since}.0.0`;
const STEPS = [
  `fetching ${new Date().getFullYear() - profile.since} years of experience`,
  'linking software architecture',
  'installing dipnot (technical co-founder)',
  'building 140+ websites',
  'running tests',
];
const WIDTH = 20;

const barLine = (label: string, pct: number): Line => {
  const n = Math.round((pct / 100) * WIDTH);
  return [
    { t: '[' },
    { t: '█'.repeat(n), c: 'accent' },
    { t: '░'.repeat(WIDTH - n), c: 'muted' },
    { t: '] ' },
    { t: label, c: pct === 100 ? undefined : 'muted' },
  ];
};

function done(): Line[] {
  const linkedin = profile.links.find((l) => l.label === 'LinkedIn')!;
  return [
    [{ t: `npm notice resolving nevcan@${version}`, c: 'muted' }],
    ...STEPS.map((s) => barLine(s, 100)),
    [],
    [{ t: `+ nevcan@${version}`, c: 'accent' }],
    [{ t: 'added 1 developer in 3.2s' }],
    [{ t: 'found 0 vulnerabilities (some bugs turned out to be features)', c: 'muted' }],
    [],
    [
      { t: 'next: ', c: 'muted' },
      { t: 'LinkedIn', href: linkedin.href, c: 'link' },
      { t: ' · ', c: 'muted' },
      { t: profile.email, href: `mailto:${profile.email}`, c: 'link' },
    ],
  ];
}

export default function Hire({ exit }: ProgramProps) {
  // progress in percent across all steps
  const [p, setP] = useState(0);
  useTick(40, () => {
    const next = p + 6.5;
    if (next >= 100 * STEPS.length) exit(done());
    else setP(next);
  });
  useKeys((e) => {
    if (!isInterrupt(e)) return;
    e.preventDefault();
    exit([
      [
        { t: 'npm ERR! install aborted. The offer still stands: ', c: 'err' },
        { t: profile.email, href: `mailto:${profile.email}`, c: 'link' },
      ],
    ]);
  });

  const step = Math.floor(p / 100);
  return (
    <div>
      <LineView line={[{ t: `npm notice resolving nevcan@${version}`, c: 'muted' }]} />
      {STEPS.slice(0, step + 1).map((s, i) => (
        <LineView key={s} line={barLine(s, i < step ? 100 : p % 100)} />
      ))}
    </div>
  );
}
