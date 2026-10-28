import { getExercise } from '@/exercises/catalog';
import { semitonesBetween } from '@/lib/notes';

import type { BaselineMetrics } from './baseline';
import type { CheckinRecord } from './checkin';
import type { ResultRecord, SessionRecord } from './records';
import type { MilestoneKind, PlanStage } from './stages';
import type { Band } from './targets';

/** Situação de um marco, com o valor medido e a meta (para "58% → falta pouco"). */
export type MilestoneStatus = { kind: MilestoneKind; met: boolean; current: number | null; target: number };

export type MilestoneContext = {
  /** Treinos desde o começo da etapa (mais recentes primeiro). */
  sessions: readonly SessionRecord[];
  /** Check-ins desde o começo da etapa (mais recentes primeiro). */
  checkins: readonly CheckinRecord[];
  baseline: BaselineMetrics;
  band: Band;
  floorHz: number | null;
  /** Para onde a ressonância deve ir. */
  resonanceDirection: 'brighter' | 'darker';
  /** Última vez que a faixa subiu: o marco de tom recomeça dali (na faixa nova). */
  bandSince?: string | null;
};

const results = (ctx: MilestoneContext, ids: readonly string[]): ResultRecord[] =>
  ctx.sessions.flatMap((s) => s.results.filter((r) => !r.skipped && ids.includes(r.exerciseId)));

const calm = (s: SessionRecord) => !s.stoppedForPain && (s.discomfort ?? 0) === 0;
const notStrong = (s: SessionRecord) => !s.stoppedForPain && (s.discomfort ?? 0) < 2;
const done = (s: SessionRecord) => s.results.some((r) => !r.skipped);
const GLIDES = ['straw-phonation', 'lip-trill', 'pitch-glides', 'cooldown', 'new-low', 'smooth-breaks'];
const RESONANCE_MIN_PCT = 5;
/** Tolerância da leitura em relação à faixa (meio semitom). */
const BAND_TOLERANCE_ST = 0.5;

function status(kind: MilestoneKind, current: number | null, target: number, met = current !== null && current >= target): MilestoneStatus {
  return { kind, met, current, target };
}

/** Mudança da ressonância do /i/ no último check-in em relação ao início, em %, na direção pedida. */
export function resonanceChangePct(ctx: MilestoneContext): number | null {
  const now = ctx.checkins[0]?.metrics.vowelI?.spacing;
  const start = ctx.baseline.vowelI?.spacing;
  if (!now || !start) return null;
  const change = ((now - start) / start) * 100;
  return ctx.resonanceDirection === 'brighter' ? change : -change;
}

function evaluate(kind: MilestoneKind, stage: PlanStage, ctx: MilestoneContext): MilestoneStatus {
  switch (kind) {
    case 'calm-sessions':
      return status(kind, ctx.sessions.filter((s) => done(s) && calm(s)).length, 5);
    case 'glide-range': {
      const ranges = results(ctx, GLIDES).flatMap((r) => r.metrics.glideRanges ?? []);
      return status(kind, ranges.length > 0 ? Math.max(...ranges) : null, 8);
    }
    case 'mpt':
      return status(kind, results(ctx, ['sz-mpt']).some((r) => (r.metrics.attempts?.length ?? 0) > 0) ? 1 : 0, 1);
    case 'resonance-gain': {
      const change = resonanceChangePct(ctx);
      const sessions = results(ctx, stage.exercises).filter((r) => (r.metrics.resonance?.bestChangePct ?? 0) >= RESONANCE_MIN_PCT).length;
      return status(kind, change, RESONANCE_MIN_PCT, change !== null && change >= RESONANCE_MIN_PCT && sessions >= 3);
    }
    case 'pitch-hold': {
      const target = getExercise('target-hold')?.reps ?? 8;
      const since = ctx.bandSince ?? '';
      const recent = { ...ctx, sessions: ctx.sessions.filter((s) => s.startedAt >= since) };
      const good = results(recent, ['target-hold']).slice(0, 3).filter((r) => r.repsDone >= target * 0.8).length;
      return status(kind, good, 3);
    }
    case 'reading-band': {
      const reading = ctx.checkins[0]?.metrics.reading;
      if (!reading?.medianHz) return status(kind, null, 1, false);
      const inBand =
        semitonesBetween(ctx.band.lowHz, reading.medianHz) >= -BAND_TOLERANCE_ST &&
        semitonesBetween(reading.medianHz, ctx.band.highHz) >= -BAND_TOLERANCE_ST;
      const aboveFloor = ctx.floorHz === null || (reading.p10Hz ?? 0) >= ctx.floorHz;
      return status(kind, Math.round(reading.medianHz), 1, inBand && aboveFloor);
    }
    case 'weight':
      return status(kind, results(ctx, ['light-heavy']).filter((r) => (r.rating.selfRating ?? 0) >= 4).length, 3);
    case 'intonation': {
      const errors = results(ctx, ['question-statement', 'falling-endings']).flatMap((r) => r.metrics.contourErrors ?? []).slice(-10);
      const good = errors.filter((e) => e < 2).length;
      return status(kind, errors.length > 0 ? good : null, 9, errors.length >= 10 && good >= 9);
    }
    case 'monologue': {
      const ratios = results(ctx, ['monologue']).flatMap((r) => (r.metrics.segment?.inTargetRatio != null ? [r.metrics.segment.inTargetRatio] : []));
      return status(kind, ratios.length > 0 ? Math.round(Math.max(...ratios) * 100) : null, 70);
    }
    case 'comfort': {
      const ok = ctx.checkins.slice(0, 2).filter((c) => c.answers.effort <= 3 && c.answers.fit >= 7).length;
      return status(kind, ok, 2);
    }
    case 'function':
      return status(kind, results(ctx, ['vocal-function']).length, 20);
    case 'projection': {
      const calmProjection = ctx.sessions.filter((s) => calm(s) && s.results.some((r) => !r.skipped && r.exerciseId === 'projection')).length;
      return status(kind, calmProjection, 3);
    }
    case 'practice': {
      const count = ctx.sessions.filter((s) => notStrong(s) && s.results.some((r) => !r.skipped && stage.exercises.includes(r.exerciseId))).length;
      return status(kind, count, 6);
    }
  }
}

/** Marcos da etapa com o que já foi medido (seção 10.6). */
export function evaluateMilestones(stage: PlanStage, ctx: MilestoneContext): MilestoneStatus[] {
  return stage.milestones.map((kind) => evaluate(kind, stage, ctx));
}
