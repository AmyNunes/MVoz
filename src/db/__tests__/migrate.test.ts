import { runMigrations } from '../migrate';
import type { Db, Migration } from '../types';

/** Banco de mentira: guarda o SQL executado e a versão atual. */
function fakeDb(initialVersion = 0) {
  let version = initialVersion;
  const executed: string[] = [];
  const db = {
    execAsync: jest.fn(async (sql: string) => {
      executed.push(sql);
      const match = /PRAGMA user_version = (\d+)/.exec(sql);
      if (match) version = Number(match[1]);
    }),
    getFirstAsync: jest.fn(async () => ({ user_version: version })),
    withTransactionAsync: jest.fn(async (task: () => Promise<void>) => task()),
    runAsync: jest.fn(),
    getAllAsync: jest.fn(),
  } as unknown as Db;
  return { db, executed, version: () => version };
}

const m = (version: number): Migration => ({
  version,
  name: `m${version}`,
  up: async (db) => db.execAsync(`-- up ${version}`),
});

describe('runMigrations', () => {
  it('aplica todas em ordem num banco novo', async () => {
    const { db, executed, version } = fakeDb(0);
    await runMigrations(db, [m(2), m(1)]);
    expect(executed).toEqual(['-- up 1', 'PRAGMA user_version = 1', '-- up 2', 'PRAGMA user_version = 2']);
    expect(version()).toBe(2);
  });

  it('aplica só as que faltam', async () => {
    const { db, executed } = fakeDb(1);
    await runMigrations(db, [m(1), m(2)]);
    expect(executed).toEqual(['-- up 2', 'PRAGMA user_version = 2']);
  });

  it('não faz nada se estiver em dia', async () => {
    const { db, executed } = fakeDb(2);
    await expect(runMigrations(db, [m(1), m(2)])).resolves.toBe(2);
    expect(executed).toEqual([]);
  });
});
