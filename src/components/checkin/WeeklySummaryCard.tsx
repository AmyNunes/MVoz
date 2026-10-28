import { AiErrorView } from '@/components/ai/AiErrorView';
import { Button, Card, Skeleton, Text } from '@/components/ui';
import type { AiActionState } from '@/features/ai/useAiAction';
import type { WeeklySummary } from '@/ai/schemas/weeklySummary';
import { strings } from '@/i18n/strings';
import { useTheme } from '@/theme';

const w = strings.ai.weekly;

/** Resumo da semana com IA, no resultado do check-in (seção 9.4). A decisão continua das regras. */
export function WeeklySummaryCard({ state, onGenerate }: { state: AiActionState<WeeklySummary>; onGenerate: () => void }) {
  const theme = useTheme();
  if (state.status === 'idle') return <Button label={w.generate} icon="zap" variant="secondary" onPress={onGenerate} />;
  if (state.status === 'loading') return <Skeleton height={theme.sizes.listRowHeight * 2} />;
  if (state.status === 'error') return <AiErrorView error={state.error} onRetry={onGenerate} />;
  return (
    <Card title={w.title}>
      <Text>{state.data.summaryPt}</Text>
      {state.data.focusNextWeekPt !== '' && (
        <>
          <Text variant="label">{w.next}</Text>
          <Text>{state.data.focusNextWeekPt}</Text>
        </>
      )}
    </Card>
  );
}
