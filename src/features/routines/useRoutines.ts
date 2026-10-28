import { useCallback } from 'react';

import { deleteRoutine, insertRoutine, listRoutines, restoreRoutine, setRoutineUseInToday, updateRoutine, type Routine } from '@/db/routinesRepo';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

const r = strings.routines;

/** Minhas rotinas: lista, excluir (com "Desfazer") e duplicar (seção 8.6). */
export function useRoutineList() {
  const loader = useLoader(listRoutines);
  const { refresh } = loader;

  const remove = useCallback(
    async (routine: Routine) => {
      await deleteRoutine(routine.id);
      refresh();
      showSnackbar(r.deleted, {
        label: r.undo,
        onPress: () => {
          void restoreRoutine(routine).then(refresh);
        },
      });
    },
    [refresh],
  );

  const duplicate = useCallback(
    async (routine: Routine) => {
      await insertRoutine({ name: r.copyName(routine.name), items: routine.items });
      refresh();
      showSnackbar(r.duplicated);
    },
    [refresh],
  );

  /** Usar a rotina em Hoje no lugar do plano: só hoje, sempre ou não (seção 8.6). */
  const setInToday = useCallback(
    async (routine: Routine, mode: Routine['useInToday']) => {
      await setRoutineUseInToday(routine.id, mode);
      refresh();
    },
    [refresh],
  );

  return { ...loader, remove, duplicate, setInToday };
}

/** Acrescenta um exercício no fim de uma rotina ("Adicionar a uma rotina" no detalhe). */
export async function appendToRoutine(routine: Routine, exerciseId: string): Promise<void> {
  await updateRoutine(routine.id, { name: routine.name, items: [...routine.items, { exerciseId }] });
  showSnackbar(r.addedTo(routine.name));
}
