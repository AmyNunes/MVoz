import { EMPTY_RATING } from '@/exercises/results';

import { saveSingleExercise } from '../saveSingle';

const mockStart = jest.fn(async (_input: unknown) => 's1');
const mockInsert = jest.fn(async (_r: unknown) => 'r1');
const mockFinish = jest.fn(async (_id: string, _o: unknown) => {});

jest.mock('@/db/sessionsRepo', () => ({
  startSession: (input: unknown) => mockStart(input),
  insertExerciseResult: (r: unknown) => mockInsert(r),
  finishSession: (id: string, o: unknown) => mockFinish(id, o),
}));

describe('exercício avulso', () => {
  it('vira uma sessão "single" com um resultado; dor fica registrada', async () => {
    await saveSingleExercise(
      {
        exerciseId: 'lip-trill',
        startedAt: '2026-10-26T18:00:00.000Z',
        durationSec: 90,
        repsDone: 5,
        skipped: false,
        metrics: {},
        rating: { ...EMPTY_RATING, discomfort: 2 },
        recordingId: null,
      },
      true,
    );

    expect(mockStart).toHaveBeenCalledWith({ origin: 'single', startedAt: '2026-10-26T18:00:00.000Z' });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ sessionId: 's1', exerciseId: 'lip-trill' }));
    expect(mockFinish).toHaveBeenCalledWith('s1', { minutes: 1.5, feeling: null, discomfort: 2, stoppedForPain: true });
  });
});
