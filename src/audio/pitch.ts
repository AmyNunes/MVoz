import { PitchDetector } from 'pitchy';

/**
 * Tom (F0) quadro a quadro com o pitchy (método McLeod) e os filtros da seção 7.2,
 * nesta ordem: silêncio → clareza → faixa de 60–500 Hz → mediana de 5 quadros.
 */

export type PitchFrame = {
  /** Segundos desde o início da captura (centro do quadro). */
  t: number;
  /** Tom em Hz, ou `null` quando não há voz. */
  hz: number | null;
  /** 0–1: quão periódico é o som. Voz limpa fica acima de 0,9; com barulho de fundo, perto de 0,8. */
  clarity: number;
  /** Volume (raiz da média dos quadrados), de 0 a 1. */
  rms: number;
};

export type PitchOptions = {
  /** Abaixo deste volume é silêncio (nem chama o detector). */
  silenceRms: number;
  /** Som de voz abaixo deste volume é fraco demais para medir: a tela pede para chegar mais perto. */
  minVoiceRms: number;
  minClarity: number;
  minHz: number;
  maxHz: number;
  /** Quadros na mediana contra saltos de oitava. */
  medianFrames: number;
};

export const DEFAULT_PITCH_OPTIONS: PitchOptions = {
  silenceRms: 0.003,
  minVoiceRms: 0.005,
  // A spec dizia 0,9, mas voz fraca com um pouco de barulho (canudo, sala comum) fica em ~0,83 e
  // era toda descartada. Com 0,8, ruído sozinho continua sem "voz" (testes em pitch.test.ts).
  minClarity: 0.8,
  minHz: 60,
  maxHz: 500,
  medianFrames: 5,
};

export function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return samples.length === 0 ? 0 : Math.sqrt(sum / samples.length);
}

export class PitchTracker {
  private readonly detector: PitchDetector<Float32Array>;
  private readonly options: PitchOptions;
  /** Tons brutos dos últimos quadros (`null` = sem voz). */
  private readonly recent: (number | null)[] = [];

  constructor(frameSize: number, options: Partial<PitchOptions> = {}) {
    this.detector = PitchDetector.forFloat32Array(frameSize);
    this.options = { ...DEFAULT_PITCH_OPTIONS, ...options };
  }

  analyze(frame: Float32Array, sampleRate: number, t: number): PitchFrame {
    const { silenceRms, minVoiceRms, minClarity, minHz, maxHz } = this.options;
    const level = rms(frame);
    let raw: number | null = null;
    let clarity = 0;

    if (level >= silenceRms) {
      const [hz, c] = this.detector.findPitch(frame, sampleRate);
      clarity = Number.isFinite(c) ? c : 0;
      if (level >= minVoiceRms && clarity >= minClarity && hz >= minHz && hz <= maxHz) raw = hz;
    }

    this.recent.push(raw);
    if (this.recent.length > this.options.medianFrames) this.recent.shift();
    return { t, hz: raw === null ? null : this.median(), clarity, rms: level };
  }

  /** Esquece o histórico (ao pausar ou reiniciar a escuta). */
  reset(): void {
    this.recent.length = 0;
  }

  /**
   * Mediana dos quadros com voz da janela. Com número par, fica com o menor do meio:
   * a média de 200 e 400 Hz daria 300 Hz, um tom que ninguém cantou.
   */
  private median(): number {
    const voiced = this.recent.filter((hz): hz is number => hz !== null).sort((a, b) => a - b);
    return voiced[Math.floor((voiced.length - 1) / 2)];
  }
}
