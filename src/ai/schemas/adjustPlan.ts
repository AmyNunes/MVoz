import { z } from 'zod';

export const PLAN_ACTIONS = ['add', 'remove', 'replace'] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];

export const planChangeSchema = z.object({
  action: z.enum(PLAN_ACTIONS),
  exerciseId: z.string(),
  /** Só em `replace`. */
  replaceWithId: z.string().nullable().optional(),
  stageIndex: z.number().int(),
  reasonPt: z.string().default(''),
});
export type PlanChangeSuggestion = z.infer<typeof planChangeSchema>;

/** Saída de `adjustPlan` (seção 12.5): mudanças que eu aceito ou não. */
export const planAdjustmentSchema = z.object({
  explanationPt: z.string().min(1),
  changes: z.array(planChangeSchema).max(8).default([]),
});
export type PlanAdjustment = z.infer<typeof planAdjustmentSchema>;
