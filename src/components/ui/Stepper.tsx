import { View } from 'react-native';

import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Como mostrar o número (ex.: 0.9 → "90%"). */
  format?: (value: number) => string;
  accessibilityLabel: string;
};

const round = (n: number) => Math.round(n * 1000) / 1000;

/** [ − ] valor [ + ] */
export function Stepper({ value, onChange, min, max, step = 1, format = String, accessibilityLabel }: Props) {
  const styles = useStyles();
  const dec = () => onChange(Math.max(min, round(value - step)));
  const inc = () => onChange(Math.min(max, round(value + step)));

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => (e.nativeEvent.actionName === 'increment' ? inc() : dec())}
    >
      <IconButton icon="minus" accessibilityLabel={strings.common.decrease} onPress={dec} disabled={value <= min} />
      <Text variant="heading" style={styles.value}>
        {format(value)}
      </Text>
      <IconButton icon="plus" accessibilityLabel={strings.common.increase} onPress={inc} disabled={value >= max} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  value: { minWidth: t.sizes.touchTarget + t.spacing.lg, textAlign: 'center' },
}));
