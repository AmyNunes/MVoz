import { getApiKey } from '@/ai/keyStore';
import { PROVIDERS } from '@/ai/providers';
import { useSettings } from '@/stores/settingsStore';

/** A IA está pronta para uso? (URL, modelo e, se o provedor exigir, chave.) */
export async function isAiConfigured(): Promise<boolean> {
  const ai = useSettings.getState().ai;
  if (!ai.baseUrl.trim() || !ai.model.trim()) return false;
  if (!PROVIDERS[ai.provider].requiresKey) return true;
  return (await getApiKey()) != null;
}
