import Feather from '@expo/vector-icons/Feather';
import type { ComponentProps } from 'react';

import { useTheme, type ColorTokens } from '@/theme';

export type IconName = ComponentProps<typeof Feather>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: keyof ColorTokens;
};

/** Ícone Feather decorativo. Quem é tocável é o componente em volta, com seu próprio rótulo. */
export function Icon({ name, size, color = 'text' }: Props) {
  const theme = useTheme();

  return (
    <Feather
      name={name}
      size={size ?? theme.sizes.icon}
      color={theme.colors[color]}
      importantForAccessibility="no"
    />
  );
}
