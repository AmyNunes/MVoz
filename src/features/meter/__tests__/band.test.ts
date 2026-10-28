import type { PitchFrame } from '@/audio/pitch';
import { hzToMidi, semitonesBetween } from '@/lib/notes';

import { bandState, shiftBand, withHigh, withLow } from '../band';
import { gridLines, tracePath, traceRange, yForHz } from '../trace';

const band = { lowHz: 165, highHz: 200 };

describe('faixa-alvo', () => {
  it('estado em relação à faixa', () => {
    expect(bandState(150, band)).toBe('below');
    expect(bandState(180, band)).toBe('in');
    expect(bandState(210, band)).toBe('above');
  });

  it('mover a faixa inteira mantém a largura em semitons', () => {
    const up = shiftBand(band, 2);
    expect(semitonesBetween(band.lowHz, up.lowHz)).toBeCloseTo(2);
    expect(semitonesBetween(up.lowHz, up.highHz)).toBeCloseTo(semitonesBetween(165, 200));
  });

  it('não deixa a faixa sair de 60–500 Hz', () => {
    expect(shiftBand({ lowHz: 62, highHz: 80 }, -2)).toEqual({ lowHz: 62, highHz: 80 });
    expect(shiftBand({ lowHz: 400, highHz: 490 }, 2)).toEqual({ lowHz: 400, highHz: 490 });
  });

  it('a faixa tem pelo menos 1 semitom de largura', () => {
    const narrow = withLow(band, 199);
    expect(semitonesBetween(narrow.lowHz, narrow.highHz)).toBeCloseTo(1);
    const narrow2 = withHigh(band, 166);
    expect(semitonesBetween(narrow2.lowHz, narrow2.highHz)).toBeCloseTo(1);
  });
});

function frames(hz: (number | null)[], start = 0): PitchFrame[] {
  return hz.map((value, i) => ({ t: start + i * 0.02, hz: value, clarity: 0.95, rms: 0.05 }));
}

describe('gráfico do tom', () => {
  it('cobre a faixa e a voz, com pelo menos 18 semitons', () => {
    const range = traceRange(frames(new Array(50).fill(120)), band);
    expect(range.low).toBeLessThan(hzToMidi(120));
    expect(range.high).toBeGreaterThan(hzToMidi(200));
    expect(range.high - range.low).toBeGreaterThanOrEqual(18);
  });

  it('sem faixa e sem voz, centra em 165 Hz', () => {
    const range = traceRange([], null);
    expect((range.low + range.high) / 2).toBeCloseTo(hzToMidi(165));
  });

  it('tons mais altos ficam mais acima', () => {
    const range = traceRange([], band);
    expect(yForHz(200, range, 300)).toBeLessThan(yForHz(165, range, 300));
  });

  it('linhas de referência dentro do gráfico', () => {
    const lines = gridLines(traceRange([], band));
    expect(lines).toContain(200);
    expect(lines).not.toContain(500);
  });

  it('trechos sem voz quebram a linha', () => {
    const range = traceRange([], band);
    const d = tracePath(frames([180, 180, null, null, 190, 190]), range, { width: 400, height: 300 });
    expect(d.match(/M/g)).toHaveLength(2);
    expect(d.match(/L/g)).toHaveLength(2);
  });

  it('a medida mais nova fica na borda direita', () => {
    const range = traceRange([], band);
    const d = tracePath(frames([180, 180]), range, { width: 400, height: 300 });
    expect(d.endsWith(`400.0 ${yForHz(180, range, 300).toFixed(1)}`)).toBe(true);
  });
});

describe('linhas do gráfico num gráfico baixo', () => {
  it('pula as linhas que ficariam a menos de N pixels da anterior', () => {
    const range = traceRange([], { lowHz: 100, highHz: 220 });
    const all = gridLines(range);
    const short = gridLines(range, 120, 26);
    expect(short.length).toBeLessThan(all.length);
    for (let i = 1; i < short.length; i++) {
      expect(Math.abs(yForHz(short[i - 1], range, 120) - yForHz(short[i], range, 120))).toBeGreaterThanOrEqual(26);
    }
    expect(gridLines(range, 600, 26)).toEqual(all);
  });
});
