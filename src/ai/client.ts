import { insertUsage, usageTotalsSince } from '@/db/aiUsageRepo';
import { nowIso, startOfMonth } from '@/lib/dates';
import { useSettings } from '@/stores/settingsStore';

import { createAIClient } from './createClient';
import { getApiKey } from './keyStore';
import { PROVIDERS } from './providers';
import type { AIConfig, FetchLike } from './types';

/**
 * Único ponto de acesso à IA no app (regra do projeto).
 * Toda chamada passa por aqui com um schema zod de saída.
 */

export const jsonModeKey = (baseUrl: string, model: string) => `${baseUrl.trim()}|${model.trim()}`;

const realFetch: FetchLike = (url, init) => fetch(url, init);

const client = createAIClient({
  fetch: realFetch,
  loadConfig: async (): Promise<AIConfig> => {
    const ai = useSettings.getState().ai;
    return {
      baseUrl: ai.baseUrl,
      apiKey: await getApiKey(),
      model: ai.model,
      requiresKey: PROVIDERS[ai.provider].requiresKey,
      jsonMode: !ai.jsonModeUnsupported.includes(jsonModeKey(ai.baseUrl, ai.model)),
      inputPricePerMillion: ai.inputPricePerMillion,
      outputPricePerMillion: ai.outputPricePerMillion,
      monthlyLimit: ai.monthlyLimit,
    };
  },
  recordUsage: (feature, model, usage) =>
    insertUsage({
      at: nowIso(),
      feature,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      estimatedCost: usage.estimatedCost,
    }),
  getMonthSpend: async () => (await usageTotalsSince(startOfMonth(new Date()).toISOString())).cost,
  markJsonModeUnsupported: async (config) => {
    const { ai, update } = useSettings.getState();
    const key = jsonModeKey(config.baseUrl, config.model);
    if (!ai.jsonModeUnsupported.includes(key)) {
      await update('ai', { jsonModeUnsupported: [...ai.jsonModeUnsupported, key] });
    }
  },
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});

export const { callAI, testConnection, listModels } = client;
export { AIError, toAIError } from './errors';
