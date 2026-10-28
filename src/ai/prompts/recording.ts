import type { SegmentMetrics } from '@/audio/metrics';

import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import { describeMetrics } from './describe';
import { BASE_RULES, CATALOG_RULE, catalogForPrompt } from './rules';

const KINDS = { baseline: 'gravação inicial', checkin: 'check-in semanal', exercise: 'exercício', free: 'fala livre no Medidor' } as const;

export type ExplainRecordingInput = {
  kind: keyof typeof KINDS;
  exerciseName: string | null;
  metrics: SegmentMetrics;
};

/** "Perguntar à IA sobre esta gravação" (seção 10.8): só as métricas, nunca o áudio. */
export function explainRecordingPrompt(input: ExplainRecordingInput, ctx: UserContext): ChatMessage[] {
  const system = [
    BASE_RULES,
    '- Explique as medidas de uma gravação em linguagem simples: o que está indo bem (strengthsPt), no que focar (focusPt) e um resumo curto (summaryPt).',
    '- Compare com o início e com a faixa-alvo quando houver. Lembre que a ressonância é uma estimativa.',
    `- ${CATALOG_RULE}`,
    contextText(ctx),
    `Catálogo:\n${catalogForPrompt()}`,
  ].join('\n\n');
  const user = [`Tipo: ${KINDS[input.kind]}${input.exerciseName ? ` (${input.exerciseName})` : ''}.`, `Medidas:\n${describeMetrics(input.metrics)}`].join('\n');
  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}
