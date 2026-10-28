import { shiftSemitones } from '@/lib/notes';

/** Faixa-alvo em Hz. Comparações e gráficos usam semitons (seção 7.2). */
export type Band = { lowHz: number; highHz: number };
export type BandState = 'in' | 'below' | 'above';

const MIN_HZ = 60;
const MAX_HZ = 500;
/** Faixa mais estreita permitida. */
const MIN_WIDTH_ST = 1;

export function bandState(hz: number, band: Band): BandState {
  if (hz < band.lowHz) return 'below';
  if (hz > band.highHz) return 'above';
  return 'in';
}

/** Move a faixa inteira `semitones` (para cima ou para baixo), sem sair de 60–500 Hz. */
export function shiftBand(band: Band, semitones: number): Band {
  const lowHz = shiftSemitones(band.lowHz, semitones);
  const highHz = shiftSemitones(band.highHz, semitones);
  if (lowHz < MIN_HZ || highHz > MAX_HZ) return band;
  return { lowHz, highHz };
}

/** Muda o começo da faixa, mantendo pelo menos 1 semitom de largura. */
export function withLow(band: Band, lowHz: number): Band {
  const max = shiftSemitones(band.highHz, -MIN_WIDTH_ST);
  return { ...band, lowHz: Math.min(Math.max(lowHz, MIN_HZ), max) };
}

/** Muda o fim da faixa, mantendo pelo menos 1 semitom de largura. */
export function withHigh(band: Band, highHz: number): Band {
  const min = shiftSemitones(band.lowHz, MIN_WIDTH_ST);
  return { ...band, highHz: Math.max(Math.min(highHz, MAX_HZ), min) };
}
