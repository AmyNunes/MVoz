/** Predefinições de provedores compatíveis com a API da OpenAI (seção 10.1). */
export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    requiresKey: true,
    keyUrl: 'https://aistudio.google.com/apikey',
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    keyUrl: 'https://openrouter.ai/keys',
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    keyUrl: 'https://console.groq.com/keys',
  },
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  ollama: {
    label: 'Ollama (rede local)',
    baseUrl: 'http://IP-DO-PC:11434/v1',
    requiresKey: false,
    keyUrl: null,
  },
  custom: {
    label: 'Personalizado',
    baseUrl: '',
    requiresKey: false,
    keyUrl: null,
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as [ProviderId, ...ProviderId[]];

/** Junta a URL base com um caminho, sem barras duplicadas. */
export function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl.trim().replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}
