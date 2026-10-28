import type { ReactNode } from 'react';
import { View } from 'react-native';

import { IconBadge, IconButton, Text } from '@/components/ui';
import { CATEGORY_ICONS, getExercise } from '@/exercises/catalog';
import type { RoutineItem } from '@/exercises/results';
import { itemDurationSec } from '@/exercises/routine';
import { strings } from '@/i18n/strings';
import { formatMinutes } from '@/lib/format';
import { makeStyles } from '@/theme';

const r = strings.routines;

type Props = {
  item: RoutineItem;
  handle: ReactNode;
  onMenu: () => void;
};

/** Linha de um exercício na rotina: alça ≡, nome, duração ou repetições e menu ⋯. */
export function RoutineItemRow({ item, handle, onMenu }: Props) {
  const styles = useStyles();
  const exercise = getExercise(item.exerciseId);
  if (!exercise) return null;
  const detail = item.reps ? r.itemReps(item.reps) : formatMinutes(itemDurationSec(item));

  return (
    <View style={styles.row}>
      {handle}
      <IconBadge icon={CATEGORY_ICONS[exercise.category]} size="sm" />
      <View style={styles.texts}>
        <Text numberOfLines={1}>{exercise.name}</Text>
        <Text variant="caption" color="textMuted">
          {detail}
        </Text>
      </View>
      <IconButton icon="more-vertical" accessibilityLabel={r.menu(exercise.name)} onPress={onMenu} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingRight: t.spacing.xs },
  texts: { flex: 1 },
}));
