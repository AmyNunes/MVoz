import { Pressable } from 'react-native';

import { makeStyles, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  /** Obrigatório: é o que o leitor de tela fala, já que não há texto visível. */
  accessibilityLabel: string;
  onPress: () => void;
  color?: keyof ColorTokens;
  disabled?: boolean;
};

export function IconButton({ icon, accessibilityLabel, onPress, color = 'text', disabled }: Props) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.base,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  base: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    borderRadius: t.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  disabled: { opacity: t.opacity.disabled },
}));
