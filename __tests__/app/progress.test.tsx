import { fireEvent, render, screen } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import ProgressScreen from '@/../app/(tabs)/progress';
import RecordingsScreen from '@/../app/recordings/index';
import DataSettingsScreen from '@/../app/settings/data';
import { strings } from '@/i18n/strings';

const p = strings.progress;
const r = strings.recordings;
const d = strings.settings.data;
const mockPush = jest.fn();
const mockWipe = jest.fn(async () => {});
const mockFavorite = jest.fn(async (_id: string, _f: boolean) => {});

const recording = (id: string, kind: string, createdAt: string, favorite = false) => ({
  id,
  kind,
  file: `recordings/${id}.wav`,
  durationSec: 30,
  createdAt,
  metrics: null,
  pitchTrack: null,
  note: '',
  favorite,
  exerciseId: null,
  checkinId: null,
});
const mockRecordings = [
  recording('r3', 'checkin', '2026-10-25T10:00:00Z', true),
  recording('r2', 'free', '2026-10-20T10:00:00Z'),
  recording('r1', 'baseline', '2026-10-01T10:00:00Z'),
];

jest.mock('expo-router', () => ({
  router: { push: (x: unknown) => mockPush(x), dismissTo: jest.fn() },
  Stack: { Screen: () => null },
  useIsFocused: () => true,
}));
jest.mock('@/components/ui/Sheet', () => ({
  Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => (visible ? children : null),
}));
jest.mock('@/db/recordingsRepo', () => ({
  listRecordings: async () => mockRecordings,
  countRecordings: async () => mockRecordings.length,
  setRecordingFavorite: (id: string, f: boolean) => mockFavorite(id, f),
  deleteRecording: async () => {},
  restoreRecording: async () => {},
}));
jest.mock('@/db/aiUsageRepo', () => ({ usageTotalsSince: async () => ({ calls: 2, inputTokens: 10, outputTokens: 10, cost: 0.0123 }) }));
jest.mock('@/db/sessionsRepo', () => ({ listSessionRecords: async () => [] }));
jest.mock('@/db/guideRepo', () => ({
  getActivePlan: async () => ({ stageTarget: { lowHz: 140, highHz: 160 } }),
  getBaseline: async () => ({ id: 'b', createdAt: '2026-10-01T10:00:00Z', recordingIds: [], metrics: jest.requireActual('@/guide/__tests__/fixtures').baseline }),
  listCheckins: async () => [
    {
      id: 'c1',
      weekStart: '2026-10-19',
      createdAt: '2026-10-25T10:00:00Z',
      answers: { effort: 3, fit: 6, comfort: 7, symptoms: [] },
      metrics: { reading: { medianHz: 150, inTargetRatio: 0.6 }, free: null, vowelI: null, extension: null },
      decision: 'stay',
      summaryPt: '',
      recordingIds: [],
    },
  ],
}));
jest.mock('@/features/data/backupService', () => ({
  exportBackup: jest.fn(),
  pickBackup: jest.fn(),
  restoreBackup: jest.fn(),
  wipeEverything: () => mockWipe(),
  lastBackupAt: async () => null,
}));
jest.mock('@/features/recordings/files', () => ({ deleteRecordingFile: jest.fn(), recordingFile: () => ({ exists: false, uri: '' }) }));

beforeEach(() => jest.clearAllMocks());

const wrap = (node: React.ReactNode) => <GestureHandlerRootView>{node}</GestureHandlerRootView>;

describe('Progresso', () => {
  it('números, gráfico do tom com tabela e gasto de IA', async () => {
    await render(<ProgressScreen />);
    expect(await screen.findByText(p.stats.minutesWeek)).toBeOnTheScreen();
    expect(screen.getByText('150 Hz')).toBeOnTheScreen();
    expect(screen.getByText('60%')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: p.showTable }));
    expect(screen.getAllByText(p.start).length).toBeGreaterThan(0);
    expect(screen.getByText('US$ 0,01')).toBeOnTheScreen();
    expect(screen.getByText(p.aiSpentHint)).toBeOnTheScreen();
  });
});

describe('Gravações', () => {
  it('filtra por tipo e favoritas', async () => {
    await render(wrap(<RecordingsScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: r.filters.favorite }));
    expect(screen.getAllByText(r.kinds.checkin)).toHaveLength(1);
    expect(screen.queryByText(r.kinds.free)).toBeNull();
  });

  it('escolher 2 e comparar: a mais antiga é o "antes"', async () => {
    await render(wrap(<RecordingsScreen />));
    await fireEvent.press(await screen.findByRole('button', { name: r.select }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${r.kinds.checkin}(?!s)`) }));
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(`^${r.kinds.baseline}`) }));
    await fireEvent.press(screen.getByRole('button', { name: r.compare }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/recordings/compare', params: { a: 'r1', b: 'r3' } });
  });

  it('menu ⋮: favoritar', async () => {
    await render(wrap(<RecordingsScreen />));
    await fireEvent.press((await screen.findAllByRole('button', { name: r.menu(r.kinds.free) }))[0]);
    await fireEvent.press(screen.getByRole('button', { name: r.favorite }));
    expect(mockFavorite).toHaveBeenCalledWith('r2', true);
  });
});

describe('Dados', () => {
  it('apagar tudo só depois de digitar APAGAR', async () => {
    const { Alert } = jest.requireActual('react-native');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation((_t, _m, buttons) => (buttons as { onPress?: () => void }[])?.[1]?.onPress?.());
    await render(<DataSettingsScreen />);
    await fireEvent.press(screen.getByRole('button', { name: new RegExp(d.wipe) }));
    const confirm = screen.getByRole('button', { name: d.wipeConfirm });
    expect(confirm).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText(d.wipeField), 'APAGAR');
    await fireEvent.press(screen.getByRole('button', { name: d.wipeConfirm }));
    expect(mockWipe).toHaveBeenCalled();
    alert.mockRestore();
  });
});
