import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import { BASE_RULES, CATALOG_RULE, catalogForPrompt } from './rules';

/** Até quantas mensagens do histórico vão para a IA. */
export const COACH_HISTORY = 12;

const RULES = `- Responda dúvidas sobre voz, treino e cuidados, em até 6 frases (replyPt). Pode usar listas curtas.
- Quando fizer sentido, sugira exercícios do catálogo (suggestedExerciseIds). ${CATALOG_RULE}
- safetyFlag = true quando a pessoa citar dor, rouquidão por mais de 2–3 dias, perda de voz, sangue, falta de ar ou cirurgia recente; nesses casos, recomende parar o treino e procurar fono ou otorrino.
- Fora de voz, responda com gentileza que você só ajuda com voz.`;

/** Perguntar à IA (Coach, seção 10.9): conversa de texto sobre voz. */
export function coachPrompt(history: readonly ChatMessage[], ctx: UserContext): ChatMessage[] {
  const system = [BASE_RULES, RULES, contextText(ctx), `Catálogo:\n${catalogForPrompt()}`].join('\n\n');
  return [{ role: 'system', content: system }, ...history.slice(-COACH_HISTORY)];
}
