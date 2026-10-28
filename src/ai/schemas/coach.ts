import { z } from 'zod';

/** Saída de `coachTurn` (seção 12.5). `safetyFlag` → cartão de alerta da seção 14. */
export const coachReplySchema = z.object({
  replyPt: z.string().min(1),
  suggestedExerciseIds: z.array(z.string()).default([]),
  safetyFlag: z.boolean().catch(false),
});
export type CoachReply = z.infer<typeof coachReplySchema>;
