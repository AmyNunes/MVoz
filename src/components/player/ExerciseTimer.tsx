import { View } from 'react-native';
import { GestureDetector, useTapGesture } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';

import { Icon, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { formatClock } from '@/lib/format';
import { makeStyles, useTheme } from '@/theme';

const p = strings.player;

type Props = {
  elapsedSec: number;
  durationSec: number;
  /** 0–1: repetições do passo ou do exercício, ou o tempo. */
  progress: number;
  /** "2 de 5 deslizes" (vazio = só o tempo). */
  label: string;
  /** "Passo feito ✓" ou "Pronto!", embaixo do texto. */
  note?: string | null;
  paused: boolean;
  onTogglePause: () => void;
};

const SIZE = 64;
const STROKE = 6;

/**
 * Anel de progresso com o tempo e a contagem de repetições (seção 4.5).
 * Toque duplo: pausa/continua (alternativa visível: botão Pausar).
 */
export function ExerciseTimer({ elapsedSec, durationSec, progress, label, note = null, paused, onTogglePause }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const radius = (SIZE - STROKE) / 2;
  const length = 2 * Math.PI * radius;
  const doubleTap = useTapGesture({ numberOfTaps: 2, runOnJS: true, onActivate: onTogglePause });

  return (
    <View style={styles.row}>
      <GestureDetector gesture={doubleTap}>
        <View
          style={styles.ring}
          accessible
          accessibilityRole="timer"
          accessibilityLabel={p.timerLabel(formatClock(elapsedSec), formatClock(durationSec))}
        >
          <Svg width={SIZE} height={SIZE} style={styles.svg}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={radius} stroke={theme.colors.surfaceAlt} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={radius}
              stroke={theme.colors.primary}
              strokeWidth={STROKE}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${length} ${length}`}
              strokeDashoffset={length * (1 - progress)}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          {paused ? <Icon name="pause" /> : <Text variant="caption" style={styles.time}>{formatClock(elapsedSec)}</Text>}
        </View>
      </GestureDetector>
      <View style={styles.texts}>
        {label !== '' && (
          <Text variant="label" accessibilityLiveRegion="polite">
            {label}
          </Text>
        )}
        {note && (
          <Text variant="caption" color="success" accessibilityLiveRegion="polite">
            {note}
          </Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  ring: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  svg: { position: 'absolute' },
  time: { fontVariant: ['tabular-nums'] },
  texts: { flex: 1, gap: t.spacing.xs / 2 },
}));
