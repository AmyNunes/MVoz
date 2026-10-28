import { useState } from 'react';
import { View } from 'react-native';

import { Button, Chip, Notice, Sheet, Stepper, Text } from '@/components/ui';
import type { Exercise } from '@/exercises/model';
import { EMPTY_RATING, FEELINGS, type Discomfort, type ResultRating } from '@/exercises/results';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;
const DISCOMFORT: Discomfort[] = [0, 1, 2];

type Props = {
  visible: boolean;
  exercise: Exercise;
  /** Linhas do resumo (tempo, repetições, métricas). */
  summary: string[];
  saving: boolean;
  onCancel: () => void;
  onSave: (rating: ResultRating) => void;
};

/** "Como foi?" e "Desconforto?" no fim do exercício (seção 8.5), mais autoavaliação e notas da missão. */
export function FinishSheet({ visible, exercise, summary, saving, onCancel, onSave }: Props) {
  const styles = useStyles();
  const [rating, setRating] = useState<ResultRating>(EMPTY_RATING);
  const mission = rating.mission ?? { comfort: 5, effort: 5, fit: 5 };
  const set = (patch: Partial<ResultRating>) => setRating((r) => ({ ...r, ...patch }));

  const save = () =>
    onSave({
      ...rating,
      selfRating: exercise.selfRating ? (rating.selfRating ?? 3) : null,
      mission: exercise.measure === 'mission' ? mission : null,
    });

  return (
    <Sheet visible={visible} onClose={onCancel} title={p.finishTitle} snapPoints={['80%', '95%']}>
      {summary.length > 0 && (
        <View style={styles.summary}>
          {summary.map((line) => (
            <Text key={line} color="textMuted">
              {line}
            </Text>
          ))}
        </View>
      )}
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={p.finishTitle}>
        {FEELINGS.map((f) => (
          <Chip key={f} label={p.feeling[f]} selected={rating.feeling === f} onPress={() => set({ feeling: f })} />
        ))}
      </View>
      <Text variant="label">{p.discomfortLabel}</Text>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={p.discomfortLabel}>
        {DISCOMFORT.map((d) => (
          <Chip key={d} label={p.discomfort[d]} selected={rating.discomfort === d} onPress={() => set({ discomfort: d })} />
        ))}
      </View>
      {rating.discomfort === 2 && <Notice tone="warning">{p.strongDiscomfort}</Notice>}

      {exercise.selfRating && (
        <>
          <Text variant="label">{exercise.selfRating}</Text>
          <Stepper value={rating.selfRating ?? 3} min={1} max={5} onChange={(v) => set({ selfRating: v })} accessibilityLabel={p.selfRatingLabel} />
        </>
      )}
      {exercise.measure === 'mission' &&
        (['comfort', 'effort', 'fit'] as const).map((key) => (
          <View key={key} style={styles.field}>
            <Text variant="label">{p.mission[key]}</Text>
            <Stepper value={mission[key]} min={0} max={10} onChange={(v) => set({ mission: { ...mission, [key]: v } })} accessibilityLabel={p.mission[key]} />
          </View>
        ))}

      <Button label={p.save} icon="check" size="main" loading={saving} onPress={save} />
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  summary: { gap: t.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  field: { gap: t.spacing.sm },
}));
