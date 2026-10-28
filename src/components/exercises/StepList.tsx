import { View } from 'react-native';

import { Text } from '@/components/ui';
import { makeStyles } from '@/theme';

type Props = {
  steps: readonly string[];
  /** Passo atual em destaque (no player). */
  current?: number;
};

/** Passos numerados do exercício, com o atual em destaque (seção 4.5). */
export function StepList({ steps, current }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {steps.map((step, i) => {
        const active = i === current;
        return (
          <View key={step} style={[styles.row, active && styles.active]} accessibilityState={{ selected: active }}>
            <View style={[styles.number, active && styles.numberActive]}>
              <Text variant="label" color={active ? 'onPrimary' : 'textMuted'}>
                {i + 1}
              </Text>
            </View>
            <Text color={current === undefined || active ? 'text' : 'textMuted'} style={styles.text}>
              {step}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** Lista com marcadores (erros comuns, cuidados). */
export function BulletList({ items }: { items: readonly string[] }) {
  const styles = useStyles();
  return (
    <View style={styles.list}>
      {items.map((item) => (
        <View key={item} style={styles.row}>
          <Text color="textMuted">•</Text>
          <Text style={styles.text}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.md },
  row: { flexDirection: 'row', gap: t.spacing.md, alignItems: 'flex-start', borderRadius: t.radii.sm },
  active: { backgroundColor: t.colors.surfaceAlt, padding: t.spacing.sm, margin: -t.spacing.sm },
  number: {
    width: t.sizes.badge.sm - t.spacing.sm,
    height: t.sizes.badge.sm - t.spacing.sm,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberActive: { backgroundColor: t.colors.primary },
  text: { flex: 1 },
}));
