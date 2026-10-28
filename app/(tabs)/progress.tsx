import { router } from 'expo-router';

import { SettingsButton } from '@/components/navigation/SettingsButton';
import { LineChart } from '@/components/progress/LineChart';
import { StatTiles } from '@/components/progress/StatTiles';
import { Card, ErrorState, ListGroup, ListRow, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { useProgress } from '@/features/progress/useProgress';
import { strings } from '@/i18n/strings';
import { formatUsd } from '@/lib/format';
import { useTheme } from '@/theme';

const p = strings.progress;
const hz = (value: number) => strings.meter.hzShort(Math.round(value));

/** Progresso (seção 10.7): números, tom por check-in, ressonância, gravações e gasto de IA. */
export default function ProgressScreen() {
  const theme = useTheme();
  const { state, reload } = useProgress();

  return (
    <Screen>
      <ScreenHeader title={strings.tabs.progress} right={<SettingsButton />} />
      {state.status === 'loading' && <Skeleton height={theme.sizes.traceHeight} />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && (() => {
        const d = state.data;
        const lastResonance = d.resonance.at(-1);
        return (
          <>
            <StatTiles
              stats={[
                { label: p.stats.minutesWeek, value: String(d.minutesWeek) },
                { label: p.stats.activeDays, value: String(d.activeDaysMonth) },
                { label: p.stats.median, value: d.medianHz ? hz(d.medianHz) : p.none },
                { label: p.stats.inTarget, value: d.inTargetPct !== null ? `${d.inTargetPct}%` : p.none },
              ]}
            />
            <Card title={p.pitchTitle}>
              <Text variant="caption" color="textMuted">
                {p.pitchHint}
              </Text>
              {d.pitch.length > 1 ? (
                <LineChart
                  points={d.pitch}
                  format={hz}
                  band={d.band ? { low: d.band.lowHz, high: d.band.highHz } : null}
                  accessibilityLabel={p.pitchA11y(hz(d.pitch[0].value), hz(d.pitch[d.pitch.length - 1].value), d.pitch.length)}
                />
              ) : (
                <Text color="textMuted">{d.pitch.length === 0 ? p.empty : p.fewPoints}</Text>
              )}
            </Card>
            {d.resonance.length > 1 && lastResonance && (
              <Card title={p.resonanceTitle}>
                <Text variant="caption" color="textMuted">
                  {p.resonanceHint}
                </Text>
                <LineChart points={d.resonance} format={p.percent} zero accessibilityLabel={p.resonanceA11y(p.percent(lastResonance.value))} />
              </Card>
            )}
            <ListGroup>
              <ListRow icon="mic" title={strings.recordings.title} value={strings.recordings.count(d.recordings)} onPress={() => router.push('/recordings')} />
              <ListRow icon="cpu" title={p.aiSpent} subtitle={p.aiSpentHint} value={formatUsd(d.aiSpent)} onPress={() => router.push('/settings/ai')} />
            </ListGroup>
          </>
        );
      })()}
    </Screen>
  );
}
