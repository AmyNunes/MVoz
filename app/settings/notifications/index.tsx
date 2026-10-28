import { Stack } from 'expo-router';
import { View } from 'react-native';

import { NotificationHistory } from '@/components/notifications/NotificationHistory';
import { NotificationTypeRow } from '@/components/notifications/NotificationTypeRow';
import { PermissionCard } from '@/components/notifications/PermissionCard';
import {
  Button,
  Card,
  Chip,
  ListGroup,
  ListRow,
  Notice,
  Screen,
  SortableList,
  Stepper,
  Text,
  TimeField,
  Toggle,
} from '@/components/ui';
import { pauseState, useNotificationCenter, type PauseOption } from '@/features/notifications/useNotificationCenter';
import { strings } from '@/i18n/strings';
import { formatWeekdayDayMonth } from '@/lib/dates';
import { useFontScale } from '@/lib/useFontScale';
import { makeStyles, useTheme } from '@/theme';

const c = strings.notifications.center;
const PAUSES: PauseOption[] = ['day', 'threeDays', 'week', 'forever'];

/** Central de Notificações (seção 11). */
export default function NotificationCenterScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const center = useNotificationCenter();
  const { settings } = center;
  const paused = pauseState(settings);
  const rowHeight = Math.round((theme.sizes.listRowHeight + theme.spacing.lg) * useFontScale());

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: c.title }} />

      <ListGroup>
        <ListRow
          icon="bell"
          title={c.master}
          subtitle={settings.enabled ? undefined : c.masterHint}
          right={<Toggle accessibilityLabel={c.master} value={settings.enabled} onValueChange={center.setEnabled} />}
        />
      </ListGroup>

      {settings.enabled && <PermissionCard permission={center.permission} onAsk={center.askPermission} />}

      {settings.enabled && (
        <>
          <ListGroup>
            <ListRow
              icon="eye-off"
              title={c.discreet}
              subtitle={c.discreetHint}
              right={<Toggle accessibilityLabel={c.discreet} value={settings.discreet} onValueChange={center.setDiscreet} />}
            />
          </ListGroup>

          <Card title={c.pause}>
            {paused ? (
              <Notice icon="pause-circle" action={<Button label={c.resume} icon="play" variant="secondary" onPress={center.resume} />}>
                {paused === 'forever' ? c.pausedForever : c.pausedUntil(formatWeekdayDayMonth(paused))}
              </Notice>
            ) : (
              <View style={styles.chips}>
                {PAUSES.map((p) => (
                  <Chip key={p} label={c.pauseOptions[p]} onPress={() => center.pause(p)} />
                ))}
              </View>
            )}
          </Card>

          <Card>
            <View style={styles.inline}>
              <Text style={styles.flex}>{c.quiet}</Text>
              <Toggle accessibilityLabel={c.quiet} value={settings.quiet.enabled} onValueChange={(enabled) => center.setQuiet({ enabled })} />
            </View>
            {settings.quiet.enabled && (
              <View style={styles.inline}>
                <TimeField label={strings.notifications.detail.windowStart} value={settings.quiet.start} onChange={(start) => center.setQuiet({ start })} />
                <TimeField label={strings.notifications.detail.windowEnd} value={settings.quiet.end} onChange={(end) => center.setQuiet({ end })} />
              </View>
            )}
            <View style={styles.inline}>
              <Text style={styles.flex}>{c.maxPerDay}</Text>
              <Stepper accessibilityLabel={c.maxPerDay} value={settings.maxPerDay} min={1} max={10} onChange={center.setMaxPerDay} />
            </View>
          </Card>

          <View style={styles.types}>
            <Text variant="label" color="textMuted" style={styles.typesTitle}>
              {c.typesTitle}
            </Text>
            <View style={styles.typesBox}>
              <SortableList
                data={center.order}
                keyOf={(t) => t}
                rowHeight={rowHeight}
                onReorder={center.reorder}
                handleLabel={(t) => c.dragHandle(strings.notifications.types[t])}
                renderItem={(type, handle) => (
                  <NotificationTypeRow
                    type={type}
                    settings={settings}
                    checkinWeekday={center.checkinWeekday}
                    handle={handle}
                    onToggle={(enabled) => center.toggleType(type, enabled)}
                  />
                )}
              />
            </View>
          </View>
        </>
      )}

      <NotificationHistory state={center.history.state} />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  inline: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  types: { gap: t.spacing.sm },
  typesTitle: { paddingHorizontal: t.spacing.xs, textTransform: 'uppercase', letterSpacing: t.tracking.caps },
  typesBox: {
    borderRadius: t.radii.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    overflow: 'hidden',
  },
}));
