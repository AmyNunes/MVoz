import type { Migration } from '../types';

// Fase 4. Nunca edite esta migration: crie outra.
export const migration004: Migration = {
  version: 4,
  name: 'guide',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE profile (
        id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),
        goal TEXT NOT NULL,
        grammaticalGender TEXT NOT NULL,
        identity TEXT,
        hormones TEXT,
        recentSurgery INTEGER NOT NULL DEFAULT 0,
        surgeryCleared INTEGER NOT NULL DEFAULT 0,
        experience TEXT NOT NULL,
        slp TEXT NOT NULL,
        dailyMinutes INTEGER NOT NULL,
        healthFlags TEXT NOT NULL DEFAULT '[]',
        aiIncludeContext INTEGER NOT NULL DEFAULT 0,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE baselines (
        id TEXT PRIMARY KEY NOT NULL,
        createdAt TEXT NOT NULL,
        recordingIds TEXT NOT NULL DEFAULT '[]',
        metrics TEXT NOT NULL
      );

      CREATE TABLE plans (
        id TEXT PRIMARY KEY NOT NULL,
        goal TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        stageIndex INTEGER NOT NULL DEFAULT 0,
        stages TEXT NOT NULL,
        finalTargetLowHz REAL NOT NULL,
        finalTargetHighHz REAL NOT NULL,
        stageTargetLowHz REAL NOT NULL,
        stageTargetHighHz REAL NOT NULL,
        stageStartedAt TEXT NOT NULL,
        lighterUntil TEXT
      );

      CREATE TABLE plan_events (
        id TEXT PRIMARY KEY NOT NULL,
        planId TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
        kind TEXT NOT NULL,
        fromStage INTEGER NOT NULL,
        toStage INTEGER NOT NULL,
        at TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE checkins (
        id TEXT PRIMARY KEY NOT NULL,
        weekStart TEXT NOT NULL,
        recordingIds TEXT NOT NULL DEFAULT '[]',
        answers TEXT NOT NULL,
        milestones TEXT NOT NULL DEFAULT '[]',
        decision TEXT,
        summaryPt TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        metrics TEXT NOT NULL DEFAULT '{}'
      );
      CREATE INDEX idx_checkins_week ON checkins(weekStart);
    `);
  },
};
