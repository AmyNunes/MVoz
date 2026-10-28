import { View } from 'react-native';

import { ResonanceGauge } from '@/components/meter/ResonanceGauge';
import { Notice, ProgressBar, Text } from '@/components/ui';
import type { DetectorState } from '@/exercises/criteria';
import type { Exercise } from '@/exercises/model';
import type { ResonanceReading } from '@/features/meter/resonance';
import { resolveDirection } from '@/features/player/target';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { FeedbackPlaceholder } from './PitchMeasure';
import { ExerciseReadingCard } from './ExerciseReadingCard';

const m = strings.player.measure;

type Props = {
  exercise: Exercise;
  reading: ResonanceReading | null;
  state: DetectorState | null;
  hidden: boolean;
  summaryOnly: boolean;
  paused: boolean;
};

/** Ressonância comparada com o começo do próprio exercício (seção 8.3). */
export function ResonanceMeasure({ exercise, reading, state, hidden, summaryOnly, paused }: Props) {
  const styles = useStyles();
  const reference = state?.reference ?? null;

  return (
    <View style={styles.container}>
      {exercise.readingTexts && <ExerciseReadingCard exercise={exercise} />}
      <Text variant="label" align="center">
        {m.resonanceGoal[resolveDirection(exercise)]}
      </Text>
      {reference === null && <Notice>{m.resonanceCalibrating}</Notice>}
      {hidden ? (
        <FeedbackPlaceholder summaryOnly={summaryOnly} />
      ) : (
        <View style={styles.gauge}>
          <ResonanceGauge
            compact
            reading={reading}
            paused={paused}
            reference={reference === null ? null : { spacing: reference, label: m.resonanceStart }}
          />
          {state && reference !== null && <ProgressBar progress={state.progress} color="success" />}
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flexGrow: 1, gap: t.spacing.md },
  gauge: { flexGrow: 1, justifyContent: 'center', gap: t.spacing.md },
}));
