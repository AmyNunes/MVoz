import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import { BASE_RULES } from './rules';

export type ReadingTextInput = {
  theme: string;
  /** `questions`: muitas perguntas (entonação); `statements`: afirmações; `mixed`: os dois. */
  focus: 'questions' | 'statements' | 'mixed';
  size: 'short' | 'medium';
};

const FOCUS = {
  questions: 'Use muitas perguntas, para treinar a entonação que sobe no fim.',
  statements: 'Use frases afirmativas curtas, com final que desce suave.',
  mixed: 'Misture perguntas e afirmações.',
} as const;

/** Texto novo para ler em voz alta nos exercícios de fala (seção 12.5, `readingText`). */
export function readingTextPrompt(input: ReadingTextInput, ctx: UserContext): ChatMessage[] {
  const size = input.size === 'short' ? '2 parágrafos curtos (uns 60 segundos de leitura)' : '3 ou 4 parágrafos (uns 2 minutos)';
  const rules = [
    '- Escreva um texto original para ler em voz alta, em português do Brasil do dia a dia, com frases curtas e fáceis de falar.',
    `- Tamanho: ${size}.`,
    `- ${FOCUS[input.focus]}`,
    '- Nada de temas tristes, violentos ou que marquem o gênero de quem lê.',
  ].join('\n');
  return [
    { role: 'system', content: [BASE_RULES, rules, contextText(ctx)].join('\n\n') },
    { role: 'user', content: `Tema: ${input.theme}.` },
  ];
}

export type SpeakingPromptsInput = { stageName: string | null; situations: string; count: number };

/** Perguntas variadas para a Conversa treinada (S4) e o monólogo (seção 12.5, `speakingPrompts`). */
export function speakingPromptsPrompt(input: SpeakingPromptsInput, ctx: UserContext): ChatMessage[] {
  const rules = [
    `- Crie ${input.count} perguntas abertas e leves para a pessoa responder em voz alta, cada uma com uma dica curta de voz (tipPt) ligada à etapa atual.`,
    '- Perguntas do dia a dia, que rendam pelo menos 30 segundos de fala, sem temas pessoais delicados.',
  ].join('\n');
  const stage = input.stageName ? `Etapa: ${input.stageName}. ` : '';
  return [
    { role: 'system', content: [BASE_RULES, rules, contextText(ctx)].join('\n\n') },
    { role: 'user', content: `${stage}Situações que importam: ${input.situations}.` },
  ];
}
