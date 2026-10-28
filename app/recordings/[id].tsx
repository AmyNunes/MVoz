import { router, Stack, useLocalSearchParams } from 'expo-router';

import { AskAiCard } from '@/components/recordings/AskAiCard';
import { PlaybackTrace } from '@/components/recordings/PlaybackTrace';
import { RecordingMetrics } from '@/components/recordings/RecordingMetrics';
import { Button, Card, EmptyState, ErrorState, Notice, Screen, Skeleton, Text, TextField } from '@/components/ui';
import { shareRecordingFile } from '@/features/recordings/files';
import { usePlayback } from '@/features/recordings/usePlayback';
import { useRecordingDetail } from '@/features/recordings/useRecordings';
import { strings } from '@/i18n/strings';
import { formatShortDate, formatTime } from '@/lib/dates';
import { formatClock } from '@/lib/format';
import { showSnackbar } from '@/stores/snackbarStore';
import { useTheme } from '@/theme';

const r = strings.recordings;

/** Detalhe da gravação (seção 10.8): ouvir com o traçado, métricas, "Perguntar à IA", anotação, excluir. */
export default function RecordingScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const detail = useRecordingDetail(id);
  const playback = usePlayback(detail.audioUri);
  const { recording, state } = detail;

  const onDelete = () =>
    detail.confirmDelete(() => {
      showSnackbar(r.deleted);
      router.back();
    });

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: r.detailTitle }} />
      {state.status === 'loading' && <Skeleton height={theme.sizes.traceHeight} />}
      {state.status === 'error' && <ErrorState onRetry={detail.reload} />}
      {state.status === 'success' && !recording && <EmptyState icon="mic-off" message={r.notFound} />}
      {recording && (
        <>
          <Text color="textMuted">
            {r.kinds[recording.kind]} · {formatShortDate(new Date(recording.createdAt))},{' '}
            {formatTime(new Date(recording.createdAt))}
          </Text>
          {recording.pitchTrack && (
            <PlaybackTrace track={recording.pitchTrack} durationSec={recording.durationSec} position={playback.position} />
          )}
          {detail.audioUri ? (
            <>
              <Button
                label={playback.playing ? r.pauseListening : r.listen}
                icon={playback.playing ? 'pause' : 'play'}
                size="main"
                disabled={!playback.ready}
                onPress={playback.toggle}
              />
              <Text variant="caption" color="textMuted" align="center">
                {r.position(formatClock(playback.position), formatClock(recording.durationSec))}
              </Text>
            </>
          ) : (
            <Notice tone="warning">{r.fileMissing}</Notice>
          )}
          {recording.metrics && (
            <Card title={r.metricsTitle}>
              <RecordingMetrics metrics={recording.metrics} />
            </Card>
          )}
          <AskAiCard recording={recording} />
          <TextField
            label={r.note}
            placeholder={r.notePlaceholder}
            value={detail.note}
            onChangeText={detail.changeNote}
            multiline
          />
          {detail.audioUri && (
            <Button
              label={r.share}
              icon="share-2"
              variant="secondary"
              onPress={() => shareRecordingFile(recording.file, r.shareTitle).catch(() => showSnackbar(strings.common.genericError))}
            />
          )}
          <Button label={r.delete} icon="trash-2" variant="secondary" onPress={onDelete} />
        </>
      )}
    </Screen>
  );
}
