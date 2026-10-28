import { z } from 'zod';

import { AIError } from './errors';
import { extractJson } from './json';
import { joinUrl } from './providers';
import type {
  AIConfig,
  AIFeature,
  AIResult,
  AIUsage,
  CallOptions,
  ChatMessage,
  FetchLike,
  HttpResponse,
} from './types';

export type AIClientDeps = {
  fetch: FetchLike;
  loadConfig: () => Promise<AIConfig>;
  recordUsage: (feature: AIFeature, model: string, usage: AIUsage) => Promise<void>;
  /** Gasto estimado do mês atual, em US$. */
  getMonthSpend: () => Promise<number>;
  markJsonModeUnsupported: (config: AIConfig) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
  timeoutMs?: number;
};

const MAX_TRANSIENT_RETRIES = 2;
/** Esperas maiores que isto não valem a pena: o erro é mostrado na hora. */
const MAX_WAIT_MS = 10_000;

const completionSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable().optional() }) }))
    .min(1),
  usage: z
    .object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() })
    .nullish(),
});

const modelsSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

class NetworkError extends Error {}

export function backoffMs(attempt: number): number {
  return attempt <= 1 ? 1000 : 3000;
}

/** Quanto o provedor pede para esperar (header `Retry-After` ou `retryDelay` do Gemini). */
export function retryAfterMs(res: HttpResponse, body: string): number | null {
  const header = res.headers.get('retry-after');
  if (header && Number.isFinite(Number(header))) return Number(header) * 1000;
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  return match ? Number(match[1]) * 1000 : null;
}

export const isDailyQuota = (body: string) => /per ?day|perday|daily/i.test(body);
/** Gemini: "limit: 0" = este modelo não tem uso gratuito neste projeto. */
export const isZeroQuota = (body: string) => /limit"?\s*:\s*0\b/i.test(body);

const MAX_PROVIDER_MESSAGE = 300;

/** Modelos que não servem para conversa (imagem, vídeo, áudio, voz, embeddings…). */
const NOT_CHAT =
  /embed|imagen|veo|lyria|tts|aqa|live|audio|image|robotics|computer-use|whisper|dall-e|moderation|realtime|transcribe|search|sora|codex|davinci|babbage/i;

/** Só os modelos de texto/conversa entram na lista de escolha. */
export const isChatModel = (id: string) => !NOT_CHAT.test(id);

/** API do Google (Gemini): tem ajustes próprios. */
export const isGoogleEndpoint = (baseUrl: string) => /generativelanguage\.googleapis\.com/i.test(baseUrl);

/** No Gemini, as gerações 1.x e 2.x foram aposentadas (dão "não encontrado") e o Gemma não aceita instrução de sistema. */
const RETIRED_ON_GOOGLE = /^(gemini-[12][.-]|gemma)/i;

export const isListedModel = (id: string, baseUrl: string) =>
  isChatModel(id) && !(isGoogleEndpoint(baseUrl) && RETIRED_ON_GOOGLE.test(id));

/** API da OpenAI. */
export const isOpenAIEndpoint = (baseUrl: string) => /api\.openai\.com/i.test(baseUrl);

/**
 * Gemini 3 e os GPT-5 "pensam" antes de responder, por padrão bastante (lento e, na OpenAI,
 * os tokens de raciocínio são cobrados). Para explicar e corrigir, pouco raciocínio basta.
 * Modelos que não raciocinam recusam o campo: aí o app tenta de novo sem ele.
 */
const REASONING_EFFORT = 'low';
const asksForReasoning = (baseUrl: string) => isGoogleEndpoint(baseUrl) || isOpenAIEndpoint(baseUrl);
export const rejectsReasoning = (body: string) => /reasoning/i.test(body);
/** Modelos que raciocinam (ex.: GPT-5) só aceitam a temperatura padrão. */
export const rejectsTemperature = (body: string) => /temperature/i.test(body);
/** …e pedem `max_completion_tokens` no lugar de `max_tokens`. */
export const rejectsMaxTokens = (body: string) => /max_tokens/i.test(body);

/** A mensagem de erro do provedor (formatos da OpenAI e do Gemini), curta. */
export function providerMessageOf(body: string): string | null {
  let message: unknown = body;
  try {
    const parsed: unknown = JSON.parse(body);
    const first: unknown = Array.isArray(parsed) ? parsed[0] : parsed;
    const error = first && typeof first === 'object' && 'error' in first ? first.error : null;
    message = error && typeof error === 'object' && 'message' in error ? error.message : error;
  } catch {
    // não é JSON: usa o texto como veio
  }
  if (typeof message !== 'string') return null;
  const clean = message.replace(/\s+/g, ' ').trim();
  if (!clean) return null;
  return clean.length > MAX_PROVIDER_MESSAGE ? `${clean.slice(0, MAX_PROVIDER_MESSAGE - 1)}…` : clean;
}
export const isInvalidKeyBody = (body: string) =>
  /api[_ ]?key/i.test(body) && /invalid|not valid|incorrect/i.test(body);
