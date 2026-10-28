import { z } from 'zod';

import { segmentMetricsSchema } from '@/audio/metrics';
import { localDateKey, startOfWeek } from '@/lib/dates';

/** Check-in semanal (seção 9.4). */

export const SYMPTOMS = ['hoarseness', 'pain', 'tightness', 'throat-clearing'] as const;
export type Symptom = (typeof SYMPTOMS)[number];

const score = z.number().int().min(0).max(10);

/** Perguntas de 0 a 10 e sintomas da semana. */
export const checkinAnswersSchema = z.object({
  effort: score,
  fit: score,
  comfort: score,
  symptoms: z.array(z.enum(SYMPTOMS)),
});
export type CheckinAnswers = z.infer<typeof checkinAnswersSchema>;

const vowelSchema = z.object({ f1: z.number(), f2: z.number(), spacing: z.number().nullable() });

/** Métricas das gravações do check-in: leitura padrão, fala livre e /i/ sustentado. */
export const checkinMetricsSchema = z.object({
  reading: segmentMetricsSchema.nullable().default(null),
  free: segmentMetricsSchema.nullable().default(null),
  vowelI: vowelSchema.nullable().default(null),
  /** Regravação mensal: extensão do deslize. */
  extension: z.object({ lowHz: z.number(), highHz: z.number() }).nullable().default(null),
});
export type CheckinMetrics = z.infer<typeof checkinMetricsSchema>;

export const DECISIONS = ['advance', 'stay', 'lighter'] as const;
export type Decision = (typeof DECISIONS)[number];

export type CheckinRecord = {
  id: string;
  weekStart: string;
  createdAt: string;
  answers: CheckinAnswers;
  metrics: CheckinMetrics;
  decision: Decision | null;
  summaryPt: string;
  recordingIds: string[];
};

/** Semana do check-in: a segunda-feira (chave "AAAA-MM-DD"). */
export function weekStartKey(date: Date): string {
  return localDateKey(startOfWeek(date));
}

const DAY_MS = 24 * 3600 * 1000;
/** Uma vez por mês o check-in vira regravação completa (seção 9.4). */
const FULL_EVERY_DAYS = 28;

/** O check-in desta semana ainda não foi feito. */
export function checkinDue(last: Pick<CheckinRecord, 'weekStart'> | null, now: Date): boolean {
  return !last || last.weekStart !== weekStartKey(now);
}

/** Hora da regravação completa: 4 semanas desde a última gravação completa. */
export function fullRecordingDue(lastFullAt: string | null, now: Date): boolean {
  return !lastFullAt || now.getTime() - new Date(lastFullAt).getTime() >= FULL_EVERY_DAYS * DAY_MS;
}
