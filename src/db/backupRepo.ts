import { getDb } from './client';

/**
 * Tabelas que entram no backup (seção 13). O cache da IA fica de fora (dá para refazer) e os
 * áudios também: as gravações voltam sem o arquivo.
 */
export const BACKUP_TABLES = [
  'settings',
  'profile',
  'baselines',
  'plans',
  'plan_events',
  'routines',
  'sessions',
  'exercise_results',
  'recordings',
  'checkins',
  'coach_conversations',
  'notification_log',
  'ai_usage',
] as const;

export type TableRows = Record<string, Record<string, unknown>[]>;

async function existingTables(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'");
  return new Set(rows.map((r) => r.name));
}

async function columnsOf(table: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return rows.map((r) => r.name);
}

export async function schemaVersion(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

/** Lê todas as linhas das tabelas do backup. */
export async function dumpTables(): Promise<TableRows> {
  const db = await getDb();
  const existing = await existingTables();
  const out: TableRows = {};
  for (const table of BACKUP_TABLES) {
    if (existing.has(table)) out[table] = await db.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`);
  }
  return out;
}

type SqlValue = string | number | null;
const toSql = (v: unknown): SqlValue => (v == null ? null : typeof v === 'number' || typeof v === 'string' ? v : JSON.stringify(v));

/** "Substituir tudo": apaga e regrava as tabelas do backup numa transação. */
export async function replaceTables(data: TableRows): Promise<void> {
  const db = await getDb();
  const existing = await existingTables();
  const columns = new Map<string, string[]>();
  for (const table of BACKUP_TABLES) if (existing.has(table)) columns.set(table, await columnsOf(table));

  await db.withTransactionAsync(async () => {
    for (const table of BACKUP_TABLES) {
      const cols = columns.get(table);
      if (!cols) continue;
      await db.runAsync(`DELETE FROM ${table}`);
      for (const row of data[table] ?? []) {
        const keys = Object.keys(row).filter((k) => cols.includes(k));
        if (!keys.length) continue;
        await db.runAsync(
          `INSERT OR REPLACE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
          ...keys.map((k) => toSql(row[k])),
        );
      }
    }
  });
}

/** "Apagar tudo": esvazia todas as tabelas (inclusive o cache). */
export async function wipeAllTables(): Promise<void> {
  const db = await getDb();
  const existing = await existingTables();
  await db.withTransactionAsync(async () => {
    for (const table of [...BACKUP_TABLES, 'ai_cache']) if (existing.has(table)) await db.runAsync(`DELETE FROM ${table}`);
  });
}
