import { IconButton, ListRow, SwipeRow } from '@/components/ui';
import type { Recording } from '@/db/recordingsRepo';
import { strings } from '@/i18n/strings';
import { formatShortDate, formatTime } from '@/lib/dates';
import { formatClock } from '@/lib/format';

const r = strings.recordings;

type Props = {
  recording: Recording;
  /** Modo "escolher 2 para comparar". */
  selecting: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  onMenu: () => void;
};

/** Uma gravação na lista: ← exclui, → favorita, segurar escolhe para comparar (seção 6). */
export function RecordingRow({ recording, selecting, selected, onPress, onLongPress, onFavorite, onDelete, onMenu }: Props) {
  const date = new Date(recording.createdAt);
  const median = recording.metrics?.medianHz;
  const title = r.kinds[recording.kind];
  return (
    <SwipeRow
      enabled={!selecting}
      onSwipeLeft={{ label: r.delete, icon: 'trash-2', color: 'danger', onTrigger: onDelete }}
      onSwipeRight={{ label: recording.favorite ? r.unfavorite : r.favorite, icon: 'star', color: 'warning', onTrigger: onFavorite }}
    >
      <ListRow
        icon={selecting ? (selected ? 'check-square' : 'square') : recording.favorite ? 'star' : 'mic'}
        iconColor={recording.favorite && !selecting ? 'warning' : 'primary'}
        title={title}
        subtitle={r.rowSubtitle(`${formatShortDate(date)}, ${formatTime(date)}`, formatClock(recording.durationSec))}
        value={median ? strings.meter.hzShort(Math.round(median)) : undefined}
        onPress={onPress}
        onLongPress={onLongPress}
        right={selecting ? undefined : <IconButton icon="more-vertical" accessibilityLabel={r.menu(title)} onPress={onMenu} />}
      />
    </SwipeRow>
  );
}
