import { View } from 'react-native';

import { BulletList, StepList } from '@/components/exercises/StepList';
import { ListGroup, ListRow, Segmented, Sheet, Text } from '@/components/ui';
import { getExercise } from '@/exercises/catalog';
import type { Exercise } from '@/exercises/model';
import type { FeedbackMode } from '@/features/player/usePlayerFlow';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;

const FEEDBACK = [
  { value: 'full', label: p.feedback.full },
  { value: 'partial', label: p.feedback.partial },
  { value: 'summary', label: p.feedback.summary },
] as const satisfies readonly { value: FeedbackMode; label: string }[];

type Props = {
  visible: boolean;
  onClose: () => void;
  exercise: Exercise;
  step: number;
  feedback: FeedbackMode;
  onFeedbackChange: (mode: FeedbackMode) => void;
  /** Trocar pela variação mais fácil ou mais difícil (some no meio de um treino). */
  onSwitchExercise?: (id: string) => void;
  onExplain?: () => void;
};

/** Menu ⋯ do player: passos, erros comuns, cuidados, variações e retorno visual (seção 8.5). */
export function PlayerMenu({ visible, onClose, exercise, step, feedback, onFeedbackChange, onSwitchExercise, onExplain }: Props) {
  const styles = useStyles();
  const easier = exercise.easier ? getExercise(exercise.easier) : undefined;
  const harder = exercise.harder ? getExercise(exercise.harder) : undefined;

  return (
    <Sheet visible={visible} onClose={onClose} title={exercise.name} snapPoints={['70%', '95%']}>
      {onExplain && (
        <ListGroup>
          <ListRow icon="cpu" title={strings.simulate.button} onPress={onExplain} />
        </ListGroup>
      )}
      <View style={styles.section}>
        <Text variant="label" color="textMuted">
          {p.feedback.label}
        </Text>
        <Segmented accessibilityLabel={p.feedback.label} options={FEEDBACK} value={feedback} onChange={onFeedbackChange} />
        <Text variant="caption" color="textMuted">
          {p.feedbackHint}
        </Text>
      </View>
      <Section title={p.menuItems.steps}>
        <StepList steps={exercise.steps} current={step} />
      </Section>
      <Section title={p.menuItems.mistakes}>
        <BulletList items={exercise.mistakes} />
      </Section>
      {exercise.cautions.length > 0 && (
        <Section title={p.menuItems.cautions}>
          <BulletList items={exercise.cautions} />
        </Section>
      )}
      {onSwitchExercise && (easier || harder) && (
        <ListGroup>
          {easier && <ListRow icon="chevrons-down" title={p.menuItems.easier} subtitle={easier.name} onPress={() => onSwitchExercise(easier.id)} />}
          {harder && <ListRow icon="chevrons-up" title={p.menuItems.harder} subtitle={harder.name} onPress={() => onSwitchExercise(harder.id)} />}
        </ListGroup>
      )}
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.section}>
      <Text variant="label" color="textMuted" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  section: { gap: t.spacing.sm },
}));
