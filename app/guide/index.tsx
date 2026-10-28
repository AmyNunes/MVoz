import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { QuestionView } from '@/components/guide/QuestionView';
import { Button, IconBadge, Notice, ProgressBar, Screen, Text } from '@/components/ui';
import { isAnswered, OPTIONAL_QUESTIONS, toProfile, visibleQuestions, type GuideDraft } from '@/guide/questions';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const t = strings.guide;

/** Guia: uma pergunta por tela, com "Pular" nas opcionais (seção 9.1). Dá para refazer quando quiser. */
export default function GuideScreen() {
  const styles = useStyles();
  const existing = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const [intro, setIntro] = useState(true);
  const [draft, setDraft] = useState<GuideDraft>(existing ?? {});
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const questions = visibleQuestions(draft);
  const id = questions[Math.min(index, questions.length - 1)];
  const last = index >= questions.length - 1;

  const next = async () => {
    if (!last) return setIndex(index + 1);
    const profile = toProfile(draft);
    if (!profile) return;
    setSaving(true);
    try {
      await save(profile);
      router.push('/guide/baseline');
    } catch {
      showSnackbar(t.saveError);
    } finally {
      setSaving(false);
    }
  };

  if (intro) {
    return (
      <Screen edges={[]} footer={<Button label={t.start} size="main" onPress={() => setIntro(false)} />}>
        <Stack.Screen options={{ title: t.title }} />
        <View style={styles.intro}>
          <IconBadge icon="compass" size="lg" />
          <Text variant="title" accessibilityRole="header">
            {t.introTitle}
          </Text>
          <Text>{t.introBody}</Text>
        </View>
        <Notice>{strings.health.disclaimer}</Notice>
      </Screen>
    );
  }

  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          {OPTIONAL_QUESTIONS.includes(id) && (
            <Button
              label={t.skip}
              variant="ghost"
              onPress={() => {
                setDraft({ ...draft, [id]: null });
                void next();
              }}
            />
          )}
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label={t.back} variant="secondary" disabled={index === 0} onPress={() => setIndex(index - 1)} />
            </View>
            <View style={styles.flex}>
              <Button label={t.next} disabled={!isAnswered(id, draft)} loading={saving} onPress={() => void next()} />
            </View>
          </View>
        </View>
      }
    >
      <Stack.Screen options={{ title: t.title }} />
      <ProgressBar progress={(index + 1) / questions.length} accessibilityLabel={t.progress(index + 1, questions.length)} />
      <Text variant="caption" color="textMuted">
        {t.progress(index + 1, questions.length)}
      </Text>
      <QuestionView id={id} draft={draft} onChange={(patch) => setDraft({ ...draft, ...patch })} />
    </Screen>
  );
}

const useStyles = makeStyles((tk) => ({
  intro: { gap: tk.spacing.lg, alignItems: 'flex-start', paddingTop: tk.spacing.lg },
  footer: { gap: tk.spacing.sm },
  row: { flexDirection: 'row', gap: tk.spacing.md },
  flex: { flex: 1 },
}));
