import { z } from 'zod';

import type { VoiceFrame } from '@/audio/analyzer';
import { formantSpacing } from '@/audio/formants';
import { computeMetrics } from '@/audio/metrics';

/**
 * Gravação inicial (seção 9.1, item 10) e regravação mensal: tarefas guiadas e as medidas que
 * viram o "Seu início" de todos os medidores.
 */

export type TaskKind = 'vowel-a' | 'vowel-i' | 'glide' | 'counting' | 'reading' | 'free';

export type RecordingTask = {
  kind: TaskKind;
  /** Para sozinha neste tempo (segundos). */
  seconds: number;
  /** Texto de leitura (ids de `texts.ts`). */
  textId?: string;
};

/** Gravação inicial completa (~3 min). */
export const BASELINE_TASKS: RecordingTask[] = [
  { kind: 'vowel-a', seconds: 5 },
  { kind: 'vowel-i', seconds: 5 },
  { kind: 'glide', seconds: 12 },
  { kind: 'counting', seconds: 15 },
  { kind: 'reading', seconds: 60, textId: 'north-wind' },
  { kind: 'free', seconds: 30 },
];

/** Check-in semanal (~4 min com as perguntas): leitura padrão + fala livre + /i/ (seção 9.4). */
export const CHECKIN_TASKS: RecordingTask[] = [
  { kind: 'reading', seconds: 60, textId: 'north-wind' },
  { kind: 'free', seconds: 30 },
  { kind: 'vowel-i', seconds: 5 },
];

const resonanceSchema = z.object({ f1: z.number(), f2: z.number(), spacing: z.number().nullable() });
export type VowelResonance = z.infer<typeof resonanceSchema>;

export const baselineMetricsSchema = z.object({
  /** Tom habitual: mediana da fala (contagem, leitura e fala livre). */
  speechMedianHz: z.number(),
  speechP10Hz: z.number(),
  speechP90Hz: z.number(),
  readingMedianHz: z.number().nullable(),
  /** Extensão: grave e agudo confortáveis do deslize. */
  minHz: z.number(),
  maxHz: z.number(),
  vowelA: resonanceSchema.nullable(),
  vowelI: resonanceSchema.nullable(),
  /** Ressonância média na leitura: o "Seu início" da barra do Medidor. */
  speechSpacing: z.number().nullable(),
});
export type BaselineMetrics = z.infer<typeof baselineMetricsSchema>;

function percentile(sorted: readonly number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

/** Grave e agudo do deslize, ignorando as pontas soltas (3% de cada lado). */
export function extension(frames: readonly VoiceFrame[]): { lowHz: number; highHz: number } | null {
  const hz = frames.flatMap((f) => (f.hz === null ? [] : [f.hz])).sort((a, b) => a - b);
  if (hz.length < 10) return null;
  return { lowHz: percentile(hz, 0.03), highHz: percentile(hz, 0.97) };
}

/** F1, F2 e espaçamento medianos de uma vogal sustentada. */
export function vowelResonance(frames: readonly VoiceFrame[]): VowelResonance | null {
  const metrics = computeMetrics(frames);
  if (!metrics.resonance) return null;
  return { f1: metrics.resonance.f1, f2: metrics.resonance.f2, spacing: metrics.resonance.spacing };
}

/** Junta as tarefas gravadas no "Seu início". `null` se faltou voz nas tarefas de fala. */
export function buildBaseline(frames: Partial<Record<TaskKind, readonly VoiceFrame[]>>): BaselineMetrics | null {
  const speech = [...(frames.counting ?? []), ...(frames.reading ?? []), ...(frames.free ?? [])];
  const speechMetrics = computeMetrics(speech);
  if (speechMetrics.medianHz === null || speechMetrics.p10Hz === null || speechMetrics.p90Hz === null) return null;

  const glide = extension(frames.glide ?? []);
  const reading = frames.reading ? computeMetrics(frames.reading) : null;
  const readingFormants = (frames.reading ?? []).flatMap((f) => {
    const spacing = f.formants ? formantSpacing(f.formants) : null;
    return spacing === null ? [] : [spacing];
  });

  return {
    speechMedianHz: speechMetrics.medianHz,
    speechP10Hz: speechMetrics.p10Hz,
    speechP90Hz: speechMetrics.p90Hz,
    readingMedianHz: reading?.medianHz ?? null,
    minHz: glide?.lowHz ?? speechMetrics.p10Hz,
    maxHz: glide?.highHz ?? speechMetrics.p90Hz,
    vowelA: frames['vowel-a'] ? vowelResonance(frames['vowel-a']) : null,
    vowelI: frames['vowel-i'] ? vowelResonance(frames['vowel-i']) : null,
    speechSpacing: readingFormants.length > 0 ? [...readingFormants].sort((a, b) => a - b)[readingFormants.length >> 1] : null,
  };
}
