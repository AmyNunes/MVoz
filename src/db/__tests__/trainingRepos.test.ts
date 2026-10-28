import { getRoutine, insertRoutine } from '../routinesRepo';
import { finishSession, insertExerciseResult, listSessionResults, startSession } from '../sessionsRepo';

const mockDb = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};
jest.mock('../client', () => ({ getDb: async () => mockDb }));
jest.mock('@/lib/ids', () => ({ newId: () => 'id-1' }));

beforeEach(() => jest.clearAllMocks());

describe('rotinas', () => {
  it('salva os itens em JSON e lê de volta validando', async () => {
    const id = await insertRoutine({ name: 'Manhã', items: [{ exerciseId: 'straw-phonation', durationSec: 120 }] });
    expect(id).toBe('id-1');
    expect(JSON.parse(mockDb.runAsync.mock.calls[0][3] as string)).toEqual([
      { exerciseId: 'straw-phonation', durationSec: 120 },
    ]);

    mockDb.getFirstAsync.mockResolvedValueOnce({
      id: 'id-1',
      name: 'Manhã',
      items: '[{"exerciseId":"lip-trill","reps":3},{"lixo":true}]',
      origin: 'user',
      useInToday: 'never',
      createdAt: 'x',
      updatedAt: 'x',
    });
    // Um item inválido invalida a lista: melhor mostrar vazio que quebrar a tela.
    expect((await getRoutine('id-1'))?.items).toEqual([]);
  });
});

describe('sessões e resultados', () => {
  it('a sessão guarda o dia de treino (vira às 04:00)', async () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 27, 2, 30));
    await startSession({ origin: 'single' });
    jest.useRealTimers();

    expect(mockDb.runAsync.mock.calls[0][2]).toBe('2026-10-26');
  });

  it('fechar a sessão grava parada por dor como 1', async () => {
    await finishSession('s1', { minutes: 4, feeling: 'ok', discomfort: 2, stoppedForPain: true });
    expect(mockDb.runAsync.mock.calls[0].slice(2)).toEqual([4, 'ok', 2, 1, 's1']);
  });

  it('resultado: JSON de métricas e avaliação vai e volta', async () => {
    await insertExerciseResult({
      sessionId: 's1',
      exerciseId: 'target-hold',
      startedAt: 'x',
      durationSec: 120,
      repsDone: 6,
      skipped: false,
      metrics: { contourErrors: [1.2] },
      rating: { feeling: 'easy', discomfort: 0, selfRating: null, mission: null },
      recordingId: null,
    });
    const row = mockDb.runAsync.mock.calls[0];
    mockDb.getAllAsync.mockResolvedValueOnce([
      {
        id: 'id-1',
        sessionId: 's1',
        exerciseId: 'target-hold',
        startedAt: 'x',
        durationSec: 120,
        repsDone: 6,
        skipped: 0,
        metrics: row[8],
        rating: row[9],
        recordingId: null,
      },
    ]);

    const [result] = await listSessionResults('s1');
    expect(result.metrics.contourErrors).toEqual([1.2]);
    expect(result.rating.feeling).toBe('easy');
    expect(result.skipped).toBe(false);
  });
});
