import type { BaselineMetrics } from '@/guide/baseline';
import type { CheckinRecord } from '@/guide/checkin';
import type { Plan } from '@/guide/plan';
import type { SessionRecord } from '@/guide/records';
import { addDays, startOfMonth } from '@/lib/dates';

/** Um ponto dos gráficos de Progresso: quando e o valor. `start` = a gravação inicial. */
export type ProgressPoint = { at: string; value: number; start: boolean };

export type ProgressView = {
  minutesWeek: number;
  activeDaysMonth: number;
  /** Tom médio na fala (leitura do último check-in, ou o início). */
  medianHz: number | null;
  inTargetPct: number | null;
  /** Tom médio da leitura: o início e cada check-in, do mais antigo ao mais novo. */
  pitch: ProgressPoint[];
  band: { lowHz: number; highHz: number } | null;
  /** Ressonância do "i" em % relativa ao início (0 = igual ao início). */
  resonance: ProgressPoint[];
};

export type ProgressData = {
  sessions: readonly SessionRecord[];
  /** Mais recentes primeiro. */
  checkins: readonly CheckinRecord[];
  baseline: { createdAt: string; metrics: BaselineMetrics } | null;
  plan: Pick<Plan, 'stageTarget'> | null;
};

/** Números e séries da aba Progresso (seção 10.7), tudo calculado no aparelho. */
export function buildProgress(data: ProgressData, now: Date): ProgressView {
  const weekAgo = addDays(now, -7).toISOString();
  const monthStart = startOfMonth(now).toISOString();
  const minutesWeek = Math.round(data.sessions.filter((s) => s.startedAt >= weekAgo).reduce((sum, s) => sum + s.minutes, 0));
  const activeDaysMonth = new Set(data.sessions.filter((s) => s.startedAt >= monthStart && s.minutes > 0).map((s) => s.date)).size;

  const oldestFirst = [...data.checkins].reverse();
  const start = data.baseline;
  const startHz = start ? (start.metrics.readingMedianHz ?? start.metrics.speechMedianHz) : null;
  const pitch: ProgressPoint[] = [
    ...(start && startHz ? [{ at: start.createdAt, value: startHz, start: true }] : []),
    ...oldestFirst.flatMap((c) => (c.metrics.reading?.medianHz ? [{ at: c.createdAt, value: c.metrics.reading.medianHz, start: false }] : [])),
  ];

  const startSpacing = start?.metrics.vowelI?.spacing ?? null;
  const resonance: ProgressPoint[] = startSpacing
    ? [
        { at: start?.createdAt ?? '', value: 0, start: true },
        ...oldestFirst.flatMap((c) => {
          const spacing = c.metrics.vowelI?.spacing;
          return spacing ? [{ at: c.createdAt, value: ((spacing - startSpacing) / startSpacing) * 100, start: false }] : [];
        }),
      ]
    : [];

  const last = data.checkins[0]?.metrics.reading ?? null;
  return {
    minutesWeek,
    activeDaysMonth,
    medianHz: last?.medianHz ?? startHz,
    inTargetPct: last?.inTargetRatio != null ? Math.round(last.inTargetRatio * 100) : null,
    pitch,
    band: data.plan?.stageTarget ?? null,
    resonance,
  };
}

