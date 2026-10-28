import { getExercise } from '@/exercises/catalog';
import { hzToMidi } from '@/lib/notes';

import type { ContourPoint } from './schemas/simulate';

const MIN_HZ = 60;
const MAX_HZ = 600;
const MAX_POINTS = 60;
const MAX_SECONDS = 30;
/** Com a gravação inicial: dentro da extensão medida + 2 semitons (seção 12.4). */
const EXTENSION_MARGIN_ST = 2;
/** Sem a gravação inicial: a faixa-alvo com folga de 5 semitons. */
const BAND_MARGIN_ST = 5;
/** Sem faixa-alvo, uma zona confortável para a maioria das vozes. */
const DEFAULT_RANGE = { lowHz: 80, highHz: 400 };

/**
 * Valida a curva de tom que a IA mandou (seção 12.4): 60–600 Hz, tempos crescentes a partir
 * de 0, até 60 pontos, até 30 s e dentro da faixa segura. Curva inválida vira `null` (não é usada).
 */
export function validateContour(
  points: readonly ContourPoint[] | null | undefined,
  band: { lowHz: number; highHz: number } | null,
  extension: { lowHz: number; highHz: number } | null = null,
): ContourPoint[] | null {
  if (!points || points.length < 2 || points.length > MAX_POINTS) return null;
  const safe = extension ?? band ?? DEFAULT_RANGE;
  const margin = extension ? EXTENSION_MARGIN_ST : band ? BAND_MARGIN_ST : 0;
  const lowSt = hzToMidi(safe.lowHz) - margin;
  const highSt = hzToMidi(safe.highHz) + margin;

  for (let i = 0; i < points.length; i++) {
    const { t, hz } = points[i];
    if (!Number.isFinite(t) || !Number.isFinite(hz)) return null;
    if (hz < MIN_HZ || hz > MAX_HZ) return null;
    const st = hzToMidi(hz);
    if (st < lowSt || st > highSt) return null;
    if (i > 0 && t <= points[i - 1].t) return null;
  }
  const start = points[0].t;
  if (start < 0 || points[points.length - 1].t - start > MAX_SECONDS) return null;
  // Começa em 0 para tocar e desenhar.
  return points.map((p) => ({ t: p.t - start, hz: p.hz }));
}

/** Só ids do catálogo, sem repetir (seção 12.4): o resto é descartado em silêncio. */
export function validExerciseIds(ids: readonly string[] | null | undefined, max = 3): string[] {
  const known = (ids ?? []).filter((id, i, all) => getExercise(id) !== undefined && all.indexOf(id) === i);
  return known.slice(0, max);
}
