import { z } from 'zod';

import { createAIClient, type AIClientDeps } from '../createClient';
import { AIError } from '../errors';
import type { AIConfig, HttpResponse } from '../types';

const config: AIConfig = {
  baseUrl: 'https://api.test/v1/',
  apiKey: 'secret',
  model: 'test-model',
  requiresKey: true,
  jsonMode: true,
  inputPricePerMillion: 1,
  outputPricePerMillion: 2,
  monthlyLimit: null,
};

function response(status: number, body: unknown, headers: Record<string, string> = {}): HttpResponse {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  };
}

function completion(content: string, model = 'test-model-001') {
  return response(200, {
    model,
    choices: [{ message: { content } }],
    usage: { prompt_tokens: 1000, completion_tokens: 500 },
  });
}

function setup(responses: (HttpResponse | Error)[], overrides: Partial<AIClientDeps> = {}) {
  const calls: { url: string; body: Record<string, unknown> }[] = [];
  const deps: AIClientDeps = {
    fetch: jest.fn(async (url, init) => {
      calls.push({ url, body: init.body ? JSON.parse(init.body) : {} });
      const next = responses.shift();
      if (!next) throw new Error('no more responses');
      if (next instanceof Error) throw next;
      return next;
    }),
    loadConfig: jest.fn(async () => config),
    recordUsage: jest.fn(async () => {}),
    getMonthSpend: jest.fn(async () => 0),
    markJsonModeUnsupported: jest.fn(async () => {}),
    sleep: jest.fn(async () => {}),
    ...overrides,
  };
  return { client: createAIClient(deps), deps, calls };
}

const schema = z.object({ answer: z.string() });
const messages = [{ role: 'user' as const, content: 'oi' }];

