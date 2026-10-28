import { useCallback } from 'react';

import { explainRecording } from '@/ai/functions/recording';
import { AiErrorView } from '@/components/ai/AiErrorView';
import { ExerciseCards } from '@/components/ai/ExerciseCards';
import { BulletList } from '@/components/exercises/StepList';
import { Button, Card, Skeleton, Text } from '@/components/ui';
import type { Recording } from '@/db/recordingsRepo';
import { getExercise } from '@/exercises/catalog';
import { loadUserContext } from '@/features/ai/userContext';
import { useAiAction } from '@/features/ai/useAiAction';
import { strings } from '@/i18n/strings';
import { useTheme } from '@/theme';

const a = strings.ai;

/** "Perguntar à IA sobre esta gravação" (seção 10.8): manda só as métricas, nunca o áudio. */
export function AskAiCard({ recording }: { recording: Recording }) {
  const theme = useTheme();
  const call = useCallback(async () => {
    if (!recording.metrics) throw new Error('sem métricas');
    const ctx = await loadUserContext();
    const exerciseName = recording.exerciseId ? (getExercise(recording.exerciseId)?.name ?? null) : null;
    return explainRecording({ recordingId: recording.id, kind: recording.kind, exerciseName, metrics: recording.metrics }, ctx);
  }, [recording]);
  const { state, run } = useAiAction(call);

  if (!recording.metrics) return null;
  if (state.status === 'idle') {
    return (
      <>
        <Button label={a.recording.ask} icon="message-circle" variant="secondary" onPress={() => void run()} />
        <Text variant="caption" color="textMuted" align="center">
          {a.privacy}
        </Text>
      </>
    );
  }
  if (state.status === 'loading') {
    return (
      <>
        <Text color="textMuted" accessibilityLiveRegion="polite">
          {a.thinking}
        </Text>
        <Skeleton height={theme.sizes.listRowHeight * 2} />
      </>
    );
  }
  if (state.status === 'error') return <AiErrorView error={state.error} onRetry={() => void run()} />;

  const { data } = state.data;
  return (
    <Card title={a.recording.title}>
      <Text>{data.summaryPt}</Text>
      {data.strengthsPt.length > 0 && (
        <>
          <Text variant="label">{a.recording.strengths}</Text>
          <BulletList items={data.strengthsPt} />
        </>
      )}
      {data.focusPt.length > 0 && (
        <>
          <Text variant="label">{a.recording.focus}</Text>
          <BulletList items={data.focusPt} />
        </>
      )}
      <ExerciseCards ids={data.suggestedExerciseIds} />
      {state.data.cached && (
        <Text variant="caption" color="textMuted">
          {a.cached}
        </Text>
      )}
    </Card>
  );
}
