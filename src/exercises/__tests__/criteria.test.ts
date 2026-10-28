import type { VoiceFrame } from '@/audio/analyzer';

import {
  contourDetector,
  contourError,
  durationDetector,
  glideDetector,
  manualDetector,
  resonanceDetector,
  soundHoldDetector,
  speechDetector,
  voiceTimeDetector,
  sustainDetector,
} from '../criteria';

/** Quadros de 20 ms entre `from` e `to` segundos. */
function frames(from: number, to: number, make: (t: number) => Partial<VoiceFrame>): VoiceFrame[] {
  const out: VoiceFrame[] = [];
  for (let i = Math.round(from / 0.02); i * 0.02 < to - 1e-9; i++) {
    const t = Number((i * 0.02).toFixed(2));
    out.push({ t, hz: null, clarity: 0.2, rms: 0.001, formants: null, ...make(t) });
  }
  return out;
}

const voice = (hz: number) => () => ({ hz, clarity: 0.95, rms: 0.05 });
const silent = () => ({});

describe('sustentar', () => {
  const band = { lowHz: 165, highHz: 200 };

  it('3 s seguidos na faixa contam uma repetição; segurar mais não conta de novo', () => {
    const d = sustainDetector(3, { band, noteHz: null });
    expect(d.push(frames(0, 2, voice(180))).reps).toBe(0);
    const s = d.push(frames(2, 8, voice(180)));
    expect(s.reps).toBe(1);
    expect(s.progress).toBe(1);
  });

  it('sair do alvo zera a contagem; voltar e segurar conta outra', () => {
    const d = sustainDetector(3, { band, noteHz: null });
    d.push(frames(0, 3.5, voice(180)));
    d.push(frames(3.5, 4.5, voice(140)));
    const s = d.push(frames(4.5, 8, voice(185)));
    expect(s.reps).toBe(2);
  });

  it('uma pausa curta não quebra; silêncio quebra', () => {
    const d = sustainDetector(3, { band, noteHz: null });
    d.push(frames(0, 1.5, voice(180)));
    d.push(frames(1.5, 1.6, silent));
    expect(d.push(frames(1.6, 3.1, voice(180))).reps).toBe(1);
  });

  it('nota: ±50 cents', () => {
    const d = sustainDetector(1, { band: null, noteHz: 200 });
    expect(d.push(frames(0, 1.5, voice(203))).reps).toBe(1);
    const far = sustainDetector(1, { band: null, noteHz: 200 });
    expect(far.push(frames(0, 1.5, voice(212))).reps).toBe(0);
  });
});

describe('ressonância', () => {
  const withSpacing = (f3: number) => (t: number) => ({
    ...voice(150)(),
    formants: Math.round(t * 50) % 5 === 0 ? { f1: 500, f2: 1500, f3, centroid: 1500 } : null,
  });

  it('o começo vira a referência; ficar mais clara por 3 s conta', () => {
    const d = resonanceDetector(3, 'brighter');
    const calibrating = d.push(frames(0, 1.2, withSpacing(2500)));
    expect(calibrating.reference).not.toBeNull();
    const s = d.push(frames(1.2, 5, withSpacing(2700)));
    expect(s.reps).toBe(1);
    expect(s.bestChangePct).toBeGreaterThan(2);
  });

  it('na direção contrária não conta', () => {
    const d = resonanceDetector(3, 'darker');
    d.push(frames(0, 1.2, withSpacing(2500)));
    expect(d.push(frames(1.2, 5, withSpacing(2700))).reps).toBe(0);
  });
});

describe('deslize', () => {
  it('conta deslizes com extensão suficiente, separados por silêncio', () => {
    const d = glideDetector(8);
    const up = (from: number) => (t: number) => voice(130 * 2 ** (((t - from) * 12) / 12))();
    d.push(frames(0, 1, up(0))); // 12 semitons
    d.push(frames(1, 1.6, silent));
    d.push(frames(1.6, 2.1, up(1.6))); // ~6 semitons
    const s = d.push(frames(2.1, 2.8, silent));
    expect(s.values).toHaveLength(2);
    expect(s.values[0]).toBeGreaterThan(10);
    expect(s.reps).toBe(1);
  });

  it('conta na hora em que alcança a extensão, sem esperar o som parar; subir e descer no mesmo fôlego vale uma', () => {
    const d = glideDetector(5);
    // Sobe 12 semitons em 1 s e desce de volta, sem pausa.
    const siren = (t: number) => voice(130 * 2 ** ((t <= 1 ? t : 2 - t) * 1))();
    expect(d.push(frames(0, 0.6, siren)).reps).toBe(1);
    expect(d.push(frames(0.6, 2, siren)).reps).toBe(1);
    const s = d.push(frames(2, 2.6, silent));
    expect(s.reps).toBe(1);
    expect(s.values).toHaveLength(1);
  });
});

