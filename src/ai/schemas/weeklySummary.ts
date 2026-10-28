import { z } from 'zod';

/** Saída de `weeklySummary` (seção 12.5): só explica; quem decide a etapa são as regras do app. */
export const weeklySummarySchema = z.object({
  summaryPt: z.string().min(1),
  focusNextWeekPt: z.string().default(''),
});
export type WeeklySummary = z.infer<typeof weeklySummarySchema>;
