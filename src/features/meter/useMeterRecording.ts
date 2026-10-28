import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceFrame } from '@/audio/analyzer';
import { strings } from '@/i18n/strings';
import { newId } from '@/lib/ids';
import { showSnackbar } from '@/stores/snackbarStore';
import type { RecordingKind } from '@/db/recordingsRepo';
import { newRecordingFile } from '@/features/recordings/files';
import { saveRecording } from '@/features/recordings/save';

import type { Band } from './band';
import type { LiveVoice } from './useLiveVoice';

/** Limite por gravação (seção 7.5): para sozinha, com aviso. */
export const MAX_RECORDING_SEC = 180;
const TICK_MS = 250;

type Session = {
  id: string;
  file: string;
  startedAt: number;
  frames: VoiceFrame[];
  unsubscribe: () => void;
};

type EndReason = 'user' | 'limit' | 'interrupted';

const r = strings.meter.record;

type Options = {
  /** Livre (Medidor) ou de exercício (player). */
  kind?: RecordingKind;
  exerciseId?: string | null;
};

/**
 * Gravação do Medidor (seção 10.2) e dos exercícios (8.5): grava o WAV junto com a escuta e,
 * ao parar, salva em Gravações com as métricas. Se a escuta parar (sair da tela, segundo
 * plano), a gravação é finalizada e salva sozinha. `savedId` = última gravação salva.
 */
export function useMeterRecording(
  live: Pick<LiveVoice, 'listening' | 'startFile' | 'stopFile' | 'onFrames'>,
  band: Band | null,
  { kind = 'free', exerciseId = null }: Options = {},
) {
  const { listening, startFile, stopFile, onFrames } = live;
  const session = useRef<Session | null>(null);
  const bandRef = useRef(band);
  useEffect(() => {
    bandRef.current = band;
  }, [band]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);

  const finish = useCallback(
    async (reason: EndReason): Promise<string | null> => {
      const current = session.current;
      if (!current) return null;
      session.current = null;
      current.unsubscribe();
      setStartedAt(null);

      let durationSec = (Date.now() - current.startedAt) / 1000;
      // Se a escuta já parou, o expo-audio finalizou o arquivo sozinho.
      if (reason !== 'interrupted') {
        try {
          durationSec = await stopFile();
        } catch {
          // Mantém a duração medida pelo relógio.
        }
      }
      try {
        const saved = await saveRecording({
          id: current.id,
          kind,
          file: current.file,
          durationSec,
          frames: current.frames,
          band: bandRef.current,
          exerciseId,
        });
        if (!saved) {
          showSnackbar(r.tooShort);
          return null;
        }
        setSavedId(current.id);
        showSnackbar(reason === 'limit' ? r.savedLimit : r.saved, {
          label: strings.recordings.view,
          onPress: () => router.push(`/recordings/${current.id}`),
        });
        return current.id;
      } catch {
        showSnackbar(r.saveError);
        return null;
      }
    },
    [stopFile, kind, exerciseId],
  );

  const start = useCallback(async () => {
    if (session.current) return;
    const id = newId();
    const { file, relative } = newRecordingFile(id);
    try {
      await startFile(file.uri);
    } catch {
      showSnackbar(r.startError);
      return;
    }
    const current: Session = { id, file: relative, startedAt: Date.now(), frames: [], unsubscribe: () => {} };
    let offset: number | null = null;
    current.unsubscribe = onFrames((frames) => {
      for (const f of frames) {
        offset ??= f.t;
        current.frames.push({ ...f, t: f.t - offset });
      }
    });
    session.current = current;
    setElapsed(0);
    setStartedAt(current.startedAt);
  }, [startFile, onFrames]);

  // Relógio da gravação e limite de 3 minutos.
  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => {
      const seconds = (Date.now() - startedAt) / 1000;
      setElapsed(seconds);
      if (seconds >= MAX_RECORDING_SEC) finish('limit');
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [startedAt, finish]);

  // A escuta parou (pausa, segundo plano): salva o que foi gravado.
  useEffect(() => {
    if (!listening) finish('interrupted');
  }, [listening, finish]);

  // Saiu da tela gravando: salva também.
  useEffect(() => () => void finish('interrupted'), [finish]);

  const toggle = useCallback(async () => {
    if (session.current) await finish('user');
    else await start();
  }, [finish, start]);

  /** Para a gravação, se houver, e devolve o id salvo (ou o último salvo antes). */
  const stop = useCallback(async () => (session.current ? finish('user') : savedId), [finish, savedId]);

  return { recording: startedAt !== null, elapsed, toggle, stop, savedId };
}
