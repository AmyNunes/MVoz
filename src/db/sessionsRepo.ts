import {
  EMPTY_RATING,
  resultDetailsSchema,
  resultRatingSchema,
  type Discomfort,
  type Feeling,
  type ResultDetails,
  type ResultRating,
} from '@/exercises/results';
import type { SessionRecord } from '@/guide/records';
import { nowIso, studyDayKey } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** De onde veio o treino: plano (Fase 4), rotina, treino curto ou um exercício avulso. */
export type SessionOrigin = 'plan' | 'routine' | 'minimal' | 'single';

export type ExerciseResult = {
  id: string;
  sessionId: string;
  exerciseId: string;
  startedAt: string;
  durationSec: number;
  repsDone: number;
  skipped: boolean;
  metrics: ResultDetails;
  rating: ResultRating;
  recordingId: string | null;
};

export type NewExerciseResult = Omit<ExerciseResult, 'id'>;

/** Começa um treino (sessão) e devolve o id. O dia de treino vira às 04:00. */
export async function startSession(input: {
  origin: SessionOrigin;
  routineId?: string | null;
  /** Quando começou (padrão: agora). */
  startedAt?: string;
  /** Treino do plano: bloco (1 ou 2), etapa e "Como está sua voz hoje?". */
  block?: 1 | 2;
  stageIndex?: number | null;
  voiceToday?: 'good' | 'tired' | 'hoarse' | null;
}): Promise<string> {
  const db = await getDb();
  const id = newId();
  const now = input.startedAt ? new Date(input.startedAt) : new Date();
  await db.runAsync(
    `INSERT INTO sessions (id, date, block, origin, routineId, stageIndex, voiceToday, startedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    studyDayKey(now),
    input.block ?? 1,
    input.origin,
    input.routineId ?? null,
    input.stageIndex ?? null,
    input.voiceToday ?? null,
    now.toISOString(),
  );
  return id;
}

/** Fecha o treino: minutos, como foi, desconforto (o maior do treino) e se parou por dor. */
export async function finishSession(
  id: string,
  outcome: { minutes: number; feeling: Feeling | null; discomfort: Discomfort | null; stoppedForPain: boolean },
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE sessions SET endedAt = ?, minutes = ?, feeling = ?, discomfort = ?, stoppedForPain = ? WHERE id = ?`,
    nowIso(),
    outcome.minutes,
    outcome.feeling,
    outcome.discomfort,
    outcome.stoppedForPain ? 1 : 0,
    id,
  );
}

export async function insertExerciseResult(result: NewExerciseResult): Promise<string> {
  const db = await getDb();
  const id = newId();
  await db.runAsync(
    `INSERT INTO exercise_results
       (id, sessionId, exerciseId, startedAt, durationSec, repsDone, skipped, metrics, rating, recordingId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    result.sessionId,
    result.exerciseId,
    result.startedAt,
    result.durationSec,
    result.repsDone,
    result.skipped ? 1 : 0,
    JSON.stringify(result.metrics),
    JSON.stringify(result.rating),
    result.recordingId,
  );
  return id;
}

type ResultRow = Omit<ExerciseResult, 'skipped' | 'metrics' | 'rating'> & {
  skipped: number;
  metrics: string;
  rating: string;
};

/**
 * Treinos com os resultados, mais recentes primeiro (para os marcos, as regras de segurança
 * e "Sua semana"). `since` = ISO de início (ex.: começo da etapa).
 */
export async function listSessionRecords(options: { since?: string; limit?: number } = {}): Promise<SessionRecord[]> {
  const db = await getDb();
  const sessions = await db.getAllAsync<SessionRow>(
    `SELECT * FROM sessions WHERE endedAt IS NOT NULL AND startedAt >= ? ORDER BY startedAt DESC LIMIT ?`,
    options.since ?? '',
    options.limit ?? 500,
  );
  if (sessions.length === 0) return [];
  const placeholders = sessions.map(() => '?').join(',');
  const rows = await db.getAllAsync<ResultRow>(
    `SELECT * FROM exercise_results WHERE sessionId IN (${placeholders}) ORDER BY startedAt`,
    ...sessions.map((s) => s.id),
  );
  const bySession = new Map<string, SessionRecord['results']>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push({
      exerciseId: row.exerciseId,
      repsDone: row.repsDone,
      skipped: row.skipped === 1,
      metrics: parseJsonWith(row.metrics, resultDetailsSchema, {}),
      rating: parseJsonWith(row.rating, resultRatingSchema, EMPTY_RATING),
    });
    bySession.set(row.sessionId, list);
  }
  return sessions.map((s) => ({
    id: s.id,
    date: s.date,
    startedAt: s.startedAt,
    origin: s.origin,
    block: s.block,
    minutes: s.minutes,
    discomfort: s.discomfort === 0 || s.discomfort === 1 || s.discomfort === 2 ? s.discomfort : null,
    stoppedForPain: s.stoppedForPain === 1,
    results: bySession.get(s.id) ?? [],
  }));
}

type SessionRow = {
  id: string;
  date: string;
  startedAt: string;
  origin: string;
  block: number;
  minutes: number;
  discomfort: number | null;
  stoppedForPain: number;
};

export async function listSessionResults(sessionId: string): Promise<ExerciseResult[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ResultRow>(
    'SELECT * FROM exercise_results WHERE sessionId = ? ORDER BY startedAt',
    sessionId,
  );
  return rows.map((row) => ({
    ...row,
    skipped: row.skipped === 1,
    metrics: parseJsonWith(row.metrics, resultDetailsSchema, {}),
    rating: parseJsonWith(row.rating, resultRatingSchema, EMPTY_RATING),
  }));
}
