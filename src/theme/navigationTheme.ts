import { DarkTheme, DefaultTheme, type Theme as NavigationTheme } from 'expo-router';

import { palette, type ColorScheme } from './tokens';

/** Cores que o Expo Router usa no fundo das telas e nos cabeçalhos nativos. */
function build(scheme: ColorScheme): NavigationTheme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const c = palette[scheme];
  return {
    ...base,
    colors: {
      primary: c.primary,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      notification: c.danger,
    },
  };
}

export const navigationThemes: Record<ColorScheme, NavigationTheme> = {
  light: build('light'),
  dark: build('dark'),
};
