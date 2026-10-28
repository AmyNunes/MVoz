import type { VoiceFrame } from '@/audio/analyzer';
import { EMPTY_RATING } from '@/exercises/results';

import { buildBaseline, extension } from '../baseline';
import { checkinDue, fullRecordingDue, weekStartKey, type CheckinRecord } from '../checkin';
import { evaluateMilestones, type MilestoneContext } from '../milestones';
import { generatePlan } from '../plan';
import { applyDecision, isStuck, needsReinforcement, suggestDecision } from '../progression';
import type { SessionRecord } from '../records';
import { minutesOn, safetyAlerts, shouldGoLight } from '../safety';
import { stagesFor } from '../stages';
import { buildPlanSession, feedbackFor, sessionMinutes, skillRotation } from '../today';

import { baseline, profile } from './fixtures';

const feminize = stagesFor('feminize', { hormones: null });
const [fundamentals, resonance, pitch] = feminize;

function session(partial: Partial<SessionRecord> = {}): SessionRecord {
  return { id: 's', date: '2026-10-26', startedAt: '2026-10-26T18:00:00.000Z', origin: 'plan', block: 1, minutes: 10, discomfort: 0, stoppedForPain: false, results: [], ...partial };
}
const result = (exerciseId: string, extra: Partial<SessionRecord['results'][number]> = {}) => ({
  exerciseId,
  repsDone: 0,
  skipped: false,
  metrics: {},
  rating: EMPTY_RATING,
  ...extra,
});
function checkin(partial: Partial<CheckinRecord> = {}): CheckinRecord {
  return {
    id: 'c',
    weekStart: '2026-10-19',
    createdAt: '2026-10-25T10:00:00.000Z',
    answers: { effort: 2, fit: 8, comfort: 8, symptoms: [] },
    metrics: { reading: null, free: null, vowelI: null, extension: null },
    decision: null,
    summaryPt: '',
    recordingIds: [],
    ...partial,
  };
}

describe('treino do dia', () => {
  it('aquecimento → habilidades → fala → desaquecimento, no tempo do bloco', () => {
    const items = buildPlanSession(resonance, { minutes: 10, week: 1, variant: 'normal' });
    expect(items[0].role).toBe('warmup');
    expect(items[items.length - 1].exerciseId).toBe('cooldown');
    expect(items.some((i) => i.role === 'speech')).toBe(true);
    expect(sessionMinutes(items)).toBeGreaterThanOrEqual(9);
    expect(sessionMinutes(items)).toBeLessThanOrEqual(12);
  });

  it('o exercício de medição fica fixo e vem primeiro; os outros mudam com a semana', () => {
    expect(skillRotation(resonance, 1)[0]).toBe('f2-vowels');
    expect(skillRotation(resonance, 2)[0]).toBe('f2-vowels');
    expect(skillRotation(resonance, 1)).not.toEqual(skillRotation(resonance, 2));
  });

  it('fundamentos não têm exercício de fala', () => {
    expect(buildPlanSession(fundamentals, { minutes: 10, week: 1, variant: 'normal' }).some((i) => i.role === 'speech')).toBe(false);
  });

  it('"Só tenho 5 minutos" e "Pegue leve"', () => {
    const minimal = buildPlanSession(pitch, { minutes: 15, week: 1, variant: 'minimal' });
    expect(minimal.map((i) => i.role)).toEqual(['warmup', 'skill', 'cooldown']);
    expect(minimal[1].exerciseId).toBe('target-hold');
    expect(sessionMinutes(minimal)).toBeLessThanOrEqual(6);

    const light = buildPlanSession(pitch, { minutes: 15, week: 3, variant: 'light' });
    expect(light.every((i) => ['warmup', 'cooldown', 'skill'].includes(i.role))).toBe(true);
    expect(light.map((i) => i.exerciseId)).not.toContain('target-hold');
  });

  it('retorno visual diminui: completo → parcial → só resumo na fala', () => {
    expect(feedbackFor(1, 'speech')).toBe('full');
    expect(feedbackFor(2, 'skill')).toBe('partial');
    expect(feedbackFor(3, 'speech')).toBe('summary');
    expect(feedbackFor(3, 'skill')).toBe('partial');
  });
});

