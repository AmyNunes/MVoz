import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import {
  deleteRecording,
  getRecording,
  listRecordings,
  restoreRecording,
  setRecordingFavorite,
  updateRecordingNote,
  type Recording,
} from '@/db/recordingsRepo';
import { strings } from '@/i18n/strings';
import { useDebouncedSave } from '@/lib/useDebouncedSave';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

import { deleteRecordingFile, recordingFile } from './files';

const r = strings.recordings;

/** O áudio de uma gravação excluída espera o "Desfazer" (5 s) antes de ser apagado. */
const UNDO_MS = 8000;

/** Lista de gravações (mais recentes primeiro), com favoritar e excluir com "Desfazer" (seção 6). */
export function useRecordingList() {
  const loader = useLoader(listRecordings);
  const { refresh } = loader;

  const toggleFavorite = useCallback(
    async (recording: Recording) => {
      await setRecordingFavorite(recording.id, !recording.favorite);
      refresh();
      showSnackbar(recording.favorite ? r.unfavorited : r.favorited);
    },
    [refresh],
  );

  const remove = useCallback(
    async (recording: Recording) => {
      await deleteRecording(recording.id);
      refresh();
      let undone = false;
      const timer = setTimeout(() => {
        if (!undone) deleteRecordingFile(recording.file);
      }, UNDO_MS);
      showSnackbar(r.deleted, {
        label: r.undo,
        onPress: () => {
          undone = true;
          clearTimeout(timer);
          void restoreRecording(recording).then(refresh);
        },
      });
    },
    [refresh],
  );

  return { ...loader, toggleFavorite, remove };
}

/** Apaga a gravação do banco e o áudio do celular. */
export async function removeRecording(recording: Pick<Recording, 'id' | 'file'>): Promise<void> {
  await deleteRecording(recording.id);
  deleteRecordingFile(recording.file);
}

/** Detalhe: dados, anotação salva sozinha, endereço do áudio e excluir (com confirmação). */
export function useRecordingDetail(id: string) {
  const loader = useLoader(() => getRecording(id), id);
  const [note, setNote] = useState<string | null>(null);
  const saver = useDebouncedSave((value: string) => updateRecordingNote(id, value));
  const recording = loader.state.status === 'success' ? loader.state.data : null;
  const file = recording ? recordingFile(recording.file) : null;

  const changeNote = useCallback(
    (value: string) => {
      setNote(value);
      saver.schedule(value);
    },
    [saver],
  );

  const confirmDelete = useCallback(
    (onDeleted: () => void) => {
      if (!recording) return;
      Alert.alert(r.deleteTitle, r.deleteBody, [
        { text: strings.common.cancel, style: 'cancel' },
        {
          text: r.delete,
          style: 'destructive',
          onPress: () => {
            void removeRecording(recording).then(onDeleted);
          },
        },
      ]);
    },
    [recording],
  );

  return {
    ...loader,
    recording,
    note: note ?? recording?.note ?? '',
    changeNote,
    /** `null` se o arquivo sumiu (ex.: apagado fora do app). */
    audioUri: file?.exists ? file.uri : null,
    confirmDelete,
  };
}
