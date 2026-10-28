import { insertCheckin, insertPlanEvent, updatePlanProgress } from '@/db/guideRepo';
import { weekStartKey, type CheckinAnswers, type CheckinMetrics, type Decision } from '@/guide/checkin';
import { applyDecision, type PlanChange } from '@/guide/progression';
import { emitAppEvent } from '@/features/app/events';
import type { PlanOverview } from '@/features/plan/usePlanOverview';
import { useSettings } from '@/stores/settingsStore';

/**
 * Salva o check-in com a decisão que eu confirmei e aplica ao plano: muda a etapa, marca a
 * semana mais leve ou sobe a faixa (que também vira a faixa do Medidor e dos exercícios).
 */
export async function saveCheckin(input: {
  overview: PlanOverview;
  metrics: CheckinMetrics;
  answers: CheckinAnswers;
  decision: Decision;
  raiseBand: boolean;
  recordingIds: string[];
  /** Resumo com IA, se pedi (seção 9.4). */
  summaryPt?: string;
  now: Date;
}): Promise<{ change: PlanChange; bandRaised: boolean }> {
  const { plan, baseline } = input.overview;
  await insertCheckin({
    weekStart: weekStartKey(input.now),
    answers: input.answers,
    metrics: input.metrics,
    decision: input.decision,
    summaryPt: input.summaryPt ?? '',
    recordingIds: input.recordingIds,
  });
  // Semana mais leve não sobe a faixa.
  const raiseBand = input.raiseBand && input.decision !== 'lighter';
  const change = applyDecision(plan, input.decision, { baseline, raiseBand, now: input.now });
  await updatePlanProgress(plan.id, change);
  await insertPlanEvent({ planId: plan.id, kind: input.decision, fromStage: plan.stageIndex, toStage: change.stageIndex });

  const bandRaised = change.stageTarget.lowHz !== plan.stageTarget.lowHz || change.stageTarget.highHz !== plan.stageTarget.highHz;
  if (bandRaised) {
    await insertPlanEvent({
      planId: plan.id,
      kind: 'band',
      fromStage: change.stageIndex,
      toStage: change.stageIndex,
      note: `${Math.round(change.stageTarget.lowHz)}-${Math.round(change.stageTarget.highHz)}`,
    });
    await useSettings.getState().update('training', {
      targetEnabled: true,
      targetLowHz: change.stageTarget.lowHz,
      targetHighHz: change.stageTarget.highHz,
    });
  }
  emitAppEvent('checkinSaved');
  return { change, bandRaised };
}
