import { router, Stack } from 'expo-router';
import { View } from 'react-native';

import { CheckinQuestions } from '@/components/checkin/CheckinQuestions';
import { CheckinResult } from '@/components/checkin/CheckinResult';
import { WeeklySummaryCard } from '@/components/checkin/WeeklySummaryCard';
import { RecordingTasks } from '@/components/guide/RecordingTasks';
import { Button, EmptyState, ErrorState, IconBadge, Notice, Screen, Skeleton, Text } from '@/components/ui';
import { useCheckinFlow } from '@/features/checkin/useCheckinFlow';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const c = strings.checkin;

/** Check-in semanal (seção 9.4). */
export default function CheckinScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const flow = useCheckinFlow();
  const header = <Stack.Screen options={{ title: c.title }} />;

  if (flow.state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (flow.state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={flow.reload} /></Screen>;
  if (!flow.overview) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="compass" message={c.needsPlan} action={{ label: strings.plan.answerGuide, onPress: () => router.replace('/guide') }} />
      </Screen>
    );
  }

  if (flow.step === 'record') {
    return (
      <Screen scroll={false} edges={['bottom']}>
        {header}
        <RecordingTasks tasks={flow.tasks} kind="checkin" onDone={flow.onRecorded} />
      </Screen>
    );
  }

  if (flow.step === 'questions') {
    return (
      <Screen edges={[]} footer={<Button label={c.seeResult} size="main" onPress={flow.showResult} />}>
        {header}
        <CheckinQuestions answers={flow.answers} onChange={flow.setAnswers} />
      </Screen>
    );
  }

  if (flow.step === 'result' && flow.outcome) {
    return (
      <Screen edges={[]} footer={<Button label={c.confirm} icon="check" size="main" loading={flow.saving} disabled={!flow.decision} onPress={flow.confirm} />}>
        {header}
        <Text variant="title" accessibilityRole="header">
          {c.resultTitle}
        </Text>
        <CheckinResult outcome={flow.outcome} answers={flow.answers} decision={flow.decision} onDecision={flow.setDecision} />
        <WeeklySummaryCard state={flow.summary} onGenerate={flow.summarize} />
        {flow.beforeAfter && <Button label={c.beforeAfter} icon="columns" variant="secondary" onPress={flow.beforeAfter} />}
      </Screen>
    );
  }

  return (
    <Screen edges={[]} footer={<Button label={c.start} icon="mic" size="main" onPress={flow.start} />}>
      {header}
      <View style={styles.intro}>
        <IconBadge icon="calendar" size="lg" />
        <Text>{flow.full ? c.fullBody : c.introBody}</Text>
      </View>
      <Notice icon="volume-x">{strings.guide.baseline.tips}</Notice>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  intro: { gap: t.spacing.lg, paddingTop: t.spacing.lg },
}));
