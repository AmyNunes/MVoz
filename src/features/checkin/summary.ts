import { weeklySummary } from '@/ai/functions/weeklySummary';
import type { WeeklyStats } from '@/ai/prompts/weeklySummary';
import type { WeeklySummary } from '@/ai/schemas/weeklySummary';
import { listSessionRecords } from '@/db/sessionsRepo';
import type { CheckinAnswers, Decision } from '@/guide/checkin';
import type { SessionRecord } from '@/guide/records';
import { strings } from '@/i18n/strings';
import { addDays } from '@/lib/dates';

import { loadUserContext } from '../ai/userContext';

import type { CheckinOutcome } from './evaluate';

/** Números da semana para o resumo com IA, calculados no aparelho (seção 12.5). */
export function weeklyStats(input: {
  outcome: CheckinOutcome;
  answers: CheckinAnswers;
  decision: Decision;
  weekSessions: readonly SessionRecord[];
}): WeeklyStats {
  const { comparison: cmp, milestones } = input.outcome;
  return {
    minutesWeek: Math.round(input.weekSessions.reduce((sum, s) => sum + s.minutes, 0)),
    activeDays: new Set(input.weekSessions.map((s) => s.date)).size,
    readingMedianHz: cmp.nowHz,
    lastReadingMedianHz: cmp.lastHz,
    startReadingMedianHz: cmp.startHz,
    inTargetPct: cmp.inTargetPct,
    resonancePct: cmp.resonancePct,
    effort: input.answers.effort,
    fit: input.answers.fit,
    comfort: input.answers.comfort,
    symptoms: input.answers.symptoms.map((s) => strings.checkin.symptoms[s]),
    milestonesMet: milestones.filter((m) => m.met).length,
    milestonesTotal: milestones.length,
    decision: strings.checkin.decisions[input.decision],
  };
}

/** "Resumo com IA" no resultado do check-in. */
export async function summarizeWeek(input: Omit<Parameters<typeof weeklyStats>[0], 'weekSessions'>, now = new Date()): Promise<WeeklySummary> {
  const weekSessions = await listSessionRecords({ since: addDays(now, -7).toISOString() });
  return weeklySummary(weeklyStats({ ...input, weekSessions }), await loadUserContext(now));
}

/** Como o resumo fica guardado no check-in. */
export const summaryText = (s: WeeklySummary) => (s.focusNextWeekPt ? `${s.summaryPt}\n\n${s.focusNextWeekPt}` : s.summaryPt);
