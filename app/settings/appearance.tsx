import { Stack } from 'expo-router';

import { Card, Screen, Segmented, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import type { ThemePreference } from '@/theme';

const a = strings.settings.appearance;

const THEME_OPTIONS = [
  { value: 'system', label: a.themeSystem },
  { value: 'light', label: a.themeLight },
  { value: 'dark', label: a.themeDark },
] as const satisfies readonly { value: ThemePreference; label: string }[];

export default function AppearanceScreen() {
  const themePreference = useSettings((s) => s.appearance.themePreference);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: a.title }} />
      <Card title={a.theme}>
        <Segmented
          accessibilityLabel={a.theme}
          options={THEME_OPTIONS}
          value={themePreference}
          onChange={(value) => update('appearance', { themePreference: value })}
        />
        <Text variant="caption" color="textMuted">
          {a.themeHint}
        </Text>
      </Card>
    </Screen>
  );
}
