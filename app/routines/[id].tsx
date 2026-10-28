import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { GestureGuide } from '@/components/navigation/GestureGuide';
import { ExercisePickerSheet } from '@/components/routines/ExercisePickerSheet';
import { ItemMenuSheet } from '@/components/routines/ItemMenuSheet';
import { RoutineItemRow } from '@/components/routines/RoutineItemRow';
import { RoutineWarnings } from '@/components/routines/RoutineWarnings';
import { Button, EmptyState, ErrorState, Screen, Skeleton, SortableList, Text, TextField } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import { routineDurationSec } from '@/exercises/routine';
import { useRoutineEditor } from '@/features/routines/useRoutineEditor';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';
import { useFontScale } from '@/lib/useFontScale';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const r = strings.routines;

/** Montar ou editar uma rotina (seção 8.6). */
export default function RoutineEditorScreen() {
  const styles = useStyles();
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const editor = useRoutineEditor(id, add);
  const [picker, setPicker] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  // Linhas de altura fixa (para arrastar): crescem junto com a fonte do sistema.
  const rowHeight = Math.round(styles.row.height * useFontScale());

  usePreventRemove(editor.dirty && !saving, ({ repeat }) => {
    Alert.alert(r.discardTitle, r.discardBody, [
      { text: r.keepEditing, style: 'cancel' },
      { text: r.discard, style: 'destructive', onPress: repeat },
    ]);
  });

  const save = async () => {
    setSaving(true);
    try {
      await editor.save();
      showSnackbar(r.saved);
      router.back();
    } catch {
      showSnackbar(r.saveError);
      setSaving(false);
    }
  };

  if (editor.status !== 'ready') {
    return (
      <Screen edges={[]}>
        <Stack.Screen options={{ title: r.editTitle }} />
        {editor.status === 'loading' && <Skeleton height={rowHeight} />}
        {editor.status === 'error' && <ErrorState onRetry={editor.retry} />}
        {editor.status === 'notFound' && <EmptyState icon="list" message={strings.common.genericError} />}
      </Screen>
    );
  }

  const plain = editor.items.map((k) => k.item);
  const menuItem = menuIndex === null ? null : (editor.items[menuIndex]?.item ?? null);

  return (
    <Screen edges={[]} footer={<Button label={r.save} icon="check" size="main" loading={saving} onPress={save} />}>
      <Stack.Screen options={{ title: id === 'new' ? r.new : r.editTitle }} />
      <TextField label={r.name} placeholder={r.namePlaceholder} value={editor.name} onChangeText={editor.setName} />

      {editor.items.length === 0 ? (
        <Text color="textMuted">{r.noItems}</Text>
      ) : (
        <>
          <Text variant="caption" color="textMuted">
            {r.summary(editor.items.length, formatMinutes(routineDurationSec(plain)))}
          </Text>
          <View style={styles.list}>
            <SortableList
              data={editor.items}
              keyOf={(k) => k.key}
              rowHeight={rowHeight}
              onReorder={editor.reorder}
              handleLabel={(k) => r.handle(getExercise(k.item.exerciseId)?.name ?? '')}
              renderItem={(k, index, handle) => <RoutineItemRow item={k.item} handle={handle} onMenu={() => setMenuIndex(index)} />}
            />
          </View>
        </>
      )}
      <Button label={r.add} icon="plus" variant="secondary" onPress={() => setPicker(true)} />
      <RoutineWarnings warnings={editor.warnings} />

      <GestureGuide name="editor" when={editor.items.length > 1} />
      <ExercisePickerSheet visible={picker} onClose={() => setPicker(false)} onPick={editor.add} />
      <ItemMenuSheet
        item={menuItem}
        index={menuIndex ?? 0}
        count={editor.items.length}
        onClose={() => setMenuIndex(null)}
        onMove={(delta) => {
          if (menuIndex === null) return;
          editor.move(menuIndex, delta);
          setMenuIndex(menuIndex + delta);
        }}
        onRemove={() => {
          if (menuIndex !== null) editor.removeAt(menuIndex);
          setMenuIndex(null);
        }}
        onChange={(patch) => menuIndex !== null && editor.updateAt(menuIndex, patch)}
      />
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  row: { height: t.sizes.listRowHeight + t.spacing.sm },
  list: { borderRadius: t.radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: t.colors.border },
}));
