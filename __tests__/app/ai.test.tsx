import { fireEvent, render, screen } from '@testing-library/react-native';

import CoachScreen from '@/../app/coach';
import PlanAdjustScreen from '@/../app/plan/adjust';
import { AskAiCard } from '@/components/recordings/AskAiCard';
import type { Recording } from '@/db/recordingsRepo';
import { getExercise } from '@/exercises/catalog';
import { strings } from '@/i18n/strings';

const a = strings.ai;
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockCoachTurn = jest.fn();
const mockAdjust = jest.fn();
const mockExplain = jest.fn();
const mockUpdateStages = jest.fn(async (_id: string, _s: unknown) => {});
const mockData = { plan: null as unknown };

jest.mock('expo-router', () => ({
  router: { push: (x: unknown) => mockPush(x), back: () => mockBack(), replace: jest.fn() },
  Stack: { Screen: () => null },
  useIsFocused: () => true,
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/features/ai/userContext', () => ({ loadUserContext: async () => ({ profile: null, stage: null, band: null, start: null, lastCheckin: null, discomfort: false }) }));
jest.mock('@/ai/functions/coach', () => ({ coachTurn: (...args: unknown[]) => mockCoachTurn(...args) }));
jest.mock('@/ai/functions/recording', () => ({ explainRecording: (...args: unknown[]) => mockExplain(...args) }));
jest.mock('@/ai/functions/adjustPlan', () => ({ adjustPlan: (...args: unknown[]) => mockAdjust(...args) }));
jest.mock('@/db/coachRepo', () => ({
  getOpenConversation: async () => null,
  saveConversation: async (id: string | null) => id ?? 'conv-1',
  endConversation: async () => {},
}));
jest.mock('@/db/guideRepo', () => ({
  getActivePlan: async () => mockData.plan,
  updatePlanStages: (id: string, s: unknown) => mockUpdateStages(id, s),
  insertPlanEvent: async () => {},
}));

beforeEach(() => {
  jest.clearAllMocks();
  const { baseline, profile } = jest.requireActual('@/guide/__tests__/fixtures');
  const { generatePlan } = jest.requireActual('@/guide/plan');
  mockData.plan = { ...generatePlan(profile, baseline, new Date().toISOString()).plan, id: 'p' };
});

describe('Perguntar à IA (Coach)', () => {
  it('pergunta, recebe a resposta com exercícios tocáveis e o alerta de saúde', async () => {
    mockCoachTurn.mockResolvedValue({ replyPt: 'Pare hoje e descanse.', suggestedExerciseIds: ['lip-trill'], safetyFlag: true });
    await render(<CoachScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: a.coach.examples[0] }));

    expect(await screen.findByText('Pare hoje e descanse.')).toBeOnTheScreen();
    expect(mockCoachTurn).toHaveBeenCalledWith([{ role: 'user', content: a.coach.examples[0] }], expect.anything());
    expect(screen.getByText(a.safetyTitle)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(getExercise('lip-trill')?.name ?? '') }));
    expect(mockPush).toHaveBeenCalledWith('/exercise/lip-trill');
  });

  it('erro de conexão: mensagem amigável e "Tentar de novo"', async () => {
    const { AIError } = jest.requireActual('@/ai/errors');
    mockCoachTurn.mockRejectedValueOnce(new AIError('offline'));
    await render(<CoachScreen />);
    await fireEvent.changeText(await screen.findByLabelText(a.coach.placeholder), 'Oi');
    await fireEvent.press(screen.getByRole('button', { name: a.coach.send }));
    expect(await screen.findByText(strings.ai.errors.offline)).toBeOnTheScreen();

    mockCoachTurn.mockResolvedValueOnce({ replyPt: 'Olá!', suggestedExerciseIds: [], safetyFlag: false });
    await fireEvent.press(screen.getByRole('button', { name: strings.common.retry }));
    expect(await screen.findByText('Olá!')).toBeOnTheScreen();
  });
});

describe('Ajustar com IA', () => {
  it('mostra as mudanças sugeridas; aplico só as que deixei marcadas', async () => {
    const plan = mockData.plan as { stageIndex: number; stages: { exercises: string[] }[] };
    mockAdjust.mockResolvedValue({
      explanationPt: 'Mais fala do dia a dia.',
      changes: [
        { action: 'add', exerciseId: 'phone-messages', stageIndex: plan.stageIndex, reasonPt: 'telefone' },
        { action: 'add', exerciseId: 'cooldown', stageIndex: plan.stageIndex, reasonPt: 'descanso' },
      ],
    });
    await render(<PlanAdjustScreen />);
    await fireEvent.changeText(await screen.findByLabelText(a.adjust.label), 'quero focar no telefone');
    await fireEvent.press(screen.getByRole('button', { name: a.adjust.send }));

    expect(await screen.findByText('Mais fala do dia a dia.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: /descanso/ }));
    await fireEvent.press(screen.getByRole('button', { name: a.adjust.apply(1) }));

    const stages = mockUpdateStages.mock.calls[0][1] as { exercises: string[] }[];
    expect(stages[plan.stageIndex].exercises).toContain('phone-messages');
    expect(mockBack).toHaveBeenCalled();
  });
});

describe('Perguntar à IA sobre esta gravação', () => {
  it('manda só as métricas e mostra a explicação', async () => {
    const recording = {
      id: 'r1',
      kind: 'free',
      file: 'recordings/r1.wav',
      durationSec: 10,
      createdAt: '2026-10-27T10:00:00Z',
      metrics: { medianHz: 160 },
      pitchTrack: null,
      note: '',
      favorite: false,
      exerciseId: null,
      checkinId: null,
    } as unknown as Recording;
    mockExplain.mockResolvedValue({
      data: { summaryPt: 'Tom estável.', strengthsPt: ['Boa faixa'], focusPt: ['Ressonância'], suggestedExerciseIds: [] },
      cached: false,
    });
    await render(<AskAiCard recording={recording} />);
    await fireEvent.press(screen.getByRole('button', { name: a.recording.ask }));

    expect(await screen.findByText('Tom estável.')).toBeOnTheScreen();
    const [input] = mockExplain.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(input).sort()).toEqual(['exerciseName', 'kind', 'metrics', 'recordingId']);
  });
});
