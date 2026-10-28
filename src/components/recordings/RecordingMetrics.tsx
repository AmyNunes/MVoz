import { View } from 'react-native';

import { Text } from '@/components/ui';
import type { SegmentMetrics } from '@/audio/metrics';
import { formatUserNote } from '@/features/settings/notation';
import { strings } from '@/i18n/strings';
import { formatClock } from '@/lib/format';
import { makeStyles } from '@/theme';

const m = strings.recordings.metrics;

/** "5,8" (uma casa, vírgula). */
const one = (n: number) => n.toFixed(1).replace('.', ',');
const percent = (ratio: number) => m.percent(Math.round(ratio * 100));

type Row = { label: string; value: string };

/** As métricas da seção 7.4 que fazem sentido para uma gravação livre. */
export function metricRows(metrics: SegmentMetrics): Row[] {
  if (metrics.medianHz === null) {
    return [{ label: m.voiced, value: m.noVoice }];
  }
  const rows: Row[] = [
    { label: m.median, value: m.medianValue(Math.round(metrics.medianHz), formatUserNote(metrics.medianHz)) },
  ];
  if (metrics.p10Hz !== null && metrics.p90Hz !== null && metrics.rangeSt !== null) {
    rows.push({ label: m.range, value: m.rangeValue(Math.round(metrics.p10Hz), Math.round(metrics.p90Hz), one(metrics.rangeSt)) });
  }
  if (metrics.variabilitySt !== null) rows.push({ label: m.variability, value: m.semitones(one(metrics.variabilitySt)) });
  rows.push({ label: m.voiced, value: m.voicedValue(formatClock(metrics.voicedSec), formatClock(metrics.durationSec)) });
  if (metrics.inTargetRatio !== null) rows.push({ label: m.inTarget, value: percent(metrics.inTargetRatio) });
  const { rising, falling, flat } = metrics.endings;
  if (rising + falling + flat > 0) rows.push({ label: m.endings, value: m.endingsValue(rising, falling, flat) });
  rows.push({ label: m.longest, value: m.seconds(one(metrics.longestSoundSec)) });
  if (metrics.resonance) {
    rows.push({ label: m.resonance, value: m.resonanceValue(Math.round(metrics.resonance.f1), Math.round(metrics.resonance.f2)) });
  }
  return rows;
}

export function RecordingMetrics({ metrics }: { metrics: SegmentMetrics }) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {metricRows(metrics).map((row) => (
        <View key={row.label} style={styles.row} accessible accessibilityLabel={`${row.label}: ${row.value}`}>
          <Text color="textMuted" style={styles.label}>
            {row.label}
          </Text>
          <Text style={styles.value}>{row.value}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  list: { gap: t.spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: t.spacing.sm },
  label: { flexShrink: 1 },
  value: { fontVariant: ['tabular-nums'], textAlign: 'right', flexShrink: 1 },
}));
