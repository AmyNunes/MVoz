import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { ListGroup, ListRow, Sheet } from '@/components/ui';
import { listRoutines, type Routine } from '@/db/routinesRepo';
import { routineDurationSec } from '@/exercises/routine';
import { appendToRoutine } from '@/features/routines/useRoutines';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

const r = strings.routines;

type Props = {
  visible: boolean;
  exerciseId: string;
  onClose: () => void;
};

/** "Adicionar a uma rotina" (seção 10.3): uma das minhas rotinas ou uma nova. */
export function AddToRoutineSheet({ visible, exerciseId, onClose }: Props) {
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    if (!visible) return;
    let alive = true;
    listRoutines().then((list) => alive && setRoutines(list), () => {});
    return () => {
      alive = false;
    };
  }, [visible]);

  return (
    <Sheet visible={visible} onClose={onClose} title={r.addToRoutine}>
      <ListGroup>
        <ListRow
          icon="plus"
          title={r.addToNew}
          onPress={() => {
            onClose();
            router.push({ pathname: '/routines/[id]', params: { id: 'new', add: exerciseId } });
          }}
        />
        {routines.map((routine) => (
          <ListRow
            key={routine.id}
            icon="list"
            title={routine.name}
            subtitle={r.summary(routine.items.length, formatMinutes(routineDurationSec(routine.items)))}
            onPress={() => {
              onClose();
              void appendToRoutine(routine, exerciseId);
            }}
          />
        ))}
      </ListGroup>
    </Sheet>
  );
}
