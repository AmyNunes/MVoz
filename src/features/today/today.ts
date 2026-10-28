import type { Routine } from '@/db/routinesRepo';
import type { BaselineMetrics } from '@/guide/baseline';
import { checkinDue, type CheckinRecord } from '@/guide/checkin';
import { currentStage, weekInStage, type Plan } from '@/guide/plan';
import { blockCount, effectiveDailyMinutes, planBlocked, type Profile } from '@/guide/profile';
import type { SessionRecord } from '@/guide/records';
import { minutesOn, safetyAlerts, shouldGoLight, type SafetyAlert } from '@/guide/safety';
import { buildPlanSession, sessionMinutes, type PlanItem } from '@/guide/today';
import { addDays, localDateKey, startOfWeek, studyDayKey } from '@/lib/dates';

/** Primeiro uso (seção 10.1): Responder o Guia → Gravação inicial → Ver o plano → Primeiro treino. */
export type SetupStep = 'guide' | 'baseline' | 'plan' | 'first-session' | null;

export type TodayBlock = { block: 1 | 2; items: PlanItem[]; minutes: number; done: boolean };
export type WeekDay = { key: string; state: 'done' | 'missed' | 'today' | 'future' };

export type TodayData = {
  plan: Plan | null;
  baseline: BaselineMetrics | null;
  /** Treinos dos últimos ~30 dias, mais recentes primeiro. */
  sessions: SessionRecord[];
  /** Check-ins mais recentes primeiro. */
  checkins: CheckinRecord[];
  routines: Routine[];
};

export type TodayView = {
  setup: SetupStep;
  /** Cirurgia recente sem liberação: só leitura dos exercícios (seção 14.6). */
  blocked: boolean;
  alerts: SafetyAlert[];
  /** "Pegue leve hoje" (desconforto forte no último treino ou semana mais leve). */
  light: boolean;
  blocks: TodayBlock[];
  /** Rotina escolhida para hoje, no lugar do plano. */
  routine: Routine | null;
  minutesToday: number;
  limitReached: boolean;
  week: WeekDay[];
  weekMinutes: number;
  checkinDue: boolean;
  stageIndex: number | null;
};

function setupStep(profile: Profile | null, data: TodayData): SetupStep {
  if (!profile) return 'guide';
  if (!data.baseline) return 'baseline';
  if (!data.plan) return 'plan';
  return data.sessions.length === 0 ? 'first-session' : null;
}

/** Segunda a domingo da semana atual, com os dias treinados. */
export function weekDays(sessions: readonly SessionRecord[], now: Date): WeekDay[] {
  const today = studyDayKey(now);
  const trained = new Set(sessions.filter((s) => s.minutes > 0 || s.results.length > 0).map((s) => s.date));
  const monday = startOfWeek(now);
  return Array.from({ length: 7 }, (_, i) => {
    const key = localDateKey(addDays(monday, i));
    const state = trained.has(key) ? 'done' : key === today ? 'today' : key < today ? 'missed' : 'future';
    return { key, state };
  });
}

/** Rotina que vale hoje: "sempre", ou "hoje" escolhida neste dia de treino. */
export function todayRoutine(routines: readonly Routine[], now: Date): Routine | null {
  const today = studyDayKey(now);
  return (
    routines.find((r) => r.useInToday === 'always') ??
    routines.find((r) => r.useInToday === 'today' && studyDayKey(new Date(r.updatedAt)) === today) ??
    null
  );
}

/** O que a tela Hoje mostra (seção 10.1). */
export function buildToday(profile: Profile | null, data: TodayData, options: { dailyLimitMinutes: number; now: Date }): TodayView {
  const { now } = options;
  const today = studyDayKey(now);
  const week = weekDays(data.sessions, now);
  const weekKeys = new Set(week.map((d) => d.key));
  const minutesToday = minutesOn(data.sessions, today);
  const plan = data.plan;
  const light = plan ? shouldGoLight(data.sessions[0] ?? null, plan.lighterUntil, now) : false;

  let blocks: TodayBlock[] = [];
  if (profile && plan) {
    const minutes = effectiveDailyMinutes(profile);
    const count = blockCount(minutes);
    const stage = currentStage(plan);
    const week = weekInStage(plan.stageStartedAt, now);
    blocks = Array.from({ length: count }, (_, i) => {
      const block = (i + 1) as 1 | 2;
      const items = buildPlanSession(stage, { minutes: minutes / count, week, variant: light ? 'light' : 'normal' });
      const done = data.sessions.some((s) => s.date === today && s.block === block && (s.origin === 'plan' || s.origin === 'minimal'));
      return { block, items, minutes: sessionMinutes(items), done };
    });
  }

  return {
    setup: setupStep(profile, data),
    blocked: planBlocked(profile),
    alerts: safetyAlerts(data.sessions, data.checkins),
    light,
    blocks,
    routine: todayRoutine(data.routines, now),
    minutesToday,
    limitReached: minutesToday >= options.dailyLimitMinutes,
    week,
    weekMinutes: Math.round(data.sessions.filter((s) => weekKeys.has(s.date)).reduce((sum, s) => sum + s.minutes, 0)),
    checkinDue: !!plan && checkinDue(data.checkins[0] ?? null, now),
    stageIndex: plan?.stageIndex ?? null,
  };
}
