import { Stack } from 'expo-router';

import { ListGroup, ListRow, Screen, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

const g = strings.settings.gestures;

/** Configurações › Gestos (seção 10.10, item 5): vibração e "Ver guias de novo". */
export default function GestureSettingsScreen() {
  const haptics = useSettings((s) => s.gestures.haptics);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: g.title }} />
      <ListGroup>
        <ListRow
          icon="smartphone"
          title={g.haptics}
          subtitle={g.hapticsHint}
          right={<Toggle accessibilityLabel={g.haptics} value={haptics} onValueChange={(value) => update('gestures', { haptics: value })} />}
        />
      </ListGroup>
      <ListGroup>
        <ListRow
          icon="help-circle"
          title={g.seeGuides}
          onPress={() => {
            void update('gestures', { coachMarksSeen: [] });
            showSnackbar(g.guidesReset);
          }}
        />
      </ListGroup>
    </Screen>
  );
}
