import { router, useLocalSearchParams } from 'expo-router';

import { BlockedNotice, usePlanBlocked } from '@/components/guide/BlockedNotice';
import { ExercisePlayer } from '@/components/player/ExercisePlayer';
import { EmptyState, Screen } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import { saveSingleExercise } from '@/features/player/saveSingle';
import { strings } from '@/i18n/strings';
import { useSimulationStore } from '@/stores/simulationStore';
import { showSnackbar } from '@/stores/snackbarStore';

/** Fazer um exercício avulso (seção 8.5), em tela cheia. */
export default function PlayScreen() {
  const { id, curve } = useLocalSearchParams<{ id: string; curve?: string }>();
  const exercise = getExercise(id);
  // "Fazer agora" na simulação com IA: o player segue a curva sugerida.
  const simulated = useSimulationStore((s) => (curve ? s.contours[id] : undefined)) ?? null;
  const blocked = usePlanBlocked();

  if (!exercise || blocked) {
    return (
      <Screen edges={['top', 'bottom']}>
        {blocked ? <BlockedNotice full /> : <EmptyState icon="alert-circle" message={strings.exercises.detail.notFound} />}
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <ExercisePlayer
        key={exercise.id}
        exercise={exercise}
        simulatedContour={simulated}
        onExplain={() => router.push(`/exercise/${exercise.id}/simulate`)}
        onComplete={async (result) => {
          await saveSingleExercise(result);
          showSnackbar(strings.player.saved);
          router.back();
        }}
        onPain={(result) => {
          saveSingleExercise(result, true).catch(() => showSnackbar(strings.player.saveError));
        }}
        onExit={() => router.back()}
        onSwitchExercise={(next) => router.replace(`/exercise/${next}/play`)}
      />
    </Screen>
  );
}
