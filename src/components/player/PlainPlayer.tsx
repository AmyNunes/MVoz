import { useState } from 'react';
import { View } from 'react-native';

import { IconBadge, Text } from '@/components/ui';
import { CATEGORY_ICONS } from '@/exercises/catalog';
import { manualDetector } from '@/exercises/criteria';
import type { Exercise } from '@/exercises/model';
import type { RoutineItem } from '@/exercises/results';
import { usePlayerClock, usePlayerFlow, type FeedbackMode } from '@/features/player/usePlayerFlow';
import { useStepCounter } from '@/features/player/useStepCounter';
import { strings } from '@/i18n/strings';
import { haptics } from '@/lib/haptics';
import { makeStyles } from '@/theme';

import type { PlayerCallbacks } from './MeasuredPlayer';
import { PlayerScaffold } from './PlayerScaffold';
import { ExerciseReadingCard } from './ExerciseReadingCard';

type Props = PlayerCallbacks & { exercise: Exercise; item?: RoutineItem; initialFeedback?: FeedbackMode };

/** Player sem microfone: exercícios sem medição (passos + timer) e missões (seção 8.3). */
export function PlainPlayer({ exercise, item, initialFeedback, ...callbacks }: Props) {
  const styles = useStyles();
  const flow = usePlayerFlow(exercise, item, initialFeedback);
  const [paused, setPaused] = useState(false);
  const [reps, setReps] = useState(0);
  const elapsed = usePlayerClock(flow.phase === 'running' && !paused);
  // Sem microfone: a contagem por passo é só pelo "Fiz".
  const steps = useStepCounter(exercise, flow.step, null, manualDetector);

  const view =
    exercise.measure === 'mission' ? (
      <View style={styles.flex}>
        <ExerciseReadingCard exercise={exercise} />
        <Text color="textMuted" align="center">
          {strings.player.measure.missionsHint}
        </Text>
      </View>
    ) : (
      // O "como fazer" fica no cartão de baixo; aqui, para que serve o exercício.
      <View style={styles.about}>
        <IconBadge icon={CATEGORY_ICONS[exercise.category]} size="lg" />
        <Text color="textMuted" align="center">
          {exercise.about}
        </Text>
      </View>
    );

  return (
    <PlayerScaffold
      {...callbacks}
      exercise={exercise}
      flow={flow}
      elapsed={elapsed}
      reps={reps}
      paused={paused}
      onTogglePause={() => setPaused((v) => !v)}
      onManualRep={() => {
        setReps((n) => n + 1);
        haptics.light();
      }}
      steps={steps}
      measure={view}
      getDetails={() => ({})}
    />
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flexGrow: 1, gap: t.spacing.md },
  about: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md, padding: t.spacing.lg },
}));
