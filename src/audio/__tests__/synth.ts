/**
 * Sinais sintéticos para os testes do motor de áudio: senoides, ruído e vogais com
 * formantes conhecidos (fonte com harmônicos passando por ressoadores de Klatt).
 */

export const SAMPLE_RATE = 16_000;

export function sine(hz: number, seconds: number, sampleRate = SAMPLE_RATE, amplitude = 0.5): Float32Array {
  const out = new Float32Array(Math.round(seconds * sampleRate));
  const w = (2 * Math.PI * hz) / sampleRate;
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin(w * i);
  return out;
}

export function silence(seconds: number, sampleRate = SAMPLE_RATE): Float32Array {
  return new Float32Array(Math.round(seconds * sampleRate));
}

/** Ruído branco reprodutível: a mesma semente gera sempre o mesmo sinal. */
export function noise(seconds: number, amplitude = 0.3, sampleRate = SAMPLE_RATE, seed = 1): Float32Array {
  const out = new Float32Array(Math.round(seconds * sampleRate));
  let state = seed >>> 0;
  for (let i = 0; i < out.length; i++) {
    // mulberry32
    state = (state + 0x6d2b79f5) >>> 0;
    let r = Math.imul(state ^ (state >>> 15), 1 | state);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    out[i] = amplitude * (((r ^ (r >>> 14)) >>> 0) / 2 ** 31 - 1);
  }
  return out;
}

export function concat(...parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export type Formant = { hz: number; bandwidth: number };

/** F1–F3 de Peterson & Barney (1952), com larguras de banda típicas. */
export const VOWELS = {
  aMale: [
    { hz: 730, bandwidth: 90 },
    { hz: 1090, bandwidth: 110 },
    { hz: 2440, bandwidth: 170 },
  ],
  iMale: [
    { hz: 270, bandwidth: 60 },
    { hz: 2290, bandwidth: 100 },
    { hz: 3010, bandwidth: 170 },
  ],
  uMale: [
    { hz: 300, bandwidth: 60 },
    { hz: 870, bandwidth: 80 },
    { hz: 2240, bandwidth: 170 },
  ],
  aFemale: [
    { hz: 850, bandwidth: 90 },
    { hz: 1220, bandwidth: 110 },
    { hz: 2810, bandwidth: 170 },
  ],
  iFemale: [
    { hz: 310, bandwidth: 60 },
    { hz: 2790, bandwidth: 100 },
    { hz: 3310, bandwidth: 170 },
  ],
} satisfies Record<string, Formant[]>;

/** Vogal sustentada: harmônicos de `f0` (caindo 6 dB por oitava) filtrados pelos formantes. */
export function vowel(
  f0: number,
  formants: readonly Formant[],
  seconds: number,
  sampleRate = SAMPLE_RATE,
  amplitude = 0.5,
): Float32Array {
  let signal: Float32Array = new Float32Array(Math.round(seconds * sampleRate));
  for (let k = 1; k * f0 < sampleRate / 2; k++) {
    const w = (2 * Math.PI * k * f0) / sampleRate;
    for (let i = 0; i < signal.length; i++) signal[i] += Math.sin(w * i) / k;
  }
  for (const formant of formants) signal = resonate(signal, formant, sampleRate);

  let peak = 0;
  for (const v of signal) peak = Math.max(peak, Math.abs(v));
  return signal.map((v) => (v / peak) * amplitude);
}

/** Ressoador de 2 polos de Klatt (1980). */
function resonate(x: Float32Array, { hz, bandwidth }: Formant, sampleRate: number): Float32Array {
  const c = -Math.exp((-2 * Math.PI * bandwidth) / sampleRate);
  const b = 2 * Math.exp((-Math.PI * bandwidth) / sampleRate) * Math.cos((2 * Math.PI * hz) / sampleRate);
  const a = 1 - b - c;
  const y = new Float32Array(x.length);
  for (let n = 0; n < x.length; n++) {
    y[n] = a * x[n] + b * (n > 0 ? y[n - 1] : 0) + c * (n > 1 ? y[n - 2] : 0);
  }
  return y;
}
