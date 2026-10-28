import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';
import { strings } from '@/i18n/strings';

import { durationLabel, summaryLines, szRatio } from '../summary';
import { needsBand, resolveDirection, resolveTarget } from '../target';
import { feedbackHidden } from '../usePlayerFlow';

const ex = (id: string) => getExercise(id) as Exercise;
const band = { lowHz: 165, highHz: 200 };

describe('alvo do exercício', () => {
  it('nota-alvo = centro da faixa; faixa inteira; nenhum', () => {
    expect(resolveTarget(ex('target-hold'), band).noteHz).toBeCloseTo(181.7, 1);
    expect(resolveTarget(ex('standard-passage'), band)).toEqual({ band, noteHz: null });
    expect(resolveTarget(ex('straw-phonation'), band)).toEqual({ band: null, noteHz: null });
  });

  it('quem precisa da faixa ligada', () => {
    expect(needsBand(ex('target-hold'))).toBe(true);
    expect(needsBand(ex('question-statement'))).toBe(true);
    expect(needsBand(ex('lip-trill'))).toBe(false);
  });

  it('ressonância "conforme o objetivo" fica mais clara até o Guia existir', () => {
    expect(resolveDirection(ex('big-dog-small-dog'))).toBe('brighter');
    expect(resolveDirection(ex('low-larynx'))).toBe('darker');
  });
});

describe('retorno visual', () => {
  it('parcial esconde 1 em cada 3 tentativas; só resumo esconde todas', () => {
    expect([0, 1, 2, 3, 4, 5].map((n) => feedbackHidden('partial', n))).toEqual([false, false, true, false, false, true]);
    expect(feedbackHidden('summary', 0)).toBe(true);
    expect(feedbackHidden('full', 2)).toBe(false);
  });
});

describe('resumo do fim', () => {
  it('tempo, repetições e o melhor de cada tipo de medição', () => {
    const lines = summaryLines(ex('pitch-glides'), 95, 4, { segment: null, glideRanges: [6.2, 9.8] });
    const s = strings.player.summary;
    expect(lines).toEqual([s.time('1:35'), s.reps(4), s.bestGlide('9,8')]);
  });

  it('teste de /s/ /z/: a ordem dos sons e a relação s/z', () => {
    expect([0, 2, 4, 6].map((n) => durationLabel(ex('sz-mpt'), n))).toEqual(['/s/', '/z/', '"a"', null]);
    expect(durationLabel(ex('diaphragmatic-breathing'), 0)).toBeNull();
    expect(szRatio([18, 20, 16, 15])).toBeCloseTo(1.25);
    expect(szRatio([18])).toBeNull();
  });
});
