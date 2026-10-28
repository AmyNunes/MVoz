import { act, renderHook } from '@testing-library/react-native';

import { sine } from '@/audio/__tests__/synth';

import { useLiveVoice } from '../useLiveVoice';

const mockCaptures: { onSamples: (s: Float32Array) => void; start: jest.Mock; stop: jest.Mock }[] = [];
let mockStartFails = false;
let mockFocused = true;

jest.mock('@/audio/capture', () => ({
  createCapture: (onSamples: (s: Float32Array) => void) => {
    const capture = {
      onSamples,
      start: jest.fn(() => (mockStartFails ? Promise.reject(new Error('ocupado')) : Promise.resolve())),
      stop: jest.fn(),
    };
    mockCaptures.push(capture);
    return capture;
  },
}));

jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));

beforeEach(() => {
  mockCaptures.length = 0;
  mockStartFails = false;
  mockFocused = true;
});

async function speak(hz: number, seconds: number) {
  const signal = sine(hz, seconds);
  const capture = mockCaptures[mockCaptures.length - 1];
  await act(async () => {
    for (let i = 0; i < signal.length; i += 1600) capture.onSamples(signal.subarray(i, i + 1600));
  });
}

describe('useLiveVoice', () => {
  it('liga o microfone e mostra o tom', async () => {
    const { result } = await renderHook(() => useLiveVoice());

    expect(result.current.status).toBe('listening');
    await speak(196, 0.5);
    expect(result.current.readout).toEqual({ kind: 'voice', hz: expect.closeTo(196, 0) });
  });

  it('pausar desliga o microfone; continuar liga de novo', async () => {
    const { result } = await renderHook(() => useLiveVoice());

    await act(() => result.current.togglePause());
    expect(mockCaptures[0].stop).toHaveBeenCalled();
    expect(result.current.paused).toBe(true);

    await act(() => result.current.togglePause());
    expect(mockCaptures).toHaveLength(2);
    expect(mockCaptures[1].start).toHaveBeenCalled();
  });

  it('com o tom de referência tocando, ignora o microfone', async () => {
    const { result } = await renderHook(() => useLiveVoice({ muted: true }));

    await speak(196, 0.5);
    expect(result.current.readout).toEqual({ kind: 'silence' });
    expect(result.current.trace).toHaveLength(0);
  });

  it('sair da tela desliga o microfone', async () => {
    const { rerender } = await renderHook(() => useLiveVoice());

    mockFocused = false;
    await rerender({});
    expect(mockCaptures[0].stop).toHaveBeenCalled();
  });

  it('erro ao ligar mostra o estado de erro, e "Tentar de novo" tenta outra vez', async () => {
    mockStartFails = true;
    const { result } = await renderHook(() => useLiveVoice());
    expect(result.current.status).toBe('error');

    mockStartFails = false;
    await act(() => result.current.retry());
    expect(result.current.status).toBe('listening');
    expect(mockCaptures[0].stop).toHaveBeenCalled();
  });
});
