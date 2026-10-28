import { nowIso } from '@/lib/dates';

import { getDb } from './client';

export async function getCachedResponse(hash: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ response: string }>('SELECT response FROM ai_cache WHERE hash = ?', hash);
  return row?.response ?? null;
}

export async function putCachedResponse(hash: string, feature: string, response: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO ai_cache (hash, feature, response, createdAt) VALUES (?, ?, ?, ?)',
    hash,
    feature,
    response,
    nowIso(),
  );
}
