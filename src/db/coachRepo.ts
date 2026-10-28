import { z } from 'zod';

import { nowIso } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { parseJsonWith } from '@/lib/json';

import { getDb } from './client';

/** Conversas com o Coach (seção 10.9, tabela `coach_conversations`). */

export const coachMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  at: z.string(),
  /** Só nas respostas da IA. */
  exerciseIds: z.array(z.string()).default([]),
  safetyFlag: z.boolean().default(false),
});
export type CoachMessage = z.infer<typeof coachMessageSchema>;

export type CoachConversation = { id: string; createdAt: string; messages: CoachMessage[] };

const messagesSchema = z.array(coachMessageSchema);

/** A conversa em aberto (a mais recente que não foi encerrada), ou `null`. */
export async function getOpenConversation(): Promise<CoachConversation | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ id: string; createdAt: string; messages: string }>(
    'SELECT id, createdAt, messages FROM coach_conversations WHERE endedAt IS NULL ORDER BY createdAt DESC LIMIT 1',
  );
  return row ? { id: row.id, createdAt: row.createdAt, messages: parseJsonWith(row.messages, messagesSchema, []) } : null;
}

/** Cria a conversa (se `id` for `null`) ou salva as mensagens. Devolve o id. */
export async function saveConversation(id: string | null, messages: readonly CoachMessage[]): Promise<string> {
  const db = await getDb();
  if (id) {
    await db.runAsync('UPDATE coach_conversations SET messages = ? WHERE id = ?', JSON.stringify(messages), id);
    return id;
  }
  const newConversation = newId();
  await db.runAsync(
    'INSERT INTO coach_conversations (id, messages, createdAt, endedAt) VALUES (?, ?, ?, NULL)',
    newConversation,
    JSON.stringify(messages),
    nowIso(),
  );
  return newConversation;
}

/** "Nova conversa": encerra a atual (fica guardada). */
export async function endConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE coach_conversations SET endedAt = ? WHERE id = ?', nowIso(), id);
}
