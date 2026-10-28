import type { VoiceFrame } from '@/audio/analyzer';
import { baseline, profile } from '@/guide/__tests__/fixtures';
import type { CheckinAnswers } from '@/guide/checkin';
import { evaluateMilestones, type MilestoneContext } from '@/guide/milestones';
import { currentStage, generatePlan, type Plan } from '@/guide/plan';
import type { SessionRecord } from '@/guide/records';
import type { PlanOverview } from '@/features/plan/usePlanOverview';

import { checkinMetricsFrom, evaluateCheckin } from '../evaluate';

const NOW = new Date('2026-10-25T12:00:00Z');
const calmAnswers: CheckinAnswers = { effort: 2, fit: 7, comfort: 8, symptoms: [] };

const voiced = (hz: number, n = 200): VoiceFrame[] =>
  Array.from({ length: n }, (_, i) => ({ t: i * 0.02, hz, clarity: 0.95, rms: 0.1, formants: null }));

function overview(plan: Plan, sessions: SessionRecord[] = [], extra: Partial<MilestoneContext> = {}): PlanOverview {
  const stage = currentStage(plan);
  const context: MilestoneContext = {
    sessions,
    checkins: [],
    baseline,
    band: plan.stageTarget,
    floorHz: 150,
    resonanceDirection: 'brighter',
    ...extra,
  };
  return {
    plan,
    stage,
    baseline,
    milestones: evaluateMilestones(stage, context),
    week: 3,
    stuck: false,
    reinforcement: false,
    context,
    lastCheckin: null,
    lastFullAt: '2026-10-01T00:00:00Z',
  };
}

const basePlan = (): Plan => ({ ...generatePlan(profile, baseline, '2026-09-01T00:00:00Z').plan, id: 'p' });

function atPitchStage(): Plan {
  const plan = basePlan();
  return { ...plan, stageIndex: plan.stages.findIndex((s) => s.pitchMoves), stageStartedAt: '2026-09-20T00:00:00Z' };
}

const holdSession = (startedAt: string): SessionRecord => ({
  id: startedAt,
  date: startedAt.slice(0, 10),
  startedAt,
  origin: 'plan',
  block: 1,
  minutes: 10,
  discomfort: 0,
  stoppedForPain: false,
  results: [
    {
      exerciseId: 'target-hold',
      repsDone: 8,
      skipped: false,
      metrics: {},
      rating: { feeling: null, discomfort: 0, selfRating: null, mission: null },
    },
  ],
});

describe('checkinMetricsFrom', () => {
  it('mede a leitura na faixa da etapa; o deslize só entra na regravação mensal', () => {
    const metrics = checkinMetricsFrom({ reading: voiced(180), free: voiced(170) }, { band: { lowHz: 165, highHz: 200 }, floorHz: 150 });
    expect(metrics.reading?.medianHz).toBeCloseTo(180);
    expect(metrics.reading?.inTargetRatio).toBe(1);
    expect(metrics.free?.medianHz).toBeCloseTo(170);
    expect(metrics.extension).toBeNull();

    const full = checkinMetricsFrom({ glide: [...voiced(150, 50), ...voiced(300, 50)] }, { band: { lowHz: 165, highHz: 200 }, floorHz: null });
    expect(full.extension).toEqual({ lowHz: 150, highHz: 300 });
  });
});

describe('evaluateCheckin', () => {
  it('compara com o início e com a semana passada', () => {
    const plan = basePlan();
    const view = { ...overview(plan), lastCheckin: null };
    const metrics = checkinMetricsFrom({ reading: voiced(140) }, { band: plan.stageTarget, floorHz: 150 });
    const { comparison } = evaluateCheckin(view, { metrics, answers: calmAnswers, now: NOW });
    expect(comparison.startHz).toBe(baseline.readingMedianHz);
    expect(comparison.lastHz).toBeNull();
    expect(comparison.nowHz).toBeCloseTo(140);
    expect(comparison.floorHz).toBe(150);
  });

  it('dor ou rouquidão na semana: sugere semana mais leve', () => {
    const plan = basePlan();
    const metrics = checkinMetricsFrom({ reading: voiced(140) }, { band: plan.stageTarget, floorHz: null });
    const result = evaluateCheckin(overview(plan), { metrics, answers: { ...calmAnswers, symptoms: ['pain'] }, now: NOW });
    expect(result.decision).toBe('lighter');
    expect(result.reasons).toEqual(['symptoms']);
  });

  it('marcos faltando: continua na etapa', () => {
    const plan = basePlan();
    const metrics = checkinMetricsFrom({ reading: voiced(140) }, { band: plan.stageTarget, floorHz: null });
    const result = evaluateCheckin(overview(plan), { metrics, answers: calmAnswers, now: NOW });
    expect(result.decision).toBe('stay');
    expect(result.reasons).toContain('milestones');
    expect(result.raiseBand).toBe(false);
  });

  it('etapa de tom: marco de tom cumprido sobe a faixa; só contam os treinos depois da última subida', () => {
    const plan = atPitchStage();
    const sessions = ['2026-10-24T10:00:00Z', '2026-10-23T10:00:00Z', '2026-10-22T10:00:00Z'].map(holdSession);
    const metrics = checkinMetricsFrom({ reading: voiced(150) }, { band: plan.stageTarget, floorHz: null });

    expect(evaluateCheckin(overview(plan, sessions), { metrics, answers: calmAnswers, now: NOW }).raiseBand).toBe(true);
    const afterRaise = overview(plan, sessions, { bandSince: '2026-10-23T00:00:00Z' });
    expect(evaluateCheckin(afterRaise, { metrics, answers: calmAnswers, now: NOW }).raiseBand).toBe(false);
  });
});
