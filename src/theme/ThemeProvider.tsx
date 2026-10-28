import { ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { navigationThemes } from './navigationTheme';
import { resolveColorScheme, themes, type Theme, type ThemePreference } from './theme';

const ThemeContext = createContext<Theme>(themes.light);

type Props = {
  preference?: ThemePreference;
  children: ReactNode;
};

export function ThemeProvider({ preference = 'system', children }: Props) {
  const scheme = resolveColorScheme(preference, useColorScheme());
  const theme = themes[scheme];

  useEffect(() => {
    // Teclado e diálogos nativos seguem a mesma escolha.
    Appearance.setColorScheme(preference === 'system' ? 'unspecified' : preference);
  }, [preference]);

  useEffect(() => {
    // Fundo da janela nativa: evita um "flash" branco atrás das telas no modo escuro.
    SystemUI.setBackgroundColorAsync(theme.colors.bg);
  }, [theme.colors.bg]);

  return (
    <ThemeContext value={theme}>
      <NavigationThemeProvider value={navigationThemes[scheme]}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {children}
      </NavigationThemeProvider>
    </ThemeContext>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
