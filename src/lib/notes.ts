/**
 * Notas musicais e distâncias entre tons.
 * A percepção de tom é logarítmica: comparações e gráficos usam semitons (seção 7.2).
 * Numeração científica das oitavas, a mesma dos afinadores: Lá 4 = A4 = 440 Hz, Sol 3 = 196 Hz.
 */

export type NoteNotation = 'solfege' | 'letter';

const A4_HZ = 440;
const A4_MIDI = 69;

const SOLFEGE = ['Dó', 'Dó♯', 'Ré', 'Ré♯', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Sol♯', 'Lá', 'Lá♯', 'Si'] as const;
const LETTERS = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/** Número MIDI (com fração): 69 = Lá 4. */
export function hzToMidi(hz: number): number {
  return A4_MIDI + 12 * Math.log2(hz / A4_HZ);
}

export function midiToHz(midi: number): number {
  return A4_HZ * 2 ** ((midi - A4_MIDI) / 12);
}

/** Quantos semitons de `fromHz` até `toHz` (negativo se descer). */
export function semitonesBetween(fromHz: number, toHz: number): number {
  return 12 * Math.log2(toHz / fromHz);
}

/** Quantos cents (1/100 de semitom) de `fromHz` até `toHz`. */
export function centsBetween(fromHz: number, toHz: number): number {
  return 1200 * Math.log2(toHz / fromHz);
}

/** Sobe (ou desce, se negativo) `semitones` a partir de `hz`. */
export function shiftSemitones(hz: number, semitones: number): number {
  return hz * 2 ** (semitones / 12);
}

/** Nota mais próxima de `hz` e a distância até ela, em cents (−50 a +50). */
export function nearestNote(hz: number): { midi: number; cents: number } {
  const exact = hzToMidi(hz);
  const midi = Math.round(exact);
  return { midi, cents: (exact - midi) * 100 };
}

/** "Sol 3" ou "G3". */
export function noteName(midi: number, notation: NoteNotation): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return notation === 'solfege' ? `${SOLFEGE[pitchClass]} ${octave}` : `${LETTERS[pitchClass]}${octave}`;
}

/** Nome da nota mais próxima de `hz`: 196 Hz → "Sol 3". */
export function formatNote(hz: number, notation: NoteNotation): string {
  return noteName(nearestNote(hz).midi, notation);
}
