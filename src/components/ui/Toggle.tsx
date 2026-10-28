import { Switch } from 'react-native';

import { useTheme } from '@/theme';

type Props = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

/** Interruptor liga/desliga com as cores do tema. */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled }: Props) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
      thumbColor={theme.colors.surface}
    />
  );
}
