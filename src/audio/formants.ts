import { Resampler } from './frames';

/**
 * Ressonância estimada (seção 7.3): formantes por LPC, feitos por nós (não há biblioteca mantida).
 * É uma ESTIMATIVA: erra mais com tom alto (≥ ~250 Hz), com o controle automático de volume e
 * com ruído. Por isso a tela compara sempre com a própria pessoa e indica "estimativa".
 */

export type Formants = {
  f1: number;
  f2: number;
  f3: number | null;
  /** Centro de gravidade do envelope espectral (0–5 kHz): apoio barato para o "brilho". */
  centroid: number;
};

/** ~10,7 kHz: teto de ~5,3 kHz, onde ficam F1–F3. */
export const LPC_SAMPLE_RATE = 32_000 / 3;
const WINDOW_SEC = 0.03;
const ORDER = 12;
const PRE_EMPHASIS = 0.97;
const MIN_FORMANT_HZ = 90;
const MAX_FORMANT_HZ = 5000;
/**
 * A spec sugere < 400 Hz, mas a janela alarga as larguras medidas: o F3 de um "a" sintético
 * (largura real 170 Hz) sai com ~520 Hz. Os polos falsos ficam acima de ~900 Hz.
 */
const MAX_BANDWIDTH_HZ = 600;
const ENVELOPE_POINTS = 64;

/** Formantes do centro de um quadro com voz. `null` se o som não tiver formantes claros. */
export function estimateFormants(frame: Float32Array, sampleRate: number): Formants | null {
  const resampled = new Resampler(sampleRate, LPC_SAMPLE_RATE).process(frame);
  const length = Math.round(WINDOW_SEC * LPC_SAMPLE_RATE);
  if (resampled.length < length) return null;
  const start = Math.floor((resampled.length - length) / 2);
  const x = preEmphasisAndHamming(resampled.subarray(start, start + length));

  const coefficients = lpc(autocorrelation(x, ORDER));
  if (!coefficients) return null;

  const candidates = polynomialRoots(coefficients)
    .filter((root) => root.im > 0)
    .map((root) => ({
      hz: (Math.atan2(root.im, root.re) * LPC_SAMPLE_RATE) / (2 * Math.PI),
      bandwidth: (-LPC_SAMPLE_RATE / Math.PI) * Math.log(Math.hypot(root.re, root.im)),
    }))
    .filter((c) => c.hz > MIN_FORMANT_HZ && c.hz < MAX_FORMANT_HZ && c.bandwidth < MAX_BANDWIDTH_HZ)
    .map((c) => c.hz)
    .sort((a, b) => a - b);

  if (candidates.length < 2) return null;
  return {
    f1: candidates[0],
    f2: candidates[1],
    f3: candidates[2] ?? null,
    centroid: envelopeCentroid(coefficients),
  };
}

/**
 * Espaçamento médio entre os formantes (ΔF, Reby & McComb 2003): quanto maior, menor o
 * trato vocal aparente e mais "clara" a ressonância. Varia com a vogal: compare a mesma vogal.
 */
export function formantSpacing({ f1, f2, f3 }: Formants): number | null {
  if (f3 === null) return null;
  return (0.5 * f1 + 1.5 * f2 + 2.5 * f3) / (0.25 + 2.25 + 6.25);
}

function preEmphasisAndHamming(input: Float32Array): Float64Array {
  const n = input.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const emphasized = input[i] - PRE_EMPHASIS * (i > 0 ? input[i - 1] : 0);
    out[i] = emphasized * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1)));
  }
  return out;
}

function autocorrelation(x: Float64Array, order: number): Float64Array {
  const r = new Float64Array(order + 1);
  for (let lag = 0; lag <= order; lag++) {
    let sum = 0;
    for (let i = lag; i < x.length; i++) sum += x[i] * x[i - lag];
    r[lag] = sum;
  }
  return r;
}

/** Levinson-Durbin: coeficientes de A(z) = 1 + a1·z⁻¹ + … + ap·z⁻ᵖ. */
export function lpc(r: Float64Array): Float64Array | null {
  const order = r.length - 1;
  if (r[0] <= 0) return null;
  let a = new Float64Array(order + 1);
  a[0] = 1;
  let error = r[0];
  for (let i = 1; i <= order; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / error;
    const next = a.slice();
    for (let j = 1; j < i; j++) next[j] = a[j] + k * a[i - j];
    next[i] = k;
    a = next;
    error *= 1 - k * k;
    if (error <= 0) return null;
  }
  return a;
}

type Complex = { re: number; im: number };

/** Raízes de zᵖ + a1·zᵖ⁻¹ + … + ap pelo método de Durand-Kerner. */
export function polynomialRoots(a: Float64Array, maxIterations = 200): Complex[] {
  const degree = a.length - 1;
  const re = new Float64Array(degree);
  const im = new Float64Array(degree);
  // Chutes iniciais espalhados num círculo (potências de 0,4 + 0,9i).
  let gRe = 1;
  let gIm = 0;
  for (let k = 0; k < degree; k++) {
    re[k] = gRe;
    im[k] = gIm;
    [gRe, gIm] = [gRe * 0.4 - gIm * 0.9, gRe * 0.9 + gIm * 0.4];
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let biggestStep = 0;
    for (let k = 0; k < degree; k++) {
      // P(z) pelo método de Horner.
      let pRe = 1;
      let pIm = 0;
      for (let j = 1; j <= degree; j++) {
        [pRe, pIm] = [pRe * re[k] - pIm * im[k] + a[j], pRe * im[k] + pIm * re[k]];
      }
      // Produto das distâncias às outras raízes.
      let dRe = 1;
      let dIm = 0;
      for (let j = 0; j < degree; j++) {
        if (j === k) continue;
        const xRe = re[k] - re[j];
        const xIm = im[k] - im[j];
        [dRe, dIm] = [dRe * xRe - dIm * xIm, dRe * xIm + dIm * xRe];
      }
      const denominator = dRe * dRe + dIm * dIm;
      if (denominator === 0) continue;
      const stepRe = (pRe * dRe + pIm * dIm) / denominator;
      const stepIm = (pIm * dRe - pRe * dIm) / denominator;
      re[k] -= stepRe;
      im[k] -= stepIm;
      biggestStep = Math.max(biggestStep, Math.hypot(stepRe, stepIm));
    }
    if (biggestStep < 1e-10) break;
  }
  return Array.from(re, (value, k) => ({ re: value, im: im[k] }));
}

/** Centroide do envelope |1/A(e^jω)|² entre 0 e 5 kHz. */
function envelopeCentroid(a: Float64Array): number {
  let weighted = 0;
  let total = 0;
  for (let p = 0; p < ENVELOPE_POINTS; p++) {
    const hz = (MAX_FORMANT_HZ * (p + 0.5)) / ENVELOPE_POINTS;
    const omega = (2 * Math.PI * hz) / LPC_SAMPLE_RATE;
    let sRe = 0;
    let sIm = 0;
    for (let j = 0; j < a.length; j++) {
      sRe += a[j] * Math.cos(omega * j);
      sIm -= a[j] * Math.sin(omega * j);
    }
    const power = 1 / (sRe * sRe + sIm * sIm);
    weighted += hz * power;
    total += power;
  }
  return weighted / total;
}
