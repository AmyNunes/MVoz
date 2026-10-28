import { View } from 'react-native';

import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  message?: string;
  onRetry: () => void;
};

/** Erro com o botão "Tentar de novo", obrigatório em toda tela. */
export function ErrorState({ message = strings.common.genericError, onRetry }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Icon name="alert-circle" size={theme.sizes.iconLarge} color="danger" />
      <Text align="center" accessibilityRole="alert" accessibilityLiveRegion="polite">
        {message}
      </Text>
      <Button label={strings.common.retry} onPress={onRetry} variant="secondary" icon="refresh-cw" />
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
