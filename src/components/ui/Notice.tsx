import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles, TINT, useTheme, withAlpha, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Tone = 'info' | 'success' | 'warning' | 'error';

const TONES: Record<Tone, { color: keyof ColorTokens; icon: IconName }> = {
  info: { color: 'primary', icon: 'info' },
  success: { color: 'success', icon: 'check-circle' },
  warning: { color: 'warning', icon: 'alert-triangle' },
  error: { color: 'danger', icon: 'alert-circle' },
};

type Props = {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
  /** Ação opcional abaixo do texto. */
  action?: ReactNode;
};

/** Aviso em caixa colorida suave, com ícone (a cor nunca é o único sinal). */
export function Notice({ tone = 'info', icon, children, action }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const { color, icon: toneIcon } = TONES[tone];

  return (
    <View
      style={[styles.box, { backgroundColor: withAlpha(theme.colors[color], TINT) }]}
      accessibilityLiveRegion={tone === 'error' || tone === 'success' ? 'polite' : 'none'}
    >
      <Icon name={icon ?? toneIcon} color={color} size={theme.sizes.iconSmall} />
      <View style={styles.body}>
        {typeof children === 'string' ? <Text variant="label">{children}</Text> : children}
        {action}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  box: {
    flexDirection: 'row',
    gap: t.spacing.md,
    padding: t.spacing.lg,
    borderRadius: t.radii.md,
  },
  body: { flex: 1, gap: t.spacing.sm },
}));
