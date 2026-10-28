import type { Goal } from '@/exercises/model';
import { semitonesBetween, shiftSemitones } from '@/lib/notes';

import type { BaselineMetrics } from './baseline';

/** Faixa de tom em Hz. */
export type Band = { lowHz: number; highHz: number };
export type Direction = 'up' | 'down' | 'none';

/** A faixa de cada etapa tem ~3 semitons (seção 9.2). */
export const BAND_WIDTH_ST = 3;
/** Na etapa de tom, a faixa anda até 2 semitons por vez. */
export const STEP_ST = 2;
/** O topo da faixa fica pelo menos 4 semitons abaixo do agudo confortável. */
export const CEILING_MARGIN_ST = 4;
/** Na masculinização, nunca abaixo da nota grave mais limpa + 2 semitons. */
export const FLOOR_MARGIN_ST = 2;

/** Meta final de tom médio na fala e piso, por objetivo (seção 9.2; valores em PESQUISA.md). */
export function finalTarget(goal: Goal, baseline: Pick<BaselineMetrics, 'speechMedianHz' | 'minHz'>): { band: Band; floorHz: number | null } {
  switch (goal) {
    case 'feminize':
      return { band: { lowHz: 165, highHz: 200 }, floorHz: 150 };
    case 'neutral':
      return { band: { lowHz: 145, highHz: 175 }, floorHz: 130 };
    case 'masculinize': {
      const lowest = shiftSemitones(baseline.minHz, FLOOR_MARGIN_ST);
      const lowHz = Math.max(100, lowest);
      return { band: { lowHz, highHz: Math.max(130, shiftSemitones(lowHz, BAND_WIDTH_ST)) }, floorHz: null };
    }
    case 'health':
      return {
        band: { lowHz: shiftSemitones(baseline.speechMedianHz, -2), highHz: shiftSemitones(baseline.speechMedianHz, 2) },
        floorHz: null,
      };
  }
}

/** Para onde o tom precisa andar: do habitual até a meta final. */
export function direction(goal: Goal, habitualHz: number, final: Band): Direction {
  if (goal === 'health') return 'none';
  if (habitualHz < final.lowHz) return 'up';
  if (habitualHz > final.highHz) return 'down';
  return 'none';
}

export function comfortCeilingHz(baseline: Pick<BaselineMetrics, 'maxHz'>): number {
  return shiftSemitones(baseline.maxHz, -CEILING_MARGIN_ST);
}

export function comfortFloorHz(baseline: Pick<BaselineMetrics, 'minHz'>): number {
  return shiftSemitones(baseline.minHz, FLOOR_MARGIN_ST);
}

function shiftBand(band: Band, semitones: number): Band {
  return { lowHz: shiftSemitones(band.lowHz, semitones), highHz: shiftSemitones(band.highHz, semitones) };
}

/** Mantém a faixa entre o piso e o teto de conforto, sem mudar a largura. */
export function clampBand(band: Band, baseline: Pick<BaselineMetrics, 'minHz' | 'maxHz'>): Band {
  const ceiling = comfortCeilingHz(baseline);
  const floor = comfortFloorHz(baseline);
  if (band.highHz > ceiling) return shiftBand(band, semitonesBetween(band.highHz, ceiling));
  if (band.lowHz < floor) return shiftBand(band, semitonesBetween(band.lowHz, floor));
  return band;
}

/** Faixa da primeira etapa: começa no tom habitual, na direção do objetivo (seção 9.2). */
export function initialBand(goal: Goal, baseline: BaselineMetrics): Band {
  const habitual = baseline.speechMedianHz;
  const final = finalTarget(goal, baseline).band;
  const dir = direction(goal, habitual, final);
  const band =
    dir === 'up'
      ? { lowHz: habitual, highHz: shiftSemitones(habitual, BAND_WIDTH_ST) }
      : dir === 'down'
        ? { lowHz: shiftSemitones(habitual, -BAND_WIDTH_ST), highHz: habitual }
        : { lowHz: shiftSemitones(habitual, -BAND_WIDTH_ST / 2), highHz: shiftSemitones(habitual, BAND_WIDTH_ST / 2) };
  return clampBand(band, baseline);
}

/** Um passo (até 2 semitons) da faixa em direção à meta final, sem passar dela nem do teto. */
export function stepTowardFinal(band: Band, final: Band, baseline: BaselineMetrics): Band {
  const up = semitonesBetween(band.lowHz, final.lowHz);
  const down = semitonesBetween(band.highHz, final.highHz);
  const delta = up > 0 ? Math.min(STEP_ST, up) : down < 0 ? Math.max(-STEP_ST, down) : 0;
  return clampBand(shiftBand(band, delta), baseline);
}

/** A faixa já chegou na meta final (ou no teto, se a meta passa do teto)? */
export function atFinal(band: Band, final: Band, baseline: BaselineMetrics): boolean {
  const next = stepTowardFinal(band, final, baseline);
  return Math.abs(semitonesBetween(band.lowHz, next.lowHz)) < 0.05;
}

/** A meta final passa do teto de conforto (o plano para no teto e explica). */
export function finalAboveCeiling(final: Band, baseline: BaselineMetrics): boolean {
  return final.highHz > comfortCeilingHz(baseline);
}
