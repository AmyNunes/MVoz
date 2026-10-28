import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import { BASE_RULES } from './rules';

/** Números do check-in, calculados no aparelho (seção 12.5). */
export type WeeklyStats = {
  minutesWeek: number;
  activeDays: number;
  readingMedianHz: number | null;
  lastReadingMedianHz: number | null;
  startReadingMedianHz: number | null;
  inTargetPct: number | null;
  resonancePct: number | null;
  effort: number;
  fit: number;
  comfort: number;
  symptoms: string[];
  milestonesMet: number;
  milestonesTotal: number;
  decision: string;
};

const RULES = `- Escreva um resumo gentil da semana em 3 a 5 frases (summaryPt), destacando o que melhorou e sem cobrar.
- Em focusNextWeekPt, uma sugestão prática para a próxima semana, em 1 ou 2 frases.
- A decisão de etapa já foi tomada pelo app: só explique, não mude.`;

const hz = (n: number | null) => (n === null ? '—' : `${Math.round(n)} Hz`);

/** Resumo do check-in (seção 9.4): a IA explica os números; a decisão já veio das regras do app. */
export function weeklySummaryPrompt(stats: WeeklyStats, ctx: UserContext): ChatMessage[] {
  const system = [BASE_RULES, RULES, contextText(ctx)].join('\n\n');
  const user = [
    `Treino na semana: ${stats.minutesWeek} min em ${stats.activeDays} dias.`,
    `Tom médio na leitura: hoje ${hz(stats.readingMedianHz)}, semana passada ${hz(stats.lastReadingMedianHz)}, início ${hz(stats.startReadingMedianHz)}.`,
    stats.inTargetPct === null ? '' : `Leitura na faixa: ${stats.inTargetPct}% do tempo de voz.`,
    stats.resonancePct === null ? '' : `Ressonância do "i" (estimativa): ${stats.resonancePct > 0 ? '+' : ''}${Math.round(stats.resonancePct)}% em relação ao início.`,
    `Respostas: esforço ${stats.effort}/10, combina comigo ${stats.fit}/10, conforto ${stats.comfort}/10.`,
    `Sintomas: ${stats.symptoms.length > 0 ? stats.symptoms.join(', ') : 'nenhum'}.`,
    `Marcos da etapa: ${stats.milestonesMet} de ${stats.milestonesTotal}.`,
    `Decisão: ${stats.decision}.`,
  ];
  return [
    { role: 'system', content: system },
    { role: 'user', content: user.filter(Boolean).join('\n') },
  ];
}
