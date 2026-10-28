import type { VoiceFrame } from '@/audio/analyzer';

import { gaugePosition, sameResonance, summarizeResonance } from '../resonance';

function frame(t: number, hz: number | null, f: [number, number, number | null] | null): VoiceFrame {
  return {
    t,
    hz,
    clarity: 0.95,
    rms: 0.05,
    formants: f ? { f1: f[0], f2: f[1], f3: f[2], centroid: 1500 } : null,
  };
}

describe('ressonância do último segundo', () => {
  it('precisa de pelo menos 3 medidas', () => {
    expect(summarizeResonance([frame(0, 120, [300, 2300, 3000]), frame(0.1, 120, [300, 2300, 3000])])).toBeNull();
  });

  it('mediana das medidas (ignora uma fora da curva)', () => {
    const frames = [
      frame(0, 120, [300, 2300, 3000]),
      frame(0.1, 120, [300, 2300, 3000]),
      frame(0.2, 120, [300, 900, 1800]),
      frame(0.3, 120, [300, 2300, 3000]),
    ];
    const reading = summarizeResonance(frames);
    expect(reading?.f2).toBe(2300);
    expect(reading?.highPitch).toBe(false);
  });

  it('avisa quando o tom está alto (≥ 250 Hz)', () => {
    const frames = [0, 0.1, 0.2].map((t) => frame(t, 280, [350, 2700, 3300]));
    expect(summarizeResonance(frames)?.highPitch).toBe(true);
  });

  it('esquece medidas com mais de 1 s', () => {
    const old = [0, 0.1, 0.2].map((t) => frame(t, 120, [300, 2300, 3000]));
    expect(summarizeResonance([...old, frame(1.5, null, null)])).toBeNull();
  });
});

describe('barra mais escura ↔ mais clara', () => {
  it('limita entre 0 e 1', () => {
    expect(gaugePosition(500)).toBe(0);
    expect(gaugePosition(1100)).toBeCloseTo(0.5);
    expect(gaugePosition(2000)).toBe(1);
  });

  it('diferenças pequenas não renderizam de novo', () => {
    const a = { spacing: 1000, f1: 300, f2: 2300, centroid: 1500, highPitch: false };
    expect(sameResonance(a, { ...a, spacing: 1003 })).toBe(true);
    expect(sameResonance(a, { ...a, spacing: 1010 })).toBe(false);
    expect(sameResonance(null, null)).toBe(true);
  });
});
