import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import RoutineEditorScreen from '@/../app/routines/[id]';
import RoutinesScreen from '@/../app/routines/index';
import { strings } from '@/i18n/strings';

const r = strings.routines;
const mockPush = jest.fn();
const mockBack = jest.fn();
let mockParams: Record<string, string> = { id: 'new' };

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p), back: () => mockBack() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams,
  usePreventRemove: () => {},
  useIsFocused: () => true,
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));

const mockRoutine = {
  id: 'r1',
  name: 'Manhã',
  items: [{ exerciseId: 'straw-phonation' }, { exerciseId: 'cooldown' }],
  origin: 'user',
  useInToday: 'never',
  createdAt: 'x',
  updatedAt: 'x',
};
const mockDb = {
  list: jest.fn(async () => [mockRoutine]),
  insert: jest.fn(async (_input: unknown) => 'r2'),
  remove: jest.fn(async (_id: string) => {}),
};
jest.mock('@/db/routinesRepo', () => ({
  listRoutines: () => mockDb.list(),
  getRoutine: async () => mockRoutine,
  insertRoutine: (input: unknown) => mockDb.insert(input),
  updateRoutine: jest.fn(async () => {}),
  deleteRoutine: (id: string) => mockDb.remove(id),
  restoreRoutine: jest.fn(async () => {}),
}));

beforeEach(() => jest.clearAllMocks());

const wrap = (node: React.ReactNode) => <GestureHandlerRootView>{node}</GestureHandlerRootView>;

describe('Minhas rotinas', () => {
  it('lista com resumo; o menu ⋯ duplica e exclui', async () => {
    await render(wrap(<RoutinesScreen />));
    expect(await screen.findByText('Manhã')).toBeOnTheScreen();
    expect(screen.getByText(r.summary(2, '~4 min'))).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: r.menu('Manhã') }));
    await fireEvent.press(screen.getByRole('button', { name: r.duplicate }));
    expect(mockDb.insert).toHaveBeenCalledWith({ name: r.copyName('Manhã'), items: mockRoutine.items });

    await fireEvent.press(screen.getByRole('button', { name: r.menu('Manhã') }));
    await fireEvent.press(screen.getByRole('button', { name: r.delete }));
    expect(mockDb.remove).toHaveBeenCalledWith('r1');
  });

  it('sem rotinas: estado vazio', async () => {
    mockDb.list.mockResolvedValueOnce([]);
    await render(wrap(<RoutinesScreen />));
    expect(await screen.findByText(r.empty)).toBeOnTheScreen();
  });
});

describe('montar rotina', () => {
  it('adiciona exercícios, mostra os avisos e salva', async () => {
    mockParams = { id: 'new' };
    await render(wrap(<RoutineEditorScreen />));

    await fireEvent.press(screen.getByRole('button', { name: r.add }));
    await fireEvent.press(screen.getByRole('button', { name: /Vogais com sorriso/ }));
    expect(screen.getByText(r.warnings.warmupFirst)).toBeOnTheScreen();

    await fireEvent.changeText(screen.getByLabelText(r.name), 'Ressonância');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: r.save }));
    });
    expect(mockDb.insert).toHaveBeenCalledWith({ name: 'Ressonância', items: [{ exerciseId: 'smile-vowels' }] });
    expect(mockBack).toHaveBeenCalled();
  });

  it('"Nova rotina com este exercício" já começa com ele', async () => {
    mockParams = { id: 'new', add: 'lip-trill' };
    await render(wrap(<RoutineEditorScreen />));
    expect(screen.getByText('Vibração de lábios ou língua')).toBeOnTheScreen();
  });

  it('menu do item: mover para baixo e remover (alternativas ao arraste)', async () => {
    mockParams = { id: 'r1' };
    await render(wrap(<RoutineEditorScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: r.menu('Canudo (e canudo na água)') }));
    await fireEvent.press(screen.getByRole('button', { name: r.moveDown }));
    await fireEvent.press(screen.getByRole('button', { name: r.remove }));

    expect(screen.queryByText('Canudo (e canudo na água)')).toBeNull();
    expect(screen.getByText('Desaquecimento')).toBeOnTheScreen();
  });
});
