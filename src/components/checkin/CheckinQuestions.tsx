import { View } from 'react-native';

import { Chip, Stepper, Text } from '@/components/ui';
import { SYMPTOMS, type CheckinAnswers, type Symptom } from '@/guide/checkin';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const c = strings.checkin;

type Props = { answers: CheckinAnswers; onChange: (answers: CheckinAnswers) => void };

/** Perguntas do check-in: três notas de 0 a 10 e os sintomas da semana. */
export function CheckinQuestions({ answers, onChange }: Props) {
  const styles = useStyles();
  const score = (key: 'effort' | 'fit' | 'comfort') => (
    <View style={styles.question}>
      <Text>{c[key]}</Text>
      <Stepper value={answers[key]} min={0} max={10} onChange={(v) => onChange({ ...answers, [key]: v })} accessibilityLabel={c[key]} />
    </View>
  );
  const toggle = (symptom: Symptom) =>
    onChange({
      ...answers,
      symptoms: answers.symptoms.includes(symptom) ? answers.symptoms.filter((s) => s !== symptom) : [...answers.symptoms, symptom],
    });

  return (
    <View style={styles.container}>
      <Text variant="title" accessibilityRole="header">
        {c.questionsTitle}
      </Text>
      {score('effort')}
      {score('fit')}
      {score('comfort')}
      <Text variant="label">{c.symptomsTitle}</Text>
      <View style={styles.chips}>
        <Chip label={c.noSymptoms} selected={answers.symptoms.length === 0} onPress={() => onChange({ ...answers, symptoms: [] })} />
        {SYMPTOMS.map((s) => (
          <Chip key={s} label={c.symptoms[s]} selected={answers.symptoms.includes(s)} onPress={() => toggle(s)} />
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { gap: t.spacing.lg },
  question: { gap: t.spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
}));
