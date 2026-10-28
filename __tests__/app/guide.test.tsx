import { act, fireEvent, render, screen } from '@testing-library/react-native';

import GuideScreen from '@/../app/guide/index';
import GuideResultScreen from '@/../app/guide/result';
import { profile } from '@/guide/__tests__/fixtures';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

const t = strings.guide;
const q = t.questions;
const mockPush = jest.fn();
const mockDismissTo = jest.fn();
const mockInsertPlan = jest.fn(async (_p: unknown) => 'plan-1');
const mockSaveProfile = jest.fn(async (_p: unknown) => {});

jest.mock('expo-router', () => ({
  router: { push: (p: unknown) => mockPush(p), replace: jest.fn(), dismissTo: (p: unknown) => mockDismissTo(p) },
  Stack: { Screen: () => null },
  useIsFocused: () => true,
}));
jest.mock('@/db/profileRepo', () => ({ saveProfile: (p: unknown) => mockSaveProfile(p), getProfile: async () => null }));
jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));
jest.mock('@/db/guideRepo', () => ({
  getBaseline: async () => ({
    id: 'b1',
    createdAt: '2026-10-27T10:00:00.000Z',
    recordingIds: [],
    metrics: jest.requireActual('@/guide/__tests__/fixtures').baseline,
  }),
  insertPlan: (p: unknown) => mockInsertPlan(p),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useProfile.setState({ profile: null });
  useSettings.setState({ training: { ...defaultSettings.training } });
});

const choose = (label: string) => fireEvent.press(screen.getByRole('radio', { name: label }));
const next = () => fireEvent.press(screen.getByRole('button', { name: t.next }));

describe('Guia', () => {
  it('uma pergunta por tela, "Pular" nas opcionais e, no fim, a gravação inicial', async () => {
    await render(<GuideScreen />);
    expect(screen.getByText(strings.health.disclaimer)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: t.start }));

    await choose(q.goal.options.feminize);
    await next();
    await choose(q.grammaticalGender.options.n);
    await next();
    await fireEvent.press(screen.getByRole('button', { name: t.skip }));
    await fireEvent.press(screen.getByRole('button', { name: t.skip }));
    await choose(q.surgery.options.no);
    await next();
    await choose(q.experience.options.new);
    await next();
    await choose(q.slp.options.no);
    await next();
    await choose(q.minutes.value(20));
    await next();
    await fireEvent.press(screen.getByRole('checkbox', { name: q.health.none }));
    await act(async () => {
      await next();
    });

    expect(mockSaveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ goal: 'feminize', grammaticalGender: 'n', identity: null, dailyMinutes: 15, healthFlags: [] }),
    );
    expect(mockPush).toHaveBeenCalledWith('/guide/baseline');
  });

  it('"Continuar" só depois de responder', async () => {
    await render(<GuideScreen />);
    await fireEvent.press(screen.getByRole('button', { name: t.start }));
    expect(screen.getByRole('button', { name: t.next })).toBeDisabled();
  });
});

describe('plano proposto', () => {
  it('mostra o início, a faixa, as etapas e o prazo; "Começar" salva e liga a faixa', async () => {
    useProfile.setState({ profile });
    await render(<GuideResultScreen />);

    expect(await screen.findByText(t.result.habitual(120, 'Si 2'))).toBeOnTheScreen();
    expect(screen.getByText(t.result.finalBand(165, 200))).toBeOnTheScreen();
    expect(screen.getByText(/1\. Fundamentos/)).toBeOnTheScreen();
    expect(screen.getByText(t.deadline.feminize)).toBeOnTheScreen();

    await act(async () => {
      await fireEvent.press(screen.getByRole('button', { name: t.result.start }));
    });
    expect(mockInsertPlan).toHaveBeenCalledWith(expect.objectContaining({ goal: 'feminize', stageIndex: 0 }));
    expect(useSettings.getState().training).toMatchObject({ targetEnabled: true, dailyLimitMinutes: 15 });
    expect(mockDismissTo).toHaveBeenCalledWith('/');
  });
});
