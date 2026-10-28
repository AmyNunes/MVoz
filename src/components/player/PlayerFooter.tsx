import { Pressable, View } from 'react-native';

import { Button, Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import type { StepCounter } from '@/features/player/useStepCounter';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const p = strings.player;

export type FooterAction = { label: string; icon: IconName; onPress: () => void; primary?: boolean; hint?: string; disabled?: boolean };

/** Com tarefas: "Fiz" conta na tarefa; tarefa opcional ou já feita → "Próxima tarefa". */
export function footerAction(input: {
  steps: Pick<StepCounter, 'enabled' | 'target' | 'stepDone' | 'add'>;
  lastStep: boolean;
  onNextStep: () => void;
  onManualRep: () => void;
}): FooterAction {
  const { steps, lastStep } = input;
  if (steps.enabled && (!steps.target || steps.target.optional || steps.stepDone) && !lastStep) {
    return { label: p.nextTask, icon: 'chevron-right', onPress: input.onNextStep, primary: steps.stepDone };
  }
  return {
    label: p.did,
    icon: 'check',
    hint: p.didHint,
    onPress: steps.enabled ? steps.add : input.onManualRep,
    disabled: steps.enabled && !steps.target,
  };
}

type Props = {
  /** "Fiz" ou "Próximo passo". */
  action: FooterAction;
  done: boolean;
  onFinish: () => void;
  onPain: () => void;
};

/** Controles fixos embaixo do player: Fiz/Próximo passo · Terminar · "Senti dor · parar". */
export function PlayerFooter({ action, done, onFinish, onPain }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.footer}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label={action.label}
            icon={action.icon}
            size="main"
            variant={action.primary && !done ? 'primary' : 'secondary'}
            accessibilityHint={action.hint}
            disabled={action.disabled}
            onPress={action.onPress}
          />
        </View>
        <View style={styles.flex}>
          <Button label={p.finish} icon="flag" size="main" variant={done ? 'primary' : 'secondary'} onPress={onFinish} />
        </View>
      </View>
      {/* "Senti dor · parar": sempre visível (seção 14.6). */}
      <Pressable accessibilityRole="button" accessibilityLabel={p.pain} onPress={onPain} style={({ pressed }) => [styles.pain, pressed && styles.pressed]}>
        <Icon name="alert-octagon" color="danger" />
        <Text variant="label">{p.pain}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  footer: { gap: t.spacing.xs, paddingHorizontal: t.spacing.screen, paddingTop: t.spacing.sm },
  row: { flexDirection: 'row', gap: t.spacing.md },
  flex: { flex: 1 },
  pain: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: t.spacing.sm, minHeight: t.sizes.touchTarget },
  pressed: { opacity: t.opacity.pressed },
}));
