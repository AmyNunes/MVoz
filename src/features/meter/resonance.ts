import type { VoiceFrame } from '@/audio/analyzer';
import { formantSpacing } from '@/audio/formants';

/** Ressonância estimada do último segundo (mediana de ~10 medidas). */
export type ResonanceReading = {
  /** Espaçamento médio dos formantes (ΔF), em Hz: maior = mais "clara". */
  spacing: number;
  f1: number;
  f2: number;
  centroid: number;
  /** Tom mediano ≥ 250 Hz: o LPC erra mais (seção 7.3). */
  highPitch: boolean;
};

const WINDOW_SEC = 1;
const MIN_READINGS = 3;
const HIGH_PITCH_HZ = 250;
/** Extremos da barra "mais escura ↔ mais clara" (ΔF de vogais masculinas a femininas, com folga). */
const DARK_SPACING = 800;
const BRIGHT_SPACING = 1400;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function summarizeResonance(frames: readonly VoiceFrame[]): ResonanceReading | null {
  const last = frames[frames.length - 1];
  if (!last) return null;
  const recent = frames.filter((f) => last.t - f.t <= WINDOW_SEC);
  const readings = recent.flatMap((f) => {
    const spacing = f.formants ? formantSpacing(f.formants) : null;
    return f.formants && spacing !== null ? [{ ...f.formants, spacing }] : [];
  });
  if (readings.length < MIN_READINGS) return null;

  const voiced = recent.flatMap((f) => (f.hz === null ? [] : [f.hz]));
  return {
    spacing: median(readings.map((r) => r.spacing)),
    f1: median(readings.map((r) => r.f1)),
    f2: median(readings.map((r) => r.f2)),
    centroid: median(readings.map((r) => r.centroid)),
    highPitch: voiced.length > 0 && median(voiced) >= HIGH_PITCH_HZ,
  };
}

/** Posição na barra, de 0 (mais escura) a 1 (mais clara). */
export function gaugePosition(spacing: number): number {
  return Math.min(1, Math.max(0, (spacing - DARK_SPACING) / (BRIGHT_SPACING - DARK_SPACING)));
}

/** Evita renderizar de novo por diferenças que não mudam a barra (menos de 5 Hz). */
export function sameResonance(a: ResonanceReading | null, b: ResonanceReading | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a.spacing - b.spacing) < 5 && a.highPitch === b.highPitch;
}
