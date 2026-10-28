import { migrations } from '../migrations';
import { getRecording, insertRecording, listRecordings } from '../recordingsRepo';

const mockDb = {
  runAsync: jest.fn(),
  getAllAsync: jest.fn(),
  getFirstAsync: jest.fn(),
};
jest.mock('../client', () => ({ getDb: async () => mockDb }));

const metrics = {
  durationSec: 30,
  voicedSec: 20,
  voicedRatio: 0.66,
  medianHz: 180,
  p10Hz: 150,
  p90Hz: 210,
  rangeSt: 5.8,
  variabilitySt: 2,
  stabilityCents: 150,
  inTargetRatio: 0.6,
  belowFloorRatio: null,
  endings: { rising: 2, falling: 1, flat: 3 },
  longestSoundSec: 4,
  resonance: null,
};

const row = {
  id: 'r1',
  kind: 'free',
  file: 'recordings/r1.wav',
  durationSec: 30,
  createdAt: '2026-10-26T18:00:00.000Z',
  metrics: JSON.stringify(metrics),
  pitchTrack: JSON.stringify({ v: 1, rate: 10, hz: [180, 0] }),
  note: '',
  favorite: 0,
  exerciseId: null,
  checkinId: null,
};

beforeEach(() => jest.clearAllMocks());

describe('migrations', () => {
  it('versões em ordem, de 1 em 1', () => {
    expect(migrations.map((m) => m.version)).toEqual(migrations.map((_, i) => i + 1));
  });
});

describe('recordingsRepo', () => {
  it('salva métricas e traçado em JSON', async () => {
    await insertRecording({
      id: 'r1',
      kind: 'free',
      file: 'recordings/r1.wav',
      durationSec: 30,
      createdAt: row.createdAt,
      metrics,
      pitchTrack: { v: 1, rate: 10, hz: [180, 0] },
    });

    const args = mockDb.runAsync.mock.calls[0];
    expect(args[0]).toContain('INSERT INTO recordings');
    expect(JSON.parse(args[6] as string).medianHz).toBe(180);
  });

  it('lê e valida o JSON; favorito vira booleano', async () => {
    mockDb.getAllAsync.mockResolvedValueOnce([row]);
    const [recording] = await listRecordings();

    expect(recording.metrics?.medianHz).toBe(180);
    expect(recording.pitchTrack?.hz).toEqual([180, 0]);
    expect(recording.favorite).toBe(false);
  });

  it('JSON estragado vira null em vez de quebrar a tela', async () => {
    mockDb.getFirstAsync.mockResolvedValueOnce({ ...row, metrics: '{quebrado', pitchTrack: '{"v":2}' });
    const recording = await getRecording('r1');

    expect(recording?.metrics).toBeNull();
    expect(recording?.pitchTrack).toBeNull();
  });
});
