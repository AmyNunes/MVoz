import { moveItem, routineDurationSec, routineWarnings } from '../routine';

const item = (exerciseId: string, durationSec?: number) => ({ exerciseId, ...(durationSec ? { durationSec } : {}) });

describe('rotinas: duração e avisos', () => {
  it('duração usa a escolhida ou a sugerida pelo exercício', () => {
    expect(routineDurationSec([item('straw-phonation'), item('cooldown', 60)])).toBe(150 + 60);
  });

  it('rotina bem montada: sem avisos', () => {
    expect(routineWarnings([item('straw-phonation'), item('pitch-glides'), item('cooldown')])).toEqual([]);
  });

  it('sem aquecimento no começo e sem desaquecimento no fim', () => {
    const kinds = routineWarnings([item('smile-vowels')]).map((w) => w.kind);
    expect(kinds).toEqual(['warmupFirst', 'cooldownLast']);
  });

  it('tempo total acima do recomendado para quem começa (15 min)', () => {
    const warnings = routineWarnings([item('straw-phonation', 600), item('cooldown', 600)]);
    expect(warnings).toContainEqual({ kind: 'tooLong', minutes: 20 });
  });

  it('pré-requisito que não veio antes', () => {
    const warnings = routineWarnings([item('straw-phonation'), item('target-hold'), item('cooldown')]);
    expect(warnings).toEqual([{ kind: 'prerequisite', exerciseId: 'target-hold', prerequisiteId: 'pitch-glides' }]);
  });

  it('lista vazia: nada a avisar', () => {
    expect(routineWarnings([])).toEqual([]);
  });
});

describe('mover item', () => {
  it('para cima e para baixo, sem sair da lista', () => {
    expect(moveItem(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveItem(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
  });
});
