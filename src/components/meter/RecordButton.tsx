import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { formatClock } from '@/lib/format';
import { makeStyles } from '@/theme';

const r = strings.meter.record;

type Props = {
  recording: boolean;
  elapsedSec: number;
  maxSec: number;
  onPress: () => void;
  disabled?: boolean;
};

const SIZE = 64;
const DOT = 26;
const SQUARE = 22;

/** Círculo vermelho com o tempo gravado; toque inicia e para (seção 4.5). */
export function RecordButton({ recording, elapsedSec, maxSec, onPress, disabled = false }: Props) {
  const styles = useStyles();
  const time = r.elapsed(formatClock(elapsedSec), formatClock(maxSec));

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={recording ? `${r.stop}, ${time}` : r.start}
        accessibilityState={{ disabled }}
        style={({ pressed }) => [styles.circle, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <View style={recording ? styles.square : styles.dot} />
      </Pressable>
      <Text variant="label" color={recording ? 'text' : 'textMuted'} style={styles.label} importantForAccessibility="no">
        {recording ? time : r.start}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: t.radii.full,
    borderWidth: 3,
    borderColor: t.colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: DOT, height: DOT, borderRadius: t.radii.full, backgroundColor: t.colors.danger },
  square: { width: SQUARE, height: SQUARE, borderRadius: t.spacing.xs, backgroundColor: t.colors.danger },
  label: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: t.opacity.pressed },
  disabled: { opacity: t.opacity.disabled },
}));
