import {
  centsBetween,
  formatNote,
  hzToMidi,
  midiToHz,
  nearestNote,
  noteName,
  semitonesBetween,
  shiftSemitones,
} from '../notes';

describe('nomes das notas', () => {
  it('196 Hz é Sol 3 / G3', () => {
    expect(formatNote(196, 'solfege')).toBe('Sol 3');
    expect(formatNote(196, 'letter')).toBe('G3');
  });

  it('440 Hz é Lá 4 / A4', () => {
    expect(formatNote(440, 'solfege')).toBe('Lá 4');
    expect(formatNote(440, 'letter')).toBe('A4');
  });

  it('dó central e sustenidos', () => {
    expect(formatNote(261.63, 'solfege')).toBe('Dó 4');
    expect(formatNote(277.18, 'solfege')).toBe('Dó♯ 4');
    expect(formatNote(277.18, 'letter')).toBe('C♯4');
  });

  it('a oitava muda no Dó, não no Lá', () => {
    expect(noteName(59, 'letter')).toBe('B3');
    expect(noteName(60, 'letter')).toBe('C4');
  });

  it('tons graves', () => {
    expect(formatNote(65.41, 'solfege')).toBe('Dó 2');
  });
});

describe('distâncias', () => {
  it('uma oitava são 12 semitons e 1200 cents', () => {
    expect(semitonesBetween(220, 440)).toBeCloseTo(12);
    expect(centsBetween(440, 220)).toBeCloseTo(-1200);
  });

  it('165–200 Hz tem pouco mais de 3 semitons', () => {
    expect(semitonesBetween(165, 200)).toBeCloseTo(3.33, 2);
  });

  it('subir e descer semitons', () => {
    expect(shiftSemitones(440, 12)).toBeCloseTo(880);
    expect(shiftSemitones(440, -2)).toBeCloseTo(392, 0);
  });

  it('Hz ↔ MIDI ida e volta', () => {
    expect(hzToMidi(440)).toBe(69);
    expect(midiToHz(hzToMidi(187.3))).toBeCloseTo(187.3, 6);
  });

  it('nota mais próxima e o desvio em cents', () => {
    const { midi, cents } = nearestNote(200);
    expect(noteName(midi, 'solfege')).toBe('Sol 3');
    expect(cents).toBeCloseTo(34.98, 1);
  });
});
