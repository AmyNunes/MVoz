import { semitonesBetween } from '@/lib/notes';

import type { BaselineMetrics } from './baseline';
import type { CheckinAnswers, CheckinRecord, Decision } from './checkin';
import type { MilestoneStatus } from './milestones';
import { currentStage, type Plan } from './plan';
import type { SessionRecord } from './records';
import { atFinal, stepTowardFinal, type Band } from './targets';

/** Progressão por marcos, não pelo calendário (seção 9.3). */

const DAY_MS = 24 * 3600 * 1000;
/** Sem progresso nos marcos depois disso: o plano sugere trocar variações e conversar com uma fono. */
const STUCK_WEEKS = 4;

export type DecisionReason = 'symptoms' | 'effort' | 'discomfort' | 'min-weeks' | 'milestones' | 'band' | 'ready' | 'maintenance';

/** Esforço a partir do qual o check-in sugere uma semana mais leve. */
const HIGH_EFFORT = 7;

export function suggestDecision(input: {
  milestones: readonly MilestoneStatus[];
  weeksInStage: number;
  minWeeks: number;
  answers: CheckinAnswers;
  /** Treinos da última semana. */
  recentSessions: readonly SessionRecord[];
  maintenance: boolean;
  /** Etapa de tom: só avança quando a faixa chegou na meta final. */
  bandAtFinal: boolean;
  pitchStage: boolean;
}): { decision: Decision; reasons: DecisionReason[] } {
  const reasons: DecisionReason[] = [];
  if (input.answers.symptoms.some((s) => s === 'pain' || s === 'hoarseness')) reasons.push('symptoms');
  if (input.answers.effort >= HIGH_EFFORT) reasons.push('effort');
  if (input.recentSessions.some((s) => s.stoppedForPain || s.discomfort === 2)) reasons.push('discomfort');
  if (reasons.length > 0) return { decision: 'lighter', reasons };

  if (input.maintenance) return { decision: 'stay', reasons: ['maintenance'] };
  if (input.weeksInStage < input.minWeeks) reasons.push('min-weeks');
  if (!input.milestones.every((m) => m.met)) reasons.push('milestones');
  if (input.pitchStage && !input.bandAtFinal) reasons.push('band');
  return reasons.length > 0 ? { decision: 'stay', reasons } : { decision: 'advance', reasons: ['ready'] };
}

/** Travou: várias semanas na etapa sem cumprir os marcos. */
export function isStuck(weeksInStage: number, milestones: readonly MilestoneStatus[], maintenance: boolean): boolean {
  return !maintenance && weeksInStage >= STUCK_WEEKS && !milestones.every((m) => m.met);
}

/** Marco de tom cumprido (na etapa de tom, a faixa sobe no check-in). */
export function pitchMilestoneMet(milestones: readonly MilestoneStatus[]): boolean {
  return milestones.some((m) => m.kind === 'pitch-hold' && m.met);
}

export type PlanChange = Pick<Plan, 'stageIndex' | 'stageTarget' | 'stageStartedAt' | 'lighterUntil'>;

/** Aplica a decisão do check-in (que eu confirmei) ao plano. */
export function applyDecision(
  plan: Plan,
  decision: Decision | 'back',
  input: { baseline: BaselineMetrics; raiseBand: boolean; now: Date },
): PlanChange {
  const iso = input.now.toISOString();
  const change: PlanChange = {
    stageIndex: plan.stageIndex,
    stageTarget: plan.stageTarget,
    stageStartedAt: plan.stageStartedAt,
    lighterUntil: plan.lighterUntil,
  };
  const stage = currentStage(plan);
  // Na etapa de tom, a faixa sobe até 2 semitons quando o marco de tom é cumprido (seção 9.2).
  if (stage.pitchMoves && input.raiseBand) change.stageTarget = stepTowardFinal(plan.stageTarget, plan.finalTarget, input.baseline);

  if (decision === 'advance' && plan.stageIndex < plan.stages.length - 1) {
    change.stageIndex = plan.stageIndex + 1;
    change.stageStartedAt = iso;
  } else if (decision === 'back' && plan.stageIndex > 0) {
    change.stageIndex = plan.stageIndex - 1;
    change.stageStartedAt = iso;
  } else if (decision === 'lighter') {
    change.lighterUntil = new Date(input.now.getTime() + 7 * DAY_MS).toISOString();
  }
  return change;
}

export function bandAtFinal(plan: Pick<Plan, 'stageTarget' | 'finalTarget'>, baseline: BaselineMetrics): boolean {
  return atFinal(plan.stageTarget, plan.finalTarget, baseline);
}

/**
 * Manutenção: bloco de reforço se o tom médio da leitura cair 2+ semitons do melhor
 * em 2 check-ins seguidos (seção 9.2). Vale para quem quer subir o tom (para descer, ao contrário).
 */
export function needsReinforcement(checkins: readonly CheckinRecord[], direction: 'up' | 'down' | 'none'): boolean {
  if (direction === 'none') return false;
  const medians = checkins.flatMap((c) => (c.metrics.reading?.medianHz ? [c.metrics.reading.medianHz] : []));
  if (medians.length < 3) return false;
  const best = direction === 'up' ? Math.max(...medians) : Math.min(...medians);
  const drop = (hz: number) => (direction === 'up' ? semitonesBetween(hz, best) : semitonesBetween(best, hz));
  return drop(medians[0]) >= 2 && drop(medians[1]) >= 2;
}

/** A faixa da etapa saiu das regras do plano? (aviso em Configurações › Treino). */
export function outsidePlanBand(band: Band, plan: Pick<Plan, 'stageTarget'>): boolean {
  return Math.abs(semitonesBetween(plan.stageTarget.lowHz, band.lowHz)) > 0.5 || Math.abs(semitonesBetween(plan.stageTarget.highHz, band.highHz)) > 0.5;
}