export const rejectsJsonMode = (body: string) => /response_format|json_object|json mode/i.test(body);

export function costOf(config: AIConfig, inputTokens: number, outputTokens: number): number {
  const inPrice = config.inputPricePerMillion ?? 0;
  const outPrice = config.outputPricePerMillion ?? 0;
  return (inputTokens * inPrice + outputTokens * outPrice) / 1_000_000;
}

function formatInstruction(schema: z.ZodType): string {
  let jsonSchema = '';
  try {
    jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  } catch {
    jsonSchema = '';
  }
  return (
    'Responda SOMENTE com um objeto JSON válido, sem texto antes ou depois' +
    (jsonSchema ? `, seguindo este JSON Schema: ${jsonSchema}` : '.')
  );
}

/** Acrescenta a instrução de formato ao prompt de sistema (ou cria um). */
function withInstruction(messages: ChatMessage[], instruction: string): ChatMessage[] {
  const [first, ...rest] = messages;
  if (first?.role === 'system') {
    return [{ role: 'system', content: `${first.content}\n\n${instruction}` }, ...rest];
  }
  return [{ role: 'system', content: instruction }, ...messages];
}

export function createAIClient(deps: AIClientDeps) {
  const timeoutMs = deps.timeoutMs ?? 45_000;

  async function request(
    url: string,
    init: { method: string; headers: Record<string, string>; body?: string },
    signal?: AbortSignal,
  ): Promise<HttpResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const onAbort = () => controller.abort();
    signal?.addEventListener('abort', onAbort);
    try {
      return await deps.fetch(url, { ...init, signal: controller.signal });
    } catch {
      if (signal?.aborted) throw new AIError('cancelled');
      if (controller.signal.aborted) throw new AIError('timeout');
      throw new NetworkError();
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  function headersFor(config: AIConfig): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    return headers;
  }

  async function loadUsableConfig(): Promise<AIConfig> {
    const config = await deps.loadConfig();
    const missingKey = config.requiresKey && !config.apiKey;
    if (!config.baseUrl.trim() || !config.model.trim() || missingKey) {
      throw new AIError('notConfigured');
    }
    return config;
  }

  async function callAI<T>(
    feature: AIFeature,
    messages: ChatMessage[],
    schema: z.ZodType<T>,
    options: CallOptions = {},
  ): Promise<AIResult<T>> {
    const config = await loadUsableConfig();
    if (config.monthlyLimit != null && (await deps.getMonthSpend()) >= config.monthlyLimit) {
      throw new AIError('monthlyLimit');
    }

    const instruction = formatInstruction(schema);
    const base = withInstruction(messages, instruction);
    let conversation = base;
    let jsonMode = config.jsonMode;
    let reasoning = asksForReasoning(config.baseUrl);
    let sendTemperature = true;
    let maxTokensField: 'max_tokens' | 'max_completion_tokens' = 'max_tokens';
    let transient = 0;
    let formatRetried = false;
    const total: AIUsage = { inputTokens: 0, outputTokens: 0, estimatedCost: 0 };

    for (;;) {
      let res: HttpResponse;
      try {
        res = await request(
          joinUrl(config.baseUrl, 'chat/completions'),
          {
            method: 'POST',
            headers: headersFor(config),
            body: JSON.stringify({
              model: config.model,
              messages: conversation,
              ...(sendTemperature ? { temperature: options.temperature ?? 0.4 } : {}),
              ...(options.maxTokens ? { [maxTokensField]: options.maxTokens } : {}),
              ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
              ...(reasoning ? { reasoning_effort: REASONING_EFFORT } : {}),
            }),
          },
          options.signal,
        );
      } catch (error) {
        if (error instanceof AIError) throw error;
        if (transient < MAX_TRANSIENT_RETRIES) {
          transient++;
          await deps.sleep(backoffMs(transient));
          continue;
        }
        throw new AIError('offline');
      }

      const body = await res.text();

      if (!res.ok) {
        const said = providerMessageOf(body);
        if (res.status === 400 && reasoning && rejectsReasoning(body)) {
          reasoning = false;
          continue;
        }
        if (res.status === 400 && sendTemperature && rejectsTemperature(body)) {
          sendTemperature = false;
          continue;
        }
        if (res.status === 400 && options.maxTokens && maxTokensField === 'max_tokens' && rejectsMaxTokens(body)) {
          maxTokensField = 'max_completion_tokens';
          continue;
        }
        if (res.status === 400 && jsonMode && rejectsJsonMode(body)) {
          jsonMode = false;
          await deps.markJsonModeUnsupported(config);
          continue;
        }
        if (res.status === 401 || res.status === 403 || isInvalidKeyBody(body)) {
          throw new AIError('invalidKey', String(res.status), said);
        }
        if (res.status === 404) throw new AIError('modelNotFound', '404', said);
        if (res.status === 429) {
          if (isZeroQuota(body)) throw new AIError('noFreeQuota', '429', said);
          if (isDailyQuota(body)) throw new AIError('dailyLimit', '429', said);
          const wait = retryAfterMs(res, body) ?? backoffMs(transient + 1);
          if (wait > MAX_WAIT_MS || transient >= MAX_TRANSIENT_RETRIES) {
            throw new AIError('providerLimit', '429', said);
          }
          transient++;
          await deps.sleep(wait);
          continue;
        }
        if (res.status >= 500) {
          if (transient < MAX_TRANSIENT_RETRIES) {
            transient++;
            await deps.sleep(backoffMs(transient));
            continue;
          }
          throw new AIError('server', String(res.status), said);
        }
        throw new AIError('badRequest', String(res.status), said);
      }

      let completion: z.infer<typeof completionSchema>;
      try {
        completion = completionSchema.parse(JSON.parse(body));
      } catch {
        throw new AIError('invalidResponse');
      }

      const model = completion.model ?? config.model;
      const inputTokens = completion.usage?.prompt_tokens ?? 0;
      const outputTokens = completion.usage?.completion_tokens ?? 0;
      const usage = { inputTokens, outputTokens, estimatedCost: costOf(config, inputTokens, outputTokens) };
      total.inputTokens += usage.inputTokens;
      total.outputTokens += usage.outputTokens;
      total.estimatedCost += usage.estimatedCost;
      try {
        await deps.recordUsage(feature, model, usage);
      } catch {
        // registrar o uso nunca deve derrubar a resposta
      }

      const content = completion.choices[0].message.content ?? '';
      let parsed: { success: true; data: T } | { success: false } = { success: false };
      try {
        parsed = schema.safeParse(extractJson(content));
      } catch {
        parsed = { success: false };
      }
      if (parsed.success) return { data: parsed.data, model, usage: total };

      if (!formatRetried) {
        formatRetried = true;
        conversation = [
          ...base,
          { role: 'assistant', content },
          { role: 'user', content: `Sua resposta não seguiu o formato pedido. ${instruction}` },
        ];
        continue;
      }
      throw new AIError('invalidResponse');
    }
  }

  /** "Testar conexão": uma chamada mínima e real. Devolve o modelo que respondeu. */
  async function testConnection(signal?: AbortSignal): Promise<{ model: string }> {
    const result = await callAI(
      'testConnection',
      [
        { role: 'system', content: 'Você verifica se a conexão com a API funciona.' },
        { role: 'user', content: 'Responda exatamente: {"ok": true}' },
      ],
      z.object({ ok: z.boolean() }),
      { temperature: 0, signal },
    );
    return { model: result.model };
  }

  /** Lista os modelos do provedor (GET /models), para escolher sem digitar. */
  async function listModels(): Promise<string[]> {
    const config = await deps.loadConfig();
    if (!config.baseUrl.trim()) throw new AIError('notConfigured');
    let res: HttpResponse;
    try {
      res = await request(joinUrl(config.baseUrl, 'models'), {
        method: 'GET',
        headers: headersFor(config),
      });
    } catch (error) {
      if (error instanceof AIError) throw error;
      throw new AIError('offline');
    }
    const body = await res.text();
    if (res.status === 401 || res.status === 403 || isInvalidKeyBody(body)) {
      throw new AIError('invalidKey');
    }
    if (!res.ok) throw new AIError(res.status >= 500 ? 'server' : 'badRequest', String(res.status));
    try {
      const ids = modelsSchema
        .parse(JSON.parse(body))
        .data.map((m) => m.id.replace(/^models\//, ''))
        .filter((id) => isListedModel(id, config.baseUrl));
      return [...new Set(ids)].sort((a, b) => a.localeCompare(b));
    } catch {
      throw new AIError('invalidResponse');
    }
  }

  return { callAI, testConnection, listModels };
}
