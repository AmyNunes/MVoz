import { baseline } from '@/guide/__tests__/fixtures';
import type { CheckinRecord } from '@/guide/checkin';
import type { SessionRecord } from '@/guide/records';

import { chartGeometry, nearestIndex } from '../chart';
import { buildProgress } from '../progress';

const NOW = new Date('2026-10-27T12:00:00Z');

const session = (startedAt: string, minutes: number): SessionRecord => ({
  id: startedAt,
  date: startedAt.slice(0, 10),
  startedAt,
  origin: 'plan',
  block: 1,
  minutes,
  discomfort: 0,
  stoppedForPain: false,
  results: [],
});

const checkin = (createdAt: string, medianHz: number, spacing: number | null, inTargetRatio = 0.5): CheckinRecord => ({
  id: createdAt,
  weekStart: createdAt.slice(0, 10),
  createdAt,
  answers: { effort: 3, fit: 6, comfort: 7, symptoms: [] },
  metrics: {
    reading: {
      durationSec: 60,
      voicedSec: 40,
      voicedRatio: 0.66,
      medianHz,
      p10Hz: medianHz - 20,
      p90Hz: medianHz + 20,
      rangeSt: 4,
      variabilitySt: 2,
      stabilityCents: null,
      inTargetRatio,
      belowFloorRatio: null,
      endings: { rising: 0, falling: 0, flat: 0 },
      longestSoundSec: 3,
      resonance: null,
    },
    free: null,
    vowelI: spacing ? { f1: 300, f2: 2300, spacing } : null,
    extension: null,
  },
  decision: 'stay',
  summaryPt: '',
  recordingIds: [],
});

describe('buildProgress', () => {
  it('números da semana e do mês; séries do mais antigo ao mais novo, começando no início', () => {
    const view = buildProgress(
      {
        sessions: [session('2026-10-26T10:00:00Z', 10), session('2026-10-25T10:00:00Z', 5), session('2026-10-02T10:00:00Z', 8), session('2026-09-30T10:00:00Z', 8)],
        checkins: [checkin('2026-10-25T10:00:00Z', 150, 1375, 0.6), checkin('2026-10-18T10:00:00Z', 140, 1312.5)],
        baseline: { createdAt: '2026-10-01T10:00:00Z', metrics: baseline },
        plan: { stageTarget: { lowHz: 140, highHz: 160 } },
      },
      NOW,
    );
    expect(view.minutesWeek).toBe(15);
    expect(view.activeDaysMonth).toBe(3);
    expect(view.medianHz).toBe(150);
    expect(view.inTargetPct).toBe(60);
    expect(view.pitch.map((p) => p.value)).toEqual([122, 140, 150]);
    expect(view.pitch[0].start).toBe(true);
    expect(view.resonance.map((p) => Math.round(p.value))).toEqual([0, 5, 10]);
    expect(view.band).toEqual({ lowHz: 140, highHz: 160 });
  });

  it('sem Guia: tudo vazio, sem quebrar', () => {
    const view = buildProgress({ sessions: [], checkins: [], baseline: null, plan: null }, NOW);
    expect(view.pitch).toEqual([]);
    expect(view.resonance).toEqual([]);
    expect(view.medianHz).toBeNull();
  });
});

describe('chartGeometry', () => {
  const box = { width: 220, height: 120, padX: 10, padY: 10 };

  it('pontos espaçados igualmente e a escala inclui a faixa', () => {
    const geo = chartGeometry([150, 160, 170], box, [140, 200]);
    expect(geo.xy.map((p) => p.x)).toEqual([10, 110, 210]);
    expect(geo.min).toBeLessThan(140);
    expect(geo.max).toBeGreaterThan(200);
    expect(geo.y(200)).toBeLessThan(geo.y(140));
    expect(geo.path.startsWith('M10.0,')).toBe(true);
  });

  it('um ponto só fica no meio; toque escolhe o mais perto', () => {
    expect(chartGeometry([150], box).xy[0].x).toBe(110);
    expect(nearestIndex([{ x: 10 }, { x: 110 }, { x: 210 }], 140)).toBe(1);
  });
});
