import { View } from 'react-native';

import { ChoiceList } from '@/components/guide/ChoiceList';
import { MilestoneList } from '@/components/plan/MilestoneList';
import { Card, Notice, Text } from '@/components/ui';
import type { CheckinOutcome } from '@/features/checkin/evaluate';
import { DECISIONS, type CheckinAnswers, type Decision } from '@/guide/checkin';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const c = strings.checkin;

const hzText = (hz: number | null) => (hz === null ? c.none : `${Math.round(hz)} Hz`);
const signed = (n: number) => `${n > 0 ? '+' : ''}${Math.round(n)}`;

type Props = {
  outcome: CheckinOutcome;
  answers: CheckinAnswers;
  decision: Decision | null;
  onDecision: (decision: Decision) => void;
};

/** Resultado do check-in: comparação com o início e a semana passada, marcos e decisão. */
export function CheckinResult({ outcome, answers, decision, onDecision }: Props) {
  const styles = useStyles();
  const { comparison: cmp } = outcome;
  const hurt = answers.symptoms.some((s) => s === 'pain' || s === 'hoarseness');

  return (
    <View style={styles.container}>
      <Card title={c.compareTitle}>
        <Text>{c.medianLine(hzText(cmp.startHz), hzText(cmp.lastHz), hzText(cmp.nowHz))}</Text>
        {cmp.inTargetPct !== null && <Text>{c.inTargetLine(cmp.inTargetPct)}</Text>}
        {cmp.floorHz !== null && cmp.p10Hz !== null && <Text>{c.floorLine(Math.round(cmp.p10Hz), Math.round(cmp.floorHz))}</Text>}
        {cmp.resonancePct !== null && <Text>{c.resonanceLine(signed(cmp.resonancePct))}</Text>}
      </Card>
      <Card title={c.milestonesTitle}>
        <MilestoneList milestones={outcome.milestones} />
      </Card>
      {hurt && <Notice tone="warning">{c.healthNote}</Notice>}
      <Card title={c.decisionTitle}>
        {outcome.reasons.map((r) => (
          <Text key={r} color="textMuted">
            {c.reasons[r]}
          </Text>
        ))}
        <Text variant="caption" color="textMuted">
          {c.decisionHint}
        </Text>
        <ChoiceList
          choices={DECISIONS.map((d) => ({ value: d, label: c.decisions[d] }))}
          selected={decision ? [decision] : []}
          onToggle={onDecision}
          accessibilityLabel={c.decisionTitle}
        />
      </Card>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.lg },
}));
