import { View } from 'react-native';

import { Icon, Text, type IconName } from '@/components/ui';
import type { PlanStage } from '@/guide/stages';
import { stageWeeks } from '@/features/guide/planText';
import { strings } from '@/i18n/strings';
import { makeStyles, type ColorTokens } from '@/theme';

const t = strings.guide;

type Props = {
  stages: readonly PlanStage[];
  /** Etapa atual (as anteriores aparecem como feitas). `null` = plano ainda não começou. */
  current: number | null;
};

/** Linha do tempo das etapas (seções 9.2 e 10.6). */
export function StageList({ stages, current }: Props) {
  const styles = useStyles();

  return (
    <View style={styles.list}>
      {stages.map((stage, i) => {
        const state: { icon: IconName; color: keyof ColorTokens } =
          current !== null && i < current
            ? { icon: 'check-circle', color: 'success' }
            : i === current
              ? { icon: 'play-circle', color: 'primary' }
              : { icon: 'circle', color: 'textMuted' };
        const meta = t.stages[stage.id];
        return (
          <View key={`${stage.id}-${i}`} style={styles.row} accessible accessibilityLabel={`${i + 1}. ${meta.name}. ${meta.focus} ${stageWeeks(stage)}`}>
            <Icon name={state.icon} color={state.color} />
            <View style={styles.texts}>
              <Text variant="label">
                {i + 1}. {meta.name}
              </Text>
              <Text variant="caption" color="textMuted">
                {meta.focus} · {stageWeeks(stage)}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((tk) => ({
  list: { gap: tk.spacing.md },
  row: { flexDirection: 'row', gap: tk.spacing.md, alignItems: 'flex-start' },
  texts: { flex: 1, gap: tk.spacing.xs / 2 },
}));
