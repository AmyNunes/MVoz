import { createCapture } from '../capture';

type Buffer = { data: ArrayBuffer; sampleRate: number; channels: number; timestamp: number };

const mockStreams: MockStream[] = [];
let mockFailStart = false;

class MockStream {
  listener: ((buffer: Buffer) => void) | null = null;
  removed = false;
  start = jest.fn(async () => {
    if (mockFailStart) throw new Error('ocupado');
  });
  stop = jest.fn();
  release = jest.fn();
  startFileRecordingAsync = jest.fn(async () => ({ uri: 'file:///x.wav' }));
  stopFileRecordingAsync = jest.fn(async () => ({ duration: 12.5 }));

  constructor(public options: { sampleRate: number; channels: number; encoding: string }) {
    mockStreams.push(this);
  }

  addListener(_event: string, listener: (buffer: Buffer) => void) {
    this.listener = listener;
    return { remove: () => (this.removed = true) };
  }

  emit(samples: number[], sampleRate = 16_000) {
    this.listener?.({ data: new Int16Array(samples).buffer, sampleRate, channels: 1, timestamp: 0 });
  }
}

jest.mock('expo-audio', () => ({
  AudioModule: { AudioStream: jest.fn((options) => new MockStream(options)) },
}));

beforeEach(() => {
  mockStreams.length = 0;
  mockFailStart = false;
});

describe('captura do microfone', () => {
  it('pede PCM de 16 bits, mono, a 16 kHz', async () => {
    await createCapture(jest.fn()).start();

    expect(mockStreams[0].options).toEqual({ sampleRate: 16_000, channels: 1, encoding: 'int16' });
    expect(mockStreams[0].start).toHaveBeenCalled();
  });

  it('entrega os blocos em float', async () => {
    const onSamples = jest.fn();
    await createCapture(onSamples).start();

    mockStreams[0].emit([16384, -16384]);
    expect(Array.from(onSamples.mock.calls[0][0] as Float32Array)).toEqual([0.5, -0.5]);
  });

  it('parar desliga e libera o microfone', async () => {
    const capture = createCapture(jest.fn());
    await capture.start();
    capture.stop();

    const [stream] = mockStreams;
    expect(stream.removed).toBe(true);
    expect(stream.stop).toHaveBeenCalled();
    expect(stream.release).toHaveBeenCalled();
  });

  it('libera o microfone mesmo se o stop nativo falhar', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const capture = createCapture(jest.fn());
    await capture.start();
    mockStreams[0].stop.mockImplementation(() => {
      throw new Error('falhou');
    });

    capture.stop();
    expect(mockStreams[0].release).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('blocos que chegam depois de parar são ignorados', async () => {
    const onSamples = jest.fn();
    const capture = createCapture(onSamples);
    await capture.start();
    capture.stop();

    mockStreams[0].emit([1000]);
    expect(onSamples).not.toHaveBeenCalled();
  });

  it('começar de novo cria outro stream e libera o anterior', async () => {
    const capture = createCapture(jest.fn());
    await capture.start();
    await capture.start();

    expect(mockStreams).toHaveLength(2);
    expect(mockStreams[0].release).toHaveBeenCalled();
    expect(mockStreams[1].release).not.toHaveBeenCalled();
  });

  it('se não conseguir começar, libera o microfone e repassa o erro', async () => {
    mockFailStart = true;

    await expect(createCapture(jest.fn()).start()).rejects.toThrow('ocupado');
    expect(mockStreams[0].removed).toBe(true);
    expect(mockStreams[0].release).toHaveBeenCalled();
  });

  it('grava em WAV no arquivo pedido e devolve a duração', async () => {
    const capture = createCapture(jest.fn());
    await capture.start();

    await capture.startFile('file:///docs/recordings/a.wav');
    expect(mockStreams[0].startFileRecordingAsync).toHaveBeenCalledWith({
      uri: 'file:///docs/recordings/a.wav',
      format: 'wav',
    });
    await expect(capture.stopFile()).resolves.toBe(12.5);
  });

  it('gravar sem microfone ligado dá erro', async () => {
    await expect(createCapture(jest.fn()).startFile('file:///a.wav')).rejects.toThrow();
  });

  it('reamostra quando o aparelho entrega outra taxa', async () => {
    const onSamples = jest.fn();
    await createCapture(onSamples).start();

    mockStreams[0].emit(new Array(4800).fill(1000), 48_000);
    const out = onSamples.mock.calls[0][0] as Float32Array;
    expect(out.length).toBeGreaterThan(1400);
    expect(out.length).toBeLessThanOrEqual(1600);
  });
});
