import { fireEvent, render, screen } from '@testing-library/react-native';

import ExercisesScreen from '@/../app/(tabs)/exercises';
import ExerciseScreen from '@/../app/exercise/[id]/index';
import { strings } from '@/i18n/strings';

const mockPush = jest.fn();
let mockId = 'whisper-siren';

jest.mock('expo-router', () => ({
  router: { push: (path: string) => mockPush(path) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: mockId }),
  useIsFocused: () => true,
}));
jest.mock('@/db/routinesRepo', () => ({ listRoutines: async () => [] }));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));

beforeEach(() => mockPush.mockClear());

describe('aba Exercícios', () => {
  it('busca filtra a lista e tocar abre o detalhe', async () => {
    await render(<ExercisesScreen />);
    await fireEvent.changeText(screen.getByLabelText(strings.exercises.search), 'sorriso');

    expect(screen.getByText(strings.exercises.count(1))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Vogais com sorriso/ }));
    expect(mockPush).toHaveBeenCalledWith('/exercise/smile-vowels');
  });

  it('nada encontrado: estado vazio com "Limpar filtros"', async () => {
    await render(<ExercisesScreen />);
    await fireEvent.changeText(screen.getByLabelText(strings.exercises.search), 'xyz');

    expect(screen.getByText(strings.exercises.empty)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: strings.exercises.clearFilters }));
    expect(screen.queryByText(strings.exercises.empty)).toBeNull();
  });
});

describe('detalhe do exercício', () => {
  it('mostra passos, cuidados com limite de tempo e as variações', async () => {
    mockId = 'whisper-siren';
    await render(<ExerciseScreen />);

    expect(screen.getByText('Faça um "iii" sussurrado, suave.')).toBeOnTheScreen();
    expect(screen.getByText(strings.exercises.detail.maxSec(2))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: /Vogais com sorriso/ }));
    expect(mockPush).toHaveBeenCalledWith('/exercise/smile-vowels');
  });

  it('sinais para parar abrem as orientações de saúde', async () => {
    await render(<ExerciseScreen />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(strings.health.stopTitle) }));

    expect(screen.getByText(strings.health.disclaimer)).toBeOnTheScreen();
  });

  it('id que não existe: aviso em vez de quebrar', async () => {
    mockId = 'nao-existe';
    await render(<ExerciseScreen />);
    expect(screen.getByText(strings.exercises.detail.notFound)).toBeOnTheScreen();
  });
});
