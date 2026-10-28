import { decodeWav, encodeWav } from '../wav';
import { sine } from './synth';

describe('WAV', () => {
  it('escrever → ler devolve o mesmo som (16 bits)', () => {
    const input = sine(220, 0.1);
    const { samples, sampleRate } = decodeWav(encodeWav(input, 16_000));

    expect(sampleRate).toBe(16_000);
    expect(samples).toHaveLength(input.length);
    samples.forEach((v, i) => expect(v).toBeCloseTo(input[i], 3));
  });

  it('cabeçalho de PCM 16 bits mono: 1 minuto ≈ 1,9 MB', () => {
    const bytes = encodeWav(new Float32Array(16_000 * 60), 16_000);
    const view = new DataView(bytes.buffer);

    expect(String.fromCharCode(...bytes.subarray(0, 4))).toBe('RIFF');
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(bytes.length / 1e6).toBeCloseTo(1.92, 2);
  });

  it('lê float de 32 bits estéreo (misturando em mono) e pula blocos extras', () => {
    const frames = [
      [0.5, -0.5],
      [1, 0],
    ];
    const extra = 6; // bloco "LIST" de tamanho par
    const dataSize = frames.length * 2 * 4;
    const bytes = new Uint8Array(12 + 24 + 8 + extra + 8 + dataSize);
    const view = new DataView(bytes.buffer);
    const tag = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));

    tag(0, 'RIFF');
    view.setUint32(4, bytes.length - 8, true);
    tag(8, 'WAVE');
    tag(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 3, true);
    view.setUint16(22, 2, true);
    view.setUint32(24, 48_000, true);
    view.setUint16(34, 32, true);
    tag(36, 'LIST');
    view.setUint32(40, extra, true);
    const data = 44 + extra;
    tag(data, 'data');
    view.setUint32(data + 4, dataSize, true);
    frames.flat().forEach((v, i) => view.setFloat32(data + 8 + i * 4, v, true));

    const { samples, sampleRate } = decodeWav(bytes);
    expect(sampleRate).toBe(48_000);
    expect(Array.from(samples)).toEqual([0, 0.5]);
  });

  it('recusa o que não é WAV', () => {
    expect(() => decodeWav(new Uint8Array(44))).toThrow();
  });
});
