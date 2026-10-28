import type { Exercise, StepTarget } from '@/exercises/model';

/** Uma tarefa da sequência: o passo com contagem e as instruções sem contagem em volta dele. */
export type Task = {
  /** Índice do passo (em `exercise.steps`). */
  step: number;
  target: StepTarget;
  text: string;
  /** Passos de preparação logo antes desta tarefa ("Antes: …"). */
  before: string[];
  /** Na última tarefa: os passos sem contagem que vêm depois ("Depois: …"). */
  after: string[];
};

/**
 * Exercícios com tarefas diferentes (`stepTargets`): só os passos com contagem viram tarefas;
 * os outros acompanham a tarefa seguinte (ou a última). Sem `stepTargets`, não há tarefas.
 */
export function exerciseTasks(exercise: Pick<Exercise, 'steps' | 'stepTargets'>): Task[] {
  const targets = [...(exercise.stepTargets ?? [])].sort((a, b) => a.step - b.step);
  return targets.map((target, i) => {
    const from = i === 0 ? 0 : targets[i - 1].step + 1;
    const last = i === targets.length - 1;
    return {
      step: target.step,
      target,
      text: exercise.steps[target.step],
      before: exercise.steps.slice(from, target.step),
      after: last ? exercise.steps.slice(target.step + 1) : [],
    };
  });
}

/** O passo da primeira tarefa (onde o exercício começa), ou 0. */
export function firstStep(exercise: Pick<Exercise, 'steps' | 'stepTargets'>): number {
  return exerciseTasks(exercise)[0]?.step ?? 0;
}

/** Passo da tarefa vizinha (`+1` a próxima, `-1` a anterior), ou `null` se não houver. */
export function neighborTaskStep(tasks: readonly Task[], step: number, direction: 1 | -1): number | null {
  const index = tasks.findIndex((t) => t.step === step);
  return tasks[index + direction]?.step ?? null;
}
