import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ComparePane } from '@/components/recordings/ComparePane';
import { metricRows } from '@/components/recordings/RecordingMetrics';
import { Card, EmptyState, ErrorState, Screen, Skeleton, Text } from '@/components/ui';
import { getRecording } from '@/db/recordingsRepo';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { makeStyles, useTheme } from '@/theme';

const r = strings.recordings;

/** Antes × depois (seção 10.7): as duas gravações com traçados, áudio e métricas lado a lado. */
export default function CompareScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { a, b } = useLocalSearchParams<{ a: string; b: string }>();
  const { state, reload } = useLoader(() => Promise.all([getRecording(a), getRecording(b)]), `${a}|${b}`);
  const header = <Stack.Screen options={{ title: r.compareTitle }} />;

  if (state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={reload} /></Screen>;
  const [before, after] = state.data;
  if (!before || !after) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="mic-off" message={r.compareMissing} />
      </Screen>
    );
  }

  const left = before.metrics ? metricRows(before.metrics) : [];
  const right = after.metrics ? metricRows(after.metrics) : [];
  const labels = [...new Set([...left, ...right].map((row) => row.label))];
  const valueOf = (rows: typeof left, label: string) => rows.find((row) => row.label === label)?.value ?? '—';

  return (
    <Screen edges={[]}>
      {header}
      <ComparePane recording={before} title={r.before} />
      <ComparePane recording={after} title={r.after} />
      {labels.length > 0 && (
        <Card title={r.metricsTitle}>
          <View style={styles.row}>
            <View style={styles.label} />
            <Text variant="label" style={styles.cell}>
              {r.before}
            </Text>
            <Text variant="label" style={styles.cell}>
              {r.after}
            </Text>
          </View>
          {labels.map((label) => (
            <View key={label} style={styles.row} accessible accessibilityLabel={`${label}: ${r.before} ${valueOf(left, label)}, ${r.after} ${valueOf(right, label)}`}>
              <Text variant="caption" color="textMuted" style={styles.label}>
                {label}
              </Text>
              <Text variant="caption" style={styles.cell}>
                {valueOf(left, label)}
              </Text>
              <Text variant="caption" style={styles.cell}>
                {valueOf(right, label)}
              </Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' },
  label: { flex: 1.2 },
  cell: { flex: 1 },
}));