describe('som com voz por N segundos', () => {
  it('"uuu" de 5 s: conta ao chegar (com 90% de folga); só conta de novo depois de uma pausa', () => {
    const d = soundHoldDetector(5);
    expect(d.push(frames(0, 4, voice(200))).reps).toBe(0);
    expect(d.push(frames(4, 5.1, voice(200))).reps).toBe(1);
    expect(d.push(frames(5.1, 8, voice(200))).reps).toBe(1);
    d.push(frames(8, 9, silent));
    d.push(frames(9, 14.2, voice(200)));
    const s = d.push(frames(14.2, 15, silent));
    expect(s.reps).toBe(2);
    expect(s.values).toHaveLength(2);
  });

  it('respiração e barulho entre os "uuu" (sem tom, mas com volume) separam as repetições', () => {
    const d = soundHoldDetector(5);
    const breath = () => ({ hz: null, clarity: 0.2, rms: 0.05 });
    let s = d.push(frames(0, 5.2, voice(200)));
    for (const start of [5.2, 11.4]) {
      d.push(frames(start, start + 1, breath));
      s = d.push(frames(start + 1, start + 6.2, voice(200)));
    }
    expect(s.reps).toBe(3);
  });

  it('4,6 s valem um de 5 s; 3 s não', () => {
    const almost = soundHoldDetector(5);
    expect(almost.push(frames(0, 4.6, voice(200))).reps).toBe(1);
    const short = soundHoldDetector(5);
    short.push(frames(0, 3, voice(200)));
    expect(short.push(frames(3, 4, silent)).reps).toBe(0);
  });

  it('falha curta do tom no meio (até 0,5 s) não quebra o "uuu"', () => {
    const d = soundHoldDetector(5);
    d.push(frames(0, 2.5, voice(200)));
    d.push(frames(2.5, 2.8, silent));
    expect(d.push(frames(2.8, 5.2, voice(200))).reps).toBe(1);
  });
});

describe('tempo com voz no passo', () => {
  it('cantarolar 20 s: soma a voz, as pausas não zeram nem contam', () => {
    const d = voiceTimeDetector(20);
    d.push(frames(0, 8, voice(200)));
    d.push(frames(8, 10, silent));
    let s = d.push(frames(10, 18, voice(220)));
    expect(s.reps).toBe(0);
    expect(s.currentSec).toBeCloseTo(16, 0);
    s = d.push(frames(18, 21, voice(200)));
    expect(s.reps).toBe(1);
    expect(s.progress).toBe(1);
  });
});

describe('duração de som', () => {
  it('a respiração entre um /s/ e outro (volume fraco) separa as tentativas', () => {
    const d = durationDetector();
    const hiss = () => ({ hz: null, clarity: 0.2, rms: 0.08 });
    const breath = () => ({ hz: null, clarity: 0.2, rms: 0.012 });
    d.push(frames(0, 6, hiss));
    d.push(frames(6, 7.5, breath));
    d.push(frames(7.5, 13, hiss));
    const s = d.push(frames(13, 14, silent));
    expect(s.reps).toBe(2);
    expect(s.values[0]).toBeGreaterThan(5.5);
  });

  it('mede cada som contínuo (com ou sem tom) e guarda as tentativas', () => {
    const d = durationDetector();
    d.push(frames(0, 5, () => ({ rms: 0.02 })));
    expect(d.state().currentSec).toBeGreaterThan(4.9);
    const s = d.push(frames(5, 6, silent));
    expect(s.reps).toBe(1);
    expect(s.values[0]).toBeCloseTo(4.98, 1);
  });
});

describe('curva', () => {
  const target = [
    { t: 0, hz: 180 },
    { t: 1, hz: 180 },
    { t: 1.5, hz: 240 },
  ];

  it('erro zero na própria curva; em semitons quando desloca', () => {
    expect(contourError(target, target)).toBeCloseTo(0);
    const higher = target.map((p) => ({ ...p, hz: p.hz * 2 ** (2 / 12) }));
    expect(contourError(higher, target)).toBeCloseTo(2);
  });

  it('falar mais devagar não aumenta o erro (o tempo é ajustado)', () => {
    const slow = target.map((p) => ({ ...p, t: p.t * 2 }));
    const d = contourDetector(target, 2);
    d.push(frames(0, 3, (t) => voice(t < 2 ? 180 : 180 + (t - 2) * 60)()));
    const s = d.push(frames(3, 3.6, silent));
    expect(s.reps).toBe(1);
    expect(s.values[0]).toBeLessThan(1);
    expect(contourError(slow.map((p) => ({ ...p, t: p.t / 2 })), target)).toBeCloseTo(0);
  });
});

describe('fala', () => {
  it('acompanha a fração do tempo de voz na faixa, ignorando o silêncio', () => {
    const d = speechDetector({ lowHz: 165, highHz: 200 });
    d.push(frames(0, 1, voice(180)));
    d.push(frames(1, 2, silent));
    const s = d.push(frames(2, 3, voice(140)));
    expect(s.progress).toBeCloseTo(0.5);
    expect(s.reps).toBe(0);
  });
});

describe('sem critério automático', () => {
  it('só o "Fiz" conta', () => {
    const d = manualDetector();
    expect(d.push(frames(0, 2, voice(180))).reps).toBe(0);
    expect(d.addManualRep().reps).toBe(1);
  });
});
