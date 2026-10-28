import { View } from 'react-native';

import { Text } from '@/components/ui';
import { GOALS } from '@/exercises/model';
import { DAILY_MINUTES, EXPERIENCES, GRAMMATICAL_GENDERS, HEALTH_FLAGS, HORMONES, IDENTITIES, SLP, type HealthFlag } from '@/guide/profile';
import type { GuideDraft, QuestionId } from '@/guide/questions';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

import { ChoiceList, type Choice } from './ChoiceList';

const q = strings.guide.questions;

const choices = <T extends string>(values: readonly T[], labels: Record<T, string>): Choice<T>[] =>
  values.map((value) => ({ value, label: labels[value] }));

type Props = { id: QuestionId; draft: GuideDraft; onChange: (patch: GuideDraft) => void };

/** Uma pergunta do Guia (seção 9.1). */
export function QuestionView({ id, draft, onChange }: Props) {
  const styles = useStyles();

  const body = () => {
    switch (id) {
      case 'goal':
        return <ChoiceList accessibilityLabel={q.goal.title} choices={choices(GOALS, q.goal.options)} selected={draft.goal ? [draft.goal] : []} onToggle={(goal) => onChange({ goal })} />;
      case 'grammaticalGender':
        return (
          <ChoiceList
            accessibilityLabel={q.grammaticalGender.title}
            choices={choices(GRAMMATICAL_GENDERS, q.grammaticalGender.options)}
            selected={draft.grammaticalGender ? [draft.grammaticalGender] : []}
            onToggle={(grammaticalGender) => onChange({ grammaticalGender })}
          />
        );
      case 'identity':
        return <ChoiceList accessibilityLabel={q.identity.title} choices={choices(IDENTITIES, q.identity.options)} selected={draft.identity ? [draft.identity] : []} onToggle={(identity) => onChange({ identity })} />;
      case 'hormones':
        return <ChoiceList accessibilityLabel={q.hormones.title} choices={choices(HORMONES, q.hormones.options)} selected={draft.hormones ? [draft.hormones] : []} onToggle={(hormones) => onChange({ hormones })} />;
      case 'surgery':
        return (
          <ChoiceList
            accessibilityLabel={q.surgery.title}
            choices={[
              { value: true, label: q.surgery.options.yes },
              { value: false, label: q.surgery.options.no },
            ]}
            selected={draft.recentSurgery === undefined ? [] : [draft.recentSurgery]}
            onToggle={(recentSurgery) => onChange({ recentSurgery })}
          />
        );
      case 'surgeryCleared':
        return (
          <ChoiceList
            accessibilityLabel={q.surgeryCleared.title}
            choices={[
              { value: true, label: q.surgeryCleared.options.yes },
              { value: false, label: q.surgeryCleared.options.no },
            ]}
            selected={draft.surgeryCleared === undefined ? [] : [draft.surgeryCleared]}
            onToggle={(surgeryCleared) => onChange({ surgeryCleared })}
          />
        );
      case 'experience':
        return <ChoiceList accessibilityLabel={q.experience.title} choices={choices(EXPERIENCES, q.experience.options)} selected={draft.experience ? [draft.experience] : []} onToggle={(experience) => onChange({ experience })} />;
      case 'slp':
        return <ChoiceList accessibilityLabel={q.slp.title} choices={choices(SLP, q.slp.options)} selected={draft.slp ? [draft.slp] : []} onToggle={(slp) => onChange({ slp })} />;
      case 'minutes':
        return (
          <ChoiceList
            accessibilityLabel={q.minutes.title}
            choices={DAILY_MINUTES.map((n) => ({ value: n, label: q.minutes.value(n) }))}
            selected={draft.dailyMinutes ? [draft.dailyMinutes] : []}
            onToggle={(dailyMinutes) => onChange({ dailyMinutes })}
          />
        );
      case 'health': {
        const flags = draft.healthFlags ?? [];
        const toggle = (flag: HealthFlag | 'none') => {
          if (flag === 'none') return onChange({ healthFlags: [] });
          onChange({ healthFlags: flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag] });
        };
        return (
          <ChoiceList
            multiple
            accessibilityLabel={q.health.title}
            choices={[...choices(HEALTH_FLAGS, q.health.options), { value: 'none' as const, label: q.health.none }]}
            selected={draft.healthFlags === undefined ? [] : flags.length === 0 ? ['none'] : flags}
            onToggle={toggle}
          />
        );
      }
    }
  };

  const meta = q[id === 'surgery' ? 'surgery' : id];
  return (
    <View style={styles.container}>
      <Text variant="title" accessibilityRole="header">
        {meta.title}
      </Text>
      {'hint' in meta && <Text color="textMuted">{meta.hint}</Text>}
      {body()}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.lg },
}));
