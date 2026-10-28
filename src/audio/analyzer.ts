import { estimateFormants, type Formants } from './formants';
import { ANALYSIS_SAMPLE_RATE, FRAME_SIZE, FrameBuffer } from './frames';
import { PitchTracker, type PitchFrame, type PitchOptions } from './pitch';

/** Uma medida a cada 20 ms: tom e, de vez em quando, formantes. */
export type VoiceFrame = PitchFrame & { formants: Formants | null };

/** Formantes a ~10 por segundo (seção 7.8): 1 em cada 5 quadros com voz. */
const FORMANTS_EVERY = 5;

/** Dos blocos do microfone (16 kHz) às medidas de voz. */
export class VoiceAnalyzer {
  private readonly frames = new FrameBuffer();
  private readonly pitch: PitchTracker;
  private voiced = 0;

  constructor(options: Partial<PitchOptions> = {}) {
    this.pitch = new PitchTracker(FRAME_SIZE, options);
  }

  push(samples: Float32Array): VoiceFrame[] {
    const out: VoiceFrame[] = [];
    this.frames.push(samples, (frame, t) => {
      const pitch = this.pitch.analyze(frame, ANALYSIS_SAMPLE_RATE, t);
      const formants =
        pitch.hz !== null && this.voiced++ % FORMANTS_EVERY === 0
          ? estimateFormants(frame, ANALYSIS_SAMPLE_RATE)
          : null;
      out.push({ ...pitch, formants });
    });
    return out;
  }

  reset(): void {
    this.frames.reset();
    this.pitch.reset();
    this.voiced = 0;
  }
}
