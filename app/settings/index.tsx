import { router, Stack } from 'expo-router';

import { ListGroup, ListRow, Notice, Screen } from '@/components/ui';
import { useSettingsSummary } from '@/features/settings/useSettingsSummary';
import { strings } from '@/i18n/strings';

const s = strings.settings;

export default function SettingsScreen() {
  const summary = useSettingsSummary();

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: s.title }} />
      <ListGroup>
        <ListRow icon="cpu" title={s.rows.ai} value={summary.ai} onPress={() => router.push('/settings/ai')} />
      </ListGroup>
      <ListGroup>
        <ListRow icon="bell" title={s.rows.notifications} onPress={() => router.push('/settings/notifications')} />
        <ListRow icon="database" title={s.rows.data} onPress={() => router.push('/settings/data')} />
      </ListGroup>
      <ListGroup>
        <ListRow icon="user" title={s.rows.profile} onPress={() => router.push('/settings/profile')} />
        <ListRow icon="sliders" title={s.rows.training} onPress={() => router.push('/settings/training')} />
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="moon"
          iconColor="target"
          title={s.rows.appearance}
          value={summary.appearance}
          onPress={() => router.push('/settings/appearance')}
        />
        <ListRow icon="smartphone" title={s.rows.gestures} onPress={() => router.push('/settings/gestures')} />
      </ListGroup>
      <Notice icon="info">{strings.health.disclaimer}</Notice>
    </Screen>
  );
}
