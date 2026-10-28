import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import PlanScreen from '@/../app/(tabs)/plan';
import PlanEditScreen from '@/../app/plan/edit';
import CheckinScreen from '@/../app/checkin';
import type { TaskResults } from '@/components/guide/RecordingTasks';
import { getExercise } from '@/exercises/catalog';
import { profile } from '@/guide/__tests__/fixtures';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { defaultSettings, useSettings } from '@/stores/settingsStore';

const p = strings.plan;
const c = strings.checkin;
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockData = { plan: null as unknown, baseline: null as unknown };
const mockRepo = {
  updatePlanStages: jest.fn(async (_id: string, _stages: unknown) => {}),
  updatePlanProgress: jest.fn(async (_id: string, _change: unknown) => {}),
  insertPlanEvent: jest.fn(async (_e: unknown) => {}),
  insertCheckin: jest.fn(async (_c: unknown) => 'c1'),
};

jest.mock('expo-router', () => ({
  router: { push: (x: unknown) => mockPush(x), replace: jest.fn(), back: () => mockBack() },
  Stack: { Screen: () => null },
  useIsFocused: () => true,
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/db/guideRepo', () => ({
  getActivePlan: async () => mockData.plan,
  getBaseline: async () => mockData.baseline,
  listCheckins: async () => [],
  lastPlanEventAt: async () => null,
  updatePlanStages: (id: string, s: unknown) => mockRepo.updatePlanStages(id, s),
  updatePlanProgress: (id: string, c: unknown) => mockRepo.updatePlanProgress(id, c),
  insertPlanEvent: (e: unknown) => mockRepo.insertPlanEvent(e),
  insertCheckin: (c: unknown) => mockRepo.insertCheckin(c),
}));
jest.mock('@/db/sessionsRepo', () => ({ listSessionRecords: async () => [] }));
jest.mock('@/db/profileRepo', () => ({ saveProfile: jest.fn(async () => {}), getProfile: async () => null }));
jest.mock('@/db/settingsRepo', () => ({ writeSetting: jest.fn(async () => {}), readAllSettings: jest.fn() }));
// As gravações guiadas são testadas no Guia; aqui elas "terminam" na hora.
jest.mock('@/components/guide/RecordingTasks', () => {
  const { Pressable, Text } = jest.requireActual('react-native');
  const frames = (hz: number) => Array.from({ length: 100 }, (_, i) => ({ t: i * 0.02, hz, clarity: 0.95, rms: 0.1, formants: null }));
  return {
    RecordingTasks: ({ onDone }: { onDone: (r: TaskResults) => void }) => (
      <Pressable accessibilityRole="button" onPress={() => onDone({ reading: { recordingId: 'r1', frames: frames(140) }, free: { recordingId: 'r2', frames: frames(135) } })}>
        <Text>gravar</Text>
      </Pressable>
    ),
  };
});

beforeEach(() => {
  jest.clearAllMocks();
  useSettings.setState({ training: { ...defaultSettings.training } });
  const { baseline } = jest.requireActual('@/guide/__tests__/fixtures');
  const { generatePlan } = jest.requireActual('@/guide/plan');
  mockData.baseline = { id: 'b', createdAt: new Date().toISOString(), recordingIds: [], metrics: baseline };
  mockData.plan = { ...generatePlan(profile, baseline, new Date().toISOString()).plan, id: 'p' };
  useProfile.setState({ profile });
});

describe('Plano', () => {
  it('sem plano: "Responder o Guia"', async () => {
    mockData.plan = null;
    await render(<PlanScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: p.answerGuide }));
    expect(mockPush).toHaveBeenCalledWith('/guide');
  });

  it('mostra a etapa com os marcos medidos, a faixa e os botões', async () => {
    await render(<PlanScreen />);
    const stages = (mockData.plan as { stages: unknown[] }).stages.length;
    expect(await screen.findByText(p.stageTitle(1, stages))).toBeOnTheScreen();
    expect(screen.getByText(strings.guide.milestones['calm-sessions'])).toBeOnTheScreen();
    expect(screen.getByText(p.progress('0', '5'))).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.edit }));
    expect(mockPush).toHaveBeenCalledWith('/plan/edit');
  });

  it('editar: tirar um exercício da etapa e salvar', async () => {
    await render(<PlanEditScreen />);
    const plan = mockData.plan as { stages: { exercises: string[]; measureExerciseId: string | null }[] };
    const removable = plan.stages[0].exercises.find((id) => id !== plan.stages[0].measureExerciseId) ?? '';
    const name = getExercise(removable)?.name ?? '';
    await fireEvent.press(await screen.findByRole('button', { name: p.editor.remove(name) }));
    await fireEvent.press(screen.getByRole('button', { name: p.editor.save }));

    const stages = mockRepo.updatePlanStages.mock.calls[0][1] as { exercises: string[] }[];
    expect(stages[0].exercises).not.toContain(removable);
    expect(mockRepo.insertPlanEvent).toHaveBeenCalledWith(expect.objectContaining({ kind: 'edit' }));
    expect(mockBack).toHaveBeenCalled();
  });

  it('voltar uma etapa pede confirmação', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => buttons?.[1]?.onPress?.());
    mockData.plan = { ...(mockData.plan as object), stageIndex: 1 };
    await render(<PlanEditScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: p.editor.back }));
    expect(alert).toHaveBeenCalled();
    expect(mockRepo.updatePlanProgress).toHaveBeenCalledWith('p', expect.objectContaining({ stageIndex: 0 }));
    alert.mockRestore();
  });
});

describe('Check-in', () => {
  it('grava, responde, vê a comparação e confirma a decisão', async () => {
    await render(<CheckinScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: c.start }));
    await fireEvent.press(screen.getByRole('button', { name: 'gravar' }));

    expect(screen.getByText(c.questionsTitle)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: c.symptoms.pain }));
    await fireEvent.press(screen.getByRole('button', { name: c.seeResult }));

    expect(screen.getByText(c.reasons.symptoms)).toBeOnTheScreen();
    expect(screen.getByText(c.healthNote)).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: c.decisions.lighter })).toBeSelected();
    await fireEvent.press(screen.getByRole('button', { name: c.confirm }));

    expect(mockRepo.insertCheckin).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'lighter', recordingIds: ['r1', 'r2'], answers: expect.objectContaining({ symptoms: ['pain'] }) }),
    );
    expect(mockRepo.updatePlanProgress).toHaveBeenCalledWith('p', expect.objectContaining({ lighterUntil: expect.any(String) }));
    expect(mockBack).toHaveBeenCalled();
  });
});
