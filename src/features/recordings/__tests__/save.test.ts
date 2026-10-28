import { saveRecording } from '../save';

const mockInsert = jest.fn(async (_r: unknown) => {});
const mockDelete = jest.fn();

jest.mock('@/db/recordingsRepo', () => ({ insertRecording: (r: unknown) => mockInsert(r) }));
jest.mock('../files', () => ({ deleteRecordingFile: (f: string) => mockDelete(f) }));

const frames = Array.from({ length: 100 }, (_, i) => ({ t: i * 0.02, hz: 180, clarity: 0.95, rms: 0.05 }));

beforeEach(() => jest.clearAllMocks());

describe('salvar gravação', () => {
  it('salva com métricas e traçado reduzido', async () => {
    const saved = await saveRecording({
      id: 'r1',
      kind: 'free',
      file: 'recordings/r1.wav',
      durationSec: 2,
      frames,
      band: { lowHz: 165, highHz: 200 },
    });

    expect(saved).toBe(true);
    const record = mockInsert.mock.calls[0][0] as {
      metrics: { medianHz: number; inTargetRatio: number };
      pitchTrack: { hz: number[] };
    };
    expect(record.metrics.medianHz).toBeCloseTo(180);
    expect(record.metrics.inTargetRatio).toBe(1);
    expect(record.pitchTrack.hz).toHaveLength(20);
  });

  it('descarta gravação curta demais e apaga o arquivo', async () => {
    const saved = await saveRecording({
      id: 'r2',
      kind: 'free',
      file: 'recordings/r2.wav',
      durationSec: 0.4,
      frames: [],
      band: null,
    });

    expect(saved).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('recordings/r2.wav');
  });
});
