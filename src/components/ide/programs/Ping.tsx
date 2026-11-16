/**
 * `ping <host>.nevcan.com`: six replies, then statistics (Ctrl+C stops early).
 * dive.nevcan.com answers with a depth instead of a time; dev.nevcan.com is where you are.
 */
import { useState } from 'react';
import type { Line } from '@/lib/shell';
import { LineView } from '../TermLine';
import { isInterrupt, useKeys, useTick, type ProgramProps } from './common';

const COUNT = 6;

function reply(host: string, seq: number): Line {
  if (host === 'dive.nevcan.com')
    return [
      { t: `64 bytes from ${host}: icmp_seq=${seq} ` },
      { t: `depth=${(seq + 1) * 6}m`, c: 'accent' },
      { t: ` time=${(8 + Math.random() * 6).toFixed(1)} ms` },
    ];
  if (host === 'dev.nevcan.com' || host === 'localhost')
    return [
      {
        t: `64 bytes from ${host} (127.0.0.1): icmp_seq=${seq} time=0.0${seq + 1} ms (you are here)`,
      },
    ];
  return [
    { t: `64 bytes from ${host}: icmp_seq=${seq} time=${(9 + Math.random() * 20).toFixed(1)} ms` },
  ];
}

function stats(host: string, sent: number): Line[] {
  const out: Line[] = [
    [],
    [{ t: `--- ${host} ping statistics ---` }],
    [{ t: `${sent} packets transmitted, ${sent} received, 0.0% packet loss` }],
  ];
  if (host === 'dive.nevcan.com' && sent)
    out.push([
      { t: `max depth ${sent * 6}m · ascending at 9 m/min · safety stop done ✓`, c: 'muted' },
    ]);
  return out;
}

export default function Ping({ args, exit }: ProgramProps) {
  const host = args[0] ?? 'dev.nevcan.com';
  const [lines, setLines] = useState<Line[]>([[{ t: `PING ${host}: 56 data bytes` }]]);
  const sent = lines.length - 1;

  useTick(700, () => {
    if (sent >= COUNT) return exit([...lines, ...stats(host, sent)]);
    setLines((l) => [...l, reply(host, sent)]);
  });
  useKeys((e) => {
    if (!isInterrupt(e)) return;
    e.preventDefault();
    exit([...lines, [{ t: '^C', c: 'muted' }], ...stats(host, sent)]);
  });

  return (
    <div>
      {lines.map((l, i) => (
        <LineView key={i} line={l} />
      ))}
    </div>
  );
}
