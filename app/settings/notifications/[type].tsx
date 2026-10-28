import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { NotificationPreview } from '@/components/notifications/NotificationPreview';
import { TypeSettingsFields } from '@/components/notifications/TypeSettingsFields';
import { Button, EmptyState, ListGroup, ListRow, Notice, Screen, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { ACTION_LABELS } from '@/notifications/channels';
import { notificationContent } from '@/notifications/content';
import { isInQuietHours } from '@/notifications/plan';
import { notificationPermission } from '@/notifications/permissions';
import { sendTestNotification } from '@/notifications/scheduler';
import { NOTIFICATION_TYPES, normalizedOrder, urlFor, type NotificationSettings, type NotificationType } from '@/notifications/types';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const d = strings.notifications.detail;
const c = strings.notifications.center;

const SAMPLE = { minutes: 15, stage: strings.guide.stages.resonance.name };

/** Horário fixo do tipo (para avisar se cai no horário silencioso). */
function fixedTime(type: NotificationType, s: NotificationSettings): string | null {
  if (type === 'training' || type === 'checkin' || type === 'comeback') return s[type].time;
  return null;
}

/** Detalhe de um tipo de notificação: ajustes, prévia e "Enviar teste agora" (seção 11). */
export default function NotificationTypeScreen() {
  const styles = useStyles();
  const { type } = useLocalSearchParams<{ type: string }>();
  const settings = useSettings((s) => s.notifications);
  const checkinWeekday = useSettings((s) => s.training.checkinWeekday);
  const update = useSettings((s) => s.update);

  if (!(NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="bell-off" message={strings.common.genericError} />
      </Screen>
    );
  }
  const t = type as NotificationType;
  const name = strings.notifications.types[t];
  const patchType = (patch: Record<string, unknown>) => update('notifications', { [t]: { ...settings[t], ...patch } } as Partial<NotificationSettings>);

  const time = fixedTime(t, settings);
  const [h, m] = (time ?? '00:00').split(':').map(Number);
  const inQuiet = time != null && isInQuietHours(new Date(2026, 0, 1, h, m), settings.quiet);
  const preview = notificationContent(t, new Date(), SAMPLE, settings.discreet);

  const order = normalizedOrder(settings.order);
  const index = order.indexOf(t);
  const move = (delta: number) => {
    const next = [...order];
    const target = Math.max(0, Math.min(order.length - 1, index + delta));
    next.splice(index, 1);
    next.splice(target, 0, t);
    void update('notifications', { order: next });
  };

  const sendTest = async () => {
    const permission = await notificationPermission();
    if (permission !== 'granted') {
      showSnackbar(permission === 'unsupported' ? c.unsupported : d.blocked);
      return;
    }
    await sendTestNotification({ type: t, url: urlFor(t), ...preview });
    showSnackbar(d.testSent);
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: name }} />
      <ListGroup>
        <ListRow title={d.enabled} right={<Toggle accessibilityLabel={name} value={settings[t].enabled} onValueChange={(enabled) => patchType({ enabled })} />} />
      </ListGroup>

      <TypeSettingsFields type={t} settings={settings} checkinWeekday={checkinWeekday} onChange={patchType} />
      {inQuiet && <Notice tone="warning">{d.quietWarning}</Notice>}

      <NotificationPreview title={preview.title} body={preview.body} actions={ACTION_LABELS[t]} />
      <Button label={d.sendTest} icon="send" variant="secondary" onPress={() => void sendTest()} />

      <View style={styles.moves}>
        <Button label={c.moveUp} icon="arrow-up" variant="ghost" disabled={index === 0} onPress={() => move(-1)} />
        <Button label={c.moveDown} icon="arrow-down" variant="ghost" disabled={index === order.length - 1} onPress={() => move(1)} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((th) => ({
  moves: { flexDirection: 'row', justifyContent: 'center', gap: th.spacing.md },
}));
