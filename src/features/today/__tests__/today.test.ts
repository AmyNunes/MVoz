import type { Routine } from '@/db/routinesRepo';
import { EMPTY_RATING } from '@/exercises/results';
import { baseline, profile } from '@/guide/__tests__/fixtures';
import { generatePlan } from '@/guide/plan';
import type { SessionRecord } from '@/guide/records';

import { buildToday, todayRoutine, weekDays, type TodayData } from '../today';

const now = new Date(2026, 9, 28, 10, 0); // quarta-feira
const plan = { ...generatePlan(profile, baseline, '2026-10-20T00:00:00.000Z').plan, id: 'p' };

function session(partial: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id: 's',
    date: '2026-10-27',
    startedAt: new Date(2026, 9, 27, 19).toISOString(),
    origin: 'plan',
    block: 1,
    minutes: 8,
    discomfort: 0,
    stoppedForPain: false,
    results: [{ exerciseId: 'straw-phonation', repsDone: 1, skipped: false, metrics: {}, rating: EMPTY_RATING }],
    ...partial,
  };
}

const data = (partial: Partial<TodayData> = {}): TodayData => ({ plan, baseline, sessions: [], checkins: [], routines: [], ...partial });
const options = { dailyLimitMinutes: 15, now };

describe('Hoje', () => {
  it('primeiro uso: Guia → gravação inicial → plano → primeiro treino', () => {
    expect(buildToday(null, data(), options).setup).toBe('guide');
    expect(buildToday(profile, data({ baseline: null }), options).setup).toBe('baseline');
    expect(buildToday(profile, data({ plan: null }), options).setup).toBe('plan');
    expect(buildToday(profile, data(), options).setup).toBe('first-session');
    expect(buildToday(profile, data({ sessions: [session()] }), options).setup).toBeNull();
  });

  it('15 min por dia = 2 blocos; o bloco feito hoje fica marcado', () => {
    const view = buildToday(profile, data({ sessions: [session({ date: '2026-10-28', block: 1 })] }), options);
    expect(view.blocks.map((b) => b.block)).toEqual([1, 2]);
    expect(view.blocks[0].done).toBe(true);
    expect(view.blocks[1].done).toBe(false);
  });

  it('desconforto forte no treino de ontem: hoje é leve', () => {
    const view = buildToday(profile, data({ sessions: [session({ discomfort: 2 })] }), options);
    expect(view.light).toBe(true);
    expect(view.blocks[0].items.map((i) => i.exerciseId)).toContain('release-yawn-sigh');
  });

  it('cirurgia sem liberação bloqueia o plano', () => {
    expect(buildToday({ ...profile, recentSurgery: true }, data(), options).blocked).toBe(true);
  });

  it('limite diário e minutos da semana', () => {
    const view = buildToday(profile, data({ sessions: [session({ date: '2026-10-28', minutes: 16 }), session({ date: '2026-10-26', minutes: 5 })] }), options);
    expect(view.limitReached).toBe(true);
    expect(view.weekMinutes).toBe(21);
  });

  it('check-in pendente na semana', () => {
    expect(buildToday(profile, data(), options).checkinDue).toBe(true);
  });
});

describe('Sua semana', () => {
  it('segunda a domingo: feito, perdido, hoje e futuro', () => {
    const days = weekDays([session({ date: '2026-10-27' })], now);
    expect(days.map((d) => d.state)).toEqual(['missed', 'done', 'today', 'future', 'future', 'future', 'future']);
    expect(days[0].key).toBe('2026-10-26');
  });
});

describe('rotina no lugar do plano', () => {
  const routine = (useInToday: Routine['useInToday'], updatedAt: string): Routine => ({
    id: useInToday,
    name: 'R',
    items: [],
    origin: 'user',
    useInToday,
    createdAt: 'x',
    updatedAt,
  });

  it('"sempre" vale sempre; "hoje" só no dia em que foi escolhida', () => {
    expect(todayRoutine([routine('always', '2026-01-01T00:00:00.000Z')], now)?.id).toBe('always');
    expect(todayRoutine([routine('today', new Date(2026, 9, 28, 8).toISOString())], now)?.id).toBe('today');
    expect(todayRoutine([routine('today', new Date(2026, 9, 27, 8).toISOString())], now)).toBeNull();
  });
});
