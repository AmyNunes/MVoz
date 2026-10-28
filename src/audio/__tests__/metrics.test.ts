import { computeMetrics, type MetricFrame } from '../metrics';
import { reducePitchTrack, trackPoints } from '../pitchTrack';

/** Medidas a cada 20 ms, a partir de uma função do tempo. */
function frames(seconds: number, hzAt: (t: number) => number | null, rms = 0.05): MetricFrame[] {
  return Array.from({ length: Math.round(seconds / 0.02) }, (_, i) => {
    const t = i * 0.02;
    const hz = hzAt(t);
    return { t, hz, clarity: hz === null ? 0.2 : 0.95, rms: hz === null ? 0.001 : rms };
  });
}

describe('métricas de um trecho', () => {
  it('tom constante: mediana, faixa estreita, estável', () => {
    const m = computeMetrics(frames(2, () => 200));

    expect(m.durationSec).toBeCloseTo(2);
    expect(m.voicedRatio).toBe(1);
    expect(m.medianHz).toBeCloseTo(200);
    expect(m.rangeSt).toBeCloseTo(0);
    expect(m.stabilityCents).toBeCloseTo(0);
    expect(m.inTargetRatio).toBeNull();
  });

  it('tempo de voz, % na faixa e abaixo do piso', () => {
    // 1 s a 140 Hz, 1 s a 180 Hz, 1 s de silêncio.
    const m = computeMetrics(frames(3, (t) => (t < 1 ? 140 : t < 2 ? 180 : null)), {
      band: { lowHz: 165, highHz: 200 },
      floorHz: 150,
    });

    expect(m.voicedSec).toBeCloseTo(2);
    expect(m.voicedRatio).toBeCloseTo(2 / 3);
    expect(m.inTargetRatio).toBeCloseTo(0.5);
    expect(m.belowFloorRatio).toBeCloseTo(0.5);
    expect(m.p10Hz).toBeCloseTo(140);
    expect(m.p90Hz).toBeCloseTo(180);
  });

  it('variação em semitons: uma oitava pra cima e pra baixo', () => {
    const m = computeMetrics(frames(2, (t) => (t < 1 ? 100 : 200)));
    expect(m.variabilitySt).toBeCloseTo(6);
    expect(m.rangeSt).toBeCloseTo(12);
  });

  it('final das frases: sobe, desce ou reto', () => {
    const rising = (t: number) => (t > 0.7 ? 180 * 2 ** ((t - 0.7) * 10 / 12) : 180);
    const falling = (t: number) => (t > 0.7 ? 180 * 2 ** (-(t - 0.7) * 10 / 12) : 180);
    const phrase = (shape: (t: number) => number, offset: number) => (t: number) =>
      t >= offset && t < offset + 1 ? shape(t - offset) : null;

    const m = computeMetrics(
      frames(4.5, (t) => phrase(rising, 0)(t) ?? phrase(falling, 1.5)(t) ?? phrase(() => 180, 3)(t)),
    );
    expect(m.endings).toEqual({ rising: 1, falling: 1, flat: 1 });
  });

  it('duração de som pelo volume, com ou sem tom (ex.: /s/)', () => {
    const hiss = frames(3, () => null).map((f) => ({ ...f, rms: f.t < 2.5 ? 0.02 : 0.001 }));
    expect(computeMetrics(hiss).longestSoundSec).toBeCloseTo(2.5, 1);
  });

  it('ressonância: medianas dos formantes', () => {
    const withFormants = frames(1, () => 120).map((f, i) => ({
      ...f,
      formants: i % 5 === 0 ? { f1: 730, f2: 1090, f3: 2440, centroid: 1400 } : null,
    }));
    const m = computeMetrics(withFormants);
    expect(m.resonance?.f2).toBe(1090);
    expect(m.resonance?.spacing).toBeGreaterThan(900);
  });

  it('trecho vazio não quebra', () => {
    const m = computeMetrics([]);
    expect(m.medianHz).toBeNull();
    expect(m.longestSoundSec).toBe(0);
  });
});

describe('traçado reduzido (10 pontos por segundo)', () => {
  it('mediana a cada 100 ms; trechos sem voz viram 0', () => {
    const track = reducePitchTrack(frames(1, (t) => (t < 0.5 ? 200 : null)));
    expect(track.rate).toBe(10);
    expect(track.hz).toHaveLength(10);
    expect(track.hz.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(track.hz.slice(5)).toEqual([0, 0, 0, 0, 0]);
  });

  it('pontos para desenhar', () => {
    const points = trackPoints({ v: 1, rate: 10, hz: [200, 0] });
    expect(points).toEqual([
      { t: 0.05, hz: 200 },
      { t: 0.15, hz: null },
    ]);
  });
});
