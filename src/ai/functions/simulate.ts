import type { Exercise } from '@/exercises/model';

import { withCache } from '../cache';
import { callAI } from '../client';
import type { UserContext } from '../context';
import { simulatePrompt } from '../prompts/simulate';
import { simulationSchema, type Simulation } from '../schemas/simulate';
import { validateContour } from '../validate';

/**
 * "Explicar com IA" (seção 10.5). Cache: mesmo exercício + mesmo nível + mesma faixa + mesma
 * dúvida = sem nova chamada. A curva só volta se passar na validação.
 */
export async function simulateExercise(input: {
  exercise: Exercise;
  band: { lowHz: number; highHz: number } | null;
  /** Extensão medida na gravação inicial (grave e agudo do deslize). */
  extension?: { lowHz: number; highHz: number } | null;
  doubt?: string;
  ctx?: UserContext | null;
}): Promise<{ data: Simulation; cached: boolean }> {
  const doubt = input.doubt?.trim() ?? '';
  const key = {
    exerciseId: input.exercise.id,
    level: input.exercise.level,
    band: input.band ? [Math.round(input.band.lowHz), Math.round(input.band.highHz)] : null,
    doubt,
    goal: input.ctx?.profile?.goal ?? null,
    stage: input.ctx?.stage?.number ?? null,
  };
  const result = await withCache('simulateExercise', key, simulationSchema, async () => {
    const { data } = await callAI('simulateExercise', simulatePrompt({ exercise: input.exercise, band: input.band, doubt, ctx: input.ctx }), simulationSchema, {
      temperature: 0.4,
    });
    return data;
  });
  const points = validateContour(result.data.contour?.points, input.band, input.extension ?? null);
  return { ...result, data: { ...result.data, contour: points ? { points } : null } };
}
