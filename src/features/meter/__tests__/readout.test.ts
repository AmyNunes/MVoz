import type { PitchFrame } from '@/audio/pitch';

import { sameReadout, summarize } from '../readout';

function frame(t: number, hz: number | null, clarity = 0.95, rms = 0.05): PitchFrame {
  return { t, hz, clarity, rms };
}

/** Quadros a cada 20 ms entre `from` e `to` (inclusive). */
function run(from: number, to: number, make: (t: number) => PitchFrame): PitchFrame[] {
  const out: PitchFrame[] = [];
  for (let t = from; t <= to + 1e-9; t += 0.02) out.push(make(Number(t.toFixed(2))));
  return out;
}

describe('o que o medidor mostra', () => {
  it('sem medidas: silêncio', () => {
    expect(summarize([])).toEqual({ kind: 'silence' });
  });

  it('voz: mediana dos últimos 150 ms (ignora um salto isolado)', () => {
    const frames = run(0, 0.5, (t) => frame(t, t === 0.46 ? 400 : 196));
    expect(summarize(frames)).toEqual({ kind: 'voice', hz: 196 });
  });

  it('segura o último tom por 300 ms entre sílabas', () => {
    const voiced = run(0, 1, (t) => frame(t, 200));
    const gap = run(1.02, 1.2, (t) => frame(t, null, 0.3, 0.001));
    expect(summarize([...voiced, ...gap])).toEqual({ kind: 'voice', hz: 200 });

    const longGap = run(1.02, 1.4, (t) => frame(t, null, 0.3, 0.001));
    expect(summarize([...voiced, ...longGap])).toEqual({ kind: 'silence' });
  });

  it('voz fraca demais: pede para chegar mais perto', () => {
    const frames = run(0, 0.5, (t) => frame(t, null, 0.95, 0.004));
    expect(summarize(frames)).toEqual({ kind: 'quiet' });
  });

  it('som claro e forte fora da faixa (ex.: assobio) não é "muito baixo"', () => {
    const frames = run(0, 0.5, (t) => frame(t, null, 0.95, 0.1));
    expect(summarize(frames)).toEqual({ kind: 'silence' });
  });
});

describe('sameReadout', () => {
  it('compara o Hz inteiro que aparece na tela', () => {
    expect(sameReadout({ kind: 'voice', hz: 196.2 }, { kind: 'voice', hz: 196.4 })).toBe(true);
    expect(sameReadout({ kind: 'voice', hz: 196 }, { kind: 'voice', hz: 197 })).toBe(false);
    expect(sameReadout({ kind: 'silence' }, { kind: 'quiet' })).toBe(false);
    expect(sameReadout({ kind: 'silence' }, { kind: 'silence' })).toBe(true);
  });
});
