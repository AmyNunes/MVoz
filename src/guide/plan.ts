import type { Goal } from '@/exercises/model';

import type { BaselineMetrics } from './baseline';
import type { Profile } from './profile';
import { stagesFor, type PlanStage } from './stages';
import { finalAboveCeiling, finalTarget, initialBand, type Band } from './targets';

/** Plano gerado por regras no aparelho, sem IA (seção 9.2). */
export type Plan = {
  id: string;
  goal: Goal;
  createdAt: string;
  active: boolean;
  stageIndex: number;
  stages: PlanStage[];
  finalTarget: Band;
  stageTarget: Band;
  stageStartedAt: string;
  /** "Semana mais leve" até esta data (seção 9.3). */
  lighterUntil: string | null;
};

export type NewPlan = Omit<Plan, 'id'>;

/** Avisos do plano que vieram das respostas do Guia. */
export type PlanNote =
  | 'ceiling'
  | 'slp'
  | 'surgery'
  | 'testosterone'
  | 'estrogen'
  | 'hoarseness'
  | 'pain'
  | 'reflux'
  | 'smoking'
  | 'professional'
  | 'beginner-limit';

export function generatePlan(profile: Profile, baseline: BaselineMetrics, now: string): { plan: NewPlan; notes: PlanNote[] } {
  const target = finalTarget(profile.goal, baseline);
  const notes: PlanNote[] = [];
  if (profile.goal !== 'health' && finalAboveCeiling(target.band, baseline)) notes.push('ceiling');
  if (profile.slp === 'yes') notes.push('slp');
  if (profile.recentSurgery && !profile.surgeryCleared) notes.push('surgery');
  if (profile.hormones === 'testosterone') notes.push('testosterone');
  if (profile.hormones === 'estrogen' && profile.goal === 'feminize') notes.push('estrogen');
  for (const flag of profile.healthFlags) notes.push(flag);
  if (profile.experience === 'new' && profile.dailyMinutes > 15) notes.push('beginner-limit');

  return {
    plan: {
      goal: profile.goal,
      createdAt: now,
      active: true,
      stageIndex: 0,
      stages: stagesFor(profile.goal, profile),
      finalTarget: target.band,
      stageTarget: initialBand(profile.goal, baseline),
      stageStartedAt: now,
      lighterUntil: null,
    },
    notes,
  };
}

export function currentStage(plan: Pick<Plan, 'stages' | 'stageIndex'>): PlanStage {
  return plan.stages[Math.min(plan.stageIndex, plan.stages.length - 1)];
}

/** Piso do tom (seção 9.2), para os marcos e o exercício "Piso do tom". */
export function floorFor(goal: Goal, baseline: Pick<BaselineMetrics, 'speechMedianHz' | 'minHz'>): number | null {
  return finalTarget(goal, baseline).floorHz;
}

/** Semanas desde o começo da etapa (a primeira semana é a 1). */
export function weekInStage(stageStartedAt: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(stageStartedAt).getTime()) / (7 * 24 * 3600 * 1000)) + 1;
}