const ctx = (partial: Partial<MilestoneContext> = {}): MilestoneContext => ({
  sessions: [],
  checkins: [],
  baseline,
  band: { lowHz: 165, highHz: 200 },
  floorHz: 150,
  resonanceDirection: 'brighter',
  ...partial,
});

describe('marcos', () => {
  it('fundamentos: 5 treinos sem desconforto, deslize de 8 semitons e tempo de "a"', () => {
    const sessions = [
      ...Array.from({ length: 5 }, () => session({ results: [result('pitch-glides', { metrics: { glideRanges: [9] } })] })),
      session({ results: [result('sz-mpt', { metrics: { attempts: [{ label: '1', seconds: 12 }] } })] }),
    ];
    expect(evaluateMilestones(fundamentals, ctx({ sessions })).every((m) => m.met)).toBe(true);
    expect(evaluateMilestones(fundamentals, ctx()).some((m) => m.met)).toBe(false);
  });

  it('ressonância: /i/ do check-in 5% mais claro que o início e 3 treinos com melhora', () => {
    const sessions = Array.from({ length: 3 }, () => session({ results: [result('f2-vowels', { metrics: { resonance: { reference: 1000, bestChangePct: 6 } } })] }));
    const checkins = [checkin({ metrics: { reading: null, free: null, extension: null, vowelI: { f1: 300, f2: 2400, spacing: 1320 } } })];
    const [gain] = evaluateMilestones(resonance, ctx({ sessions, checkins }));
    expect(gain.met).toBe(true);
    expect(gain.current).toBeCloseTo(5.6, 1);
  });

  it('tom: leitura na faixa com o piso respeitado', () => {
    const reading = { medianHz: 180, p10Hz: 155 } as NonNullable<CheckinRecord['metrics']['reading']>;
    const checkins = [checkin({ metrics: { reading, free: null, vowelI: null, extension: null } })];
    const status = evaluateMilestones(pitch, ctx({ checkins }));
    expect(status.find((m) => m.kind === 'reading-band')?.met).toBe(true);
  });
});

describe('decisão do check-in', () => {
  const met = [{ kind: 'practice' as const, met: true, current: 6, target: 6 }];
  const base = { milestones: met, weeksInStage: 3, minWeeks: 2, answers: checkin().answers, recentSessions: [], maintenance: false, bandAtFinal: true, pitchStage: false };

  it('marcos cumpridos e tempo mínimo: avançar', () => {
    expect(suggestDecision(base).decision).toBe('advance');
  });

  it('dor ou rouquidão na semana: semana mais leve', () => {
    expect(suggestDecision({ ...base, answers: { ...base.answers, symptoms: ['hoarseness'] } }).decision).toBe('lighter');
    expect(suggestDecision({ ...base, recentSessions: [session({ discomfort: 2 })] }).decision).toBe('lighter');
  });

  it('antes do tempo mínimo, ou na etapa de tom sem a faixa na meta: continuar', () => {
    expect(suggestDecision({ ...base, weeksInStage: 1 }).decision).toBe('stay');
    expect(suggestDecision({ ...base, pitchStage: true, bandAtFinal: false }).reasons).toContain('band');
  });

  it('aplicar: avançar muda a etapa; mais leve marca 7 dias; na etapa de tom a faixa sobe', () => {
    const { plan } = generatePlan(profile, baseline, '2026-10-01T00:00:00.000Z');
    const now = new Date('2026-10-27T10:00:00.000Z');
    const p = { ...plan, id: 'p' };
    expect(applyDecision(p, 'advance', { baseline, raiseBand: false, now }).stageIndex).toBe(1);
    expect(applyDecision(p, 'lighter', { baseline, raiseBand: false, now }).lighterUntil).toBe('2026-11-03T10:00:00.000Z');

    const inPitch = { ...p, stageIndex: 2 };
    const raised = applyDecision(inPitch, 'stay', { baseline, raiseBand: true, now });
    expect(raised.stageTarget.lowHz).toBeGreaterThan(inPitch.stageTarget.lowHz);
  });

  it('travou: 4 semanas sem os marcos', () => {
    expect(isStuck(4, [{ kind: 'practice', met: false, current: 2, target: 6 }], false)).toBe(true);
    expect(isStuck(4, met, false)).toBe(false);
  });

  it('manutenção: reforço quando o tom cai 2 semitons do melhor em 2 check-ins', () => {
    const c = (hz: number) => checkin({ metrics: { reading: { medianHz: hz } as never, free: null, vowelI: null, extension: null } });
    expect(needsReinforcement([c(150), c(150), c(180)], 'up')).toBe(true);
    expect(needsReinforcement([c(178), c(150), c(180)], 'up')).toBe(false);
  });
});

