import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * A parte do banco que o app usa. Repositórios dependem só disto,
 * o que permite testar com um banco "de mentira".
 */
export type Db = Pick<
  SQLiteDatabase,
  'execAsync' | 'runAsync' | 'getFirstAsync' | 'getAllAsync' | 'withTransactionAsync'
>;

export type Migration = {
  version: number;
  name: string;
  up: (db: Db) => Promise<void>;
};
