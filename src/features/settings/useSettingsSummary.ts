import { PROVIDERS } from '@/ai/providers';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useSettings } from '@/stores/settingsStore';

import { isAiConfigured } from './useAiConfigured';

const s = strings.settings;

const THEME_LABELS = {
  system: s.appearance.themeSystem,
  light: s.appearance.themeLight,
  dark: s.appearance.themeDark,
} as const;

/** Valores curtos mostrados à direita de cada linha de Configurações. */
export function useSettingsSummary() {
  const ai = useSettings((st) => st.ai);
  const theme = useSettings((st) => st.appearance.themePreference);
  const { state } = useLoader(isAiConfigured);

  const aiReady = state.status === 'success' ? state.data : null;

  return {
    ai: aiReady === false ? s.aiNotConfigured : PROVIDERS[ai.provider].label,
    appearance: THEME_LABELS[theme],
  };
}
