import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { makeStyles } from '@/theme';

import { Text } from './Text';

type Props = {
  children: ReactNode;
  /** Título pequeno do cartão (ex.: "Sua semana"). */
  title?: string;
  /** Ação à direita do título. */
  titleRight?: ReactNode;
  /** `flat` = sem padding interno (para listas). */
  flat?: boolean;
  style?: ViewStyle;
};

/** Cartão de conteúdo: superfície com cantos arredondados e borda suave. */
export function Card({ children, title, titleRight, flat, style }: Props) {
  const styles = useStyles();

  return (
    <View style={[styles.card, !flat && styles.padded, style]}>
      {title && (
        <View style={[styles.titleRow, flat && styles.titleFlat]}>
          <Text variant="label" color="textMuted" accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {titleRight}
        </View>
      )}
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: 'hidden',
  },
  padded: { padding: t.spacing.xl, gap: t.spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleFlat: { paddingHorizontal: t.spacing.lg, paddingTop: t.spacing.lg },
  title: { flex: 1, textTransform: 'uppercase', letterSpacing: t.tracking.caps },
}));
