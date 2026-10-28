import { View } from 'react-native';

import { TINT, useTheme, withAlpha, type ColorTokens } from '@/theme';

import { Icon, type IconName } from './Icon';

type Props = {
  icon: IconName;
  color?: keyof ColorTokens;
  size?: 'sm' | 'md' | 'lg';
};

/** Ícone dentro de um círculo com a mesma cor, bem suave. Dá personalidade às listas e cartões. */
export function IconBadge({ icon, color = 'primary', size = 'md' }: Props) {
  const theme = useTheme();
  const box = theme.sizes.badge[size];

  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: theme.radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: withAlpha(theme.colors[color], TINT),
      }}
    >
      <Icon name={icon} color={color} size={theme.sizes.badgeIcon[size]} />
    </View>
  );
}
