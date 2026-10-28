import type { Goal } from '@/exercises/model';
import type { Profile } from '@/guide/profile';
import type { PlanStage } from '@/guide/stages';
import { strings } from '@/i18n/strings';

const t = strings.guide;

/** Prazo estimado do plano (seção 9.2), sempre em faixa e nunca uma data. */
export function deadlineText(goal: Goal, hormones: Profile['hormones']): string {
  if (goal === 'feminize') return t.deadline.feminize;
  if (goal === 'masculinize') return hormones === 'testosterone' ? t.deadline.masculinizeT : t.deadline.masculinize;
  return t.deadline.none;
}

/** "2–4 semanas" ou "contínua". */
export function stageWeeks(stage: PlanStage): string {
  return stage.typicalWeeks ? t.result.weeks(stage.typicalWeeks[0], stage.typicalWeeks[1]) : t.result.continuous;
}
