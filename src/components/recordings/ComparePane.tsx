import { Button, Card, Notice, Text } from '@/components/ui';
import type { Recording } from '@/db/recordingsRepo';
import { recordingFile } from '@/features/recordings/files';
import { usePlayback } from '@/features/recordings/usePlayback';
import { strings } from '@/i18n/strings';
import { formatShortDate } from '@/lib/dates';

import { PlaybackTrace } from './PlaybackTrace';

const r = strings.recordings;

/** Um lado do "antes × depois": traçado e o áudio para ouvir. */
export function ComparePane({ recording, title }: { recording: Recording; title: string }) {
  const file = recordingFile(recording.file);
  const playback = usePlayback(file.exists ? file.uri : null);
  return (
    <Card title={`${title} · ${r.kinds[recording.kind]} · ${formatShortDate(new Date(recording.createdAt))}`}>
      {recording.pitchTrack && <PlaybackTrace track={recording.pitchTrack} durationSec={recording.durationSec} position={playback.position} />}
      {file.exists ? (
        <Button
          label={playback.playing ? r.pauseListening : r.listen}
          icon={playback.playing ? 'pause' : 'play'}
          variant="secondary"
          disabled={!playback.ready}
          onPress={playback.toggle}
        />
      ) : (
        <Notice tone="warning">{r.fileMissing}</Notice>
      )}
      {!recording.metrics && <Text color="textMuted">{r.metrics.noVoice}</Text>}
    </Card>
  );
}
