import { View } from 'react-native';

import { Button, IconBadge, Notice, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.meter.permission;

type Props = {
  status: 'ask' | 'blocked';
  onRequest: () => void;
  onOpenSettings: () => void;
};

/** Explicação antes do pedido do sistema e estado "microfone negado" (seção 7.1). */
export function MicPermission({ status, onRequest, onOpenSettings }: Props) {
  const styles = useStyles();
  const blocked = status === 'blocked';

  return (
    <View style={styles.container}>
      <View style={styles.texts}>
        <IconBadge icon={blocked ? 'mic-off' : 'mic'} color={blocked ? 'warning' : 'primary'} size="lg" />
        <Text variant="title" align="center" accessibilityRole="header">
          {blocked ? p.blockedTitle : p.title}
        </Text>
        <Text color="textMuted" align="center">
          {blocked ? p.blockedBody : p.body}
        </Text>
      </View>
      {!blocked && <Notice icon="volume-x">{strings.meter.tip}</Notice>}
      <Button
        label={blocked ? p.openSettings : p.allow}
        icon={blocked ? 'settings' : 'mic'}
        size="main"
        onPress={blocked ? onOpenSettings : onRequest}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: t.spacing.xxl,
    paddingHorizontal: t.spacing.screen,
    paddingBottom: t.spacing.lg,
  },
  texts: { alignItems: 'center', gap: t.spacing.md, marginBottom: 'auto', marginTop: 'auto' },
}));
