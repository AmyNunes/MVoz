import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';
import type { z } from 'zod';

import { getCachedResponse, putCachedResponse } from '@/db/aiCacheRepo';

import type { AIFeature } from './types';

/**
 * Cache por hash de (função + entrada), para explicações de palavras e traduções.
 * A mesma pergunta não gasta tokens duas vezes.
 */
export async function withCache<T>(
  feature: AIFeature,
  input: unknown,
  schema: z.ZodType<T>,
  compute: () => Promise<T>,
): Promise<{ data: T; cached: boolean }> {
  const hash = await digestStringAsync(
    CryptoDigestAlgorithm.SHA256,
    `${feature}:${JSON.stringify(input)}`,
  );

  const stored = await getCachedResponse(hash);
  if (stored) {
    try {
      const parsed = schema.safeParse(JSON.parse(stored));
      if (parsed.success) return { data: parsed.data, cached: true };
    } catch {
      // cache corrompido: busca de novo
    }
  }

  const data = await compute();
  await putCachedResponse(hash, feature, JSON.stringify(data));
  return { data, cached: false };
}

/** Só lê o cache (para o modo sem conexão). */
export async function peekCache<T>(feature: AIFeature, input: unknown, schema: z.ZodType<T>): Promise<T | null> {
  const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${feature}:${JSON.stringify(input)}`);
  const stored = await getCachedResponse(hash);
  if (!stored) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
