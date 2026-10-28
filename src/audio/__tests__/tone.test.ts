import { semitonesBetween } from '@/lib/notes';

import { FRAME_SIZE, Resampler } from '../frames';
import { PitchTracker } from '../pitch';
import { synthesizeTone, TONE_SAMPLE_RATE, toneHzAt, type ToneSpec } from '../tone';

/** Tom medido (pelo próprio detector do app) em volta do instante `t`. */
function measuredHz(signal: Float32Array, t: number): number | null {
  const at16k = new Resampler(TONE_SAMPLE_RATE, 16_000).process(signal);
  const start = Math.max(0, Math.round(t * 16_000) - FRAME_SIZE / 2);
  return new PitchTracker(FRAME_SIZE).analyze(at16k.subarray(start, start + FRAME_SIZE), 16_000, t).hz;
}

describe('tom de referência', () => {
  it('nota de 200 Hz soa em 200 Hz (erro < 1%)', () => {
    const tone = synthesizeTone({ kind: 'note', hz: 200, seconds: 1.5 });
    expect(tone).toHaveLength(Math.round(1.5 * TONE_SAMPLE_RATE));
    expect(Math.abs((measuredHz(tone, 0.75) as number) - 200) / 200).toBeLessThan(0.01);
  });

  it('começa e termina em silêncio (sem estalo) e não satura', () => {
    const tone = synthesizeTone({ kind: 'note', hz: 300, seconds: 1 });
    expect(Math.abs(tone[0])).toBeLessThan(0.01);
    expect(Math.abs(tone[tone.length - 1])).toBeLessThan(0.01);
    expect(Math.max(...tone.map(Math.abs))).toBeLessThanOrEqual(0.5);
  });

  it('deslize vai de uma nota à outra, em semitons', () => {
    const spec: ToneSpec = { kind: 'glide', fromHz: 150, toHz: 300, seconds: 2 };
    expect(toneHzAt(spec, 1)).toBeCloseTo(212.1, 0);

    const tone = synthesizeTone(spec);
    expect(semitonesBetween(150, measuredHz(tone, 0.2) as number)).toBeLessThan(1.5);
    expect(semitonesBetween(measuredHz(tone, 1.8) as number, 300)).toBeLessThan(1.5);
  });

  it('curva segue os pontos', () => {
    const spec: ToneSpec = {
      kind: 'contour',
      points: [
        { t: 0, hz: 180 },
        { t: 1, hz: 180 },
        { t: 1.5, hz: 240 },
        { t: 2.5, hz: 240 },
      ],
    };
    expect(toneHzAt(spec, 0.5)).toBeCloseTo(180, 6);
    expect(toneHzAt(spec, 2)).toBeCloseTo(240, 6);

    const tone = synthesizeTone(spec);
    expect(tone).toHaveLength(Math.round(2.5 * TONE_SAMPLE_RATE));
    expect(measuredHz(tone, 2)).toBeCloseTo(240, 0);
  });
});
