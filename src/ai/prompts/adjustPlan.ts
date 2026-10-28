import { getExercise } from '@/exercises/catalog';

import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import { BASE_RULES, catalogForPrompt } from './rules';

export type AdjustPlanInput = {
  /** Etapas que ainda dá para mudar (a atual e as próximas). */
  stages: { index: number; name: string; exercises: string[]; fixed: string | null }[];
  request: string;
};

const RULES = `- Sugira mudanças nos exercícios das etapas do plano para atender ao pedido: "add" (acrescentar), "remove" (tirar) ou "replace" (trocar exerciseId por replaceWithId).
- Use SOMENTE ids do catálogo. "remove" e "replace" só para exercícios que já estão na etapa. Nunca tire o exercício fixo de medição.
- No máximo 5 mudanças, cada uma com um motivo curto (reasonPt). Em explanationPt, explique em 2 a 4 frases.
- Não mude a ordem das etapas nem decida avançar: isso é das regras do app.
- Se o pedido for arriscado para a voz, explique o porquê e sugira algo seguro.`;

/** "Ajustar com IA" (seção 9.5): sugere mudanças nos exercícios das etapas, só do catálogo. */
export function adjustPlanPrompt(input: AdjustPlanInput, ctx: UserContext): ChatMessage[] {
  const system = [BASE_RULES, RULES, contextText(ctx), `Catálogo:\n${catalogForPrompt()}`].join('\n\n');
  const plan = input.stages
    .map((s) => {
      const list = s.exercises.map((id) => `${id}${id === s.fixed ? ' (fixo)' : ''} — ${getExercise(id)?.name ?? id}`).join('; ');
      return `Etapa ${s.index} ("${s.name}"): ${list}`;
    })
    .join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: `Plano (stageIndex: exercícios):\n${plan}\n\nPedido: "${input.request}"` },
  ];
}
