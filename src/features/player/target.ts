import type { VoiceFrame } from '@/audio/analyzer';
import { computeMetrics } from '@/audio/metrics';
import { contourInHz, CONTOURS } from '@/exercises/contours';
import {
  contourDetector,
  durationDetector,
  glideDetector,
  manualDetector,
  resonanceDetector,
  soundHoldDetector,
  speechDetector,
  voiceTimeDetector,
  sustainDetector,
  type Band,
  type Detector,
  type DetectorState,
} from '@/exercises/criteria';
import type { Exercise, Goal, StepTarget } from '@/exercises/model';
import type { ResultDetails } from '@/exercises/results';
import { useProfile } from '@/stores/profileStore';

/** Alvo de tom de um exercício: a faixa-alvo ou uma nota (o centro da faixa). */
export type ExerciseTarget = { band: Band | null; noteHz: number | null };

export const NO_TARGET: ExerciseTarget = { band: null, noteHz: null };

/** O exercício precisa da faixa-alvo ligada. */
export function needsBand(exercise: Exercise): boolean {
  return exercise.target !== 'none' || exercise.measure === 'contour';
}

export function bandCenter(band: Band): number {
  return Math.sqrt(band.lowHz * band.highHz);
}

export function resolveTarget(exercise: Exercise, band: Band | null): ExerciseTarget {
  if (!band || exercise.target === 'none') return NO_TARGET;
  return exercise.target === 'note' ? { band, noteHz: bandCenter(band) } : { band, noteHz: null };
}

/** Para onde levar a ressonância. "Conforme o objetivo": mais escura só na masculinização (sem Guia, mais clara). */
export function resolveDirection(exercise: Exercise, goal: Goal | null = useProfile.getState().profile?.goal ?? null): 'brighter' | 'darker' {
  if (exercise.direction === 'goal') return goal === 'masculinize' ? 'darker' : 'brighter';
  return exercise.direction === 'darker' ? 'darker' : 'brighter';
}

/** Curvas do exercício em Hz (as do catálogo, centradas na faixa, ou a da simulação com IA). */
export function exerciseContours(
  exercise: Exercise,
  band: Band | null,
  simulated?: { t: number; hz: number }[] | null,
): { text: string; points: { t: number; hz: number }[] }[] {
  if (simulated && simulated.length > 1) return [{ text: exercise.name, points: simulated }];
  if (!band) return [];
  return (CONTOURS[exercise.id] ?? []).map((item) => ({ text: item.text, points: contourInHz(item, bandCenter(band)) }));
}

/** O detector da contagem de um passo (`main` = o critério do próprio exercício). */
export function createStepDetector(step: StepTarget, main: () => Detector): Detector {
  switch (step.count) {
    case 'main':
      return main();
    case 'sound':
      return soundHoldDetector(step.seconds ?? 3);
    case 'glide':
      return glideDetector(step.minRangeSt ?? 5);
    case 'voice':
      return voiceTimeDetector(step.seconds ?? 10);
    case 'manual':
      return manualDetector();
  }
}

/** O detector do critério de acerto certo para cada tipo de medição (seção 8.3). */
export function createDetector(exercise: Exercise, target: ExerciseTarget, contour?: { t: number; hz: number }[]): Detector {
  const s = exercise.success;
  switch (exercise.measure) {
    case 'sustain':
      return sustainDetector(s.holdSec ?? 3, target);
    case 'match':
      return sustainDetector(s.holdSec ?? 1, target, s.centsTolerance ?? 50);
    case 'resonance':
      return resonanceDetector(s.holdSec ?? 3, resolveDirection(exercise));
    case 'glide':
      return glideDetector(s.minRangeSt ?? 5);
    case 'duration':
      return durationDetector();
    case 'contour':
      return contour && contour.length > 1 ? contourDetector(contour, s.maxMeanErrorSt ?? 2) : manualDetector();
    case 'speech':
      return speechDetector(target.band);
    default:
      return manualDetector();
  }
}

/** O que fica salvo do exercício: métricas da voz e o resultado de cada tentativa. */
export function buildDetails(
  exercise: Exercise,
  frames: readonly VoiceFrame[],
  state: DetectorState,
  band: Band | null,
): ResultDetails {
  const voiced = frames.some((f) => f.hz !== null);
  const details: ResultDetails = { segment: voiced ? computeMetrics(frames, { band }) : null };
  if (exercise.measure === 'duration') details.attempts = state.values.map((seconds, i) => ({ label: String(i + 1), seconds }));
  if (exercise.measure === 'glide') details.glideRanges = state.values;
  if (exercise.measure === 'contour') details.contourErrors = state.values;
  if (exercise.measure === 'resonance' && state.reference !== null) {
    details.resonance = { reference: state.reference, bestChangePct: state.bestChangePct };
  }
  return details;
}
