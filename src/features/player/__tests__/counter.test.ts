import { strings } from '@/i18n/strings';

import { counterView } from '../counter';

const p = strings.player;
const noSteps = { enabled: false, target: null, count: 0, allDone: false, current: 0 };
const uuu = { step: 1, count: 'sound' as const, seconds: 5, reps: 3, unit: '"uuu" de 5 s' };

describe('counterView', () => {
  it('um contador só: mostra as feitas', () => {
    expect(counterView({ steps: noSteps, reps: 0, repsTarget: 5, elapsedSec: 10, durationSec: 150 })).toEqual({
      label: p.repOf(0, 5),
      progress: 0,
      done: false,
      holding: null,
    });
    expect(counterView({ steps: noSteps, reps: 5, repsTarget: 5, elapsedSec: 10, durationSec: 150 }).done).toBe(true);
  });

  it('por passo: a contagem é do passo atual; passo de preparação diz o que fazer', () => {
    const view = counterView({ steps: { enabled: true, target: uuu, count: 1, allDone: false, current: 0 }, reps: 4, repsTarget: 5, elapsedSec: 30, durationSec: 150 });
    expect(view).toEqual({ label: p.stepCount(1, 3, '"uuu" de 5 s'), progress: 1 / 3, done: false, holding: null });
    const free = counterView({ steps: { enabled: true, target: null, count: 0, allDone: false, current: 0 }, reps: 0, repsTarget: 5, elapsedSec: 75, durationSec: 150 });
    expect(free).toEqual({ label: p.prepStep, progress: 0.5, done: false, holding: null });
    const last = counterView({ steps: { enabled: true, target: null, count: 0, allDone: false, current: 0 }, reps: 0, repsTarget: 5, elapsedSec: 75, durationSec: 150, lastStep: true });
    expect(last.label).toBe(p.prepLast);
  });

  it('por passo: só termina quando todos os passos com contagem foram feitos', () => {
    expect(counterView({ steps: { enabled: true, target: uuu, count: 3, allDone: true, current: 0 }, reps: 0, repsTarget: 5, elapsedSec: 30, durationSec: 150 }).done).toBe(true);
  });

  it('segurando um "uuu": mostra o tempo e o anel vai enchendo', () => {
    const view = counterView({ steps: { enabled: true, target: uuu, count: 1, allDone: false, current: 2.5 }, reps: 0, repsTarget: null, elapsedSec: 30, durationSec: 150 });
    expect(view.holding).toBe(p.holding('2,5', 5));
    expect(view.progress).toBeCloseTo(1.5 / 3);
  });

  it('deslizando: mostra os semitons do deslize atual', () => {
    const glide = { step: 2, count: 'glide' as const, minRangeSt: 5, reps: 5, unit: 'deslizes' };
    const view = counterView({ steps: { enabled: true, target: glide, count: 0, allDone: false, current: 3.2 }, reps: 0, repsTarget: null, elapsedSec: 30, durationSec: 150 });
    expect(view.holding).toBe(p.glidingNow('3,2', 5));
  });

  it('tempo com voz: "12 de 20 s cantarolando", e o total quando termina', () => {
    const hum = { step: 3, count: 'voice' as const, seconds: 20, reps: 1, unit: 'cantarolando' };
    const going = counterView({ steps: { enabled: true, target: hum, count: 0, allDone: false, current: 12.6 }, reps: 0, repsTarget: null, elapsedSec: 60, durationSec: 150 });
    expect(going.label).toBe(p.voiceTime(12, 20, 'cantarolando'));
    expect(going.progress).toBeCloseTo(0.63);
    const finished = counterView({ steps: { enabled: true, target: hum, count: 1, allDone: false, current: 0 }, reps: 0, repsTarget: null, elapsedSec: 60, durationSec: 150 });
    expect(finished.label).toBe(p.voiceTime(20, 20, 'cantarolando'));
    expect(finished.progress).toBe(1);
  });
});