describe('segurança', () => {
  it('dor em 3 treinos seguidos → fono; rouquidão em 3 check-ins → otorrino', () => {
    const pain = session({ stoppedForPain: true });
    expect(safetyAlerts([pain, pain, pain], [])).toEqual(['slp-pain']);
    expect(safetyAlerts([pain, session(), pain], [])).toEqual([]);
    const hoarse = checkin({ answers: { effort: 3, fit: 6, comfort: 6, symptoms: ['hoarseness'] } });
    expect(safetyAlerts([], [hoarse, hoarse, hoarse])).toEqual(['ent-hoarseness']);
  });

  it('desconforto forte no último treino: hoje é leve; depois de 36 h, não', () => {
    const last = session({ discomfort: 2, startedAt: '2026-10-26T20:00:00.000Z' });
    expect(shouldGoLight(last, null, new Date('2026-10-27T09:00:00.000Z'))).toBe(true);
    expect(shouldGoLight(last, null, new Date('2026-10-29T09:00:00.000Z'))).toBe(false);
    expect(shouldGoLight(null, '2026-10-30T00:00:00.000Z', new Date('2026-10-27T09:00:00.000Z'))).toBe(true);
  });

  it('minutos do dia', () => {
    expect(minutesOn([session({ minutes: 7 }), session({ minutes: 5 }), session({ date: 'x', minutes: 9 })], '2026-10-26')).toBe(12);
  });
});

describe('check-in', () => {
  it('semana começa na segunda; um por semana; regravação a cada 4 semanas', () => {
    expect(weekStartKey(new Date(2026, 9, 25))).toBe('2026-10-19');
    expect(checkinDue(checkin({ weekStart: '2026-10-19' }), new Date(2026, 9, 25))).toBe(false);
    expect(checkinDue(checkin({ weekStart: '2026-10-19' }), new Date(2026, 9, 27))).toBe(true);
    expect(fullRecordingDue('2026-10-01T00:00:00.000Z', new Date('2026-10-27T00:00:00.000Z'))).toBe(false);
    expect(fullRecordingDue('2026-09-01T00:00:00.000Z', new Date('2026-10-27T00:00:00.000Z'))).toBe(true);
  });
});

describe('gravação inicial', () => {
  const frames = (hz: number, seconds: number, formants = false): VoiceFrame[] =>
    Array.from({ length: Math.round(seconds / 0.02) }, (_, i) => ({
      t: i * 0.02,
      hz,
      clarity: 0.95,
      rms: 0.05,
      formants: formants && i % 5 === 0 ? { f1: 300, f2: 2300, f3: 3000, centroid: 1500 } : null,
    }));

  it('tom habitual da fala, extensão do deslize e ressonância das vogais', () => {
    const glide = Array.from({ length: 200 }, (_, i) => ({ t: i * 0.02, hz: 90 + i * 1.5, clarity: 0.95, rms: 0.05, formants: null }));
    const metrics = buildBaseline({ reading: frames(125, 10, true), free: frames(118, 5), 'vowel-i': frames(130, 3, true), glide });
    expect(metrics?.speechMedianHz).toBeCloseTo(125, 0);
    expect(metrics?.minHz).toBeLessThan(100);
    expect(metrics?.maxHz).toBeGreaterThan(370);
    expect(metrics?.vowelI?.f2).toBe(2300);
    expect(metrics?.speechSpacing).not.toBeNull();
  });

  it('sem voz na fala: não dá para montar o início', () => {
    expect(buildBaseline({ reading: [] })).toBeNull();
    expect(extension([])).toBeNull();
  });
});
