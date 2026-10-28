import { getActivePlan, getBaseline, lastPlanEventAt, listCheckins } from '@/db/guideRepo';
import { listSessionRecords } from '@/db/sessionsRepo';
import type { BaselineMetrics } from '@/guide/baseline';
import type { CheckinRecord } from '@/guide/checkin';
import { evaluateMilestones, type MilestoneContext, type MilestoneStatus } from '@/guide/milestones';
import { currentStage, floorFor, weekInStage, type Plan } from '@/guide/plan';
import { isStuck, needsReinforcement } from '@/guide/progression';
import type { PlanStage } from '@/guide/stages';
import { direction } from '@/guide/targets';
import { useLoader } from '@/lib/useLoader';

export type PlanOverview = {
  plan: Plan;
  stage: PlanStage;
  baseline: BaselineMetrics;
  milestones: MilestoneStatus[];
  week: number;
  stuck: boolean;
  reinforcement: boolean;
  /** O que os marcos leem (treinos e check-ins desde o começo da etapa); o check-in reusa. */
  context: MilestoneContext;
  /** Último check-in (de qualquer etapa), para comparar com "a semana passada". */
  lastCheckin: CheckinRecord | null;
  /** Última gravação completa (inicial ou regravação mensal). */
  lastFullAt: string;
};

/** Para onde a ressonância deve ir: mais escura só na masculinização. */
export const resonanceDirectionFor = (goal: Plan['goal']) => (goal === 'masculinize' ? 'darker' : 'brighter');

/** Plano com os marcos da etapa medidos (seção 10.6). `null` = sem plano ou sem gravação inicial. */
export async function loadPlanOverview(now = new Date()): Promise<PlanOverview | null> {
  const [plan, baselineRow] = await Promise.all([getActivePlan(), getBaseline('latest')]);
  if (!plan || !baselineRow) return null;
  const baseline = baselineRow.metrics;
  const stage = currentStage(plan);
  const [sessions, allCheckins, bandSince] = await Promise.all([
    listSessionRecords({ since: plan.stageStartedAt }),
    listCheckins(12),
    lastPlanEventAt(plan.id, 'band'),
  ]);
  const context: MilestoneContext = {
    sessions,
    checkins: allCheckins.filter((c) => c.createdAt >= plan.stageStartedAt),
    baseline,
    band: plan.stageTarget,
    floorHz: floorFor(plan.goal, baseline),
    resonanceDirection: resonanceDirectionFor(plan.goal),
    bandSince,
  };
  const milestones = evaluateMilestones(stage, context);
  const week = weekInStage(plan.stageStartedAt, now);
  const maintenance = stage.id === 'maintenance';
  const lastFullCheckin = allCheckins.find((c) => c.metrics.extension !== null)?.createdAt ?? '';
  return {
    plan,
    stage,
    baseline,
    milestones,
    week,
    stuck: isStuck(week, milestones, maintenance),
    reinforcement: maintenance && needsReinforcement(allCheckins, direction(plan.goal, baseline.speechMedianHz, plan.finalTarget)),
    context,
    lastCheckin: allCheckins[0] ?? null,
    lastFullAt: lastFullCheckin > baselineRow.createdAt ? lastFullCheckin : baselineRow.createdAt,
  };
}

export function usePlanOverview() {
  return useLoader(() => loadPlanOverview());
}
