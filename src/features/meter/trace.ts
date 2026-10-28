import { hzToMidi } from '@/lib/notes';

import type { Band } from './band';

/** O gráfico ao vivo mostra os últimos 8 s (seção 4.5). */
export const TRACE_SECONDS = 8;
/** Faixa de tons mostrada, em número MIDI (semitons). */
export type TraceRange = { low: number; high: number };
/** Um ponto do traçado; `hz` nulo = sem voz. */
export type TracePoint = { t: number; hz: number | null };

/** Altura mínima do gráfico, em semitons. */
const MIN_SPAN_ST = 18;
/** Folga acima e abaixo da faixa e da voz. */
const MARGIN_ST = 4;
const DEFAULT_CENTER_HZ = 165;
/** Ao vivo: intervalo maior que isso entre medidas com voz quebra a linha. */
const LIVE_GAP_SEC = 0.05;

/** Cobre a faixa-alvo e a mediana da voz, com folga, e nunca menos de 18 semitons. */
export function traceRange(points: readonly { hz: number | null }[], band: Band | null): TraceRange {
  const voiced = points.flatMap((p) => (p.hz === null ? [] : [hzToMidi(p.hz)])).sort((a, b) => a - b);
  const anchors = band ? [hzToMidi(band.lowHz), hzToMidi(band.highHz)] : [];
  if (voiced.length > 0) anchors.push(voiced[Math.floor(voiced.length / 2)]);
  if (anchors.length === 0) anchors.push(hzToMidi(DEFAULT_CENTER_HZ));

  let low = Math.min(...anchors) - MARGIN_ST;
  let high = Math.max(...anchors) + MARGIN_ST;
  if (high - low < MIN_SPAN_ST) {
    const center = (low + high) / 2;
    low = center - MIN_SPAN_ST / 2;
    high = center + MIN_SPAN_ST / 2;
  }
  return { low, high };
}

const GRID_HZ = [60, 80, 100, 125, 150, 175, 200, 250, 300, 350, 400, 500];

/**
 * Linhas de referência (em Hz) que cabem no gráfico. Com `height` e `minGapPx`, pula as que
 * ficariam perto demais da anterior (num gráfico baixo, as legendas se sobrepunham).
 */
export function gridLines(range: TraceRange, height?: number, minGapPx = 0): number[] {
  const inside = GRID_HZ.filter((hz) => {
    const m = hzToMidi(hz);
    return m > range.low + 0.5 && m < range.high - 0.5;
  });
  if (!height || minGapPx <= 0) return inside;
  const kept: number[] = [];
  for (const hz of inside) {
    const last = kept[kept.length - 1];
    if (last === undefined || Math.abs(yForHz(last, range, height) - yForHz(hz, range, height)) >= minGapPx) kept.push(hz);
  }
  return kept;
}

type Size = { width: number; height: number };

/** Posição vertical de um tom (Hz) no gráfico. */
export function yForHz(hz: number, range: TraceRange, height: number): number {
  return height * (1 - (hzToMidi(hz) - range.low) / (range.high - range.low));
}

/**
 * Caminho SVG de pontos no intervalo de tempo `window` (borda esquerda → direita).
 * Trechos sem voz, ou com intervalo maior que `maxGapSec`, ficam vazios.
 */
export function pathFor(
  points: readonly TracePoint[],
  range: TraceRange,
  size: Size,
  window: { start: number; end: number },
  maxGapSec: number,
): string {
  if (size.width <= 0 || window.end <= window.start) return '';
  const parts: string[] = [];
  let previous = -Infinity;
  for (const p of points) {
    if (p.hz === null) {
      previous = -Infinity;
      continue;
    }
    const x = (size.width * (p.t - window.start)) / (window.end - window.start);
    const y = yForHz(p.hz, range, size.height);
    parts.push(`${p.t - previous > maxGapSec ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
    previous = p.t;
  }
  return parts.join(' ');
}

/** Linha ao vivo: a medida mais nova fica na borda direita. */
export function tracePath(points: readonly TracePoint[], range: TraceRange, size: Size): string {
  const last = points[points.length - 1];
  if (!last) return '';
  return pathFor(points, range, size, { start: last.t - TRACE_SECONDS, end: last.t }, LIVE_GAP_SEC);
}
