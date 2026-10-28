import type { ReactNode } from 'react';
import { View } from 'react-native';

import { makeStyles } from '@/theme';

import { Text } from './Text';

type Props = {
  title: string;
  /** Linha pequena acima do título (ex.: a data). */
  eyebrow?: string;
  subtitle?: string;
  /** Ações à direita (ex.: engrenagem). */
  right?: ReactNode;
};

/** Cabeçalho das abas: título grande à esquerda (seção 5.2). */
export function ScreenHeader({ title, eyebrow, subtitle, right }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.row}>
      <View style={styles.texts}>
        {eyebrow && (
          <Text variant="label" color="textMuted">
            {eyebrow}
          </Text>
        )}
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        {subtitle && <Text color="textMuted">{subtitle}</Text>}
      </View>
      {right && <View style={styles.right}>{right}</View>}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: t.spacing.md,
    paddingTop: t.spacing.md,
  },
  texts: { flex: 1, gap: t.spacing.xs / 2 },
  right: { flexDirection: 'row', marginRight: -t.spacing.md },
}));
