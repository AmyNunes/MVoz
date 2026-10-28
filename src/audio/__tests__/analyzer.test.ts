import { VoiceAnalyzer } from '../analyzer';
import { sine } from './synth';

describe('VoiceAnalyzer', () => {
  it('blocos de 100 ms viram medidas de tom a cada 20 ms', () => {
    const analyzer = new VoiceAnalyzer();
    const signal = sine(220, 1);
    const frames = [];
    for (let i = 0; i < signal.length; i += 1600) frames.push(...analyzer.push(signal.subarray(i, i + 1600)));

    expect(frames.length).toBeGreaterThanOrEqual(46);
    expect(frames[1].t - frames[0].t).toBeCloseTo(0.02, 6);
    frames.forEach((f) => expect(f.hz).toBeCloseTo(220, 0));
  });

  it('reset recomeça o tempo do zero', () => {
    const analyzer = new VoiceAnalyzer();
    analyzer.push(sine(220, 0.5));
    analyzer.reset();

    const [first] = analyzer.push(sine(220, 0.1));
    expect(first.t).toBeCloseTo(0.032, 6);
  });
});
