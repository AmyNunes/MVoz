import { z } from 'zod';

import type { PitchFrame } from './pitch';

/**
 * Traçado do tom reduzido a 10 pontos por segundo (seção 7.5), guardado com cada gravação
 * para desenhar o gráfico sem reanalisar o áudio. 0 = sem voz naquele trecho.
 */
export const pitchTrackSchema = z.object({
  v: z.literal(1),
  /** Pontos por segundo. */
  rate: z.number().positive(),
  hz: z.array(z.number().nonnegative()),
});
export type PitchTrack = z.infer<typeof pitchTrackSchema>;

export const TRACK_RATE = 10;

/** Mediana dos quadros com voz de cada 100 ms; trechos com menos da metade de voz viram 0. */
export function reducePitchTrack(frames: readonly PitchFrame[], rate = TRACK_RATE): PitchTrack {
  const bins: PitchFrame[][] = [];
  for (const f of frames) {
    const index = Math.floor(f.t * rate);
    (bins[index] ??= []).push(f);
  }
  const hz = Array.from(bins, (bin) => {
    const voiced = (bin ?? []).flatMap((f) => (f.hz === null ? [] : [f.hz])).sort((a, b) => a - b);
    if (voiced.length === 0 || voiced.length * 2 < (bin?.length ?? 0)) return 0;
    return Math.round(voiced[Math.floor((voiced.length - 1) / 2)] * 10) / 10;
  });
  return { v: 1, rate, hz };
}

/** Pontos `{ t, hz }` do traçado (`hz` nulo onde não havia voz). */
export function trackPoints(track: PitchTrack): { t: number; hz: number | null }[] {
  return track.hz.map((hz, i) => ({ t: (i + 0.5) / track.rate, hz: hz > 0 ? hz : null }));
}
