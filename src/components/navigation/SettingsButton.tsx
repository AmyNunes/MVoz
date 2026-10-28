import { router } from 'expo-router';

import { IconButton } from '@/components/ui';
import { strings } from '@/i18n/strings';

/** Engrenagem que abre Configurações (Hoje e Progresso, seção 5.2). */
export function SettingsButton() {
  return (
    <IconButton
      icon="settings"
      accessibilityLabel={strings.common.settings}
      onPress={() => router.push('/settings')}
    />
  );
}
