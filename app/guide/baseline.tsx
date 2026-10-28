import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { RecordingTasks } from '@/components/guide/RecordingTasks';
import { Button, IconBadge, Notice, Screen, Text } from '@/components/ui';
import { BASELINE_TASKS } from '@/guide/baseline';
import { useBaselineSetup } from '@/features/guide/useBaselineSetup';
import { strings } from '@/i18n/strings';
import { formatShortDate } from '@/lib/dates';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles, useTheme } from '@/theme';

const b = strings.guide.baseline;

/** Gravação inicial, guiada passo a passo (seção 9.1, item 10). */
export default function BaselineScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { existing, saving, save } = useBaselineSetup();
  const [recording, setRecording] = useState(false);
  const goResult = () => router.replace('/guide/result');

  if (saving) {
    return (
      <Screen scroll={false} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text>{b.saving}</Text>
        </View>
      </Screen>
    );
  }

  if (recording) {
    return (
      <Screen scroll={false} edges={['bottom']}>
        <Stack.Screen options={{ title: b.title }} />
        <RecordingTasks
          tasks={BASELINE_TASKS}
          kind="baseline"
          onDone={async (results) => {
            const ok = await save(results).catch(() => false);
            if (ok) goResult();
            else {
              showSnackbar(b.error);
              setRecording(false);
            }
          }}
        />
      </Screen>
    );
  }

  const previous = existing.status === 'success' ? existing.data : null;
  return (
    <Screen
      edges={[]}
      footer={
        <View style={styles.footer}>
          {previous && <Button label={b.useExisting} variant="secondary" onPress={goResult} />}
          <Button label={previous ? b.redo : strings.guide.start} icon="mic" size="main" onPress={() => setRecording(true)} />
        </View>
      }
    >
      <Stack.Screen options={{ title: b.title }} />
      <View style={styles.intro}>
        <IconBadge icon="mic" size="lg" />
        <Text>{b.intro}</Text>
      </View>
      <Notice icon="volume-x">{b.tips}</Notice>
      {previous && <Text color="textMuted">{b.existing(formatShortDate(new Date(previous.createdAt)))}</Text>}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: t.spacing.md },
  intro: { gap: t.spacing.lg, paddingTop: t.spacing.lg },
  footer: { gap: t.spacing.sm },
}));
