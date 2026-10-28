import { getDb } from './client';

export type NotificationLogRow = {
  id: string;
  type: string;
  scheduledFor: string;
  notificationId: string | null;
  openedAt: string | null;
};

export async function insertNotificationLog(row: NotificationLogRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO notification_log (id, type, scheduledFor, notificationId, openedAt) VALUES (?, ?, ?, ?, ?)',
    row.id,
    row.type,
    row.scheduledFor,
    row.notificationId,
    row.openedAt,
  );
}

/** Ao reagendar: tira do histórico o que ainda não chegou (será recriado). */
export async function deleteFutureNotificationLogs(afterIso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM notification_log WHERE scheduledFor > ? AND openedAt IS NULL', afterIso);
}

export async function markNotificationOpened(id: string, atIso: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE notification_log SET openedAt = COALESCE(openedAt, ?) WHERE id = ?', atIso, id);
}

/** Histórico simples (seção 9.4): o que foi enviado num período. */
export async function notificationHistory(fromIso: string, toIso: string): Promise<NotificationLogRow[]> {
  const db = await getDb();
  return db.getAllAsync<NotificationLogRow>(
    `SELECT id, type, scheduledFor, notificationId, openedAt FROM notification_log
     WHERE scheduledFor >= ? AND scheduledFor <= ? ORDER BY scheduledFor DESC`,
    fromIso,
    toIso,
  );
}

export async function lastSentOfType(type: string, beforeIso: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ at: string }>(
    'SELECT MAX(scheduledFor) AS at FROM notification_log WHERE type = ? AND scheduledFor <= ?',
    type,
    beforeIso,
  );
  return row?.at ?? null;
}
