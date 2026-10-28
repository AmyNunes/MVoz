import { useState } from 'react';

import type { TaskResults } from '@/components/guide/RecordingTasks';
import { getBaseline, insertBaseline, type Baseline } from '@/db/guideRepo';
import { buildBaseline, type TaskKind } from '@/guide/baseline';
import { useLoader } from '@/lib/useLoader';

/** Gravação inicial: usa a que já existe ou grava de novo, e salva o "Seu início". */
export function useBaselineSetup() {
  const existing = useLoader<Baseline | null>(() => getBaseline('latest'));
  const [saving, setSaving] = useState(false);

  /** Calcula e salva. Devolve `false` se faltou voz nas falas. */
  const save = async (results: TaskResults): Promise<boolean> => {
    setSaving(true);
    try {
      const frames = Object.fromEntries(Object.entries(results).map(([kind, r]) => [kind, r?.frames ?? []])) as Partial<
        Record<TaskKind, NonNullable<TaskResults[TaskKind]>['frames']>
      >;
      const metrics = buildBaseline(frames);
      if (!metrics) return false;
      const recordingIds = Object.values(results).flatMap((r) => (r?.recordingId ? [r.recordingId] : []));
      await insertBaseline({ recordingIds, metrics });
      return true;
    } finally {
      setSaving(false);
    }
  };

  return { existing: existing.state, saving, save };
}
