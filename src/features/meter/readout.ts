import { DEFAULT_PITCH_OPTIONS, type PitchFrame } from '@/audio/pitch';

/** O que o PitchReadout mostra agora. */
export type Readout =
  | { kind: 'voice'; hz: number }
  /** Há voz, mas fraca demais para medir: "chegue mais perto". */
  | { kind: 'quiet' }
  | { kind: 'silence' };

/** A voz some por instantes entre as sílabas: o último tom fica na tela por 300 ms para não piscar. */
const HOLD_SEC = 0.3;
/** Mediana dos últimos 150 ms com voz: numa nota sustentada, o número fica parado. */
const SMOOTH_SEC = 0.15;
const QUIET_SEC = 0.5;
/** Quanto histórico a tela guarda (o resto é descartado). */
export const READOUT_WINDOW_SEC = 1;

export function summarize(frames: readonly PitchFrame[]): Readout {
  const last = frames[frames.length - 1];
  if (!last) return { kind: 'silence' };
  const now = last.t;

  const voiced = frames.filter((f) => f.hz !== null && now - f.t <= HOLD_SEC);
  if (voiced.length > 0) {
    const newest = voiced[voiced.length - 1].t;
    const recent = voiced
      .filter((f) => newest - f.t <= SMOOTH_SEC)
      .map((f) => f.hz as number)
      .sort((a, b) => a - b);
    return { kind: 'voice', hz: recent[Math.floor((recent.length - 1) / 2)] };
  }

  const { minClarity, minVoiceRms } = DEFAULT_PITCH_OPTIONS;
  const quiet = frames.some((f) => now - f.t <= QUIET_SEC && f.clarity >= minClarity && f.rms < minVoiceRms);
  return quiet ? { kind: 'quiet' } : { kind: 'silence' };
}

/** Evita renderizar de novo quando o que aparece na tela (Hz inteiro) não mudou. */
export function sameReadout(a: Readout, b: Readout): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind !== 'voice' || b.kind !== 'voice' || Math.round(a.hz) === Math.round(b.hz);
}
