import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { GestureGuide } from '@/components/navigation/GestureGuide';
import { Button, EmptyState, ErrorState, IconButton, ListGroup, ListRow, Screen, Sheet, Skeleton, SwipeRow } from '@/components/ui';
import type { Routine } from '@/db/routinesRepo';
import { routineDurationSec } from '@/exercises/routine';
import { useRoutineList } from '@/features/routines/useRoutines';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';
import { useTheme } from '@/theme';

const r = strings.routines;

const edit = (id: string) => router.push({ pathname: '/routines/[id]', params: { id } });
const start = (routineId: string) => router.push({ pathname: '/session', params: { routineId } });

/** Minhas rotinas (seção 8.6). Deslizar ← exclui e → duplica; o menu ⋯ faz o mesmo. */
export default function RoutinesScreen() {
  const theme = useTheme();
  const { state, reload, remove, duplicate, setInToday } = useRoutineList();
  const [menuFor, setMenuFor] = useState<Routine | null>(null);

  const act = (action: (routine: Routine) => void) => {
    if (menuFor) action(menuFor);
    setMenuFor(null);
  };

  return (
    <Screen edges={[]} footer={<Button label={r.new} icon="plus" size="main" onPress={() => edit('new')} />}>
      <Stack.Screen options={{ title: r.title }} />
      {state.status === 'loading' && <Skeleton height={theme.sizes.listRowHeight} />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}
      {state.status === 'success' && state.data.length === 0 && <EmptyState icon="list" message={r.empty} />}
      {state.status === 'success' && state.data.length > 0 && (
        <ListGroup>
          {state.data.map((routine) => (
            <SwipeRow
              key={routine.id}
              onSwipeLeft={{ label: r.delete, icon: 'trash-2', color: 'danger', onTrigger: () => void remove(routine) }}
              onSwipeRight={{ label: r.duplicate, icon: 'copy', color: 'primary', onTrigger: () => void duplicate(routine) }}
            >
              <ListRow
                icon="list"
                title={routine.name}
                subtitle={[
                  r.summary(routine.items.length, formatMinutes(routineDurationSec(routine.items))),
                  routine.useInToday === 'always' ? r.usingAlways : routine.useInToday === 'today' ? r.usingToday : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                onPress={() => edit(routine.id)}
                right={
                  <>
                    {routine.items.length > 0 && (
                      <IconButton icon="play" color="primary" accessibilityLabel={`${r.start}: ${routine.name}`} onPress={() => start(routine.id)} />
                    )}
                    <IconButton icon="more-vertical" accessibilityLabel={r.menu(routine.name)} onPress={() => setMenuFor(routine)} />
                  </>
                }
              />
            </SwipeRow>
          ))}
        </ListGroup>
      )}

      <GestureGuide name="routines" when={state.status === 'success' && state.data.length > 0} />
      <Sheet visible={menuFor !== null} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        <ListGroup>
          {menuFor && menuFor.items.length > 0 && <ListRow icon="play" title={r.start} onPress={() => act((routine) => start(routine.id))} />}
          <ListRow icon="edit-2" title={r.edit} onPress={() => act((routine) => edit(routine.id))} />
          {menuFor?.useInToday !== 'today' && <ListRow icon="sun" title={r.useToday} onPress={() => act((routine) => void setInToday(routine, 'today'))} />}
          {menuFor?.useInToday !== 'always' && <ListRow icon="repeat" title={r.useAlways} onPress={() => act((routine) => void setInToday(routine, 'always'))} />}
          {menuFor && menuFor.useInToday !== 'never' && <ListRow icon="compass" title={r.useNever} onPress={() => act((routine) => void setInToday(routine, 'never'))} />}
          <ListRow icon="copy" title={r.duplicate} onPress={() => act((routine) => void duplicate(routine))} />
          <ListRow icon="trash-2" iconColor="danger" title={r.delete} onPress={() => act((routine) => void remove(routine))} />
        </ListGroup>
      </Sheet>
    </Screen>
  );
}
