import { View } from 'react-native';

import { Card, Icon, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

type Props = { title: string; body: string; actions: readonly string[] };

/** Prévia de como a notificação vai aparecer na barra do Android. */
export function NotificationPreview({ title, body, actions }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const d = strings.notifications.detail;

  return (
    <Card title={d.preview}>
      <View style={styles.notification} accessible accessibilityLabel={`${title}. ${body}`}>
        <View style={styles.header}>
          <View style={styles.appIcon}>
            <Icon name="mic" color="onPrimary" size={theme.sizes.iconSmall - theme.spacing.xs} />
          </View>
          <Text variant="caption" color="textMuted">
            {`${d.appName} · ${d.now}`}
          </Text>
        </View>
        <Text variant="label">{title}</Text>
        <Text color="textMuted">{body}</Text>
        {actions.length > 0 && (
          <View style={styles.actions}>
            {actions.map((a) => (
              <Text key={a} variant="label" color="primary">
                {a}
              </Text>
            ))}
          </View>
        )}
      </View>
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  notification: {
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    borderRadius: t.radii.md,
    backgroundColor: t.colors.surfaceAlt,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  appIcon: {
    width: t.spacing.xl,
    height: t.spacing.xl,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: { flexDirection: 'row', gap: t.spacing.xl, paddingTop: t.spacing.sm },
}));
