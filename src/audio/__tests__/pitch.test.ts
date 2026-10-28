import { FRAME_SIZE, FrameBuffer } from '../frames';
import { PitchTracker, type PitchFrame } from '../pitch';
import { concat, noise, SAMPLE_RATE, silence, sine, VOWELS, vowel } from './synth';

function track(signal: Float32Array): PitchFrame[] {
  const frames = new FrameBuffer();
  const tracker = new PitchTracker(FRAME_SIZE);
  const out: PitchFrame[] = [];
  frames.push(signal, (frame, t) => out.push(tracker.analyze(frame, SAMPLE_RATE, t)));
  return out;
}

function voicedHz(frames: PitchFrame[]): number[] {
  return frames.flatMap((f) => (f.hz === null ? [] : [f.hz]));
}

/** Pior erro relativo entre os quadros com voz. */
function worstError(frames: PitchFrame[], expectedHz: number): number {
  return Math.max(...voicedHz(frames).map((hz) => Math.abs(hz - expectedHz) / expectedHz));
}

describe('tom em senoides', () => {
  it.each([65, 82, 110, 147, 196, 262, 330, 440, 494])('%i Hz com erro menor que 1%%', (hz) => {
    const frames = track(sine(hz, 0.5));
    expect(voicedHz(frames)).toHaveLength(frames.length);
    expect(worstError(frames, hz)).toBeLessThan(0.01);
  });
});

describe('tom em vogais sintéticas', () => {
  it.each([
    ['"a" grave', 120, VOWELS.aMale],
    ['"i" grave', 110, VOWELS.iMale],
    ['"a" agudo', 210, VOWELS.aFemale],
    ['"i" agudo', 230, VOWELS.iFemale],
  ] as const)('%s (%i Hz) com erro menor que 1%%', (_, hz, formants) => {
    const frames = track(vowel(hz, formants, 0.5));
    expect(voicedHz(frames).length).toBeGreaterThan(frames.length * 0.9);
    expect(worstError(frames, hz)).toBeLessThan(0.01);
  });
});

describe('filtros', () => {
  it('silêncio não tem voz', () => {
    const frames = track(silence(0.5));
    expect(voicedHz(frames)).toHaveLength(0);
    expect(frames.every((f) => f.rms === 0)).toBe(true);
  });

  it('voz fraca demais não é medida, mas a clareza avisa que há voz', () => {
    const frames = track(sine(200, 0.5, SAMPLE_RATE, 0.006));
    expect(voicedHz(frames)).toHaveLength(0);
    expect(frames.every((f) => f.clarity > 0.9)).toBe(true);
  });

  it('abaixo do limiar de silêncio nem chama o detector', () => {
    const frames = track(sine(200, 0.5, SAMPLE_RATE, 0.002));
    expect(frames.every((f) => f.hz === null && f.clarity === 0)).toBe(true);
  });

  it('ruído não tem voz (clareza baixa), fraco ou forte', () => {
    for (const amplitude of [0.01, 0.03, 0.1, 0.3]) expect(voicedHz(track(noise(1, amplitude)))).toHaveLength(0);
  });

  it('voz fraca com barulho de fundo (ex.: canudo numa sala comum) é medida, sem errar o tom', () => {
    const signal = vowel(150, VOWELS.uMale, 1, SAMPLE_RATE, 0.03);
    const background = noise(1, 0.01);
    for (let i = 0; i < signal.length; i++) signal[i] += background[i];
    const frames = track(signal);
    expect(voicedHz(frames).length / frames.length).toBeGreaterThan(0.8);
    expect(worstError(frames, 150)).toBeLessThan(0.03);
  });

  it('fora de 60–500 Hz não conta como voz', () => {
    expect(voicedHz(track(sine(40, 0.5)))).toHaveLength(0);
    expect(voicedHz(track(sine(700, 0.5)))).toHaveLength(0);
  });

  it('a voz volta depois de uma pausa', () => {
    const frames = track(concat(sine(200, 0.4), silence(0.3), sine(300, 0.4)));
    const last = frames[frames.length - 1];
    expect(last.hz).toBeCloseTo(300, 0);
  });
});

describe('mediana contra saltos de oitava', () => {
  const at200 = sine(200, FRAME_SIZE / SAMPLE_RATE);
  const at400 = sine(400, FRAME_SIZE / SAMPLE_RATE);

  function analyzeSequence(sequence: Float32Array[]): number[] {
    const tracker = new PitchTracker(FRAME_SIZE);
    return sequence.map((frame, i) => tracker.analyze(frame, SAMPLE_RATE, i * 0.02).hz ?? 0);
  }

  it('um quadro isolado uma oitava acima é ignorado', () => {
    const hz = analyzeSequence([at200, at200, at200, at400, at200, at200]);
    hz.forEach((value) => expect(value).toBeCloseTo(200, 0));
  });

  it('dois quadros seguidos uma oitava acima também', () => {
    const hz = analyzeSequence([at200, at200, at200, at400, at400, at200]);
    hz.forEach((value) => expect(value).toBeCloseTo(200, 0));
  });

  it('uma mudança de verdade aparece em até 3 quadros (60 ms)', () => {
    const hz = analyzeSequence([at200, at200, at200, at400, at400, at400]);
    expect(hz[5]).toBeCloseTo(400, 0);
  });
});
