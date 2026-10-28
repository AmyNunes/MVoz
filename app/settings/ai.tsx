import { Stack } from 'expo-router';
import { Linking } from 'react-native';

import { PROVIDERS } from '@/ai/providers';
import { ConnectionTest } from '@/components/settings/ai/ConnectionTest';
import { CostCard } from '@/components/settings/ai/CostCard';
import { ModelField } from '@/components/settings/ai/ModelField';
import { ProviderPicker } from '@/components/settings/ai/ProviderPicker';
import { Button, Card, Notice, Screen, TextField } from '@/components/ui';
import { useAiSettingsForm } from '@/features/settings/useAiSettingsForm';
import { strings } from '@/i18n/strings';

const s = strings.settings.ai;

export default function AiSettingsScreen() {
  const form = useAiSettingsForm();
  const provider = PROVIDERS[form.provider];

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: s.title }} />

      <ProviderPicker value={form.provider} onChange={form.changeProvider} />

      <Card>
        <TextField
          label={s.baseUrl}
          value={form.baseUrl}
          onChangeText={form.changeUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          helper={form.provider === 'ollama' ? s.ollamaHint : undefined}
          error={form.baseUrlInvalid ? s.baseUrlInvalid : undefined}
        />
        <TextField
          label={provider.requiresKey ? s.apiKey : s.apiKeyOptional}
          value={form.apiKey}
          onChangeText={form.changeKey}
          secure
          autoCapitalize="none"
          autoCorrect={false}
          helper={s.apiKeyHelper}
        />
        {provider.keyUrl && (
          <Button
            label={s.getKey}
            icon="external-link"
            variant="ghost"
            onPress={() => provider.keyUrl && Linking.openURL(provider.keyUrl)}
          />
        )}
        <ModelField
          value={form.model}
          onChangeText={form.changeModel}
          onPick={form.pickModel}
          beforeFetch={form.flushAll}
        />
      </Card>

      <ConnectionTest beforeTest={form.flushAll} />

      <CostCard form={form} />

      <Notice icon="mic-off">{s.audioNeverSent}</Notice>
      <Notice icon="shield">{s.privacy}</Notice>
    </Screen>
  );
}
