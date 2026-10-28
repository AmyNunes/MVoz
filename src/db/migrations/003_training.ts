import type { Migration } from '../types';

// Fase 3. Nunca edite esta migration: crie outra.
export const migration003: Migration = {
  version: 3,
  name: 'training',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE routines (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        items TEXT NOT NULL,
        origin TEXT NOT NULL DEFAULT 'user',
        useInToday TEXT NOT NULL DEFAULT 'never',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        block INTEGER NOT NULL DEFAULT 1,
        origin TEXT NOT NULL,
        routineId TEXT,
        stageIndex INTEGER,
        voiceToday TEXT,
        startedAt TEXT NOT NULL,
        endedAt TEXT,
        minutes REAL NOT NULL DEFAULT 0,
        feeling TEXT,
        discomfort INTEGER,
        stoppedForPain INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_sessions_date ON sessions(date);

      CREATE TABLE exercise_results (
        id TEXT PRIMARY KEY NOT NULL,
        sessionId TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exerciseId TEXT NOT NULL,
        startedAt TEXT NOT NULL,
        durationSec REAL NOT NULL DEFAULT 0,
        repsDone INTEGER NOT NULL DEFAULT 0,
        skipped INTEGER NOT NULL DEFAULT 0,
        metrics TEXT NOT NULL DEFAULT '{}',
        rating TEXT NOT NULL DEFAULT '{}',
        recordingId TEXT
      );
      CREATE INDEX idx_exercise_results_session ON exercise_results(sessionId);
    `);
  },
};
