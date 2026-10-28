/** Geometria dos gráficos de linha do Progresso (pura, sem React). */

export type ChartBox = { width: number; height: number; padX: number; padY: number };

export type ChartGeometry = {
  min: number;
  max: number;
  /** Posição de cada ponto, na mesma ordem. */
  xy: { x: number; y: number }[];
  path: string;
  y: (value: number) => number;
};

/**
 * Pontos espaçados igualmente no eixo x (um por check-in) e escala y que inclui a faixa
 * (ou o zero), com uma folga de 8% em cima e embaixo.
 */
export function chartGeometry(values: readonly number[], box: ChartBox, include: readonly number[] = []): ChartGeometry {
  const all = [...values, ...include];
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    min = 0;
    max = 1;
  }
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const margin = (max - min) * 0.08;
  min -= margin;
  max += margin;

  const innerW = Math.max(0, box.width - 2 * box.padX);
  const innerH = Math.max(0, box.height - 2 * box.padY);
  const y = (value: number) => box.padY + (1 - (value - min) / (max - min)) * innerH;
  const x = (i: number) => (values.length <= 1 ? box.padX + innerW / 2 : box.padX + (i / (values.length - 1)) * innerW);
  const xy = values.map((v, i) => ({ x: x(i), y: y(v) }));
  const path = xy.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return { min, max, xy, path, y };
}

/** Índice do ponto mais perto de um toque no eixo x. */
export function nearestIndex(xy: readonly { x: number }[], touchX: number): number {
  let best = 0;
  for (let i = 1; i < xy.length; i++) if (Math.abs(xy[i].x - touchX) < Math.abs(xy[best].x - touchX)) best = i;
  return best;
}
