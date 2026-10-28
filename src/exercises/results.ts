import { z } from 'zod';

import { segmentMetricsSchema } from '@/audio/metrics';

/**
 * O que fica guardado de cada exercício feito (tabela `exercise_results`, seção 13).
 * Os campos em JSON são validados por zod na leitura.
 */

/** Detalhes medidos, conforme o tipo de medição. */
export const resultDetailsSchema = z.object({
  /** Métricas da seção 7.4 do trecho com voz. */
  segment: segmentMetricsSchema.nullable().optional(),
  /** Duração de som contínuo de cada tentativa (`duration`). */
  attempts: z.array(z.object({ label: z.string(), seconds: z.number() })).optional(),
  /** Extensão de cada deslize, em semitons (`glide`). */
  glideRanges: z.array(z.number()).optional(),
  /** Erro médio em relação à curva, por tentativa, em semitons (`contour`). */
  contourErrors: z.array(z.number()).optional(),
  /** Ressonância: referência do começo do exercício e a maior mudança, em % (`resonance`). */
  resonance: z.object({ reference: z.number(), bestChangePct: z.number() }).optional(),
});
export type ResultDetails = z.infer<typeof resultDetailsSchema>;

export const FEELINGS = ['easy', 'ok', 'hard'] as const;
export type Feeling = (typeof FEELINGS)[number];
/** Desconforto: 0 nenhum · 1 leve · 2 forte. */
export type Discomfort = 0 | 1 | 2;

const score = z.number().int().min(0).max(10);

/** "Como foi?", "Desconforto?", autoavaliação e notas da missão. */
export const resultRatingSchema = z.object({
  feeling: z.enum(FEELINGS).nullable().default(null),
  discomfort: z.union([z.literal(0), z.literal(1), z.literal(2)]).nullable().default(null),
  selfRating: z.number().int().min(1).max(5).nullable().default(null),
  mission: z.object({ comfort: score, effort: score, fit: score }).nullable().default(null),
});
export type ResultRating = z.infer<typeof resultRatingSchema>;

export const EMPTY_RATING: ResultRating = { feeling: null, discomfort: null, selfRating: null, mission: null };

/** Um item de rotina: exercício + duração ou repetições escolhidas (seção 8.6). */
export const routineItemSchema = z.object({
  exerciseId: z.string(),
  durationSec: z.number().int().positive().optional(),
  reps: z.number().int().positive().optional(),
});
export type RoutineItem = z.infer<typeof routineItemSchema>;
