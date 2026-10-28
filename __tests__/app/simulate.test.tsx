import { act, fireEvent, render, screen } from '@testing-library/react-native';

import SimulateScreen from '@/../app/exercise/[id]/simulate';
import { AIError } from '@/ai/errors';
import { strings } from '@/i18n/strings';
import { useSimulationStore } from '@/stores/simulationStore';

const s = strings.simulate;
const mockPush = jest.fn();
const mockSimulate = jest.fn();

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: 'question-statement' }),
}));
jest.mock('@/ai/functions/simulate', () => ({ simulateExercise: (input: unknown) => mockSimulate(input) }));
jest.mock('@/audio/tonePlayer', () => ({ createTonePlayer: () => ({ play: jest.fn(), stop: jest.fn() }) }));
jest.mock('@/features/ai/userContext', () => ({ loadUserContext: async () => null }));

const simulation = {
  overviewPt: 'A mesma frase, como afirmação e como pergunta.',
  steps: [
    {
      titlePt: 'Afirmação',
      instructionPt: 'Diga a frase descendo no fim.',
      durationSec: 20,
      feelPt: 'Garganta solta.',
      soundPt: 'Final caindo.',
      checkPt: 'A curva desce.',
    },
  ],
  analogyPt: 'Como uma escada no fim da frase.',
  mistakes: [{ mistakePt: 'Subir a frase toda.', fixPt: 'Suba só no fim.' }],
  successSignsPt: ['O final da pergunta sobe.'],
  contour: { points: [{ t: 0, hz: 180 }, { t: 1, hz: 200 }] },
  safetyPt: 'Pare se doer.',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockSimulate.mockResolvedValue({ data: simulation, cached: false });
});

describe('Explicar com IA', () => {
  it('mostra passos com o que sentir, como soar e como checar, a curva e os cuidados', async () => {
    await render(<SimulateScreen />);

    expect(await screen.findByText('1. Afirmação')).toBeOnTheScreen();
    expect(screen.getByText(new RegExp(`${s.feel}: Garganta solta\\.`))).toBeOnTheScreen();
    expect(screen.getByText(s.fix('Suba só no fim.'))).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: s.listenCurve })).toBeOnTheScreen();
    expect(screen.getByText('Pare se doer.')).toBeOnTheScreen();
    expect(screen.getByText(s.privacy)).toBeOnTheScreen();
  });

  it('"Ainda não entendi…" pergunta de novo com a dúvida', async () => {
    await render(<SimulateScreen />);
    await screen.findByText('1. Afirmação');

    await fireEvent.changeText(screen.getByLabelText(s.doubtLabel), 'não ouço a diferença');
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: s.ask }));
    });
    expect(mockSimulate).toHaveBeenLastCalledWith(expect.objectContaining({ doubt: 'não ouço a diferença' }));
  });

  it('"Fazer agora" leva a curva para o player', async () => {
    await render(<SimulateScreen />);
    await screen.findByText('1. Afirmação');
    await fireEvent.press(screen.getByRole('button', { name: s.doNow }));

    expect(useSimulationStore.getState().contours['question-statement']).toEqual(simulation.contour.points);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/exercise/[id]/play', params: { id: 'question-statement', curve: '1' } });
  });

  it('IA não configurada: leva às configurações', async () => {
    mockSimulate.mockRejectedValue(new AIError('notConfigured'));
    await render(<SimulateScreen />);

    await fireEvent.press(await screen.findByRole('button', { name: strings.ai.configure }));
    expect(mockPush).toHaveBeenCalledWith('/settings/ai');
  });

  it('sem conexão: mensagem amigável e "Tentar de novo"', async () => {
    mockSimulate.mockRejectedValueOnce(new AIError('offline'));
    await render(<SimulateScreen />);

    expect(await screen.findByText(strings.ai.errors.offline)).toBeOnTheScreen();
    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: strings.common.retry }));
    });
    expect(await screen.findByText('1. Afirmação')).toBeOnTheScreen();
  });
});
