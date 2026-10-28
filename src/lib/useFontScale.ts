import { useWindowDimensions } from 'react-native';

import { useTheme } from '@/theme';

/** Escala de fonte do sistema, limitada à do app (130%): para alturas que dependem do texto. */
export function useFontScale(): number {
  const { fontScale } = useWindowDimensions();
  const theme = useTheme();
  return Math.max(1, Math.min(fontScale, theme.maxFontScale));
}
