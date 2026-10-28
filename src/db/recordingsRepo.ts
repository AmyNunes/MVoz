import { segmentMetricsSchema, type SegmentMetrics } from '@/audio/metrics';
import { pitchTrackSchema, type PitchTrack } from '@/audio/pitchTrack';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Inicial (Guia), check-in, exercício ou livre (Medidor). */
export type RecordingKind = 'baseline' | 'checkin' | 'exercise' | 'free';

export type Recording = {
  id: string;
  kind: RecordingKind;
  /** Caminho relativo à pasta de documentos do app (ex.: "recordings/<id>.wav"). */
  file: string;
  durationSec: number;
  createdAt: string;
  metrics: SegmentMetrics | null;
  pitchTrack: PitchTrack | null;
  note: string;
  favorite: boolean;
  exerciseId: string | null;
  checkinId: string | null;
};

export type NewRecording = Omit<Recording, 'note' | 'favorite' | 'exerciseId' | 'checkinId'> &
  Partial<Pick<Recording, 'exerciseId' | 'checkinId'>>;

type Row = Omit<Recording, 'metrics' | 'pitchTrack' | 'favorite'> & {
  metrics: string;
  pitchTrack: string;
  favorite: number;
};

function fromRow(row: Row): Recording {
  return {
    ...row,
    metrics: parseJsonWith<SegmentMetrics | null>(row.metrics, segmentMetricsSchema, null),
    pitchTrack: parseJsonWith<PitchTrack | null>(row.pitchTrack, pitchTrackSchema, null),
    favorite: row.favorite === 1,
  };
}

export async function insertRecording(recording: NewRecording): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO recordings (id, kind, file, durationSec, createdAt, metrics, pitchTrack, exerciseId, checkinId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    recording.id,
    recording.kind,
    recording.file,
    recording.durationSec,
    recording.createdAt,
    JSON.stringify(recording.metrics),
    JSON.stringify(recording.pitchTrack),
    recording.exerciseId ?? null,
    recording.checkinId ?? null,
  );
}

/** Mais recentes primeiro. */
export async function listRecordings(): Promise<Recording[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM recordings ORDER BY createdAt DESC');
  return rows.map(fromRow);
}

export async function getRecording(id: string): Promise<Recording | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM recordings WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

export async function updateRecordingNote(id: string, note: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recordings SET note = ? WHERE id = ?', note, id);
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM recordings WHERE id = ?', id);
}

export async function countRecordings(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM recordings');
  return row?.n ?? 0;
}

export async function setRecordingFavorite(id: string, favorite: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE recordings SET favorite = ? WHERE id = ?', favorite ? 1 : 0, id);
}

/** "Desfazer" depois de excluir: volta a gravação como estava (anotação e favorito inclusos). */
export async function restoreRecording(recording: Recording): Promise<void> {
  await insertRecording(recording);
  const db = await getDb();
  await db.runAsync('UPDATE recordings SET note = ?, favorite = ? WHERE id = ?', recording.note, recording.favorite ? 1 : 0, recording.id);
}
