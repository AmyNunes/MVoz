import { computeMetrics, type MetricFrame } from '@/audio/metrics';
import { reducePitchTrack } from '@/audio/pitchTrack';
import { insertRecording, type RecordingKind } from '@/db/recordingsRepo';
import { nowIso } from '@/lib/dates';

import { deleteRecordingFile } from './files';

/** Gravações mais curtas que isso são descartadas (toque sem querer). */
export const MIN_RECORDING_SEC = 1;

type SaveInput = {
  id: string;
  kind: RecordingKind;
  /** Caminho relativo do WAV já gravado. */
  file: string;
  durationSec: number;
  /** Medidas de 20 ms, com `t` contado do início da gravação. */
  frames: readonly MetricFrame[];
  band: { lowHz: number; highHz: number } | null;
  /** Exercício em que foi gravada (tipo `exercise`). */
  exerciseId?: string | null;
};

/**
 * Salva a gravação com as métricas (7.4) e o traçado reduzido (7.5).
 * Devolve `false` (e apaga o arquivo) se ela for curta demais.
 */
export async function saveRecording(input: SaveInput): Promise<boolean> {
  if (input.durationSec < MIN_RECORDING_SEC) {
    deleteRecordingFile(input.file);
    return false;
  }
  await insertRecording({
    id: input.id,
    kind: input.kind,
    file: input.file,
    durationSec: input.durationSec,
    createdAt: nowIso(),
    metrics: computeMetrics(input.frames, { band: input.band }),
    pitchTrack: reducePitchTrack(input.frames),
    exerciseId: input.exerciseId ?? null,
  });
  return true;
}
