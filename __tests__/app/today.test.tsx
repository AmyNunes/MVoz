import { act, fireEvent, render, screen } from '@testing-library/react-native';

import TodayScreen from '@/../app/(tabs)/index';
import { profile } from '@/guide/__tests__/fixtures';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

const t = strings.today;
const mockPush = jest.fn();
const mockData = { plan: null as unknown, baseline: null as unknown };
let mockParams: { start?: string } = {};

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p), setParams: jest.fn() },
  useIsFocused: () => true,
  useLocalSearchParams: () => mockParams,
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/db/guideRepo', () => ({
  getActivePlan: async () => mockData.plan,
  getBaseline: async () => mockData.baseline,
  listCheckins: async () => [],
}));
jest.mock('@/db/routinesRepo', () => ({ listRoutines: async () => [] }));
jest.mock('@/db/sessionsRepo', () => ({ listSessionRecords: async () => [] }));
jest.mock('@/db/profileRepo', () => ({ saveProfile: jest.fn(async () => {}), getProfile: async () => null }));

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ training: { ...defaultSettings.training } });
  mockData.plan = null;
  mockData.baseline = null;
  mockParams = {};
});

function withPlan() {
  const { baseline } = jest.requireActual('@/guide/__tests__/fixtures');
  const { generatePlan } = jest.requireActual('@/guide/plan');
  mockData.baseline = { id: 'b', createdAt: 'x', recordingIds: [], metrics: baseline };
  mockData.plan = { ...generatePlan(profile, baseline, new Date().toISOString()).plan, id: 'p' };
  useProfile.setState({ profile });
}

describe('Hoje', () => {
  it('primeiro uso: "Responder o Guia"', async () => {
    useProfile.setState({ profile: null });
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: t.setup.guide }));
    expect(mockPush).toHaveBeenCalledWith('/guide');
  });

  it('com plano: treino em 2 blocos; "Como está sua voz hoje?" antes de começar', async () => {
    withPlan();
    await render(<TodayScreen />);

    expect(await screen.findByText(t.training.title('Fundamentos'))).toBeOnTheScreen();
    expect(screen.getByText(t.training.block(2))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t.training.startBlock(1) }));
    await fireEvent.press(screen.getByRole('radio', { name: t.voice.good }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/session', params: { block: '1', variant: 'normal', voice: 'good' } });
  });

  it('voz cansada: treino leve; rouca ou doente: sem treino, só orientações', async () => {
    withPlan();
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: t.training.minimal }));
    await fireEvent.press(screen.getByRole('radio', { name: t.voice.tired }));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/session', params: { block: '1', variant: 'light', voice: 'tired' } });

    await fireEvent.press(screen.getByRole('button', { name: t.training.startBlock(1) }));
    await act(async () => {
      await fireEvent.press(screen.getByRole('radio', { name: t.voice.hoarse }));
    });
    expect(screen.getByText(t.voice.restTitle)).toBeOnTheScreen();
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('notificação "Treinar agora": abre perguntando a voz de hoje', async () => {
    withPlan();
    mockParams = { start: 'normal' };
    await render(<TodayScreen />);
    await fireEvent.press(await screen.findByRole('radio', { name: t.voice.good }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/session', params: { block: '1', variant: 'normal', voice: 'good' } });
  });

  it('sua semana e o check-in', async () => {
    withPlan();
    await render(<TodayScreen />);
    expect(await screen.findByText(t.week.title)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(t.checkin.title('domingo')) }));
    expect(mockPush).toHaveBeenCalledWith('/checkin');
  });
});
