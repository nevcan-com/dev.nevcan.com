/**
 * The terminal programs, each loaded only when its command runs. `full` programs take over the
 * terminal panel; the others print into the scrollback where the prompt was.
 */
import { lazy, type ComponentType } from 'react';
import type { ProgramName } from '@/lib/shell';
import type { ProgramProps } from './common';

const Top = lazy(() => import('./Top'));

export const PROGRAMS: Record<ProgramName, { full: boolean; C: ComponentType<ProgramProps> }> = {
  top: { full: true, C: Top },
  htop: { full: true, C: Top },
  hire: { full: false, C: lazy(() => import('./Hire')) },
  ping: { full: false, C: lazy(() => import('./Ping')) },
  sl: { full: true, C: lazy(() => import('./Sl')) },
  matrix: { full: true, C: lazy(() => import('./Matrix')) },
  aquarium: { full: true, C: lazy(() => import('./Aquarium')) },
  typing: { full: true, C: lazy(() => import('./Typing')) },
};
