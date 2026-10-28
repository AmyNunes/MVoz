import { useState } from 'react';

import { ListGroup, ListRow, SearchField, Sheet } from '@/components/ui';
import { CATALOG, CATEGORY_ICONS } from '@/exercises/catalog';
import { filterExercises, NO_FILTERS } from '@/exercises/filter';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';

const x = strings.exercises;

type Props = {
  visible: boolean;
  onClose: () => void;
  onPick: (exerciseId: string) => void;
  title?: string;
};

/** Escolher um exercício do catálogo (rotina ou etapa do plano), com busca. */
export function ExercisePickerSheet({ visible, onClose, onPick, title = strings.routines.add }: Props) {
  const [query, setQuery] = useState('');
  const visibleExercises = filterExercises(CATALOG, { ...NO_FILTERS, query });

  return (
    <Sheet visible={visible} onClose={onClose} title={title} snapPoints={['90%']}>
      <SearchField value={query} onChangeText={setQuery} placeholder={x.search} />
      <ListGroup>
        {visibleExercises.map((exercise) => (
          <ListRow
            key={exercise.id}
            icon={CATEGORY_ICONS[exercise.category]}
            title={exercise.name}
            subtitle={x.rowSubtitle(formatMinutes(exercise.durationSec), x.categories[exercise.category])}
            onPress={() => {
              onPick(exercise.id);
              onClose();
            }}
          />
        ))}
      </ListGroup>
    </Sheet>
  );
}
