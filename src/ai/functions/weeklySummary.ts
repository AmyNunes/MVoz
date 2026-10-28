import { withCache } from '../cache';
import { callAI } from '../client';
import type { UserContext } from '../context';
import { weeklySummaryPrompt, type WeeklyStats } from '../prompts/weeklySummary';
import { weeklySummarySchema, type WeeklySummary } from '../schemas/weeklySummary';

/** Resumo do check-in (seção 9.4). Cache: os mesmos números não gastam tokens de novo. */
export async function weeklySummary(stats: WeeklyStats, ctx: UserContext): Promise<WeeklySummary> {
  const { data } = await withCache('weeklySummary', { stats, ctx }, weeklySummarySchema, async () => {
    const result = await callAI('weeklySummary', weeklySummaryPrompt(stats, ctx), weeklySummarySchema, { temperature: 0.5 });
    return result.data;
  });
  return data;
}
