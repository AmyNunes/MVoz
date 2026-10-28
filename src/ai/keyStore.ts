import * as SecureStore from 'expo-secure-store';

/** A chave da IA mora só aqui (SecureStore). Nunca em banco, log ou backup. */
const KEY = 'ai_api_key';

export async function getApiKey(): Promise<string | null> {
  const value = await SecureStore.getItemAsync(KEY);
  return value && value.trim() ? value.trim() : null;
}

export async function setApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) await SecureStore.setItemAsync(KEY, trimmed);
  else await SecureStore.deleteItemAsync(KEY);
}

export async function clearApiKey(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
