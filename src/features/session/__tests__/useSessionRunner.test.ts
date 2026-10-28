import { act, renderHook } from '@testing-library/react-native';

import type { PlayerResult } from '@/components/player/PlayerScaffold';
import { EMPTY_RATING } from '@/exercises/results';

import { aggregate, useSessionRunner, type SessionSpec } from '../useSessionRunner';

const mockStart = jest.fn(async (_input: unknown) => 's1');
const mockInsert = jest.fn(async (_r: unknown) => 'r1');
const mockFinish = jest.fn(async (_id: string, _o: unknown) => {});

jest.mock('@/db/sessionsRepo', () => ({
  startSession: (input: unknown) => mockStart(input),
  insertExerciseResult: (r: unknown) => mockInsert(r),
  finishSession: (id: string, o: unknown) => mockFinish(id, o),
}));
jest.mock('@/lib/haptics', () => ({ haptics: { light: jest.fn(), success: jest.fn() } }));

const routine: SessionSpec = {
  items: [{ exerciseId: 'straw-phonation' }, { exerciseId: 'pitch-glides' }, { exerciseId: 'cooldown' }],
  origin: 'routine',
  routineId: 'rt',
};

const result = (exerciseId: string, discomfort: 0 | 1 | 2 | null = 0): PlayerResult => ({
  exerciseId,
  startedAt: 'x',
  durationSec: 60,
  repsDone: 3,
  skipped: false,
  metrics: {},
  rating: { ...EMPTY_RATING, feeling: 'ok', discomfort },
  recordingId: null,
});

beforeEach(() => jest.clearAllMocks());

describe('treino da rotina', () => {
  it('terminar avança; pular fica registrado; no fim, resumo e sessão fechada', async () => {
    const { result: hook } = await renderHook(() => useSessionRunner(routine));

    await act(() => hook.current.complete(result('straw-phonation', 1)));
    expect(hook.current.index).toBe(1);
    expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ origin: 'routine', routineId: 'rt' }));

    await act(() => hook.current.next());
    expect(mockInsert).toHaveBeenLastCalledWith(expect.objectContaining({ exerciseId: 'pitch-glides', skipped: true }));
    expect(hook.current.index).toBe(2);

    await act(() => hook.current.complete(result('cooldown', 0)));
    expect(hook.current.summary).toMatchObject({ done: 2, skipped: 1 });
    expect(mockFinish).toHaveBeenCalledWith('s1', expect.objectContaining({ discomfort: 1, feeling: 'ok', stoppedForPain: false }));
  });

  it('voltar não registra nada; "Próximo" num exercício já feito só avança', async () => {
    const { result: hook } = await renderHook(() => useSessionRunner(routine));
    await act(() => hook.current.complete(result('straw-phonation')));
    await act(async () => hook.current.previous());
    expect(hook.current.index).toBe(0);

    const before = mockInsert.mock.calls.length;
    await act(() => hook.current.next());
    expect(mockInsert.mock.calls.length).toBe(before);
    expect(hook.current.index).toBe(1);
  });

  it('"Senti dor" salva o exercício e fecha o treino marcando a dor', async () => {
    const { result: hook } = await renderHook(() => useSessionRunner(routine));
    await act(() => hook.current.pain(result('straw-phonation', 2)));
    expect(mockFinish).toHaveBeenCalledWith('s1', expect.objectContaining({ discomfort: 2, stoppedForPain: true }));
  });

  it('sair sem ter feito nada não cria sessão', async () => {
    const { result: hook } = await renderHook(() => useSessionRunner(routine));
    await act(() => hook.current.exit());
    expect(mockStart).not.toHaveBeenCalled();
    expect(mockFinish).not.toHaveBeenCalled();
  });
});

describe('juntar os resultados', () => {
  it('maior desconforto e o último "Como foi?"', () => {
    const a = result('a', 0);
    const b = { ...result('b', 2), rating: { ...EMPTY_RATING, feeling: 'hard' as const, discomfort: 2 as const } };
    expect(aggregate([a, b])).toEqual({ discomfort: 2, feeling: 'hard' });
    expect(aggregate([])).toEqual({ discomfort: null, feeling: null });
  });
});

describe('aquecimento obrigatório do plano', () => {
  it('não dá para pular o aquecimento; depois de feito, segue normal', async () => {
    const plan: SessionSpec = {
      items: [{ exerciseId: 'straw-phonation', required: true }, { exerciseId: 'pitch-glides' }],
      origin: 'plan',
    };
    const { result: hook } = await renderHook(() => useSessionRunner(plan));
    await act(() => hook.current.next());
    expect(hook.current.index).toBe(0);
    expect(mockInsert).not.toHaveBeenCalled();

    await act(() => hook.current.complete(result('straw-phonation')));
    expect(hook.current.index).toBe(1);
  });
});
