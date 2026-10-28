import { randomUUID } from 'expo-crypto';

/** Id em texto (uuid v4), como pede o modelo de dados. */
export function newId(): string {
  return randomUUID();
}
