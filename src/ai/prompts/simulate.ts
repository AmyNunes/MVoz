import { contextText, type UserContext } from '../context';
import type { ChatMessage } from '../types';

import type { Exercise } from '@/exercises/model';

const LEVELS = { beginner: 'iniciante', intermediate: 'intermediário', advanced: 'avançado' } as const;

/** Regras gerais dos prompts (seção 12.4). */
const SYSTEM = `Você é uma fonoaudióloga experiente em treino de voz, inclusive de pessoas trans e não binárias, guiando um exercício por texto, passo a passo.
Regras:
- Português do Brasil, simples, frases curtas, sem jargão. Se usar um termo técnico, explique (ex.: "SOVT = exercícios com a boca semi-ocluída, como o canudo").
- Fale com "você" e evite marcar gênero.
- Segurança acima de tudo: nunca sugira forçar, gritar, apertar a garganta ou treinar com dor. Lembre de parar se doer e de procurar fono ou otorrino se houver dor, rouquidão que não passa ou cansaço. Não dê diagnóstico.
- Explique só o exercício informado; não invente outros.
- Para cada passo diga: o que fazer, o que a pessoa deve sentir no corpo, como deve soar e como saber que está certo.
- "contour" (curva de tom) só quando o exercício trabalhar tom ou entonação: pontos { "t": segundos, "hz": tom }, tempos crescentes começando em 0, no máximo 20 pontos, sempre dentro da faixa segura informada. Nos outros exercícios, use null.
- Responda apenas com o JSON pedido.`;

export type SimulateInput = {
  exercise: Exercise;
  band: { lowHz: number; highHz: number } | null;
  doubt: string;
  /** Contexto do usuário (seção 12.3); `null` antes do Guia. */
  ctx?: UserContext | null;
};

export function simulatePrompt({ exercise, band, doubt, ctx = null }: SimulateInput): ChatMessage[] {
  const lines = [
    `Exercício: ${exercise.name} (${exercise.code}).`,
    `O que é: ${exercise.about}`,
    `Nível: ${LEVELS[exercise.level]}. Duração sugerida: ${Math.round(exercise.durationSec / 60)} min.`,
    `Passos do app:\n${exercise.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`,
    `O que o app mede: ${exercise.measures}`,
    exercise.cautions.length > 0 ? `Cuidados: ${exercise.cautions.join(' ')}` : '',
    ctx?.profile ? contextText(ctx) : 'Objetivo da pessoa: ainda não informado. Explique de forma que sirva para qualquer objetivo de voz.',
    band
      ? `Faixa segura de tom para a curva: ${Math.round(band.lowHz)}–${Math.round(band.highHz)} Hz (pode passar um pouco, sem exagero).`
      : 'Faixa de tom ainda não definida: se fizer uma curva, fique entre 150 e 220 Hz.',
    doubt ? `A pessoa ainda não entendeu: "${doubt}". Ajuste a explicação para resolver essa dúvida.` : '',
  ];
  return [
    { role: 'system', content: SYSTEM },
    { role: 'user', content: lines.filter(Boolean).join('\n\n') },
  ];
}
