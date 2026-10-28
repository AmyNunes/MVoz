import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';

import { BlockedNotice, usePlanBlocked } from '@/components/guide/BlockedNotice';
import { GestureGuide } from '@/components/navigation/GestureGuide';
import { ExercisePlayer } from '@/components/player/ExercisePlayer';
import { SessionTopBar } from '@/components/session/SessionTopBar';
import { Button, EmptyState, ErrorState, IconBadge, Screen, Skeleton, Text } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import { loadSessionSpec, type SessionParams } from '@/features/session/spec';
import { useSessionRunner, type SessionSpec } from '@/features/session/useSessionRunner';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles, useTheme } from '@/theme';

const s = strings.session;
/** Arraste horizontal mínimo para trocar de exercício. */
const SWIPE_PX = 80;

/** Treino do dia ou de uma rotina (seção 10.4), em tela cheia. */
export default function SessionScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<SessionParams>();
  const key = JSON.stringify(params);
  const { state, reload } = useLoader(() => loadSessionSpec(params), key);
  const back = { label: s.back, onPress: () => router.back() };
  if (usePlanBlocked()) {
    return (
      <Screen scroll={false} edges={['top', 'bottom']}>
        <BlockedNotice full />
      </Screen>
    );
  }

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      {state.status === 'loading' && <Skeleton height={theme.sizes.traceHeight} />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && !state.data && <EmptyState icon="list" message={s.notFound} action={back} />}
      {state.status === 'success' && state.data && state.data.items.length === 0 && <EmptyState icon="list" message={s.empty} action={back} />}
      {state.status === 'success' && state.data && state.data.items.length > 0 && <SessionRun key={key} spec={state.data} />}
    </Screen>
  );
}

function SessionRun({ spec }: { spec: SessionSpec }) {
  const styles = useStyles();
  const runner = useSessionRunner(spec);
  const safely = (task: () => Promise<unknown>) => () => {
    task().catch(() => showSnackbar(s.saveError));
  };

  // Deslizar ← próximo, → anterior. Só arrastes horizontais: a rolagem vertical continua.
  const swipe = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-40, 40],
    failOffsetY: [-20, 20],
    onDeactivate: (e) => {
      if (e.translationX < -SWIPE_PX) safely(runner.next)();
      else if (e.translationX > SWIPE_PX) runner.previous();
    },
  });

  if (runner.summary) {
    return (
      <View style={styles.done}>
        <IconBadge icon="check" color="success" size="lg" />
        <Text variant="title" accessibilityRole="header">
          {s.doneTitle}
        </Text>
        <Text color="textMuted" align="center">
          {s.doneBody}
        </Text>
        <Text>{s.summary(runner.summary.minutes, runner.summary.done, runner.summary.skipped)}</Text>
        <Button label={s.back} size="main" onPress={() => router.back()} />
      </View>
    );
  }

  const exercise = getExercise(runner.item.exerciseId);
  if (!exercise) return null;

  return (
    <GestureDetector gesture={swipe}>
      <View style={styles.flex} accessibilityHint={s.swipeLabel}>
        <ExercisePlayer
          key={runner.index}
          exercise={exercise}
          item={runner.item}
          initialFeedback={runner.item.feedback}
          topSlot={<SessionTopBar index={runner.index} total={runner.total} onPrevious={runner.previous} onNext={safely(runner.next)} />}
          onComplete={runner.complete}
          onPain={(result) => safely(() => runner.pain(result))()}
          onExit={() => {
            safely(runner.exit)();
            router.back();
          }}
        />
        <GestureGuide name="session" />
      </View>
    </GestureDetector>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.lg, padding: t.spacing.xxl },
}));
