import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { BulletList } from '@/components/exercises/StepList';
import { StageList } from '@/components/guide/StageList';
import { Button, Card, EmptyState, ErrorState, Notice, Screen, Skeleton, Text } from '@/components/ui';
import { getBaseline } from '@/db/guideRepo';
import { generatePlan } from '@/guide/plan';
import { blockCount, effectiveDailyMinutes } from '@/guide/profile';
import { deadlineText } from '@/features/guide/planText';
import { startPlan } from '@/features/guide/startPlan';
import { formatUserNote } from '@/features/settings/notation';
import { strings } from '@/i18n/strings';
import { nowIso } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { useProfile } from '@/stores/profileStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { useTheme } from '@/theme';

const r = strings.guide.result;
const hz = Math.round;

/** Plano proposto (seção 9.2): o início medido, a faixa, as etapas, o prazo e os avisos. */
export default function GuideResultScreen() {
  const theme = useTheme();
  const profile = useProfile((s) => s.profile);
  const { state, reload } = useLoader(() => getBaseline('latest'));
  const [starting, setStarting] = useState(false);

  const header = <Stack.Screen options={{ title: r.title }} />;
  if (state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={reload} /></Screen>;
  if (!profile || !state.data) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="mic" message={r.missing} action={{ label: r.record, onPress: () => router.replace('/guide/baseline') }} />
      </Screen>
    );
  }

  const start = state.data.metrics;
  const { plan, notes } = generatePlan(profile, start, nowIso());
  const minutes = effectiveDailyMinutes(profile);

  const begin = async () => {
    setStarting(true);
    try {
      await startPlan(profile, start);
      showSnackbar(r.started);
      router.dismissTo('/');
    } catch {
      showSnackbar(strings.common.genericError);
      setStarting(false);
    }
  };

  return (
    <Screen edges={[]} footer={<Button label={r.start} icon="check" size="main" loading={starting} onPress={begin} />}>
      {header}
      <Card title={r.startTitle}>
        <Text>{r.habitual(hz(start.speechMedianHz), formatUserNote(start.speechMedianHz))}</Text>
        <Text>{r.range(hz(start.speechP10Hz), hz(start.speechP90Hz))}</Text>
        <Text>{r.extension(hz(start.minHz), hz(start.maxHz))}</Text>
        {start.vowelA && start.vowelI && <Text color="textMuted">{r.resonance(String(hz(start.vowelA.f2)), String(hz(start.vowelI.f2)))}</Text>}
      </Card>
      <Card title={r.targetTitle}>
        <Text variant="heading">{r.stageBand(hz(plan.stageTarget.lowHz), hz(plan.stageTarget.highHz))}</Text>
        <Text color="textMuted">{r.finalBand(hz(plan.finalTarget.lowHz), hz(plan.finalTarget.highHz))}</Text>
        <Text color="textMuted">{r.minutes(minutes, blockCount(minutes))}</Text>
      </Card>
      <Card title={r.stagesTitle}>
        <StageList stages={plan.stages} current={null} />
      </Card>
      <Card title={r.deadlineTitle}>
        <Text>{deadlineText(profile.goal, profile.hormones)}</Text>
      </Card>
      {notes.length > 0 && (
        <Notice tone="warning">
          <Text variant="label">{r.notesTitle}</Text>
          <BulletList items={notes.map((n) => strings.guide.notes[n])} />
        </Notice>
      )}
      <Notice>{strings.health.disclaimer}</Notice>
    </Screen>
  );
}
