import type { Recording, RecordingKind } from '@/db/recordingsRepo';

/** Filtros da lista de gravações (seção 10.7). */
export const RECORDING_FILTERS = ['all', 'baseline', 'checkin', 'exercise', 'free', 'favorite'] as const;
export type RecordingFilter = (typeof RECORDING_FILTERS)[number];

export function filterRecordings(list: readonly Recording[], filter: RecordingFilter): Recording[] {
  if (filter === 'all') return [...list];
  if (filter === 'favorite') return list.filter((r) => r.favorite);
  return list.filter((r) => r.kind === (filter satisfies RecordingKind));
}

/** As duas escolhidas para comparar, a mais antiga primeiro ("antes × depois"). */
export function compareOrder(a: Recording, b: Recording): [Recording, Recording] {
  return a.createdAt <= b.createdAt ? [a, b] : [b, a];
}
