import { newId } from '@/lib/ids';

import { getDb } from './client';

export type UsageRecord = {
  at: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
};

export async function insertUsage(record: UsageRecord): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ai_usage (id, at, feature, model, inputTokens, outputTokens, estimatedCost)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    newId(),
    record.at,
    record.feature,
    record.model,
    record.inputTokens,
    record.outputTokens,
    record.estimatedCost,
  );
}

export type UsageTotals = { calls: number; inputTokens: number; outputTokens: number; cost: number };

export async function usageTotalsSince(sinceIso: string): Promise<UsageTotals> {
  const db = await getDb();
  const row = await db.getFirstAsync<UsageTotals>(
    `SELECT COUNT(*) AS calls,
            COALESCE(SUM(inputTokens), 0) AS inputTokens,
            COALESCE(SUM(outputTokens), 0) AS outputTokens,
            COALESCE(SUM(estimatedCost), 0) AS cost
     FROM ai_usage WHERE at >= ?`,
    sinceIso,
  );
  return row ?? { calls: 0, inputTokens: 0, outputTokens: 0, cost: 0 };
}

export async function usageByFeatureSince(
  sinceIso: string,
): Promise<(UsageTotals & { feature: string })[]> {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT feature,
            COUNT(*) AS calls,
            SUM(inputTokens) AS inputTokens,
            SUM(outputTokens) AS outputTokens,
            SUM(estimatedCost) AS cost
     FROM ai_usage WHERE at >= ?
     GROUP BY feature ORDER BY cost DESC, calls DESC`,
    sinceIso,
  );
}
