import { z } from 'zod';

import { routineItemSchema, type RoutineItem } from '@/exercises/results';
import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Minhas rotinas (seção 8.6). `useInToday` é usado pela tela Hoje (Fase 4). */
export type Routine = {
  id: string;
  name: string;
  items: RoutineItem[];
  origin: 'user' | 'plan' | 'ai';
  useInToday: 'never' | 'today' | 'always';
  createdAt: string;
  updatedAt: string;
};

type Row = Omit<Routine, 'items'> & { items: string };

const itemsSchema = z.array(routineItemSchema);

function fromRow(row: Row): Routine {
  return { ...row, items: parseJsonWith(row.items, itemsSchema, []) };
}

export async function listRoutines(): Promise<Routine[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Row>('SELECT * FROM routines ORDER BY updatedAt DESC');
  return rows.map(fromRow);
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<Row>('SELECT * FROM routines WHERE id = ?', id);
  return row ? fromRow(row) : null;
}

/** Cria uma rotina e devolve o id. */
export async function insertRoutine(input: { name: string; items: RoutineItem[]; origin?: Routine['origin'] }): Promise<string> {
  const db = await getDb();
  const id = newId();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO routines (id, name, items, origin, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)`,
    id,
    input.name,
    JSON.stringify(input.items),
    input.origin ?? 'user',
    now,
    now,
  );
  return id;
}

export async function updateRoutine(id: string, patch: { name: string; items: RoutineItem[] }): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE routines SET name = ?, items = ?, updatedAt = ? WHERE id = ?',
    patch.name,
    JSON.stringify(patch.items),
    nowIso(),
    id,
  );
}

/**
 * "Usar esta rotina hoje" ou "sempre" no lugar do treino do plano (seção 8.6). Só uma rotina
 * vale de cada vez. `today` vale no dia de treino em que foi escolhida (guardado em `updatedAt`).
 */
export async function setRoutineUseInToday(id: string, mode: Routine['useInToday']): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    if (mode !== 'never') await db.runAsync(`UPDATE routines SET useInToday = 'never' WHERE useInToday != 'never'`);
    await db.runAsync('UPDATE routines SET useInToday = ?, updatedAt = ? WHERE id = ?', mode, nowIso(), id);
  });
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM routines WHERE id = ?', id);
}

/** Volta uma rotina apagada (o "Desfazer" do Snackbar), com o mesmo id e datas. */
export async function restoreRoutine(routine: Routine): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO routines (id, name, items, origin, useInToday, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    routine.id,
    routine.name,
    JSON.stringify(routine.items),
    routine.origin,
    routine.useInToday,
    routine.createdAt,
    routine.updatedAt,
  );
}
