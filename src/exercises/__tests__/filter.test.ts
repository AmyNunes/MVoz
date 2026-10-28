import { CATALOG } from '../catalog';
import { filterExercises, hasFilters, NO_FILTERS, normalizeText } from '../filter';

describe('busca e filtros do catálogo', () => {
  it('sem filtros: o catálogo inteiro, na ordem', () => {
    expect(filterExercises(CATALOG, NO_FILTERS)).toHaveLength(45);
    expect(hasFilters(NO_FILTERS)).toBe(false);
  });

  it('busca sem acento e sem maiúsculas, no nome e no código', () => {
    expect(normalizeText('Ressonância')).toBe('ressonancia');
    expect(filterExercises(CATALOG, { ...NO_FILTERS, query: 'canudo' }).map((e) => e.id)).toContain('straw-phonation');
    expect(filterExercises(CATALOG, { ...NO_FILTERS, query: 'r6' }).map((e) => e.id)).toEqual(['f2-vowels']);
  });

  it('categorias somam (aquecimento OU desaquecimento)', () => {
    const result = filterExercises(CATALOG, { ...NO_FILTERS, categories: ['warmup', 'cooldown'] });
    expect(new Set(result.map((e) => e.category))).toEqual(new Set(['warmup', 'cooldown']));
  });

  it('objetivo: só os relevantes (≥ 2), os mais relevantes primeiro', () => {
    const result = filterExercises(CATALOG, { ...NO_FILTERS, goal: 'masculinize' });
    expect(result.every((e) => e.goals.masculinize >= 2)).toBe(true);
    expect(result.map((e) => e.id)).not.toContain('smile-vowels');
    expect(result[0].goals.masculinize).toBe(3);
  });

  it('nível e busca juntos', () => {
    const result = filterExercises(CATALOG, { ...NO_FILTERS, level: 'advanced', query: 'missões' });
    expect(result.map((e) => e.id)).toEqual(['missions']);
  });
});
