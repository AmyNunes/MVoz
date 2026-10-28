import { getExercise } from '@/exercises/catalog';
import { GOALS } from '@/exercises/model';
import { semitonesBetween } from '@/lib/notes';

import { generatePlan, weekInStage } from '../plan';
import { planStageSchema, stagesFor } from '../stages';
import { atFinal, comfortCeilingHz, finalTarget, initialBand, stepTowardFinal } from '../targets';

import { baseline, profile } from './fixtures';

describe('metas e faixa', () => {
  it('meta feminina 165–200 Hz com piso de 150 Hz', () => {
    expect(finalTarget('feminize', baseline)).toEqual({ band: { lowHz: 165, highHz: 200 }, floorHz: 150 });
  });

  it('faixa inicial: começa no tom habitual, com ~3 semitons, na direção do objetivo', () => {
    const band = initialBand('feminize', baseline);
    expect(band.lowHz).toBeCloseTo(120);
    expect(semitonesBetween(band.lowHz, band.highHz)).toBeCloseTo(3);

    const down = initialBand('masculinize', { ...baseline, speechMedianHz: 170, minHz: 110 });
    expect(down.highHz).toBeCloseTo(170);
  });

  it('a faixa sobe até 2 semitons por passo e para na meta final', () => {
    const final = finalTarget('feminize', baseline).band;
    let band = initialBand('feminize', baseline);
    const first = stepTowardFinal(band, final, baseline);
    expect(semitonesBetween(band.lowHz, first.lowHz)).toBeCloseTo(2);

    for (let i = 0; i < 10; i++) band = stepTowardFinal(band, final, baseline);
    expect(band.lowHz).toBeCloseTo(165);
    expect(atFinal(band, final, baseline)).toBe(true);
  });

  it('teto de conforto: o topo fica 4 semitons abaixo do agudo confortável', () => {
    const low = { ...baseline, maxHz: 220 };
    const final = finalTarget('feminize', low).band;
    let band = initialBand('feminize', low);
    for (let i = 0; i < 10; i++) band = stepTowardFinal(band, final, low);
    expect(band.highHz).toBeLessThanOrEqual(comfortCeilingHz(low) + 0.01);
    expect(generatePlan(profile, low, 'x').notes).toContain('ceiling');
  });

  it('masculinização nunca abaixo do grave mais limpo + 2 semitons', () => {
    const target = finalTarget('masculinize', { speechMedianHz: 180, minHz: 105 });
    expect(semitonesBetween(105, target.band.lowHz)).toBeGreaterThanOrEqual(2 - 1e-9);
  });
});

describe('etapas', () => {
  it.each(GOALS)('%s: etapas válidas, com exercícios do catálogo e manutenção no fim', (goal) => {
    const stages = stagesFor(goal, { hormones: null });
    stages.forEach((s) => {
      expect(() => planStageSchema.parse(s)).not.toThrow();
      s.exercises.forEach((id) => expect({ stage: s.id, id, found: !!getExercise(id) }).toMatchObject({ found: true }));
      if (s.measureExerciseId) expect(s.exercises).toContain(s.measureExerciseId);
    });
    expect(stages[stages.length - 1].id).toBe('maintenance');
  });

  it('feminização: ressonância antes do tom; o tom é a etapa em que a faixa anda', () => {
    const ids = stagesFor('feminize', { hormones: null }).map((s) => s.id);
    expect(ids.indexOf('resonance')).toBeLessThan(ids.indexOf('pitch'));
    expect(stagesFor('feminize', { hormones: null }).find((s) => s.pitchMoves)?.id).toBe('pitch');
  });

  it('masculinização com testosterona inclui suavizar quebras', () => {
    expect(stagesFor('masculinize', { hormones: 'testosterone' })[0].exercises).toContain('smooth-breaks');
    expect(stagesFor('masculinize', { hormones: 'none' })[0].exercises).not.toContain('smooth-breaks');
  });
});

describe('plano gerado', () => {
  it('avisos que vêm das respostas', () => {
    const { plan, notes } = generatePlan(
      { ...profile, slp: 'yes', healthFlags: ['reflux'], dailyMinutes: 30, recentSurgery: true },
      baseline,
      '2026-10-27T10:00:00.000Z',
    );
    expect(notes).toEqual(expect.arrayContaining(['slp', 'surgery', 'estrogen', 'reflux', 'beginner-limit']));
    expect(plan.stageIndex).toBe(0);
    expect(plan.finalTarget).toEqual({ lowHz: 165, highHz: 200 });
  });

  it('semana na etapa', () => {
    expect(weekInStage('2026-10-01T00:00:00.000Z', new Date('2026-10-05T00:00:00.000Z'))).toBe(1);
    expect(weekInStage('2026-10-01T00:00:00.000Z', new Date('2026-10-16T00:00:00.000Z'))).toBe(3);
  });
});
