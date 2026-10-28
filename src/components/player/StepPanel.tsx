import { useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Icon, IconButton, Text } from '@/components/ui';
import type { Exercise } from '@/exercises/model';
import { exerciseTasks, neighborTaskStep } from '@/features/player/tasks';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;

type Props = {
  exercise: Pick<Exercise, 'steps' | 'stepTargets'>;
  step: number;
  onChange: (step: number) => void;
  /** O anel do tempo com a contagem. */
  children: ReactNode;
};

/**
 * Cartão do "como fazer" com o tempo e a contagem.
 * - Tarefa só: o 1º passo (a ação) e, num toque, os outros (são o jeito de fazer a mesma coisa).
 *   Recolhido, para o gráfico e os botões caberem na tela.
 * - Tarefas diferentes: a tarefa atual, com as instruções de preparação ("Antes:") e de fim ("Depois:").
 */
export function StepPanel({ exercise, step, onChange, children }: Props) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const tasks = exerciseTasks(exercise);

  if (tasks.length === 0) {
    const more = exercise.steps.length - 1;
    return (
      <View style={styles.card}>
        {open ? (
          <View style={styles.list}>
            {exercise.steps.map((text, i) => (
              <View key={text} style={styles.item}>
                <Text variant="label" color="primary" style={styles.number}>
                  {i + 1}
                </Text>
                <Text style={styles.flex}>{text}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text>{exercise.steps[0]}</Text>
        )}
        <View style={styles.row}>
          <View style={styles.flex}>{children}</View>
          {more > 0 && (
            <Pressable
              onPress={() => setOpen(!open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={open ? p.fewerSteps : p.allSteps(more)}
              style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
            >
              <Text variant="label" color="primary">
                {open ? p.fewerStepsShort : p.allStepsShort(more)}
              </Text>
              <Icon name={open ? 'chevron-up' : 'chevron-down'} color="primary" />
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const index = Math.max(0, tasks.findIndex((t) => t.step === step));
  const task = tasks[index];
  const previous = neighborTaskStep(tasks, task.step, -1);
  const next = neighborTaskStep(tasks, task.step, 1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text variant="label" color="textMuted" style={styles.flex}>
          {p.taskOf(index + 1, tasks.length)}
        </Text>
        <IconButton icon="chevron-left" accessibilityLabel={p.prevTask} disabled={previous === null} onPress={() => previous !== null && onChange(previous)} />
        <IconButton icon="chevron-right" accessibilityLabel={p.nextTask} disabled={next === null} onPress={() => next !== null && onChange(next)} />
      </View>
      {task.before.length > 0 && (
        <Text variant="caption" color="textMuted">
          {p.before(task.before.join(' '))}
        </Text>
      )}
      <Text accessibilityLiveRegion="polite">{task.text}</Text>
      {children}
      {task.after.length > 0 && (
        <Text variant="caption" color="textMuted">
          {p.after(task.after.join(' '))}
        </Text>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderRadius: t.radii.lg,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginRight: -t.spacing.sm, marginTop: -t.spacing.sm },
  list: { gap: t.spacing.xs },
  item: { flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' },
  number: { minWidth: t.spacing.lg },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs, minHeight: t.sizes.touchTarget, paddingHorizontal: t.spacing.sm },
  pressed: { opacity: t.opacity.pressed },
}));