describe('callAI', () => {
  it('envia para /chat/completions com JSON mode e valida a resposta', async () => {
    const { client, calls, deps } = setup([completion('{"answer":"hello"}')]);

    const result = await client.callAI('testConnection', messages, schema);

    expect(result.data).toEqual({ answer: 'hello' });
    expect(result.model).toBe('test-model-001');
    expect(calls[0].url).toBe('https://api.test/v1/chat/completions');
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' });
    // custo: 1000 × 1/1M + 500 × 2/1M
    expect(result.usage.estimatedCost).toBeCloseTo(0.002);
    expect(deps.recordUsage).toHaveBeenCalledWith('testConnection', 'test-model-001', {
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCost: expect.closeTo(0.002) as number,
    });
  });

  it('aceita JSON dentro de ```json``` e com texto em volta', async () => {
    const { client } = setup([completion('Claro!\n```json\n{"answer":"ok"}\n```')]);
    await expect(client.callAI('testConnection', messages, schema)).resolves.toMatchObject({
      data: { answer: 'ok' },
    });
  });

  it('resposta fora do formato: pede para corrigir uma vez', async () => {
    const { client, calls } = setup([completion('{"wrong":1}'), completion('{"answer":"fixed"}')]);

    const result = await client.callAI('testConnection', messages, schema);

    expect(result.data.answer).toBe('fixed');
    const second = calls[1].body.messages as { role: string; content: string }[];
    expect(second.at(-1)?.content).toMatch(/não seguiu o formato/);
  });

  it('fora do formato duas vezes: erro de resposta inválida', async () => {
    const { client } = setup([completion('nada'), completion('ainda nada')]);
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'invalidResponse',
    });
  });

  it('falha de rede: tenta mais 2 vezes e depois avisa "sem internet"', async () => {
    const { client, deps } = setup([new TypeError('x'), new TypeError('x'), new TypeError('x')]);
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'offline',
    });
    expect(deps.fetch).toHaveBeenCalledTimes(3);
    expect(deps.sleep).toHaveBeenCalledTimes(2);
  });

  it('5xx: tenta de novo e recupera', async () => {
    const { client } = setup([response(503, 'busy'), completion('{"answer":"back"}')]);
    await expect(client.callAI('testConnection', messages, schema)).resolves.toMatchObject({
      data: { answer: 'back' },
    });
  });

  it('429 com espera curta: respeita o Retry-After e tenta de novo', async () => {
    const { client, deps } = setup([
      response(429, 'slow down', { 'retry-after': '2' }),
      completion('{"answer":"ok"}'),
    ]);
    await client.callAI('testConnection', messages, schema);
    expect(deps.sleep).toHaveBeenCalledWith(2000);
  });

  it('429 de cota diária: não insiste', async () => {
    const { client, deps } = setup([response(429, '{"error":"Quota exceeded per day"}')]);
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'dailyLimit',
    });
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it('429 com "limit: 0" do Gemini: modelo sem uso gratuito, com a mensagem do provedor', async () => {
    const body = JSON.stringify([
      {
        error: {
          code: 429,
          message:
            'You exceeded your current quota. Quota exceeded for metric: generate_content_free_tier_requests, limit: 0, model: gemini-2.5-pro',
          status: 'RESOURCE_EXHAUSTED',
        },
      },
    ]);
    const { client, deps } = setup([response(429, body)]);
    const error = await client.callAI('testConnection', messages, schema).catch((e: unknown) => e);
    expect(error).toMatchObject({ kind: 'noFreeQuota' });
    expect((error as AIError).providerMessage).toMatch(/limit: 0, model: gemini-2.5-pro/);
    expect(deps.fetch).toHaveBeenCalledTimes(1);
  });

  it('429 passageiro que não passa: limite do provedor', async () => {
    const { client } = setup([response(429, 'slow down'), response(429, 'slow down'), response(429, 'slow down')]);
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({ kind: 'providerLimit' });
  });

  it('chave recusada (401 ou "API key not valid")', async () => {
    const a = setup([response(401, 'unauthorized')]);
    await expect(a.client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'invalidKey',
    });
    const b = setup([response(400, '{"error":{"message":"API key not valid. Please pass a valid API key."}}')]);
    await expect(b.client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'invalidKey',
    });
  });

  it('provedor sem JSON mode: tenta sem response_format e lembra disso', async () => {
    const { client, calls, deps } = setup([
      response(400, '{"error":"response_format is not supported"}'),
      completion('{"answer":"ok"}'),
    ]);
    await client.callAI('testConnection', messages, schema);
    expect(calls[1].body.response_format).toBeUndefined();
    expect(deps.markJsonModeUnsupported).toHaveBeenCalled();
  });

  it('sem modelo ou sem chave: pede para configurar, sem chamar a rede', async () => {
    const { client, deps } = setup([], {
      loadConfig: async () => ({ ...config, apiKey: null }),
    });
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'notConfigured',
    });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('limite mensal atingido: pausa as funções de IA', async () => {
    const { client, deps } = setup([], {
      loadConfig: async () => ({ ...config, monthlyLimit: 5 }),
      getMonthSpend: async () => 5.01,
    });
    await expect(client.callAI('testConnection', messages, schema)).rejects.toMatchObject({
      kind: 'monthlyLimit',
    });
    expect(deps.fetch).not.toHaveBeenCalled();
  });

  it('erros têm mensagem em português', () => {
    expect(new AIError('offline').messagePt).toMatch(/Sem conexão/);
  });
});

