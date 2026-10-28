import { router } from 'expo-router';

import { StageList } from '@/components/guide/StageList';
import { MilestoneList } from '@/components/plan/MilestoneList';
import { Button, Card, EmptyState, ErrorState, Notice, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { deadlineText } from '@/features/guide/planText';
import { usePlanOverview } from '@/features/plan/usePlanOverview';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { useProfile } from '@/stores/profileStore';
import { useTheme } from '@/theme';

const p = strings.plan;
const hz = Math.round;

/** Plano (seção 10.6): etapa atual com marcos, faixa-alvo, linha do tempo e prazo. */
export default function PlanScreen() {
  const theme = useTheme();
  const { state, reload } = usePlanOverview();
  const profile = useProfile((s) => s.profile);

  return (
    <Screen>
      <ScreenHeader title={strings.tabs.plan} />
      {state.status === 'loading' && <Skeleton height={theme.sizes.traceHeight} />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && !state.data && (
        <EmptyState icon="compass" message={p.empty} action={{ label: p.answerGuide, onPress: () => router.push('/guide') }} />
      )}
      {state.status === 'success' && state.data && (() => {
        const { plan, stage, milestones, week, stuck, reinforcement } = state.data;
        const meta = strings.guide.stages[stage.id];
        const lighter = plan.lighterUntil && new Date(plan.lighterUntil) > new Date() ? plan.lighterUntil : null;
        return (
          <>
            <Card title={p.stageTitle(plan.stageIndex + 1, plan.stages.length)}>
              <Text variant="heading">{meta.name}</Text>
              <Text color="textMuted">{meta.focus}</Text>
              <Text variant="caption" color="textMuted">
                {p.week(week)}
              </Text>
              <Text variant="label">{p.milestonesTitle}</Text>
              <MilestoneList milestones={milestones} />
            </Card>
            {lighter && <Notice>{p.lighter(formatDayMonth(new Date(lighter)))}</Notice>}
            {stuck && <Notice tone="warning">{p.stuck}</Notice>}
            {reinforcement && <Notice tone="warning">{p.reinforcement}</Notice>}
            <Card title={p.bandTitle}>
              <Text variant="heading">{p.bandNow(hz(plan.stageTarget.lowHz), hz(plan.stageTarget.highHz))}</Text>
              <Text color="textMuted">{p.bandFinal(hz(plan.finalTarget.lowHz), hz(plan.finalTarget.highHz))}</Text>
              <Text variant="caption" color="textMuted">
                {stage.pitchMoves ? p.bandMoves : p.bandStill}
              </Text>
            </Card>
            <Card title={p.stagesTitle}>
              <StageList stages={plan.stages} current={plan.stageIndex} />
            </Card>
            <Card title={p.deadlineTitle}>
              <Text>{deadlineText(plan.goal, profile?.hormones ?? null)}</Text>
            </Card>
            <Button label={p.edit} icon="edit-2" variant="secondary" onPress={() => router.push('/plan/edit')} />
            <Button label={strings.ai.adjust.button} icon="zap" variant="secondary" onPress={() => router.push('/plan/adjust')} />
            <Button label={p.redoGuide} icon="refresh-cw" variant="ghost" onPress={() => router.push('/guide')} />
          </>
        );
      })()}
    </Screen>
  );
}
