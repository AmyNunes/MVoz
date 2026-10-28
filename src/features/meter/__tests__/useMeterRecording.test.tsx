import { act, renderHook } from '@testing-library/react-native';

import type { VoiceFrame } from '@/audio/analyzer';
import type { FramesListener } from '@/features/meter/useLiveVoice';
import { strings } from '@/i18n/strings';

import { MAX_RECORDING_SEC, useMeterRecording } from '../useMeterRecording';

const mockSave = jest.fn(async (_input: unknown) => true);
const mockSnackbar = jest.fn();

jest.mock('@/features/recordings/save', () => ({ saveRecording: (input: unknown) => mockSave(input) }));
jest.mock('@/features/recordings/files', () => ({
  newRecordingFile: (id: string) => ({ file: { uri: `file:///docs/recordings/${id}.wav` }, relative: `recordings/${id}.wav` }),
}));
jest.mock('@/lib/ids', () => ({ newId: () => 'rec-1' }));
jest.mock('@/stores/snackbarStore', () => ({ showSnackbar: (m: string) => mockSnackbar(m) }));

const r = strings.meter.record;

function fakeLive(listening = true) {
  const listeners = new Set<FramesListener>();
  return {
    listening,
    startFile: jest.fn(async () => {}),
    stopFile: jest.fn(async () => 12.3),
    onFrames: (l: FramesListener) => {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
    emit: (frames: VoiceFrame[]) => listeners.forEach((l) => l(frames)),
  };
}

const frame = (t: number): VoiceFrame => ({ t, hz: 180, clarity: 0.95, rms: 0.05, formants: null });

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});
afterEach(() => jest.useRealTimers());

describe('gravação do Medidor', () => {
  it('grava no arquivo novo e, ao parar, salva com as medidas a partir do zero', async () => {
    const live = fakeLive();
    const { result } = await renderHook(() => useMeterRecording(live, null));

    await act(() => result.current.toggle());
    expect(live.startFile).toHaveBeenCalledWith('file:///docs/recordings/rec-1.wav');
    expect(result.current.recording).toBe(true);

    live.emit([frame(5), frame(5.02)]);
    await act(() => result.current.toggle());

    expect(live.stopFile).toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rec-1', kind: 'free', file: 'recordings/rec-1.wav', durationSec: 12.3 }),
    );
    const { frames } = mockSave.mock.calls[0][0] as { frames: VoiceFrame[] };
    expect(frames.map((f) => f.t)).toEqual([0, expect.closeTo(0.02, 6)]);
    expect(mockSnackbar).toHaveBeenCalledWith(r.saved);
    expect(result.current.recording).toBe(false);
  });

  it('para sozinha no limite de 3 minutos, com aviso', async () => {
    const live = fakeLive();
    const { result } = await renderHook(() => useMeterRecording(live, null));
    await act(() => result.current.toggle());

    await act(async () => {
      jest.advanceTimersByTime(MAX_RECORDING_SEC * 1000 + 500);
    });
    expect(mockSave).toHaveBeenCalled();
    expect(mockSnackbar).toHaveBeenCalledWith(r.savedLimit);
  });

  it('se a escuta parar (segundo plano), salva sem chamar o stop do arquivo', async () => {
    let live = fakeLive(true);
    const { result, rerender } = await renderHook(() => useMeterRecording(live, null));
    await act(() => result.current.toggle());

    live = { ...live, listening: false };
    await rerender({});
    expect(live.stopFile).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });

  it('se não conseguir começar, avisa e não grava', async () => {
    const live = fakeLive();
    live.startFile.mockRejectedValueOnce(new Error('ocupado'));
    const { result } = await renderHook(() => useMeterRecording(live, null));

    await act(() => result.current.toggle());
    expect(result.current.recording).toBe(false);
    expect(mockSnackbar).toHaveBeenCalledWith(r.startError);
  });
});
