import { Pressable, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { weekdayInitial } from '@/lib/dates';
import { makeStyles } from '@/theme';

import { Text } from './Text';

type Props = {
  value: number[];
  onChange: (days: number[]) => void;
};

/** Segunda a domingo (D S T Q Q S S), cada um liga/desliga. */
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WeekdayPicker({ value, onChange }: Props) {
  const styles = useStyles();
  const names = strings.notifications.weekdaysLong;

  return (
    <View style={styles.row}>
      {ORDER.map((d) => {
        const on = value.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={names[d]}
            style={[styles.day, on && styles.on]}
          >
            <Text variant="label" color={on ? 'onPrimary' : 'text'}>
              {weekdayInitial(d)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing.xs },
  day: {
    width: t.sizes.touchTarget - t.spacing.xs,
    height: t.sizes.touchTarget - t.spacing.xs,
    borderRadius: t.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surfaceAlt,
  },
  on: { backgroundColor: t.colors.primary },
}));
