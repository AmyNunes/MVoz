import { callAI } from '../client';
import type { UserContext } from '../context';
import { coachPrompt } from '../prompts/coach';
import { coachReplySchema, type CoachReply } from '../schemas/coach';
import type { ChatMessage } from '../types';
import { validExerciseIds } from '../validate';

/** Uma resposta do Coach (seção 10.9). Exercícios só do catálogo. Sem cache (é conversa). */
export async function coachTurn(history: readonly ChatMessage[], ctx: UserContext): Promise<CoachReply> {
  const { data } = await callAI('coachTurn', coachPrompt(history, ctx), coachReplySchema, { temperature: 0.5 });
  return { ...data, suggestedExerciseIds: validExerciseIds(data.suggestedExerciseIds) };
}
