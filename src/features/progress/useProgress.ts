import { usageTotalsSince } from '@/db/aiUsageRepo';
import { getActivePlan, getBaseline, listCheckins } from '@/db/guideRepo';
import { countRecordings } from '@/db/recordingsRepo';
import { listSessionRecords } from '@/db/sessionsRepo';
import { addDays, startOfMonth } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';

import { buildProgress, type ProgressView } from './progress';

export type ProgressScreenData = ProgressView & { recordings: number; aiSpent: number };

async function loadProgress(now = new Date()): Promise<ProgressScreenData> {
  const monthStart = startOfMonth(now);
  const since = new Date(Math.min(monthStart.getTime(), addDays(now, -7).getTime())).toISOString();
  const [sessions, checkins, baseline, plan, recordings, usage] = await Promise.all([
    listSessionRecords({ since }),
    listCheckins(52),
    getBaseline('first'),
    getActivePlan(),
    countRecordings(),
    usageTotalsSince(monthStart.toISOString()),
  ]);
  return { ...buildProgress({ sessions, checkins, baseline, plan }, now), recordings, aiSpent: usage.cost };
}

/** Aba Progresso (seção 10.7). */
export function useProgress() {
  return useLoader(() => loadProgress());
}
