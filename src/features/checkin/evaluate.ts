import type { VoiceFrame } from '@/audio/analyzer';
import { computeMetrics } from '@/audio/metrics';
import { extension, vowelResonance, type TaskKind } from '@/guide/baseline';
import type { CheckinAnswers, CheckinMetrics, CheckinRecord, Decision } from '@/guide/checkin';
import { evaluateMilestones, resonanceChangePct, type MilestoneStatus } from '@/guide/milestones';
import { bandAtFinal, pitchMilestoneMet, suggestDecision, type DecisionReason } from '@/guide/progression';
import { addDays } from '@/lib/dates';
import type { PlanOverview } from '@/features/plan/usePlanOverview';

/** Check-in semanal (seção 9.4): medidas das gravações, comparação, marcos e decisão sugerida. */

export type TaskFrames = Partial<Record<TaskKind, readonly VoiceFrame[]>>;

/** Leitura e fala livre medidas na faixa da etapa; /i/ e (na regravação mensal) o deslize. */
export function checkinMetricsFrom(frames: TaskFrames, options: { band: { lowHz: number; highHz: number }; floorHz: number | null }): CheckinMetrics {
  const segment = (f: readonly VoiceFrame[] | undefined) => (f && f.length > 0 ? computeMetrics(f, options) : null);
  return {
    reading: segment(frames.reading),
    free: segment(frames.free),
    vowelI: frames['vowel-i'] ? vowelResonance(frames['vowel-i']) : null,
    extension: frames.glide ? extension(frames.glide) : null,
  };
}

export type CheckinComparison = {
  /** Tom médio da leitura: no início, no último check-in e hoje. */
  startHz: number | null;
  lastHz: number | null;
  nowHz: number | null;
  inTargetPct: number | null;
  p10Hz: number | null;
  floorHz: number | null;
  /** Mudança da ressonância do /i/ em relação ao início, em % (positivo = mais clara). */
  resonancePct: number | null;
};

export type CheckinOutcome = {
  comparison: CheckinComparison;
  milestones: MilestoneStatus[];
  decision: Decision;
  reasons: DecisionReason[];
  /** Na etapa de tom, a faixa sobe quando o marco de tom é cumprido. */
  raiseBand: boolean;
};

export function evaluateCheckin(
  overview: PlanOverview,
  input: { metrics: CheckinMetrics; answers: CheckinAnswers; now: Date },
): CheckinOutcome {
  const { plan, stage, baseline, context, week, lastCheckin } = overview;
  const draft: CheckinRecord = {
    id: 'draft',
    weekStart: '',
    createdAt: input.now.toISOString(),
    answers: input.answers,
    metrics: input.metrics,
    decision: null,
    summaryPt: '',
    recordingIds: [],
  };
  const withDraft = { ...context, checkins: [draft, ...context.checkins] };
  const milestones = evaluateMilestones(stage, withDraft);
  const weekAgo = addDays(input.now, -7).toISOString();
  const atFinal = bandAtFinal(plan, baseline);
  const { decision, reasons } = suggestDecision({
    milestones,
    weeksInStage: week,
    minWeeks: stage.minWeeks,
    answers: input.answers,
    recentSessions: context.sessions.filter((s) => s.startedAt >= weekAgo),
    maintenance: stage.id === 'maintenance',
    bandAtFinal: atFinal,
    pitchStage: stage.pitchMoves,
  });
  const change = resonanceChangePct(withDraft);
  const reading = input.metrics.reading;
  return {
    comparison: {
      startHz: baseline.readingMedianHz ?? baseline.speechMedianHz,
      lastHz: lastCheckin?.metrics.reading?.medianHz ?? null,
      nowHz: reading?.medianHz ?? null,
      inTargetPct: reading?.inTargetRatio != null ? Math.round(reading.inTargetRatio * 100) : null,
      p10Hz: reading?.p10Hz ?? null,
      floorHz: context.floorHz,
      // `resonanceChangePct` já vem na direção do objetivo; aqui mostro a mudança crua.
      resonancePct: change === null ? null : context.resonanceDirection === 'brighter' ? change : -change,
    },
    milestones,
    decision,
    reasons,
    raiseBand: stage.pitchMoves && !atFinal && pitchMilestoneMet(milestones),
  };
}
