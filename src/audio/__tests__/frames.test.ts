import { FRAME_SIZE, FrameBuffer, HOP_SIZE, pcm16ToFloat32, Resampler } from '../frames';
import { PitchTracker, rms } from '../pitch';
import { SAMPLE_RATE, sine } from './synth';

describe('PCM de 16 bits → float', () => {
  it('converte para −1 a 1', () => {
    const pcm = new Int16Array([0, 16384, -32768, 32767]);
    const out = pcm16ToFloat32(pcm.buffer);
    expect(Array.from(out)).toEqual([0, 0.5, -1, 32767 / 32768]);
  });

  it('mistura estéreo em mono', () => {
    const pcm = new Int16Array([16384, 0, -16384, -16384]);
    expect(Array.from(pcm16ToFloat32(pcm.buffer, 2))).toEqual([0.25, -0.5]);
  });
});

describe('quadros', () => {
  const ramp = new Float32Array(SAMPLE_RATE).map((_, i) => i);

  function collect(blockSize: number): { first: number; t: number }[] {
    const buffer = new FrameBuffer();
    const out: { first: number; t: number }[] = [];
    for (let i = 0; i < ramp.length; i += blockSize) {
      buffer.push(ramp.subarray(i, i + blockSize), (frame, t) => out.push({ first: frame[0], t }));
    }
    return out;
  }

  it('50 quadros por segundo, sobrepostos', () => {
    const frames = collect(1600);
    expect(frames).toHaveLength(Math.floor((SAMPLE_RATE - FRAME_SIZE) / HOP_SIZE) + 1);
    expect(frames[1].first - frames[0].first).toBe(HOP_SIZE);
    expect(frames[1].t - frames[0].t).toBeCloseTo(0.02, 6);
    expect(frames[0].t).toBeCloseTo(FRAME_SIZE / 2 / SAMPLE_RATE, 6);
  });

  it('o tamanho dos blocos não muda os quadros', () => {
    expect(collect(1600)).toEqual(collect(333));
  });
});

describe('reamostragem para 16 kHz', () => {
  it.each([48_000, 44_100])('de %i Hz mantém o tom', (rate) => {
    const out = new Resampler(rate, SAMPLE_RATE).process(sine(200, 1, rate));
    expect(out.length).toBeGreaterThan(SAMPLE_RATE * 0.95);
    expect(out.length).toBeLessThanOrEqual(SAMPLE_RATE);

    const frame = out.subarray(4000, 4000 + FRAME_SIZE);
    const hz = new PitchTracker(FRAME_SIZE).analyze(frame, SAMPLE_RATE, 0).hz;
    expect(hz).toBeCloseTo(200, 0);
    expect(rms(frame)).toBeCloseTo(0.5 / Math.SQRT2, 2);
  });

  it('em blocos dá o mesmo resultado que de uma vez', () => {
    const input = sine(220, 0.5, 48_000);
    const whole = new Resampler(48_000, SAMPLE_RATE).process(input);

    const resampler = new Resampler(48_000, SAMPLE_RATE);
    const parts: number[] = [];
    for (let i = 0; i < input.length; i += 4800) {
      parts.push(...resampler.process(input.subarray(i, i + 4800)));
    }
    expect(parts).toHaveLength(whole.length);
    parts.forEach((v, i) => expect(v).toBeCloseTo(whole[i], 5));
  });

  it('corta frequências acima de 8 kHz (sem aliasing)', () => {
    const out = new Resampler(48_000, SAMPLE_RATE).process(sine(10_000, 0.5, 48_000));
    expect(rms(out.subarray(1000))).toBeLessThan(0.005);
  });

  it('mesma taxa: devolve o próprio sinal', () => {
    const input = sine(200, 0.1);
    expect(new Resampler(SAMPLE_RATE, SAMPLE_RATE).process(input)).toBe(input);
  });
});
