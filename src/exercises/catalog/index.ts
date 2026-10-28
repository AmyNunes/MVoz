import type { Category, Exercise } from '../model';

import { breathingExercises } from './breathing';
import { expressionExercises } from './expression';
import { pitchExercises } from './pitch';
import { resonanceExercises } from './resonance';
import { speechExercises } from './speech';
import { warmupExercises } from './warmup';

/** Os 45 exercícios do catálogo (seção 8.4), na ordem das categorias. */
export const CATALOG: readonly Exercise[] = [
  ...warmupExercises.filter((e) => e.category === 'warmup'),
  ...breathingExercises,
  ...pitchExercises,
  ...resonanceExercises,
  ...expressionExercises,
  ...speechExercises,
  ...warmupExercises.filter((e) => e.category === 'cooldown'),
];

const byId = new Map(CATALOG.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return byId.get(id);
}

/** Ícone Feather de cada categoria (seção 8.2: ícone + rótulo, sem cor própria). */
export const CATEGORY_ICONS = {
  warmup: 'sunrise',
  breathing: 'wind',
  pitch: 'trending-up',
  resonance: 'radio',
  weight: 'feather',
  intonation: 'activity',
  articulation: 'type',
  speech: 'message-circle',
  cooldown: 'moon',
} as const satisfies Record<Category, string>;
