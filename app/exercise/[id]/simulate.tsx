import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { SimulationView } from '@/components/simulate/SimulationView';
import { Button, EmptyState, ErrorState, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';
import { useReferenceTone } from '@/features/meter/useReferenceTone';
import { useSimulation } from '@/features/simulate/useSimulation';
import { strings } from '@/i18n/strings';
import { useSimulationStore } from '@/stores/simulationStore';
import { useTheme } from '@/theme';

const s = strings.simulate;

/** "Explicar com IA" (seção 10.5). */
export default function SimulateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  if (!exercise) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="alert-circle" message={strings.exercises.detail.notFound} />
      </Screen>
    );
  }
  return <Simulation exercise={exercise} />;
}

function Simulation({ exercise }: { exercise: Exercise }) {
  const theme = useTheme();
  const { state, ask, retry, doubt } = useSimulation(exercise);
  const tone = useReferenceTone();
  const setContour = useSimulationStore((st) => st.setContour);
  const [draft, setDraft] = useState('');
  const points = state.status === 'success' ? (state.data.contour?.points ?? null) : null;

  const doNow = () => {
    tone.stop();
    if (points) setContour(exercise.id, points);
    router.push({ pathname: '/exercise/[id]/play', params: points ? { id: exercise.id, curve: '1' } : { id: exercise.id } });
  };

  return (
    <Screen edges={[]} footer={<Button label={s.doNow} icon="play" size="main" onPress={doNow} />}>
      <Stack.Screen options={{ title: exercise.name }} />
      <Text variant="caption" color="textMuted">
        {s.privacy}
      </Text>

      {state.status === 'loading' && (
        <>
          <Text color="textMuted" accessibilityLiveRegion="polite">
            {s.loading}
          </Text>
          <Skeleton height={theme.sizes.traceHeight} />
          <Skeleton height={theme.sizes.listRowHeight} />
        </>
      )}

      {state.status === 'error' && (
        <>
          {state.error.kind === 'notConfigured' ? (
            <EmptyState icon="cpu" message={state.error.messagePt} action={{ label: strings.ai.configure, onPress: () => router.push('/settings/ai') }} />
          ) : (
            <ErrorState message={state.error.messagePt} onRetry={retry} />
          )}
        </>
      )}

      {state.status === 'success' && (
        <>
          {doubt !== '' && <Text color="textMuted">“{doubt}”</Text>}
          <SimulationView
            data={state.data}
            playing={tone.playing}
            onListen={() => (tone.playing ? tone.stop() : points && void tone.playSpec({ kind: 'contour', points }))}
          />
          <TextField label={s.doubtLabel} placeholder={s.doubtPlaceholder} value={draft} onChangeText={setDraft} multiline />
          <Button
            label={s.ask}
            icon="send"
            variant="secondary"
            disabled={draft.trim() === ''}
            onPress={() => {
              ask(draft);
              setDraft('');
            }}
          />
        </>
      )}
    </Screen>
  );
}
