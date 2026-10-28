import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import type { WeekDay } from '@/features/today/today';
import { strings } from '@/i18n/strings';
import { makeStyles, type ColorTokens } from '@/theme';

const w = strings.today.week;

const MARKS: Record<WeekDay['state'], { icon: 'check-circle' | 'circle' | 'minus'; color: keyof ColorTokens }> = {
  done: { icon: 'check-circle', color: 'success' },
  missed: { icon: 'circle', color: 'textMuted' },
  today: { icon: 'circle', color: 'primary' },
  future: { icon: 'minus', color: 'border' },
};

/** "Sua semana" (seção 10.1): dias treinados e minutos. Sem streak punitivo. */
export function WeekCard({ days, minutes }: { days: readonly WeekDay[]; minutes: number }) {
  const styles = useStyles();

  return (
    <Card title={w.title} titleRight={<Text variant="label">{w.minutes(minutes)}</Text>}>
      <View style={styles.row}>
        {days.map((day, i) => {
          const mark = MARKS[day.state];
          return (
            <View key={day.key} style={styles.day} accessible accessibilityLabel={`${w.days[i]}: ${w.states[day.state]}`}>
              <Text variant="caption" color="textMuted">
                {w.initials[i]}
              </Text>
              <Icon name={mark.icon} color={mark.color} size={styles.icon.width} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { alignItems: 'center', gap: t.spacing.xs, minWidth: t.sizes.badge.sm },
  icon: { width: t.sizes.iconSmall },
}));
