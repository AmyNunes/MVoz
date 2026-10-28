import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { DetectorState } from '@/exercises/criteria';
import type { Exercise } from '@/exercises/model';
import { durationLabel, oneDecimal, szRatio } from '@/features/player/summary';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { FeedbackPlaceholder } from './PitchMeasure';

const m = strings.player.measure;

type Props = {
  exercise: Exercise;
  state: DetectorState | null;
  hidden: boolean;
  summaryOnly: boolean;
};

/** Cronômetro de som contínuo (/s/, /z/, "a", expiração), com as tentativas (seção 8.3). */
export function DurationMeasure({ exercise, state, hidden, summaryOnly }: Props) {
  const styles = useStyles();
  const values = state?.values ?? [];
  const label = durationLabel(exercise, values.length);
  const shown = state && state.currentSec > 0 ? state.currentSec : (values[values.length - 1] ?? 0);
  const ratio = exercise.id === 'sz-mpt' ? szRatio(values) : null;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="title" align="center" accessibilityLiveRegion="polite">
          {label}
        </Text>
      )}
      {hidden ? (
        <FeedbackPlaceholder summaryOnly={summaryOnly} />
      ) : (
        <Text variant="meter" align="center" style={styles.number}>
          {m.durationNow(oneDecimal(shown))}
        </Text>
      )}
      {values.length > 0 && (
        <Text align="center" color="textMuted">
          {m.durationAttempts(values.map((v) => oneDecimal(v)).join(' · '))}
        </Text>
      )}
      {ratio !== null && (
        <Text variant="label" align="center">
          {m.szRatio(ratio.toFixed(2).replace('.', ','))}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flexGrow: 1, justifyContent: 'center', gap: t.spacing.md },
  number: { fontVariant: ['tabular-nums'] },
}));
