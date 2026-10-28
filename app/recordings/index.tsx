import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { GestureGuide } from '@/components/navigation/GestureGuide';
import { RecordingRow } from '@/components/recordings/RecordingRow';
import { Button, Chip, EmptyState, ErrorState, ListGroup, ListRow, Screen, Sheet, Skeleton, Text } from '@/components/ui';
import type { Recording } from '@/db/recordingsRepo';
import { compareOrder, filterRecordings, RECORDING_FILTERS, type RecordingFilter } from '@/features/recordings/filter';
import { useRecordingList } from '@/features/recordings/useRecordings';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const r = strings.recordings;

/** Gravações (seção 10.7): filtros, favoritas, excluir com "Desfazer" e escolher 2 para comparar. */
export default function RecordingsScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { state, reload, toggleFavorite, remove } = useRecordingList();
  const [filter, setFilter] = useState<RecordingFilter>('all');
  const [selection, setSelection] = useState<Recording[] | null>(null);
  const [menuFor, setMenuFor] = useState<Recording | null>(null);
  const all = state.status === 'success' ? state.data : [];
  const visible = filterRecordings(all, filter);

  const toggleSelected = (recording: Recording) =>
    setSelection((current) => {
      const list = current ?? [];
      if (list.some((x) => x.id === recording.id)) return list.filter((x) => x.id !== recording.id);
      return list.length < 2 ? [...list, recording] : list;
    });

  const compare = () => {
    if (selection?.length !== 2) return;
    const [before, after] = compareOrder(selection[0], selection[1]);
    setSelection(null);
    router.push({ pathname: '/recordings/compare', params: { a: before.id, b: after.id } });
  };

  const act = (action: (recording: Recording) => void) => {
    if (menuFor) action(menuFor);
    setMenuFor(null);
  };

  const footer =
    all.length >= 2 ? (
      selection ? (
        <View style={styles.row}>
          <View style={styles.flex}>
            <Button label={r.cancelSelect} variant="secondary" onPress={() => setSelection(null)} />
          </View>
          <View style={styles.flex}>
            <Button label={r.compare} icon="columns" disabled={selection.length !== 2} onPress={compare} />
          </View>
        </View>
      ) : (
        <Button label={r.select} icon="check-square" variant="secondary" onPress={() => setSelection([])} />
      )
    ) : undefined;

  return (
    <Screen edges={[]} footer={footer}>
      <Stack.Screen options={{ title: r.title }} />
      {state.status === 'loading' && <Skeleton height={theme.sizes.listRowHeight} />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && all.length === 0 && (
        <EmptyState icon="mic" message={r.empty} action={{ label: r.openMeter, onPress: () => router.push('/meter') }} />
      )}
      {all.length > 0 && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityLabel={r.filterLabel}>
            {RECORDING_FILTERS.map((f) => (
              <Chip key={f} label={r.filters[f]} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>
          {selection && (
            <Text color="textMuted" accessibilityLiveRegion="polite">
              {`${r.selected(selection.length)} · ${r.selectHint}`}
            </Text>
          )}
          {visible.length === 0 ? (
            <Text color="textMuted">{r.emptyFilter}</Text>
          ) : (
            <ListGroup>
              {visible.map((recording) => (
                <RecordingRow
                  key={recording.id}
                  recording={recording}
                  selecting={selection !== null}
                  selected={selection?.some((x) => x.id === recording.id) ?? false}
                  onPress={() => (selection ? toggleSelected(recording) : router.push(`/recordings/${recording.id}`))}
                  onLongPress={() => toggleSelected(recording)}
                  onFavorite={() => void toggleFavorite(recording)}
                  onDelete={() => void remove(recording)}
                  onMenu={() => setMenuFor(recording)}
                />
              ))}
            </ListGroup>
          )}
        </>
      )}

      <GestureGuide name="recordings" when={all.length > 0} />
      <Sheet visible={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor ? r.kinds[menuFor.kind] : undefined}>
        <ListGroup>
          <ListRow icon="play" title={r.listen} onPress={() => act((x) => router.push(`/recordings/${x.id}`))} />
          <ListRow icon="star" title={menuFor?.favorite ? r.unfavorite : r.favorite} onPress={() => act((x) => void toggleFavorite(x))} />
          {all.length >= 2 && <ListRow icon="check-square" title={r.select} onPress={() => act((x) => setSelection([x]))} />}
          <ListRow icon="trash-2" iconColor="danger" title={r.delete} onPress={() => act((x) => void remove(x))} />
        </ListGroup>
      </Sheet>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  chips: { gap: t.spacing.sm },
  row: { flexDirection: 'row', gap: t.spacing.md },
  flex: { flex: 1 },
}));
