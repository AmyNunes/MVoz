import { Pressable, View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  icon?: IconName;
  /** Se definido, o chip é selecionável. Selecionado mostra um ✓ (não só a cor). */
  selected?: boolean;
  onPress?: () => void;
  /** Ícone à direita, ex.: `x` em chips removíveis. */
  trailingIcon?: IconName;
  accessibilityLabel?: string;
};

export function Chip({ label, icon, selected, onPress, trailingIcon, accessibilityLabel }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const fg = selected ? 'onPrimary' : 'text';
  const leading = selected ? 'check' : icon;

  const content = (
    <>
      {leading && <Icon name={leading} size={theme.sizes.iconSmall} color={fg} />}
      <Text variant="label" color={fg} numberOfLines={1}>
        {label}
      </Text>
      {trailingIcon && <Icon name={trailingIcon} size={theme.sizes.iconSmall} color={fg} />}
    </>
  );

  if (!onPress) {
    return <View style={[styles.base, selected && styles.selected]}>{content}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      // Completa a altura de 36 até o alvo de toque de 48.
      hitSlop={(theme.sizes.touchTarget - theme.sizes.chipHeight) / 2}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={selected === undefined ? undefined : { selected }}
      style={({ pressed }) => [styles.base, selected && styles.selected, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: t.spacing.xs,
    minHeight: t.sizes.chipHeight,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radii.sm,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surfaceAlt,
  },
  selected: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  pressed: { opacity: t.opacity.pressed },
}));
