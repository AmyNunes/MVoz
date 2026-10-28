import { View } from 'react-native';

import { ListGroup, ListRow, Sheet, Stepper, Text } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import type { RoutineItem } from '@/exercises/results';
import { itemDurationSec } from '@/exercises/routine';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const r = strings.routines;

type Props = {
  item: RoutineItem | null;
  index: number;
  count: number;
  onClose: () => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
  onChange: (patch: Partial<RoutineItem>) => void;
};

/** Menu do item: mover (alternativa ao arraste), duração/repetições e remover. */
export function ItemMenuSheet({ item, index, count, onClose, onMove, onRemove, onChange }: Props) {
  const styles = useStyles();
  const exercise = item ? getExercise(item.exerciseId) : undefined;

  return (
    <Sheet visible={item !== null} onClose={onClose} title={exercise?.name}>
      {item && exercise && (
        <>
          <View style={styles.field}>
            <Text variant="label" color="textMuted">
              {r.durationLabel}
            </Text>
            <Stepper
              value={Math.max(1, Math.round(itemDurationSec(item) / 60))}
              min={1}
              max={15}
              onChange={(minutes) => onChange({ durationSec: minutes * 60 })}
              accessibilityLabel={r.durationLabel}
            />
          </View>
          {exercise.reps !== undefined && (
            <View style={styles.field}>
              <Text variant="label" color="textMuted">
                {r.repsLabel}
              </Text>
              <Stepper value={item.reps ?? exercise.reps} min={1} max={20} onChange={(reps) => onChange({ reps })} accessibilityLabel={r.repsLabel} />
            </View>
          )}
          <ListGroup>
            {index > 0 && <ListRow icon="arrow-up" title={r.moveUp} onPress={() => onMove(-1)} />}
            {index < count - 1 && <ListRow icon="arrow-down" title={r.moveDown} onPress={() => onMove(1)} />}
            <ListRow icon="trash-2" iconColor="danger" title={r.remove} onPress={onRemove} />
          </ListGroup>
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  field: { gap: t.spacing.sm },
}));
