import { Button, Card, IconBadge, Notice, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { openSystemSettings, type PermissionState } from '@/notifications/permissions';

const c = strings.notifications.center;

/** Explica antes de pedir a permissão do Android (13+) e avisa quando está bloqueada. */
export function PermissionCard({ permission, onAsk }: { permission: PermissionState | null; onAsk: () => void }) {
  if (permission === 'unsupported') {
    return <Notice tone="info">{c.unsupported}</Notice>;
  }
  if (permission === 'blocked') {
    return (
      <Notice
        tone="warning"
        action={<Button label={c.openSettings} icon="settings" variant="secondary" onPress={openSystemSettings} />}
      >
        {c.blocked}
      </Notice>
    );
  }
  if (permission === 'undetermined') {
    return (
      <Card>
        <IconBadge icon="bell" size="lg" />
        <Text variant="heading">{c.permissionTitle}</Text>
        <Text color="textMuted">{c.permissionBody}</Text>
        <Button label={c.permissionAction} icon="bell" size="main" onPress={onAsk} />
      </Card>
    );
  }
  return null;
}