describe('Gemini (API do Google)', () => {
  const google = { ...config, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' };

  it('pede pouco raciocínio (reasoning_effort low); outros provedores não recebem o campo', async () => {
    const g = setup([completion('{"answer":"a"}')], { loadConfig: jest.fn(async () => google) });
    await g.client.callAI('testConnection', messages, schema);
    expect(g.calls[0].body.reasoning_effort).toBe('low');

    const other = setup([completion('{"answer":"a"}')]);
    await other.client.callAI('testConnection', messages, schema);
    expect(other.calls[0].body.reasoning_effort).toBeUndefined();
  });

  it('se o modelo recusar o reasoning_effort, tenta de novo sem ele', async () => {
    const g = setup([response(400, 'Unknown parameter: reasoning_effort'), completion('{"answer":"a"}')], {
      loadConfig: jest.fn(async () => google),
    });
    await expect(g.client.callAI('testConnection', messages, schema)).resolves.toMatchObject({ data: { answer: 'a' } });
    expect(g.calls[1].body.reasoning_effort).toBeUndefined();
  });
});

describe('OpenAI (modelos que raciocinam, ex.: GPT-5)', () => {
  const openai = { ...config, baseUrl: 'https://api.openai.com/v1' };

  it('pede pouco raciocínio e, se o modelo recusar a temperatura, tenta de novo sem ela', async () => {
    const o = setup(
      [
        response(400, {
          error: { message: "Unsupported value: 'temperature' does not support 0.4 with this model. Only the default (1) value is supported." },
        }),
        completion('{"answer":"a"}'),
      ],
      { loadConfig: jest.fn(async () => openai) },
    );
    await expect(o.client.callAI('testConnection', messages, schema)).resolves.toMatchObject({ data: { answer: 'a' } });
    expect(o.calls[0].body.reasoning_effort).toBe('low');
    expect(o.calls[0].body.temperature).toBe(0.4);
    expect(o.calls[1].body.temperature).toBeUndefined();
  });

  it('troca max_tokens por max_completion_tokens quando o modelo pede', async () => {
    const o = setup(
      [
        response(400, { error: { message: "Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead." } }),
        completion('{"answer":"a"}'),
      ],
      { loadConfig: jest.fn(async () => openai) },
    );
    await o.client.callAI('testConnection', messages, schema, { maxTokens: 500 });
    expect(o.calls[1].body.max_tokens).toBeUndefined();
    expect(o.calls[1].body.max_completion_tokens).toBe(500);
  });

  it('a lista esconde modelos que não são de conversa (áudio, imagem, busca…)', async () => {
    const ids = ['gpt-5-nano', 'gpt-5-mini', 'whisper-1', 'dall-e-3', 'gpt-4o-realtime-preview', 'omni-moderation-latest', 'gpt-4o-search-preview'];
    const o = setup([response(200, { data: ids.map((id) => ({ id })) })], { loadConfig: jest.fn(async () => openai) });
    await expect(o.client.listModels()).resolves.toEqual(['gpt-5-mini', 'gpt-5-nano']);
  });
});

describe('testConnection e listModels', () => {
  it('testConnection devolve o modelo que respondeu', async () => {
    const { client } = setup([completion('{"ok":true}', 'gemini-x')]);
    await expect(client.testConnection()).resolves.toEqual({ model: 'gemini-x' });
  });

  it('listModels tira o prefixo "models/" e ordena', async () => {
    const { client } = setup([
      response(200, { data: [{ id: 'models/b-model' }, { id: 'a-model' }] }),
    ]);
    await expect(client.listModels()).resolves.toEqual(['a-model', 'b-model']);
  });

  it('no Gemini, a lista esconde as gerações aposentadas (1.x, 2.x) e o Gemma', async () => {
    const ids = ['models/gemini-2.5-flash', 'models/gemini-2.0-flash-lite', 'models/gemma-3-27b-it', 'models/gemini-3.5-flash-lite'];
    const { client } = setup([response(200, { data: ids.map((id) => ({ id })) })], {
      loadConfig: jest.fn(async () => ({ ...config, baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/' })),
    });
    await expect(client.listModels()).resolves.toEqual(['gemini-3.5-flash-lite']);
  });

  it('listModels esconde modelos que não servem para conversa', async () => {
    const ids = [
      'models/gemini-x-flash',
      'models/gemini-x-flash-lite',
      'models/gemini-embedding-001',
      'models/imagen-4.0-generate',
      'models/gemini-x-flash-image',
      'models/gemini-x-flash-preview-tts',
      'models/gemini-live-x-flash',
      'models/veo-3.0-generate',
    ];
    const { client } = setup([response(200, { data: ids.map((id) => ({ id })) })]);
    await expect(client.listModels()).resolves.toEqual(['gemini-x-flash', 'gemini-x-flash-lite']);
  });
});
