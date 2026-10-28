import { z } from 'zod';

import { centsBetween, hzToMidi, midiToHz } from '@/lib/notes';

import { formantSpacing, type Formants } from './formants';
import type { PitchFrame } from './pitch';

/** Medida de 20 ms; os formantes aparecem em algumas (VoiceFrame). */
export type MetricFrame = PitchFrame & { formants?: Formants | null };

/**
 * Métricas de um trecho (seção 7.4), calculadas a partir das medidas de 20 ms.
 * Guardadas (em JSON) com cada gravação e cada exercício.
 */
export const segmentMetricsSchema = z.object({
  durationSec: z.number(),
  /** Tempo de voz. */
  voicedSec: z.number(),
  voicedRatio: z.number(),
  /** Tom médio (mediana do F0 com voz). */
  medianHz: z.number().nullable(),
  /** Faixa usada: percentis 10 e 90. */
  p10Hz: z.number().nullable(),
  p90Hz: z.number().nullable(),
  rangeSt: z.number().nullable(),
  /** Variação (entonação): desvio-padrão em semitons. */
  variabilitySt: z.number().nullable(),
  /** Estabilidade (sons sustentados): desvio em cents em relação à média. */
  stabilityCents: z.number().nullable(),
  /** Fração dos quadros com voz dentro da faixa-alvo (se houver faixa). */
  inTargetRatio: z.number().nullable(),
  /** Fração dos quadros com voz abaixo do piso (se houver piso). */
  belowFloorRatio: z.number().nullable(),
  /** Final das frases: quantas sobem, descem ou ficam retas. */
  endings: z.object({ rising: z.number(), falling: z.number(), flat: z.number() }),
  /** Maior trecho de som contínuo pelo volume, com ou sem voz (/s/, /z/, "a"). */
  longestSoundSec: z.number(),
  /** Ressonância estimada (medianas). */
  resonance: z
    .object({ f1: z.number(), f2: z.number(), centroid: z.number(), spacing: z.number().nullable() })
    .nullable(),
});
export type SegmentMetrics = z.infer<typeof segmentMetricsSchema>;

export type MetricsOptions = {
  band?: { lowHz: number; highHz: number } | null;
  floorHz?: number | null;
  /** Intervalo entre medidas. */
  hopSec?: number;
  /** Volume mínimo para contar como som (inclui /s/, que não tem tom). */
  soundRms?: number;
};

const HOP_SEC = 0.02;
const SOUND_RMS = 0.006;
/** Pausas menores que isso não interrompem uma frase nem um som contínuo. */
const BRIDGE_SEC = 0.1;
/** Frases mais curtas que isso não entram na contagem de finais. */
const MIN_PHRASE_SEC = 0.4;
const ENDING_SEC = 0.3;
/** Variação mínima no fim da frase para contar como subida ou descida. */
const ENDING_ST = 1;

function percentile(sorted: number[], p: number): number {
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function standardDeviation(values: number[]): number {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
}

function median(values: number[]): number {
  return percentile([...values].sort((a, b) => a - b), 0.5);
}

/** Trechos contínuos onde `test` vale, juntando pausas curtas. */
function runs<T extends PitchFrame>(frames: readonly T[], test: (f: T) => boolean): T[][] {
  const out: T[][] = [];
  let current: T[] = [];
  let lastT = -Infinity;
  for (const f of frames) {
    if (!test(f)) continue;
    if (f.t - lastT > BRIDGE_SEC && current.length > 0) {
      out.push(current);
      current = [];
    }
    current.push(f);
    lastT = f.t;
  }
  if (current.length > 0) out.push(current);
  return out;
}

/** Inclinação (semitons por segundo) por mínimos quadrados. */
function slope(points: { t: number; st: number }[]): number {
  const n = points.length;
  const meanT = points.reduce((s, p) => s + p.t, 0) / n;
  const meanSt = points.reduce((s, p) => s + p.st, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - meanT) * (p.st - meanSt);
    den += (p.t - meanT) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

function phraseEndings(frames: readonly PitchFrame[], hop: number) {
  const endings = { rising: 0, falling: 0, flat: 0 };
  for (const phrase of runs(frames, (f) => f.hz !== null)) {
    const start = phrase[0].t;
    const end = phrase[phrase.length - 1].t;
    if (end - start + hop < MIN_PHRASE_SEC) continue;
    const tail = phrase
      .filter((f) => end - f.t <= ENDING_SEC)
      .map((f) => ({ t: f.t, st: hzToMidi(f.hz as number) }));
    const change = slope(tail) * ENDING_SEC;
    if (change > ENDING_ST) endings.rising++;
    else if (change < -ENDING_ST) endings.falling++;
    else endings.flat++;
  }
  return endings;
}

function resonanceOf(frames: readonly MetricFrame[]): SegmentMetrics['resonance'] {
  const formants = frames.flatMap((f) => (f.formants ? [f.formants] : []));
  if (formants.length === 0) return null;
  const spacings = formants.flatMap((f) => {
    const s = formantSpacing(f);
    return s === null ? [] : [s];
  });
  return {
    f1: median(formants.map((f) => f.f1)),
    f2: median(formants.map((f) => f.f2)),
    centroid: median(formants.map((f) => f.centroid)),
    spacing: spacings.length > 0 ? median(spacings) : null,
  };
}

export function computeMetrics(frames: readonly MetricFrame[], options: MetricsOptions = {}): SegmentMetrics {
  const hop = options.hopSec ?? HOP_SEC;
  const soundRms = options.soundRms ?? SOUND_RMS;
  const voiced = frames.flatMap((f) => (f.hz === null ? [] : [f.hz]));
  const sorted = [...voiced].sort((a, b) => a - b);
  const has = sorted.length > 0;
  const semitones = voiced.map(hzToMidi);
  const meanHz = has ? midiToHz(semitones.reduce((s, v) => s + v, 0) / semitones.length) : null;

  const p10 = has ? percentile(sorted, 0.1) : null;
  const p90 = has ? percentile(sorted, 0.9) : null;
  const { band, floorHz } = options;
  const longestSound = runs(frames, (f) => f.rms >= soundRms).reduce(
    (best, run) => Math.max(best, run[run.length - 1].t - run[0].t + hop),
    0,
  );

  return {
    durationSec: frames.length * hop,
    voicedSec: voiced.length * hop,
    voicedRatio: frames.length > 0 ? voiced.length / frames.length : 0,
    medianHz: has ? percentile(sorted, 0.5) : null,
    p10Hz: p10,
    p90Hz: p90,
    rangeSt: p10 !== null && p90 !== null ? hzToMidi(p90) - hzToMidi(p10) : null,
    variabilitySt: has ? standardDeviation(semitones) : null,
    stabilityCents: meanHz !== null ? standardDeviation(voiced.map((hz) => centsBetween(meanHz, hz))) : null,
    inTargetRatio:
      band && has ? voiced.filter((hz) => hz >= band.lowHz && hz <= band.highHz).length / voiced.length : null,
    belowFloorRatio: floorHz && has ? voiced.filter((hz) => hz < floorHz).length / voiced.length : null,
    endings: phraseEndings(frames, hop),
    longestSoundSec: longestSound,
    resonance: resonanceOf(frames),
  };
}
