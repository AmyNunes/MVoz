import type { Migration } from '../types';

// Fase 1. Nunca edite esta migration: crie outra.
export const migration001: Migration = {
  version: 1,
  name: 'foundation',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE ai_usage (
        id TEXT PRIMARY KEY NOT NULL,
        at TEXT NOT NULL,
        feature TEXT NOT NULL,
        model TEXT NOT NULL,
        inputTokens INTEGER NOT NULL DEFAULT 0,
        outputTokens INTEGER NOT NULL DEFAULT 0,
        estimatedCost REAL NOT NULL DEFAULT 0
      );
      CREATE INDEX idx_ai_usage_at ON ai_usage(at);

      CREATE TABLE ai_cache (
        hash TEXT PRIMARY KEY NOT NULL,
        feature TEXT NOT NULL,
        response TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);
  },
};
