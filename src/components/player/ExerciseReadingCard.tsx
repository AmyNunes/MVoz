import type { Exercise } from '@/exercises/model';
import { aiTextKind, useAiTexts } from '@/features/ai/useAiTexts';

import { ReadingCard } from './ReadingCard';

/** Texto do exercício; nos de fala, com "Texto novo com IA" ou "Perguntas novas com IA" (seção 8.4). */
export function ExerciseReadingCard({ exercise }: { exercise: Exercise }) {
  const kind = aiTextKind(exercise);
  const ai = useAiTexts(kind);
  return <ReadingCard ids={exercise.readingTexts ?? []} extra={ai.texts} ai={kind ? ai : null} />;
}
