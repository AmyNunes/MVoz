import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';

import { simulatePrompt } from '../prompts/simulate';
import { simulationSchema } from '../schemas/simulate';
import { validateContour } from '../validate';

const band = { lowHz: 165, highHz: 200 };

describe('validação da curva da IA', () => {
  it('curva boa: começa em 0', () => {
    const points = validateContour(
      [
        { t: 1, hz: 170 },
        { t: 2, hz: 190 },
      ],
      band,
    );
    expect(points).toEqual([
      { t: 0, hz: 170 },
      { t: 1, hz: 190 },
    ]);
  });

  it.each([
    ['fora de 60–600 Hz', [{ t: 0, hz: 50 }, { t: 1, hz: 180 }]],
    ['tempos que não crescem', [{ t: 0, hz: 180 }, { t: 0, hz: 190 }]],
    ['longe da faixa (mais de 5 semitons)', [{ t: 0, hz: 180 }, { t: 1, hz: 300 }]],
    ['um ponto só', [{ t: 0, hz: 180 }]],
    ['número inválido', [{ t: 0, hz: Number.NaN }, { t: 1, hz: 180 }]],
  ])('recusa: %s', (_, points) => {
    expect(validateContour(points, band)).toBeNull();
  });

  it('mais de 60 pontos é recusado', () => {
    const many = Array.from({ length: 61 }, (_, i) => ({ t: i * 0.1, hz: 180 }));
    expect(validateContour(many, band)).toBeNull();
  });

  it('com a gravação inicial: dentro da extensão medida + 2 semitons', () => {
    const extension = { lowHz: 100, highHz: 200 };
    expect(validateContour([{ t: 0, hz: 110 }, { t: 1, hz: 220 }], band, extension)).not.toBeNull();
    expect(validateContour([{ t: 0, hz: 110 }, { t: 1, hz: 260 }], band, extension)).toBeNull();
  });

  it('sem faixa: só aceita 80–400 Hz', () => {
    expect(validateContour([{ t: 0, hz: 120 }, { t: 1, hz: 380 }], null)).not.toBeNull();
    expect(validateContour([{ t: 0, hz: 70 }, { t: 1, hz: 200 }], null)).toBeNull();
  });
});

describe('schema da simulação', () => {
  it('aceita a resposta completa e preenche o que faltar', () => {
    const parsed = simulationSchema.parse({
      overviewPt: 'Visão geral.',
      steps: [{ titlePt: 'Passo', instructionPt: 'Faça assim.', durationSec: 'x' }],
    });
    expect(parsed.steps[0]).toMatchObject({ durationSec: 30, feelPt: '' });
    expect(parsed.mistakes).toEqual([]);
  });

  it('recusa sem passos', () => {
    expect(() => simulationSchema.parse({ overviewPt: 'x', steps: [] })).toThrow();
  });
});

describe('prompt da simulação', () => {
  it('leva o exercício, a faixa, a dúvida e as regras de segurança', () => {
    const [system, user] = simulatePrompt({ exercise: getExercise('target-hold') as Exercise, band, doubt: 'não acho a nota' });
    expect(system.content).toMatch(/nunca sugira forçar/);
    expect(user.content).toMatch(/Manter o tom-alvo/);
    expect(user.content).toMatch(/165–200 Hz/);
    expect(user.content).toMatch(/não acho a nota/);
  });

  it('nunca manda áudio: só texto', () => {
    const messages = simulatePrompt({ exercise: getExercise('lip-trill') as Exercise, band: null, doubt: '' });
    messages.forEach((m) => expect(typeof m.content).toBe('string'));
  });
});
