import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { ExercisePickerSheet } from '@/components/routines/ExercisePickerSheet';
import { Button, Chip, EmptyState, ErrorState, IconButton, ListGroup, ListRow, Screen, Skeleton, Text } from '@/components/ui';
import { CATEGORY_ICONS, getExercise } from '@/exercises/catalog';
import { usePlanEditor } from '@/features/plan/usePlanEditor';
import { DAILY_MINUTES } from '@/guide/profile';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const e = strings.plan.editor;

/** Editar plano (seção 9.5). */
export default function PlanEditScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const editor = usePlanEditor();
  const [picking, setPicking] = useState(false);
  const header = <Stack.Screen options={{ title: e.title }} />;

  if (editor.state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (editor.state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={editor.reload} /></Screen>;
  if (!editor.plan || !editor.stage) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="compass" message={strings.plan.empty} action={{ label: strings.plan.answerGuide, onPress: () => router.replace('/guide') }} />
      </Screen>
    );
  }
  const stageName = strings.guide.stages[editor.stage.id].name;
  const measureId = editor.stage.measureExerciseId;

  return (
    <Screen edges={[]} footer={<Button label={e.save} icon="check" size="main" disabled={!editor.dirty} loading={editor.saving} onPress={editor.save} />}>
      {header}
      <Text variant="label">{e.exercises(stageName)}</Text>
      <ListGroup>
        {editor.exercises.map((id) => {
          const exercise = getExercise(id);
          if (!exercise) return null;
          return (
            <ListRow
              key={id}
              icon={CATEGORY_ICONS[exercise.category]}
              title={exercise.name}
              subtitle={id === measureId ? e.measureFixed : undefined}
              right={
                id === measureId ? undefined : (
                  <IconButton icon="x" accessibilityLabel={e.remove(exercise.name)} onPress={() => editor.remove(id)} />
                )
              }
            />
          );
        })}
      </ListGroup>
      <Button label={e.add} icon="plus" variant="secondary" onPress={() => setPicking(true)} />

      <View style={styles.section}>
        <Text variant="label">{e.minutes}</Text>
        <View style={styles.chips}>
          {DAILY_MINUTES.map((m) => (
            <Chip key={m} label={strings.guide.questions.minutes.value(m)} selected={editor.minutes === m} onPress={() => editor.setMinutes(m)} />
          ))}
        </View>
        <Text variant="caption" color="textMuted">
          {e.minutesHint}
        </Text>
      </View>

      {editor.plan.stageIndex > 0 && <Button label={e.back} icon="corner-up-left" variant="ghost" onPress={editor.goBack} />}

      <ExercisePickerSheet visible={picking} onClose={() => setPicking(false)} onPick={editor.add} title={e.add} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.sm, paddingTop: t.spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
