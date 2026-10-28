import { useEffect, useState } from 'react';

import { getRoutine, insertRoutine, updateRoutine } from '@/db/routinesRepo';
import type { RoutineItem } from '@/exercises/results';
import { moveItem, routineWarnings } from '@/exercises/routine';
import { strings } from '@/i18n/strings';

/** Item com uma chave estável (o mesmo exercício pode aparecer duas vezes). */
export type KeyedItem = { key: string; item: RoutineItem };

type Status = 'loading' | 'ready' | 'notFound' | 'error';

let nextKey = 0;
const keyed = (item: RoutineItem): KeyedItem => ({ key: `i${nextKey++}`, item });

/**
 * Montar ou editar uma rotina (seção 8.6). `id = 'new'` cria uma nova; `addExerciseId`
 * já começa com esse exercício ("Nova rotina com este exercício").
 */
export function useRoutineEditor(id: string, addExerciseId?: string) {
  const [status, setStatus] = useState<Status>(id === 'new' ? 'ready' : 'loading');
  const [name, setNameState] = useState('');
  const [items, setItems] = useState<KeyedItem[]>(() => (addExerciseId ? [keyed({ exerciseId: addExerciseId })] : []));
  const [dirty, setDirty] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (id === 'new') return;
    let alive = true;
    getRoutine(id).then(
      (routine) => {
        if (!alive) return;
        if (!routine) return setStatus('notFound');
        setNameState(routine.name);
        setItems(routine.items.map(keyed));
        setStatus('ready');
      },
      () => alive && setStatus('error'),
    );
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const change = (next: KeyedItem[]) => {
    setItems(next);
    setDirty(true);
  };

  const plain = items.map((k) => k.item);

  return {
    status,
    retry: () => {
      setStatus('loading');
      setAttempt((n) => n + 1);
    },
    name,
    setName: (value: string) => {
      setNameState(value);
      setDirty(true);
    },
    items,
    warnings: routineWarnings(plain),
    dirty,
    add: (exerciseId: string) => change([...items, keyed({ exerciseId })]),
    removeAt: (index: number) => change(items.filter((_, i) => i !== index)),
    move: (index: number, delta: number) => change(moveItem(items, index, delta)),
    reorder: (keys: string[]) => change(keys.map((k) => items.find((i) => i.key === k) as KeyedItem)),
    updateAt: (index: number, patch: Partial<RoutineItem>) =>
      change(items.map((k, i) => (i === index ? { ...k, item: { ...k.item, ...patch } } : k))),
    /** Salva e devolve o id da rotina. */
    save: async (): Promise<string> => {
      const finalName = name.trim() || strings.routines.defaultName;
      const savedId = id === 'new' ? await insertRoutine({ name: finalName, items: plain }) : id;
      if (id !== 'new') await updateRoutine(id, { name: finalName, items: plain });
      setDirty(false);
      return savedId;
    },
  };
}
