import { router, Stack } from 'expo-router';

import { AiErrorView } from '@/components/ai/AiErrorView';
import { ChoiceList } from '@/components/guide/ChoiceList';
import { Button, Card, EmptyState, ErrorState, Screen, Skeleton, Text, TextField } from '@/components/ui';
import type { PlanChangeSuggestion } from '@/ai/schemas/adjustPlan';
import { getExercise } from '@/exercises/catalog';
import { usePlanAdjust } from '@/features/plan/usePlanAdjust';
import type { Plan } from '@/guide/plan';
import { strings } from '@/i18n/strings';
import { useTheme } from '@/theme';

const a = strings.ai.adjust;
const name = (id: string) => getExercise(id)?.name ?? id;

function describe(change: PlanChangeSuggestion, plan: Plan): string {
  const stage = strings.guide.stages[plan.stages[change.stageIndex].id].name;
  if (change.action === 'replace') return a.actions.replace(name(change.exerciseId), name(change.replaceWithId ?? ''), stage);
  return a.actions[change.action](name(change.exerciseId), stage);
}

/** "Ajustar com IA" (seções 9.5 e 10.6). */
export default function PlanAdjustScreen() {
  const theme = useTheme();
  const adjust = usePlanAdjust();
  const { current, ai } = adjust;
  const header = <Stack.Screen options={{ title: a.title }} />;

  if (adjust.plan.state.status === 'loading') return <Screen edges={[]}>{header}<Skeleton height={theme.sizes.traceHeight} /></Screen>;
  if (adjust.plan.state.status === 'error') return <Screen edges={[]}>{header}<ErrorState onRetry={adjust.plan.reload} /></Screen>;
  if (!current) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState icon="compass" message={strings.plan.empty} action={{ label: strings.plan.answerGuide, onPress: () => router.replace('/guide') }} />
      </Screen>
    );
  }

  const footer =
    ai.status === 'success' && adjust.changes.length > 0 ? (
      <Button label={a.apply(adjust.acceptedCount)} icon="check" size="main" disabled={adjust.acceptedCount === 0} loading={adjust.applying} onPress={adjust.apply} />
    ) : (
      <Button label={a.send} icon="send" size="main" disabled={adjust.request.trim() === '' || ai.status === 'loading'} loading={ai.status === 'loading'} onPress={adjust.send} />
    );

  return (
    <Screen edges={[]} footer={footer}>
      {header}
      <TextField label={a.label} placeholder={a.placeholder} value={adjust.request} onChangeText={adjust.setRequest} multiline />
      <Text variant="caption" color="textMuted">
        {strings.ai.privacy}
      </Text>
      {ai.status === 'loading' && <Skeleton height={theme.sizes.listRowHeight * 2} />}
      {ai.status === 'error' && <AiErrorView error={ai.error} onRetry={adjust.send} />}
      {ai.status === 'success' && (
        <Card title={a.changesTitle}>
          <Text>{ai.data.explanationPt}</Text>
          {adjust.changes.length === 0 ? (
            <Text color="textMuted">{a.none}</Text>
          ) : (
            <>
              <Text variant="caption" color="textMuted">
                {a.changesHint}
              </Text>
              <ChoiceList
                multiple
                accessibilityLabel={a.changesTitle}
                choices={adjust.changes.map((c, i) => ({ value: i, label: `${describe(c, current)}${c.reasonPt ? ` — ${c.reasonPt}` : ''}` }))}
                selected={adjust.changes.flatMap((_, i) => (adjust.isAccepted(i) ? [i] : []))}
                onToggle={adjust.toggle}
              />
            </>
          )}
        </Card>
      )}
    </Screen>
  );
}
