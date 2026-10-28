import { router } from 'expo-router';

import { ListGroup, ListRow, Text } from '@/components/ui';
import { CATEGORY_ICONS, getExercise } from '@/exercises/catalog';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

const x = strings.exercises;

/** Exercícios sugeridos pela IA como cartões tocáveis do catálogo (seções 10.8 e 10.9). */
export function ExerciseCards({ ids }: { ids: readonly string[] }) {
  const exercises = ids.flatMap((id) => {
    const exercise = getExercise(id);
    return exercise ? [exercise] : [];
  });
  if (exercises.length === 0) return null;

  return (
    <>
      <Text variant="label">{strings.ai.suggested}</Text>
      <ListGroup>
        {exercises.map((exercise) => (
          <ListRow
            key={exercise.id}
            icon={CATEGORY_ICONS[exercise.category]}
            title={exercise.name}
            subtitle={x.rowSubtitle(formatMinutes(exercise.durationSec), x.categories[exercise.category])}
            onPress={() => router.push(`/exercise/${exercise.id}`)}
          />
        ))}
      </ListGroup>
    </>
  );
}
