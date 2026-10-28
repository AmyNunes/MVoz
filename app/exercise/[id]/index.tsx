import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { HealthSheet } from '@/components/exercises/HealthSheet';
import { BlockedNotice, usePlanBlocked } from '@/components/guide/BlockedNotice';
import { AddToRoutineSheet } from '@/components/routines/AddToRoutineSheet';
import { BulletList, StepList } from '@/components/exercises/StepList';
import { Button, Card, EmptyState, ListGroup, ListRow, Notice, Screen, Text } from '@/components/ui';
import { CATEGORY_ICONS, getExercise } from '@/exercises/catalog';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

const x = strings.exercises;
const d = x.detail;

/** Detalhe do exercício (seção 10.3). */
export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  const [health, setHealth] = useState(false);
  const [addSheet, setAddSheet] = useState(false);
  const blocked = usePlanBlocked();

  if (!exercise) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="alert-circle" message={d.notFound} />
      </Screen>
    );
  }

  const variations = [
    ...(exercise.easier ? [{ label: d.easier, target: getExercise(exercise.easier) }] : []),
    ...(exercise.harder ? [{ label: d.harder, target: getExercise(exercise.harder) }] : []),
    ...exercise.prerequisites.map((p) => ({ label: d.prerequisites, target: getExercise(p) })),
  ];

  return (
    <Screen
      edges={[]}
      footer={
        blocked ? (
          <BlockedNotice />
        ) : (
          <Button label={strings.player.start} icon="play" size="main" onPress={() => router.push(`/exercise/${exercise.id}/play`)} />
        )
      }
    >
      <Stack.Screen options={{ title: exercise.name }} />
      <Text color="textMuted">
        {x.categories[exercise.category]} · {x.levels[exercise.level]} · {formatMinutes(exercise.durationSec)}
      </Text>
      <Text>{exercise.about}</Text>

      <Card title={d.steps}>
        <StepList steps={exercise.steps} />
      </Card>
      <Card title={d.measures}>
        <Text>{exercise.measures}</Text>
      </Card>
      <Card title={d.mistakes}>
        <BulletList items={exercise.mistakes} />
      </Card>
      {(exercise.cautions.length > 0 || exercise.maxSec) && (
        <Notice tone="warning">
          <Text variant="label">{d.cautions}</Text>
          <BulletList items={exercise.cautions} />
          {exercise.maxSec && <Text>{d.maxSec(Math.round(exercise.maxSec / 60))}</Text>}
        </Notice>
      )}

      {variations.length > 0 && (
        <ListGroup title={d.variations}>
          {variations.map(
            ({ label, target }) =>
              target && (
                <ListRow
                  key={`${label}-${target.id}`}
                  icon={CATEGORY_ICONS[target.category]}
                  title={target.name}
                  subtitle={label}
                  onPress={() => router.push(`/exercise/${target.id}`)}
                />
              ),
          )}
        </ListGroup>
      )}

      <ListGroup>
        <ListRow icon="cpu" title={strings.simulate.button} onPress={() => router.push(`/exercise/${exercise.id}/simulate`)} />
        <ListRow icon="layers" title={strings.routines.addToRoutine} onPress={() => setAddSheet(true)} />
        <ListRow icon="alert-octagon" iconColor="danger" title={strings.health.stopTitle} onPress={() => setHealth(true)} />
      </ListGroup>
      <Text variant="caption" color="textMuted">
        {d.source}: {exercise.source}
      </Text>
      <HealthSheet visible={health} onClose={() => setHealth(false)} />
      <AddToRoutineSheet visible={addSheet} exerciseId={exercise.id} onClose={() => setAddSheet(false)} />
    </Screen>
  );
}
