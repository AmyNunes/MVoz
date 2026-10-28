import type { Db, Migration } from './types';

/**
 * Aplica, em ordem, as migrations com versão maior que `PRAGMA user_version`.
 * Cada migration roda numa transação junto com a atualização da versão:
 * ou entra inteira, ou não entra.
 */
export async function runMigrations(db: Db, migrations: readonly Migration[]): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let current = row?.user_version ?? 0;

  const pending = [...migrations]
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    await db.withTransactionAsync(async () => {
      await migration.up(db);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    current = migration.version;
  }

  return current;
}
