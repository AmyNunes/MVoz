import { View } from 'react-native';

import { Card, Stepper, Text, TimeField, WeekdayPicker } from '@/components/ui';
import { strings } from '@/i18n/strings';
import type { NotificationSettings, NotificationType } from '@/notifications/types';
import { makeStyles } from '@/theme';

const d = strings.notifications.detail;

type Props = {
  type: NotificationType;
  settings: NotificationSettings;
  checkinWeekday: number;
  /** Atualiza o bloco do tipo. */
  onChange: (patch: Record<string, unknown>) => void;
};

/** Configurações específicas de cada tipo (tabela da seção 11). */
export function TypeSettingsFields({ type, settings: s, checkinWeekday, onChange }: Props) {
  const styles = useStyles();

  if (type === 'training') {
    return (
      <Card>
        <TimeField label={d.time} value={s.training.time} onChange={(time) => onChange({ time })} />
        <Text variant="label" color="textMuted">
          {d.days}
        </Text>
        <WeekdayPicker value={s.training.days} onChange={(days) => onChange({ days })} />
      </Card>
    );
  }

  if (type === 'checkin') {
    return (
      <Card>
        <TimeField label={d.time} value={s.checkin.time} onChange={(time) => onChange({ time })} />
        <Text variant="caption" color="textMuted">
          {d.checkinDay(strings.notifications.weekdaysLong[checkinWeekday])}
        </Text>
      </Card>
    );
  }

  if (type === 'useVoice' || type === 'voiceBreak') {
    const cfg = s[type];
    return (
      <Card>
        <Text variant="label" color="textMuted">
          {d.window}
        </Text>
        <View style={styles.inline}>
          <TimeField label={d.windowStart} value={cfg.windowStart} onChange={(windowStart) => onChange({ windowStart })} />
          <TimeField label={d.windowEnd} value={cfg.windowEnd} onChange={(windowEnd) => onChange({ windowEnd })} />
        </View>
        {type === 'useVoice' && (
          <View style={styles.inline}>
            <Text style={styles.flex}>{d.perDay}</Text>
            <Stepper accessibilityLabel={d.perDay} value={s.useVoice.perDay} min={1} max={3} onChange={(perDay) => onChange({ perDay })} />
          </View>
        )}
        <Text variant="label" color="textMuted">
          {d.days}
        </Text>
        <WeekdayPicker value={cfg.days} onChange={(days) => onChange({ days })} />
      </Card>
    );
  }

  return (
    <Card>
      <View style={styles.inline}>
        <Text style={styles.flex}>{d.afterDays}</Text>
        <Stepper accessibilityLabel={d.afterDays} value={s.comeback.afterDays} min={1} max={14} onChange={(afterDays) => onChange({ afterDays })} />
      </View>
      <TimeField label={d.time} value={s.comeback.time} onChange={(time) => onChange({ time })} />
      <Text variant="caption" color="textMuted">
        {d.comebackHint}
      </Text>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
}));
