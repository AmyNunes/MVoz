import type { Migration } from '../types';

// Fase 5. Nunca edite esta migration: crie outra.
export const migration005: Migration = {
  version: 5,
  name: 'coach',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE coach_conversations (
        id TEXT PRIMARY KEY NOT NULL,
        messages TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        endedAt TEXT
      );
    `);
  },
};
