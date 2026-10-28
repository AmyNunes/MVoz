import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceFrame } from '@/audio/analyzer';
import type { RecordingKind } from '@/db/recordingsRepo';
import type { RecordingTask } from '@/guide/baseline';
import { newId } from '@/lib/ids';
import type { LiveVoice } from '@/features/meter/useLiveVoice';
import { newRecordingFile } from '@/features/recordings/files';
import { saveRecording } from '@/features/recordings/save';

export type TaskResult = { recordingId: string | null; frames: VoiceFrame[] };

const TICK_MS = 200;
/** Uma tarefa de fala precisa de pelo menos isso de voz para valer. */
const MIN_VOICED_RATIO = 0.2;

export function hasEnoughVoice(frames: readonly VoiceFrame[]): boolean {
  return frames.length > 0 && frames.filter((f) => f.hz !== null).length / frames.length >= MIN_VOICED_RATIO;
}

/**
 * Grava uma tarefa guiada (gravação inicial, check-in): WAV + medidas, parando sozinha no
 * tempo da tarefa. Cada tarefa vira uma gravação do tipo `kind`, sem aviso na tela.
 */
export function useTaskRecorder(live: Pick<LiveVoice, 'startFile' | 'stopFile' | 'onFrames'>, kind: RecordingKind) {
  const { startFile, stopFile, onFrames } = live;
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState<RecordingTask | null>(null);
  const session = useRef<{ id: string; file: string; frames: VoiceFrame[]; unsubscribe: () => void; startedAt: number } | null>(null);

  const stop = useCallback(async (): Promise<TaskResult | null> => {
    const current = session.current;
    if (!current) return null;
    session.current = null;
    current.unsubscribe();
    setActive(null);
    let durationSec = (Date.now() - current.startedAt) / 1000;
    try {
      durationSec = await stopFile();
    } catch {
      // Mantém a duração do relógio.
    }
    const saved = await saveRecording({ id: current.id, kind, file: current.file, durationSec, frames: current.frames, band: null });
    return { recordingId: saved ? current.id : null, frames: current.frames };
  }, [kind, stopFile]);

  const start = useCallback(
    async (task: RecordingTask) => {
      if (session.current) return;
      const id = newId();
      const { file, relative } = newRecordingFile(id);
      await startFile(file.uri);
      const frames: VoiceFrame[] = [];
      let offset: number | null = null;
      const unsubscribe = onFrames((batch) => {
        for (const f of batch) {
          offset ??= f.t;
          frames.push({ ...f, t: f.t - offset });
        }
      });
      session.current = { id, file: relative, frames, unsubscribe, startedAt: Date.now() };
      setElapsed(0);
      setActive(task);
    },
    [startFile, onFrames],
  );

  // Relógio da tarefa (o fim é decidido por quem usa, que chama `stop`).
  useEffect(() => {
    if (!active) return;
    const since = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - since) / 1000), TICK_MS);
    return () => clearInterval(timer);
  }, [active]);

  return { active, elapsed, start, stop };
}
