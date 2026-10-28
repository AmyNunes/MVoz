import { CATALOG, getExercise } from '../catalog';
import { CONTOURS } from '../contours';
import { exerciseSchema } from '../model';
import { TEXTS } from '../texts';

describe('catálogo de exercícios', () => {
  it('tem os 45 exercícios da spec', () => {
    expect(CATALOG).toHaveLength(45);
  });

  it.each(CATALOG.map((e) => [e.code, e]))('%s segue o schema', (_, exercise) => {
    expect(() => exerciseSchema.parse(exercise)).not.toThrow();
  });

  it('ids e códigos únicos', () => {
    expect(new Set(CATALOG.map((e) => e.id)).size).toBe(CATALOG.length);
    expect(new Set(CATALOG.map((e) => e.code)).size).toBe(CATALOG.length);
  });

  it('variações e pré-requisitos existem e não apontam para o próprio exercício', () => {
    for (const e of CATALOG) {
      for (const ref of [e.easier, e.harder, ...e.prerequisites].filter(Boolean) as string[]) {
        expect({ exercise: e.id, ref, found: !!getExercise(ref) }).toEqual({ exercise: e.id, ref, found: true });
        expect(ref).not.toBe(e.id);
      }
    }
  });

  it('textos de leitura citados existem', () => {
    for (const e of CATALOG) {
      for (const id of e.readingTexts ?? []) expect({ exercise: e.id, id, found: id in TEXTS }).toMatchObject({ found: true });
    }
  });

  it('cada medição tem o critério de acerto que precisa', () => {
    for (const e of CATALOG) {
      const s = e.success;
      if (e.measure === 'sustain' || e.measure === 'resonance') expect([e.id, s.holdSec]).toEqual([e.id, expect.any(Number)]);
      if (e.measure === 'match') expect([e.id, s.centsTolerance, s.holdSec]).toEqual([e.id, expect.any(Number), expect.any(Number)]);
      if (e.measure === 'glide') expect([e.id, s.minRangeSt]).toEqual([e.id, expect.any(Number)]);
      if (e.measure === 'contour') expect([e.id, s.maxMeanErrorSt]).toEqual([e.id, expect.any(Number)]);
      if (e.measure === 'speech' && e.target === 'band') expect([e.id, s.inTargetRatio]).toEqual([e.id, expect.any(Number)]);
    }
  });

  it('ressonância sempre diz para onde levar; nota-alvo só em sustentar/imitar', () => {
    for (const e of CATALOG) {
      if (e.measure === 'resonance') expect([e.id, e.direction]).toEqual([e.id, expect.any(String)]);
      if (e.target === 'note') expect(['sustain', 'match']).toContain(e.measure);
    }
  });

  it('exercícios de curva têm curvas, com tempos crescentes', () => {
    for (const e of CATALOG.filter((x) => x.measure === 'contour')) {
      const items = CONTOURS[e.id];
      expect({ id: e.id, count: items?.length ?? 0 }).toMatchObject({ count: expect.any(Number) });
      expect(items.length).toBeGreaterThan(0);
      for (const item of items) {
        item.points.slice(1).forEach((p, i) => expect(p.t).toBeGreaterThan(item.points[i].t));
      }
    }
  });

  it('contagem por passo: passo existe, sem repetir, com o que cada contagem precisa', () => {
    const MIC = ['main', 'sound', 'glide', 'voice'];
    for (const e of CATALOG.filter((x) => x.stepTargets)) {
      const targets = e.stepTargets ?? [];
      expect(new Set(targets.map((t) => t.step)).size).toBe(targets.length);
      for (const t of targets) {
        expect(t.step).toBeLessThan(e.steps.length);
        if (t.count === 'sound' || t.count === 'voice') expect(t.seconds).toBeDefined();
        if (t.count === 'glide') expect(t.minRangeSt).toBeDefined();
        // Exercício sem microfone só conta pelo "Fiz".
        if (e.measure === 'none' || e.measure === 'mission') expect(MIC).not.toContain(t.count);
      }
    }
    const straw = CATALOG.find((x) => x.id === 'straw-phonation');
    expect(straw?.stepTargets?.map((t) => [t.step, t.count, t.reps])).toEqual([
      [1, 'sound', 3],
      [2, 'glide', 5],
      [3, 'voice', 1],
      [4, 'voice', 1],
      [5, 'voice', 1],
    ]);
  });

  it('sussurro tem limite de 2 minutos (seção 14.1)', () => {
    expect(getExercise('whisper-siren')?.maxSec).toBe(120);
  });
});
