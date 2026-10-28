import { View } from 'react-native';

import { IconButton, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;

type Props = {
  title: string;
  /** Linha pequena embaixo do nome (a categoria). */
  subtitle: string;
  onClose: () => void;
  onMenu: () => void;
};

/** ✕ (sair) · nome e categoria · ⋯ (seção 8.5). O passo fica no cartão do passo. */
export function PlayerHeader({ title, subtitle, onClose, onMenu }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <IconButton icon="x" accessibilityLabel={p.close} onPress={onClose} />
      <View style={styles.texts}>
        <Text variant="heading" numberOfLines={1} accessibilityRole="header">
          {title}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <IconButton icon="more-horizontal" accessibilityLabel={p.menu} onPress={onMenu} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: t.spacing.xs },
  texts: { flex: 1, alignItems: 'center' },
}));
