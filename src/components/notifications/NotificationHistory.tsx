import { ListGroup, ListRow, Skeleton, Text } from '@/components/ui';
import type { NotificationLogRow } from '@/db/notificationLogRepo';
import { strings } from '@/i18n/strings';
import { formatShortDate, formatTime } from '@/lib/dates';
import type { LoaderState } from '@/lib/useLoader';
import { TYPE_ICONS } from '@/notifications/summary';
import { NOTIFICATION_TYPES, type NotificationType } from '@/notifications/types';
import { useTheme } from '@/theme';

const c = strings.notifications.center;
const isType = (t: string): t is NotificationType => (NOTIFICATION_TYPES as readonly string[]).includes(t);

/** Histórico simples: tipo, horário agendado, aberta ou não (seção 11). */
export function NotificationHistory({ state }: { state: LoaderState<NotificationLogRow[]> }) {
  const theme = useTheme();
  if (state.status === 'loading') return <Skeleton height={theme.sizes.traceHeight} />;
  if (state.status !== 'success') return null;
  if (!state.data.length) {
    return (
      <Text variant="caption" color="textMuted">
        {c.historyEmpty}
      </Text>
    );
  }
  return (
    <ListGroup title={c.history}>
      {state.data.map((row) => {
        const type = isType(row.type) ? row.type : 'training';
        const at = new Date(row.scheduledFor);
        return (
          <ListRow
            key={row.id}
            icon={TYPE_ICONS[type].icon}
            iconColor={TYPE_ICONS[type].color}
            title={strings.notifications.types[type]}
            subtitle={`${formatShortDate(at)} · ${formatTime(at)}`}
            value={row.openedAt ? c.opened : c.notOpened}
          />
        );
      })}
    </ListGroup>
  );
}
