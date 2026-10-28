import { Text as RNText, type TextProps } from 'react-native';

import { useTheme, type ColorTokens, type TypographyVariant } from '@/theme';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
};

/**
 * Texto base do app: aplica a tipografia e a cor dos tokens
 * e limita a escala de fonte do sistema a 130%.
 */
export function Text({ variant = 'body', color = 'text', align, style, ...rest }: Props) {
  const theme = useTheme();

  return (
    <RNText
      maxFontSizeMultiplier={theme.maxFontScale}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}
