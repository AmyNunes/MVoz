import { View } from 'react-native';

import { makeStyles, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type Props = {
  icon: IconName;
  /** Uma frase, no tom gentil da spec. */
  message: string;
  action?: { label: string; onPress: () => void };
};

/** Ícone + 1 frase + 1 ação (opcional). */
export function EmptyState({ icon, message, action }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Icon name={icon} size={theme.sizes.iconLarge} color="textMuted" />
      <Text color="textMuted" align="center">
        {message}
      </Text>
      {action && <Button label={action.label} onPress={action.onPress} />}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: t.spacing.lg,
    padding: t.spacing.xxl,
  },
}));
