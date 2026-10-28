import { getExercise } from './catalog';
import type { RoutineItem } from './results';

/** Iniciante: 10–15 min por dia (seção 14.1). Sem o Guia, usamos o limite de quem começa. */
const RECOMMENDED_MAX_SEC = 15 * 60;

export type RoutineWarning =
  | { kind: 'warmupFirst' }
  | { kind: 'cooldownLast' }
  | { kind: 'tooLong'; minutes: number }
  | { kind: 'prerequisite'; exerciseId: string; prerequisiteId: string };

/** Duração de um item: a escolhida na rotina ou a sugerida pelo exercício. */
export function itemDurationSec(item: RoutineItem): number {
  return item.durationSec ?? getExercise(item.exerciseId)?.durationSec ?? 0;
}

export function routineDurationSec(items: readonly RoutineItem[]): number {
  return items.reduce((sum, item) => sum + itemDurationSec(item), 0);
}

/** Avisos da rotina (seção 8.6). Não bloqueiam: só lembram o que costuma ser melhor. */
export function routineWarnings(items: readonly RoutineItem[]): RoutineWarning[] {
  if (items.length === 0) return [];
  const exercises = items.map((i) => getExercise(i.exerciseId));
  const warnings: RoutineWarning[] = [];

  if (exercises[0]?.category !== 'warmup') warnings.push({ kind: 'warmupFirst' });
  if (exercises[exercises.length - 1]?.category !== 'cooldown') warnings.push({ kind: 'cooldownLast' });

  const total = routineDurationSec(items);
  if (total > RECOMMENDED_MAX_SEC) warnings.push({ kind: 'tooLong', minutes: Math.round(total / 60) });

  exercises.forEach((exercise, index) => {
    if (!exercise) return;
    const before = new Set(items.slice(0, index).map((i) => i.exerciseId));
    // Um aviso por exercício basta: o primeiro pré-requisito que falta.
    const missing = exercise.prerequisites.find((p) => !before.has(p));
    if (missing) warnings.push({ kind: 'prerequisite', exerciseId: exercise.id, prerequisiteId: missing });
  });
  return warnings;
}

/** Move um item `delta` posições (−1 = para cima), sem sair da lista. */
export function moveItem<T>(list: readonly T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
