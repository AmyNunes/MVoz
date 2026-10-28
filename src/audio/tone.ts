import { hzToMidi, midiToHz } from '@/lib/notes';

/**
 * Tom de referência gerado pelo app (seção 7.6), sem IA: onda com envelope suave e harmônicos
 * leves, para soar menos como apito.
 */
export type TonePoint = { t: number; hz: number };
export type ToneSpec =
  | { kind: 'note'; hz: number; seconds: number }
  | { kind: 'glide'; fromHz: number; toHz: number; seconds: number }
  /** Sequência de pontos (exercícios de entonação e simulação da IA). */
  | { kind: 'contour'; points: readonly TonePoint[] };

export const TONE_SAMPLE_RATE = 22_050;
const PEAK = 0.5;
/** Timbre (Configurações › Treino): suave = harmônicos fracos; claro = mais harmônicos. */
export type Timbre = 'soft' | 'bright';
const HARMONICS: Record<Timbre, number[]> = {
  soft: [1, 0.3, 0.12],
  bright: [1, 0.55, 0.35, 0.2, 0.1],
};
const FADE_SEC = 0.04;

/** Tom (em Hz) no instante `t`. Entre pontos, anda em semitons (como o ouvido percebe). */
export function toneHzAt(spec: ToneSpec, t: number): number {
  if (spec.kind === 'note') return spec.hz;
  if (spec.kind === 'glide') {
    const progress = Math.min(1, Math.max(0, t / spec.seconds));
    return midiToHz(hzToMidi(spec.fromHz) + (hzToMidi(spec.toHz) - hzToMidi(spec.fromHz)) * progress);
  }
  const { points } = spec;
  if (t <= points[0].t) return points[0].hz;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (t <= b.t) {
      const progress = (t - a.t) / (b.t - a.t || 1);
      return midiToHz(hzToMidi(a.hz) + (hzToMidi(b.hz) - hzToMidi(a.hz)) * progress);
    }
  }
  return points[points.length - 1].hz;
}

export function toneDuration(spec: ToneSpec): number {
  return spec.kind === 'contour' ? spec.points[spec.points.length - 1].t : spec.seconds;
}

export function synthesizeTone(spec: ToneSpec, sampleRate = TONE_SAMPLE_RATE, timbre: Timbre = 'soft'): Float32Array {
  const harmonics = HARMONICS[timbre];
  const seconds = toneDuration(spec);
  const out = new Float32Array(Math.round(seconds * sampleRate));
  const norm = harmonics.reduce((sum, h) => sum + h, 0);
  const fade = Math.min(FADE_SEC, seconds / 4);
  let phase = 0;

  for (let i = 0; i < out.length; i++) {
    const t = i / sampleRate;
    // Fase acumulada: o tom pode mudar sem "estalos".
    phase += (2 * Math.PI * toneHzAt(spec, t)) / sampleRate;
    let value = 0;
    for (let h = 0; h < harmonics.length; h++) value += harmonics[h] * Math.sin((h + 1) * phase);
    // Envelope seno no começo e no fim.
    const edge = Math.min(t, seconds - t);
    const envelope = edge >= fade ? 1 : Math.sin((Math.PI / 2) * (edge / fade));
    out[i] = (PEAK * envelope * value) / norm;
  }
  return out;
}
