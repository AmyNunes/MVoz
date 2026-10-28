import type { z } from 'zod';

/** Lê um JSON salvo no banco e valida com zod. Se algo estiver errado, devolve o padrão. */
export function parseJsonWith<T>(raw: string | null | undefined, schema: z.ZodType<T>, fallback: T): T {
  if (raw == null) return fallback;
  try {
    const result = schema.safeParse(JSON.parse(raw));
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}
