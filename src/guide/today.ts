import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';
import type { RoutineItem } from '@/exercises/results';

import type { PlanStage } from './stages';

/** Retorno visual (seção 8.5). */
export type Feedback = 'full' | 'partial' | 'summary';
export type ItemRole = 'warmup' | 'skill' | 'speech' | 'cooldown';
/** Um exercício do treino do dia, com o papel no treino e o retorno visual da semana. */
export type PlanItem = RoutineItem & { role: ItemRole; feedback: Feedback };
/** Normal, "Só tenho 5 minutos" ou "Pegue leve hoje" (seção 10.1). */
export type SessionVariant = 'normal' | 'minimal' | 'light';

const DEFAULT_WARMUPS = ['straw-phonation', 'lip-trill'];
const DEFAULT_SPEECH = 'speech-ladder';
const COOLDOWN = 'cooldown';
const WARMUP_SEC = 150;
const COOLDOWN_SEC = 90;
const MIN_SKILL_SEC = 120;
const MAX_SKILL_ITEMS = 3;
/** Treino leve: soltura, SOVT, respiração e desaquecimento (seção 14). */
const LIGHT: PlanItem[] = [
  { exerciseId: 'release-yawn-sigh', durationSec: 90, role: 'warmup', feedback: 'full' },
  { exerciseId: 'straw-phonation', durationSec: 120, role: 'warmup', feedback: 'full' },
  { exerciseId: 'diaphragmatic-breathing', durationSec: 120, role: 'skill', feedback: 'full' },
  { exerciseId: COOLDOWN, durationSec: 60, role: 'cooldown', feedback: 'full' },
];

/** Retorno visual diminui (seção 9.3): completo na 1ª semana da etapa → parcial → só resumo na fala. */
export function feedbackFor(week: number, role: ItemRole): Feedback {
  if (week <= 1) return 'full';
  if (week === 2) return 'partial';
  return role === 'speech' ? 'summary' : 'partial';
}

const pick = <T>(list: readonly T[], week: number): T => list[(Math.max(1, week) - 1) % list.length];

function exercisesOf(ids: readonly string[]): Exercise[] {
  return ids.flatMap((id) => {
    const e = getExercise(id);
    return e ? [e] : [];
  });
}

/**
 * Habilidades da etapa com rodízio semanal (seção 9.3): de cada habilidade entra um exercício
 * por semana; o exercício de medição da etapa fica fixo e vem primeiro.
 */
export function skillRotation(stage: PlanStage, week: number): string[] {
  const pool = exercisesOf(stage.exercises).filter((e) => !['warmup', 'cooldown', 'speech'].includes(e.category));
  const groups = new Map<string, Exercise[]>();
  for (const e of pool) groups.set(e.skill, [...(groups.get(e.skill) ?? []), e]);
  const measure = stage.measureExerciseId;
  const chosen = [...groups.values()]
    .map((group) => (measure && group.some((e) => e.id === measure) ? measure : pick(group, week).id))
    .sort((a, b) => (a === measure ? -1 : b === measure ? 1 : 0));
  return chosen.slice(0, MAX_SKILL_ITEMS);
}

/** Treino de um bloco (seção 9.2): aquecimento → habilidade da etapa → fala → desaquecimento. */
export function buildPlanSession(stage: PlanStage, options: { minutes: number; week: number; variant: SessionVariant }): PlanItem[] {
  const { week, variant } = options;
  if (variant === 'light') return LIGHT;

  const warmups = exercisesOf(stage.exercises).filter((e) => e.category === 'warmup').map((e) => e.id);
  const warmup = pick(warmups.length > 0 ? warmups : DEFAULT_WARMUPS, week);
  const skills = skillRotation(stage, week);

  if (variant === 'minimal') {
    return [
      { exerciseId: warmup, durationSec: 120, role: 'warmup', feedback: 'full' },
      { exerciseId: skills[0] ?? warmup, durationSec: 180, role: 'skill', feedback: feedbackFor(week, 'skill') },
      { exerciseId: COOLDOWN, durationSec: 60, role: 'cooldown', feedback: 'full' },
    ];
  }

  const total = options.minutes * 60;
  const speechIds = exercisesOf(stage.exercises).filter((e) => e.category === 'speech').map((e) => e.id);
  const speechSec = stage.speech ? Math.max(180, Math.min(480, Math.round(total * 0.3))) : 0;
  const skillBudget = Math.max(MIN_SKILL_SEC, total - WARMUP_SEC - COOLDOWN_SEC - speechSec);
  const skillCount = Math.max(1, Math.min(skills.length, Math.floor(skillBudget / MIN_SKILL_SEC)));
  const skillSec = Math.round(skillBudget / skillCount);

  const items: PlanItem[] = [
    { exerciseId: warmup, durationSec: WARMUP_SEC, role: 'warmup', feedback: 'full' },
    ...skills.slice(0, skillCount).map((exerciseId): PlanItem => ({ exerciseId, durationSec: skillSec, role: 'skill', feedback: feedbackFor(week, 'skill') })),
  ];
  if (stage.speech) {
    const speech = pick(speechIds.length > 0 ? speechIds : [DEFAULT_SPEECH], week);
    items.push({ exerciseId: speech, durationSec: speechSec, role: 'speech', feedback: feedbackFor(week, 'speech') });
  }
  items.push({ exerciseId: COOLDOWN, durationSec: COOLDOWN_SEC, role: 'cooldown', feedback: 'full' });
  return items;
}

/** Duração total de um treino (para "~15 min" e o limite diário). */
export function sessionMinutes(items: readonly PlanItem[]): number {
  return Math.round(items.reduce((sum, i) => sum + (i.durationSec ?? 0), 0) / 60);
}
