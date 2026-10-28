import type { Migration } from '../types';

// Fase 6. Nunca edite esta migration: crie outra.
export const migration006: Migration = {
  version: 6,
  name: 'notifications',
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE notification_log (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        scheduledFor TEXT NOT NULL,
        notificationId TEXT,
        openedAt TEXT
      );
      CREATE INDEX idx_notification_log_scheduled ON notification_log(scheduledFor);
    `);
  },
};
