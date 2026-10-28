import { getExercise } from '@/exercises/catalog';

import { callAI } from '../client';
import type { UserContext } from '../context';
import { adjustPlanPrompt, type AdjustPlanInput } from '../prompts/adjustPlan';
import { planAdjustmentSchema, type PlanAdjustment, type PlanChangeSuggestion } from '../schemas/adjustPlan';

const MAX_CHANGES = 5;

/**
 * Descarta as mudanças que não fazem sentido no plano: ids fora do catálogo, etapa que não dá
 * para mudar, tirar ou trocar o que não está na etapa (ou o exercício fixo), acrescentar o que já está.
 */
export function validChanges(changes: readonly PlanChangeSuggestion[], stages: AdjustPlanInput['stages']): PlanChangeSuggestion[] {
  return changes
    .filter((c) => {
      const stage = stages.find((s) => s.index === c.stageIndex);
      if (!stage || !getExercise(c.exerciseId)) return false;
      const inStage = stage.exercises.includes(c.exerciseId);
      switch (c.action) {
        case 'add':
          return !inStage;
        case 'remove':
          return inStage && c.exerciseId !== stage.fixed;
        case 'replace':
          return inStage && c.exerciseId !== stage.fixed && !!c.replaceWithId && !!getExercise(c.replaceWithId) && !stage.exercises.includes(c.replaceWithId);
      }
    })
    .slice(0, MAX_CHANGES);
}

/** "Ajustar com IA" (seção 9.5): eu vejo a lista de mudanças e aceito ou não. Sem cache. */
export async function adjustPlan(input: AdjustPlanInput, ctx: UserContext): Promise<PlanAdjustment> {
  const { data } = await callAI('adjustPlan', adjustPlanPrompt(input, ctx), planAdjustmentSchema, { temperature: 0.3 });
  return { ...data, changes: validChanges(data.changes, input.stages) };
}
