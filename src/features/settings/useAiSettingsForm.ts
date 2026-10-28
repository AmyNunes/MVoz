import { useCallback, useEffect, useState } from 'react';

import { getApiKey, setApiKey } from '@/ai/keyStore';
import { PROVIDERS, type ProviderId } from '@/ai/providers';
import { formatDecimal, parseDecimal } from '@/lib/format';
import { useDebouncedSave } from '@/lib/useDebouncedSave';
import { useSettings } from '@/stores/settingsStore';

import type { AISettings } from './schemas';

type CostDrafts = { input: string; output: string; limit: string };

const isValidUrl = (url: string) => /^https?:\/\/\S+$/i.test(url.trim());

/** Estado e salvamento automático da tela Configurações › IA. */
export function useAiSettingsForm() {
  const ai = useSettings((s) => s.ai);
  const update = useSettings((s) => s.update);

  const [baseUrl, setBaseUrl] = useState(ai.baseUrl);
  const [model, setModel] = useState(ai.model);
  const [apiKey, setKeyDraft] = useState('');
  const [cost, setCost] = useState<CostDrafts>({
    input: formatDecimal(ai.inputPricePerMillion),
    output: formatDecimal(ai.outputPricePerMillion),
    limit: formatDecimal(ai.monthlyLimit),
  });

  useEffect(() => {
    let alive = true;
    getApiKey().then((k) => alive && setKeyDraft(k ?? ''));
    return () => {
      alive = false;
    };
  }, []);

  const urlSaver = useDebouncedSave((v: string) => update('ai', { baseUrl: v.trim() }));
  const modelSaver = useDebouncedSave((v: string) => update('ai', { model: v.trim() }));
  const keySaver = useDebouncedSave(setApiKey);
  const costSaver = useDebouncedSave((patch: Partial<AISettings>) => update('ai', patch));

  const changeUrl = (v: string) => {
    setBaseUrl(v);
    if (isValidUrl(v)) urlSaver.schedule(v);
  };

  const changeModel = (v: string) => {
    setModel(v);
    modelSaver.schedule(v);
  };

  const changeKey = (v: string) => {
    setKeyDraft(v);
    keySaver.schedule(v);
  };

  const changeCost = (field: keyof CostDrafts, text: string) => {
    const next = { ...cost, [field]: text };
    setCost(next);
    const input = parseDecimal(next.input);
    const output = parseDecimal(next.output);
    const limit = parseDecimal(next.limit);
    const patch: Partial<AISettings> = {};
    if (!Number.isNaN(input)) patch.inputPricePerMillion = input;
    if (!Number.isNaN(output)) patch.outputPricePerMillion = output;
    if (!Number.isNaN(limit)) patch.monthlyLimit = limit === 0 ? null : limit;
    costSaver.schedule(patch);
  };

  const flushAll = useCallback(async () => {
    await Promise.all([urlSaver.flush(), modelSaver.flush(), keySaver.flush(), costSaver.flush()]);
  }, [urlSaver, modelSaver, keySaver, costSaver]);

  const changeProvider = async (provider: ProviderId) => {
    await flushAll();
    const url = PROVIDERS[provider].baseUrl;
    setBaseUrl(url);
    setModel('');
    await update('ai', { provider, baseUrl: url, model: '' });
  };

  /** Escolha da lista: substitui o que estava sendo digitado (senão o texto do filtro salvaria por cima). */
  const pickModel = (v: string) => {
    setModel(v);
    modelSaver.schedule(v);
    void modelSaver.flush();
  };

  return {
    provider: ai.provider,
    baseUrl,
    baseUrlInvalid: baseUrl.trim() !== '' && !isValidUrl(baseUrl),
    model,
    apiKey,
    cost,
    costInvalid: {
      input: Number.isNaN(parseDecimal(cost.input)),
      output: Number.isNaN(parseDecimal(cost.output)),
      limit: Number.isNaN(parseDecimal(cost.limit)),
    },
    monthlyLimit: ai.monthlyLimit,
    changeUrl,
    changeModel,
    pickModel,
    changeKey,
    changeCost,
    changeProvider,
    flushAll,
  };
}

export type AiSettingsForm = ReturnType<typeof useAiSettingsForm>;
