import {
  durations,
  elevation,
  maxFontScale,
  opacity,
  palette,
  radii,
  sizes,
  spacing,
  springs,
  tracking,
  typography,
  type ColorScheme,
  type ColorTokens,
} from './tokens';

/** O que eu escolho em Aparência: seguir o sistema ou fixar claro/escuro. */
export type ThemePreference = 'system' | ColorScheme;

export type Theme = {
  scheme: ColorScheme;
  colors: ColorTokens;
  typography: typeof typography;
  spacing: typeof spacing;
  radii: typeof radii;
  elevation: typeof elevation;
  durations: typeof durations;
  opacity: typeof opacity;
  springs: typeof springs;
  sizes: typeof sizes;
  tracking: typeof tracking;
  maxFontScale: number;
};

const shared = {
  typography,
  spacing,
  radii,
  elevation,
  durations,
  opacity,
  springs,
  sizes,
  tracking,
  maxFontScale,
};

export const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', colors: palette.light, ...shared },
  dark: { scheme: 'dark', colors: palette.dark, ...shared },
};

/**
 * Decide o tema final. `system` é o valor de `useColorScheme()`,
 * que pode vir como 'unspecified' ou nulo; nesses casos, usa o claro.
 */
export function resolveColorScheme(
  preference: ThemePreference,
  system: string | null | undefined,
): ColorScheme {
  if (preference !== 'system') return preference;
  return system === 'dark' ? 'dark' : 'light';
}
