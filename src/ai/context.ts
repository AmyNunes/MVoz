import type { Goal } from '@/exercises/model';
import type { Profile } from '@/guide/profile';

/**
 * Contexto do usuário que vai em todo prompt de sistema (seção 12.3). Identidade e hormônios
 * só entram com "Incluir meu contexto nas perguntas à IA" ligado (seção 12.2).
 */
export type UserContext = {
  profile: Pick<Profile, 'goal' | 'grammaticalGender' | 'experience' | 'identity' | 'hormones' | 'aiIncludeContext'> | null;
  stage: { name: string; number: number; total: number } | null;
  band: { lowHz: number; highHz: number } | null;
  start: { speechMedianHz: number; readingMedianHz: number | null; minHz: number; maxHz: number } | null;
  lastCheckin: { readingMedianHz: number | null; inTargetPct: number | null; effort: number; fit: number; comfort: number } | null;
  /** Relatou desconforto ou rouquidão nas últimas 2 semanas (sem detalhes). */
  discomfort: boolean;
};

const GOALS: Record<Goal, string> = {
  feminize: 'voz mais feminina',
  masculinize: 'voz mais masculina',
  neutral: 'voz mais neutra/andrógina',
  health: 'cuidar da saúde da voz (sem mudar o tom)',
};
const GENDER = { f: 'feminino', m: 'masculino', n: 'neutro (evite marcar gênero)' } as const;
const EXPERIENCE = { new: 'começando agora', some: 'já treinou um pouco', long: 'treina há tempo' } as const;
const IDENTITY = { 'trans-woman': 'mulher trans', 'trans-man': 'homem trans', nonbinary: 'pessoa não binária', other: 'outra', undisclosed: '' } as const;
const HORMONES = { none: 'sem hormônios', estrogen: 'usa estrogênio', testosterone: 'usa testosterona', undisclosed: '' } as const;

const hz = (n: number | null) => (n === null ? '—' : `${Math.round(n)} Hz`);

/** O contexto em texto, para o prompt de sistema. */
export function contextText(ctx: UserContext): string {
  const p = ctx.profile;
  const lines = ['Contexto da pessoa:'];
  if (!p) lines.push('- Ainda não respondeu o Guia: objetivo e medidas desconhecidos.');
  else {
    lines.push(`- Objetivo: ${GOALS[p.goal]}.`, `- Forma de tratamento: ${GENDER[p.grammaticalGender]}.`, `- Experiência: ${EXPERIENCE[p.experience]}.`);
    if (p.aiIncludeContext) {
      if (p.identity && IDENTITY[p.identity]) lines.push(`- Identidade: ${IDENTITY[p.identity]}.`);
      if (p.hormones && HORMONES[p.hormones]) lines.push(`- Hormônios: ${HORMONES[p.hormones]}.`);
    }
  }
  if (ctx.stage) lines.push(`- Etapa atual do plano: ${ctx.stage.number} de ${ctx.stage.total}, "${ctx.stage.name}".`);
  if (ctx.band) lines.push(`- Faixa-alvo de tom agora: ${hz(ctx.band.lowHz)} a ${hz(ctx.band.highHz)}.`);
  if (ctx.start) {
    lines.push(
      `- No início: tom médio na fala ${hz(ctx.start.speechMedianHz)}, na leitura ${hz(ctx.start.readingMedianHz)}; extensão confortável ${hz(ctx.start.minHz)} a ${hz(ctx.start.maxHz)}.`,
    );
  }
  if (ctx.lastCheckin) {
    const c = ctx.lastCheckin;
    const inTarget = c.inTargetPct === null ? '' : `, ${c.inTargetPct}% na faixa`;
    lines.push(`- Último check-in: leitura ${hz(c.readingMedianHz)}${inTarget}; esforço ${c.effort}/10, combina comigo ${c.fit}/10, conforto ${c.comfort}/10.`);
  }
  if (ctx.discomfort) lines.push('- Relatou desconforto ou rouquidão recentemente: priorize descanso e exercícios leves.');
  return lines.join('\n');
}
