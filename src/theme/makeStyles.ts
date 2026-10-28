import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import type { Theme } from './theme';
import { useTheme } from './ThemeProvider';

/** Grupo de estilos nomeados (o React Native 0.88 deixou de exportar `StyleSheet.NamedStyles`). */
type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

/**
 * Cria um hook de estilos que dependem do tema.
 * Os estilos são calculados uma vez por tema (claro/escuro) e reaproveitados.
 *
 * Uso:
 *   const useStyles = makeStyles((t) => ({ box: { backgroundColor: t.colors.bg } }));
 *   const styles = useStyles();
 */
export function makeStyles<T extends NamedStyles<T>>(factory: (theme: Theme) => T) {
  const cache = new WeakMap<Theme, T>();

  return function useStyles(): T {
    const theme = useTheme();
    let styles = cache.get(theme);
    if (!styles) {
      styles = StyleSheet.create(factory(theme));
      cache.set(theme, styles);
    }
    return styles;
  };
}
