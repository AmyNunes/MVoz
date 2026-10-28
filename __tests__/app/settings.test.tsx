import { fireEvent, render, screen } from '@testing-library/react-native';

import ExerciseScreen from '@/../app/exercise/[id]/index';
import ProfileSettingsScreen from '@/../app/settings/profile';
import TrainingSettingsScreen from '@/../app/settings/training';
import { profile } from '@/guide/__tests__/fixtures';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

const s = strings.settings;
const q = strings.guide.questions;
const mockSaveProfile = jest.fn(async (_p: unknown) => {});
const mockData = { plan: null as unknown };

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn() },
  Stack: { Screen: () => null },
  useIsFocused: () => true,
  useLocalSearchParams: () => ({ id: 'lip-trill' }),
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/audio/tonePlayer', () => ({ createTonePlayer: () => ({ play: jest.fn(), stop: jest.fn() }) }));
jest.mock('@/db/guideRepo', () => ({ getActivePlan: async () => mockData.plan }));
jest.mock('@/db/profileRepo', () => ({ saveProfile: (p: unknown) => mockSaveProfile(p), getProfile: async () => null }));
jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  mockData.plan = null;
  useProfile.setState({ profile });
  useSettings.setState({ training: { ...defaultSettings.training } });
});

describe('Configurações › Sobre mim', () => {
  it('mostra as respostas e muda uma de cada vez', async () => {
    await render(<ProfileSettingsScreen />);
    expect(screen.getByText(q.goal.options.feminize)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(q.minutes.title) }));
    await fireEvent.press(screen.getByRole('radio', { name: q.minutes.value(10) }));
    await fireEvent.press(screen.getByRole('button', { name: strings.common.save }));

    expect(mockSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ dailyMinutes: 10 }));
    expect(useSettings.getState().training.dailyLimitMinutes).toBe(10);
  });

  it('"Incluir meu contexto nas perguntas à IA"', async () => {
    await render(<ProfileSettingsScreen />);
    await fireEvent(screen.getByLabelText(s.profile.aiContext), 'valueChange', true);
    expect(mockSaveProfile).toHaveBeenCalledWith(expect.objectContaining({ aiIncludeContext: true }));
  });

  it('objetivo diferente do plano: sugere refazer o Guia', async () => {
    mockData.plan = { goal: 'masculinize' };
    await render(<ProfileSettingsScreen />);
    expect(await screen.findByText(s.profile.goalChanged)).toBeOnTheScreen();
  });
});

describe('Configurações › Treino', () => {
  it('faixa fora das regras do plano: aviso e "Usar a faixa do plano"', async () => {
    mockData.plan = { stageTarget: { lowHz: 130, highHz: 150 } };
    useSettings.setState({ training: { ...defaultSettings.training, targetEnabled: true, targetLowHz: 170, targetHighHz: 200 } });
    await render(<TrainingSettingsScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: s.training.usePlanBand }));
    expect(useSettings.getState().training).toMatchObject({ targetLowHz: 130, targetHighHz: 150 });
  });

  it('desligar o aquecimento obrigatório mostra o cuidado', async () => {
    await render(<TrainingSettingsScreen />);
    await fireEvent(screen.getByLabelText(s.training.warmup), 'valueChange', false);
    expect(useSettings.getState().training.mandatoryWarmup).toBe(false);
    expect(screen.getByText(s.training.warmupOff)).toBeOnTheScreen();
  });

  it('dia do check-in e notação', async () => {
    await render(<TrainingSettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: strings.today.weekdays[3] }));
    await fireEvent.press(screen.getByRole('radio', { name: s.training.notationOptions.letter }));
    expect(useSettings.getState().training).toMatchObject({ checkinWeekday: 3, notation: 'letter' });
  });
});

describe('Cirurgia recente sem liberação', () => {
  it('o exercício fica só para leitura', async () => {
    useProfile.setState({ profile: { ...profile, recentSurgery: true, surgeryCleared: false } });
    await render(<ExerciseScreen />);
    expect(screen.getByText(strings.today.blocked.body)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: strings.player.start })).toBeNull();
  });
});
