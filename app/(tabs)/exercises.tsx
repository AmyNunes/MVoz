import { router } from 'expo-router';
import { useState } from 'react';

import { ExerciseFilterBar } from '@/components/exercises/ExerciseFilterBar';
import { EmptyState, ListGroup, ListRow, Screen, ScreenHeader, SearchField, Text } from '@/components/ui';
import { CATALOG, CATEGORY_ICONS } from '@/exercises/catalog';
import { filterExercises, hasFilters, NO_FILTERS, type ExerciseFilters } from '@/exercises/filter';
import { useRoutineList } from '@/features/routines/useRoutines';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

const x = strings.exercises;

/** Catálogo com busca e filtros (seção 10.3). */
export default function ExercisesScreen() {
  const [filters, setFilters] = useState<ExerciseFilters>(NO_FILTERS);
  const visible = filterExercises(CATALOG, filters);
  const routines = useRoutineList();

  return (
    <Screen>
      <ScreenHeader title={strings.tabs.exercises} />
      <ListGroup>
        <ListRow
          icon="layers"
          title={strings.routines.title}
          value={routines.state.status === 'success' ? strings.routines.entryValue(routines.state.data.length) : undefined}
          onPress={() => router.push('/routines')}
        />
      </ListGroup>
      <SearchField value={filters.query} onChangeText={(query) => setFilters({ ...filters, query })} placeholder={x.search} />
      <ExerciseFilterBar filters={filters} onChange={setFilters} />

      {visible.length === 0 ? (
        <EmptyState icon="search" message={x.empty} action={{ label: x.clearFilters, onPress: () => setFilters(NO_FILTERS) }} />
      ) : (
        <>
          {hasFilters(filters) && (
            <Text variant="caption" color="textMuted" accessibilityLiveRegion="polite">
              {x.count(visible.length)}
            </Text>
          )}
          <ListGroup>
            {visible.map((exercise) => (
              <ListRow
                key={exercise.id}
                icon={CATEGORY_ICONS[exercise.category]}
                title={exercise.name}
                subtitle={x.rowSubtitle(formatMinutes(exercise.durationSec), x.levels[exercise.level])}
                onPress={() => router.push(`/exercise/${exercise.id}`)}
              />
            ))}
          </ListGroup>
        </>
      )}
    </Screen>
  );
}
