import type { PlanStage } from './stages';

/** Uma mudança nos exercícios de uma etapa (editar plano ou "Ajustar com IA", seção 9.5). */
export type StageEdit = {
  action: 'add' | 'remove' | 'replace';
  exerciseId: string;
  replaceWithId?: string | null;
  stageIndex: number;
};

/**
 * Aplica as mudanças aceitas. Nunca tira o exercício fixo de medição nem deixa uma etapa
 * vazia; mudança que não cabe é ignorada.
 */
export function applyStageEdits(stages: readonly PlanStage[], edits: readonly StageEdit[]): PlanStage[] {
  return stages.map((stage, index) => {
    let exercises = [...stage.exercises];
    for (const edit of edits.filter((e) => e.stageIndex === index)) {
      const fixed = edit.exerciseId === stage.measureExerciseId;
      if (edit.action === 'add' && !exercises.includes(edit.exerciseId)) exercises.push(edit.exerciseId);
      else if (edit.action === 'remove' && !fixed && exercises.length > 1) exercises = exercises.filter((id) => id !== edit.exerciseId);
      else if (edit.action === 'replace' && !fixed && edit.replaceWithId && !exercises.includes(edit.replaceWithId)) {
        const by = edit.replaceWithId;
        exercises = exercises.map((id) => (id === edit.exerciseId ? by : id));
      }
    }
    return { ...stage, exercises };
  });
}
