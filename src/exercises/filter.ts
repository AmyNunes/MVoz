import type { Category, Exercise, Goal, Level } from './model';

export type ExerciseFilters = {
  query: string;
  /** Vazio = todas as categorias. */
  categories: readonly Category[];
  goal: Goal | null;
  level: Level | null;
};

export const NO_FILTERS: ExerciseFilters = { query: '', categories: [], goal: null, level: null };

/** Relevância mínima (0–3) para um exercício aparecer no filtro de objetivo. */
const MIN_GOAL_SCORE = 2;

/** Minúsculas e sem acentos: "ressonancia" encontra "Ressonância". */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Busca no nome, no código (ex.: "R6") e no "o que é". */
export function filterExercises(catalog: readonly Exercise[], filters: ExerciseFilters): Exercise[] {
  const query = normalizeText(filters.query);
  const result = catalog.filter((e) => {
    if (filters.categories.length > 0 && !filters.categories.includes(e.category)) return false;
    if (filters.goal && e.goals[filters.goal] < MIN_GOAL_SCORE) return false;
    if (filters.level && e.level !== filters.level) return false;
    if (!query) return true;
    return [e.name, e.code, e.about].some((text) => normalizeText(text).includes(query));
  });
  // Com objetivo escolhido, os mais relevantes para ele vêm primeiro (mantendo a ordem do catálogo no empate).
  const goal = filters.goal;
  return goal ? [...result].sort((a, b) => b.goals[goal] - a.goals[goal]) : result;
}

export function hasFilters(filters: ExerciseFilters): boolean {
  return filters.query.trim() !== '' || filters.categories.length > 0 || filters.goal !== null || filters.level !== null;
}
