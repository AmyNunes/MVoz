import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { LiveMeter } from '@/components/meter/LiveMeter';
import { MicPermission } from '@/components/meter/MicPermission';
import { IconButton, Screen, Text } from '@/components/ui';
import { useMicPermission } from '@/features/meter/useMicPermission';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const m = strings.meter;

/** Medidor livre em tela cheia (seção 10.2). */
export default function MeterScreen() {
  // Sem isso a tela apaga em ~30 s, o app vai para segundo plano e o microfone desliga.
  useKeepAwake();
  const theme = useTheme();
  const styles = useStyles();
  const mic = useMicPermission();

  return (
    <Screen scroll={false} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <IconButton icon="x" accessibilityLabel={m.close} onPress={() => router.back()} />
        <Text variant="heading" align="center" accessibilityRole="header" style={styles.title}>
          {m.title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {mic.status === 'checking' && (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} accessibilityLabel={strings.common.loading} />
        </View>
      )}
      {(mic.status === 'ask' || mic.status === 'blocked') && (
        <MicPermission status={mic.status} onRequest={mic.request} onOpenSettings={mic.openSettings} />
      )}
      {mic.status === 'granted' && <LiveMeter />}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.xs,
  },
  title: { flex: 1 },
  headerSpacer: { width: t.sizes.touchTarget },
  center: { flex: 1, justifyContent: 'center' },
}));
