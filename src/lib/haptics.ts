import * as Haptics from 'expo-haptics';

import { useSettings } from '@/stores/settingsStore';

/** Vibração sutil e desligável (seção 4.4; Configurações › Gestos › Vibração). */
const enabled = () => useSettings.getState().gestures.haptics;

export const haptics = {
  /** Ao entrar na faixa-alvo e a cada repetição concluída. */
  light: () => {
    if (enabled()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Ao concluir o treino ou um marco. */
  success: () => {
    if (enabled()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
};
