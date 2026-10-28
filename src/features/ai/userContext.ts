import type { UserContext } from '@/ai/context';
import { getActivePlan, getBaseline, listCheckins } from '@/db/guideRepo';
import { listSessionRecords } from '@/db/sessionsRepo';
import { currentStage } from '@/guide/plan';
import { strings } from '@/i18n/strings';
import { addDays } from '@/lib/dates';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';

const RECENT_DAYS = 14;

/** Junta o contexto do usuário para os prompts (seção 12.3), sem dados além do necessário. */
export async function loadUserContext(now = new Date()): Promise<UserContext> {
  const since = addDays(now, -RECENT_DAYS).toISOString();
  const [plan, baseline, checkins, sessions] = await Promise.all([
    getActivePlan(),
    getBaseline('first'),
    listCheckins(2),
    listSessionRecords({ since }),
  ]);
  const training = useSettings.getState().training;
  const last = checkins[0] ?? null;
  const stage = plan ? currentStage(plan) : null;
  const recentCheckins = checkins.filter((c) => c.createdAt >= since);
  return {
    profile: useProfile.getState().profile,
    stage: plan && stage ? { name: strings.guide.stages[stage.id].name, number: plan.stageIndex + 1, total: plan.stages.length } : null,
    band: training.targetEnabled ? { lowHz: training.targetLowHz, highHz: training.targetHighHz } : null,
    start: baseline
      ? {
          speechMedianHz: baseline.metrics.speechMedianHz,
          readingMedianHz: baseline.metrics.readingMedianHz,
          minHz: baseline.metrics.minHz,
          maxHz: baseline.metrics.maxHz,
        }
      : null,
    lastCheckin: last
      ? {
          readingMedianHz: last.metrics.reading?.medianHz ?? null,
          inTargetPct: last.metrics.reading?.inTargetRatio != null ? Math.round(last.metrics.reading.inTargetRatio * 100) : null,
          effort: last.answers.effort,
          fit: last.answers.fit,
          comfort: last.answers.comfort,
        }
      : null,
    discomfort:
      sessions.some((s) => s.stoppedForPain || (s.discomfort ?? 0) > 0) ||
      recentCheckins.some((c) => c.answers.symptoms.some((x) => x === 'pain' || x === 'hoarseness')),
  };
}
