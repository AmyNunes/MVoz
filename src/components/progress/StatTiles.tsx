import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

export type Stat = { label: string; value: string };

/** Números grandes do Progresso, dois por linha (seção 10.7). */
export function StatTiles({ stats }: { stats: readonly Stat[] }) {
  const styles = useStyles();
  return (
    <View style={styles.grid}>
      {stats.map((stat) => (
        <View key={stat.label} style={styles.tile} accessible accessibilityLabel={`${stat.label}: ${stat.value}`}>
          <Text variant="title">{stat.value}</Text>
          <Text variant="caption" color="textMuted">
            {stat.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.md },
  tile: {
    flexGrow: 1,
    flexBasis: '40%',
    gap: t.spacing.xs,
    padding: t.spacing.lg,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
}));
