import type { Migration } from '../types';

// Fase 2. Nunca edite esta migration: crie outra.
export const migration002: Migration = {
  version: 2,
  name: 'recordings',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE recordings (
        id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL,
        file TEXT NOT NULL,
        durationSec REAL NOT NULL,
        createdAt TEXT NOT NULL,
        metrics TEXT NOT NULL,
        pitchTrack TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        favorite INTEGER NOT NULL DEFAULT 0,
        exerciseId TEXT,
        checkinId TEXT
      );
      CREATE INDEX idx_recordings_kind_created ON recordings(kind, createdAt);
    `);
  },
};
