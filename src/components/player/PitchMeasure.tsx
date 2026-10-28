import { View } from 'react-native';

import { PitchReadout } from '@/components/meter/PitchReadout';
import { PitchTrace } from '@/components/meter/PitchTrace';
import { ProgressBar, Text } from '@/components/ui';
import type { VoiceFrame } from '@/audio/analyzer';
import type { DetectorState } from '@/exercises/criteria';
import type { Exercise } from '@/exercises/model';
import type { Readout } from '@/features/meter/readout';
import { oneDecimal } from '@/features/player/summary';
import type { ExerciseTarget } from '@/features/player/target';
import { formatUserNote } from '@/features/settings/notation';
import { strings } from '@/i18n/strings';
import { centsBetween } from '@/lib/notes';
import { makeStyles } from '@/theme';

import { ExerciseReadingCard } from './ExerciseReadingCard';

const m = strings.player.measure;

type Props = {
  exercise: Exercise;
  readout: Readout;
  trace: readonly VoiceFrame[];
  target: ExerciseTarget;
  state: DetectorState | null;
  /** Sem gráfico nesta tentativa (retorno parcial ou só resumo). */
  hidden: boolean;
  summaryOnly: boolean;
  playingTone: boolean;
};

/** Linha de apoio de cada medição de tom (seção 8.3). */
function infoLine({ exercise, readout, target, state }: Props): string | null {
  const s = exercise.success;
  switch (exercise.measure) {
    case 'sustain':
      return m.sustainHint(s.holdSec ?? 3);
    case 'match': {
      if (target.noteHz === null) return null;
      const label = m.matchTarget(`${Math.round(target.noteHz)} Hz · ${formatUserNote(target.noteHz)}`);
      return readout.kind === 'voice' ? `${label} · ${m.cents(Math.round(centsBetween(target.noteHz, readout.hz)))}` : label;
    }
    case 'glide': {
      const last = state?.values[state.values.length - 1];
      return last !== undefined ? m.glideLast(oneDecimal(last)) : m.glideHint(s.minRangeSt ?? 5);
    }
    case 'speech':
      return target.band && state ? m.speechInTarget(Math.round(state.progress * 100)) : null;
    default:
      return null;
  }
}

/** Sustentar, imitar nota, deslize e fala: leitura do tom + gráfico (seção 8.3). */
export function PitchMeasure(props: Props) {
  const styles = useStyles();
  const { exercise, readout, trace, target, state, hidden, summaryOnly, playingTone } = props;
  const info = infoLine(props);
  const showsHold = exercise.measure === 'sustain' || exercise.measure === 'match';

  return (
    <View style={styles.container}>
      {exercise.readingTexts && <ExerciseReadingCard exercise={exercise} />}
      {hidden ? (
        <FeedbackPlaceholder summaryOnly={summaryOnly} />
      ) : (
        <>
          {exercise.measure !== 'speech' && <PitchReadout readout={readout} band={target.band} playingTone={playingTone} compact />}
          <View style={styles.trace}>
            <PitchTrace frames={trace} band={target.band} noteHz={target.noteHz} />
          </View>
          {showsHold && state && <ProgressBar progress={state.progress} color="success" accessibilityLabel={info ?? undefined} />}
        </>
      )}
      {info && (
        <Text variant="caption" align="center" color="textMuted">
          {info}
        </Text>
      )}
    </View>
  );
}

/** No lugar do gráfico quando o retorno visual está escondido. */
export function FeedbackPlaceholder({ summaryOnly }: { summaryOnly: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.placeholder}>
      <Text color="textMuted" align="center">
        {summaryOnly ? strings.player.summaryOnly : strings.player.hiddenFeedback}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flexGrow: 1, gap: t.spacing.sm },
  trace: { flexGrow: 1, minHeight: t.sizes.traceMinHeight },
  placeholder: {
    flexGrow: 1,
    minHeight: t.sizes.traceMinHeight,
    justifyContent: 'center',
    padding: t.spacing.xxl,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surfaceAlt,
  },
}));
