import { FRAME_SIZE } from '../frames';
import { estimateFormants, formantSpacing, lpc, polynomialRoots, type Formants } from '../formants';
import { noise, SAMPLE_RATE, silence, VOWELS, vowel, type Formant } from './synth';

/** Formantes do meio de uma vogal sintética de 0,5 s. */
function analyze(f0: number, formants: readonly Formant[]): Formants | null {
  const signal = vowel(f0, formants, 0.5);
  const start = Math.floor((signal.length - FRAME_SIZE) / 2);
  return estimateFormants(signal.subarray(start, start + FRAME_SIZE), SAMPLE_RATE);
}

function relativeError(measured: number | null | undefined, expected: number): number {
  return measured == null ? Infinity : Math.abs(measured - expected) / expected;
}

describe('raízes de polinômio', () => {
  it('acha as raízes de (z − 0,5)(z² + 1)', () => {
    // z³ − 0,5z² + z − 0,5
    const roots = polynomialRoots(Float64Array.from([1, -0.5, 1, -0.5]));
    // `+ 0` troca −0 por 0.
    const round = (x: number) => Number(x.toFixed(6)) + 0;
    const sorted = roots.map((r) => [round(r.re), round(r.im)]).sort((a, b) => a[1] - b[1]);
    expect(sorted).toEqual([
      [0, -1],
      [0.5, 0],
      [0, 1],
    ]);
  });
});

describe('LPC', () => {
  it('silêncio não tem coeficientes', () => {
    expect(lpc(new Float64Array(13))).toBeNull();
  });
});

describe('formantes em vogais sintéticas (tom grave)', () => {
  it.each([
    ['"a"', VOWELS.aMale],
    ['"i"', VOWELS.iMale],
    ['"u"', VOWELS.uMale],
  ] as const)('%s: F1 e F2 com erro menor que 10%%', (_, formants) => {
    const result = analyze(120, formants);
    expect(relativeError(result?.f1, formants[0].hz)).toBeLessThan(0.1);
    expect(relativeError(result?.f2, formants[1].hz)).toBeLessThan(0.1);
  });

  it('"a": F3 com erro menor que 10%', () => {
    expect(relativeError(analyze(120, VOWELS.aMale)?.f3, VOWELS.aMale[2].hz)).toBeLessThan(0.1);
  });
});

describe('formantes com tom mais agudo (menos preciso, seção 7.3)', () => {
  it('"i" a 210 Hz: F2 com erro menor que 10%', () => {
    expect(relativeError(analyze(210, VOWELS.iFemale)?.f2, VOWELS.iFemale[1].hz)).toBeLessThan(0.1);
  });
});

describe('ressonância comparada', () => {
  it('a mesma vogal com formantes mais altos tem espaçamento maior', () => {
    const male = analyze(120, VOWELS.aMale);
    const female = analyze(120, VOWELS.aFemale);
    expect(male && female).toBeTruthy();
    expect(formantSpacing(female as Formants)).toBeGreaterThan(formantSpacing(male as Formants) as number);
  });

  it('"i" é mais brilhante (centroide maior) que "u"', () => {
    const i = analyze(120, VOWELS.iMale);
    const u = analyze(120, VOWELS.uMale);
    expect(i?.centroid).toBeGreaterThan(u?.centroid as number);
  });

  it('silêncio e ruído não quebram', () => {
    expect(estimateFormants(silence(FRAME_SIZE / SAMPLE_RATE), SAMPLE_RATE)).toBeNull();
    expect(() => estimateFormants(noise(FRAME_SIZE / SAMPLE_RATE), SAMPLE_RATE)).not.toThrow();
  });
});
