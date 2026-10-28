import { applyStageEdits } from '../edits';
import type { PlanStage } from '../stages';

const stage = (exercises: string[], measure: string | null = null): PlanStage => ({
  id: 'resonance',
  exercises,
  measureExerciseId: measure,
  minWeeks: 2,
  typicalWeeks: [2, 4],
  milestones: [],
  pitchMoves: false,
  speech: false,
});

describe('applyStageEdits', () => {
  it('acrescenta, tira e troca na etapa certa', () => {
    const stages = [stage(['a', 'b']), stage(['c', 'd', 'e'], 'c')];
    const result = applyStageEdits(stages, [
      { action: 'add', exerciseId: 'f', stageIndex: 1 },
      { action: 'remove', exerciseId: 'd', stageIndex: 1 },
      { action: 'replace', exerciseId: 'e', replaceWithId: 'g', stageIndex: 1 },
    ]);
    expect(result[0].exercises).toEqual(['a', 'b']);
    expect(result[1].exercises).toEqual(['c', 'g', 'f']);
  });

  it('nunca tira o exercício fixo nem deixa a etapa vazia', () => {
    const result = applyStageEdits(
      [stage(['c', 'x'], 'c'), stage(['y'])],
      [
        { action: 'remove', exerciseId: 'c', stageIndex: 0 },
        { action: 'replace', exerciseId: 'c', replaceWithId: 'z', stageIndex: 0 },
        { action: 'remove', exerciseId: 'y', stageIndex: 1 },
      ],
    );
    expect(result[0].exercises).toEqual(['c', 'x']);
    expect(result[1].exercises).toEqual(['y']);
  });
});
