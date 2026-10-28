import { useKeepAwake } from 'expo-keep-awake';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import { MicPermission } from '@/components/meter/MicPermission';
import { PitchReadout } from '@/components/meter/PitchReadout';
import { ReadingCard } from '@/components/player/ReadingCard';
import { Button, Notice, ProgressBar, Text } from '@/components/ui';
import type { RecordingKind } from '@/db/recordingsRepo';
import type { RecordingTask, TaskKind } from '@/guide/baseline';
import { hasEnoughVoice, useTaskRecorder, type TaskResult } from '@/features/guide/useTaskRecorder';
import { useLiveVoice } from '@/features/meter/useLiveVoice';
import { useMicPermission } from '@/features/meter/useMicPermission';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles, useTheme } from '@/theme';

const tk = strings.guide.tasks;

export type TaskResults = Partial<Record<TaskKind, TaskResult>>;

type Props = {
  tasks: readonly RecordingTask[];
  kind: RecordingKind;
  onDone: (results: TaskResults) => void;
};

/** Gravações guiadas (gravação inicial e check-in): uma tarefa por vez, com o tempo na tela. */
export function RecordingTasks(props: Props) {
  useKeepAwake();
  const theme = useTheme();
  const mic = useMicPermission();
  if (mic.status === 'granted') return <TaskRunner {...props} />;
  if (mic.status === 'checking') return <ActivityIndicator color={theme.colors.primary} accessibilityLabel={strings.common.loading} />;
  return <MicPermission status={mic.status} onRequest={mic.request} onOpenSettings={mic.openSettings} />;
}

function TaskRunner({ tasks, kind, onDone }: Props) {
  const styles = useStyles();
  const live = useLiveVoice();
  const recorder = useTaskRecorder(live, kind);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<TaskResults>({});
  const [problem, setProblem] = useState(false);
  const task = tasks[index];
  const result = results[task.kind];
  const recording = recorder.active !== null;

  const finishing = useRef(false);
  const finishTask = async () => {
    if (finishing.current) return;
    finishing.current = true;
    try {
      const r = await recorder.stop().catch(() => null);
      if (!r) return showSnackbar(tk.saveError);
      // Vogais, contagem, leitura e fala precisam de voz; o deslize também.
      setProblem(!hasEnoughVoice(r.frames));
      setResults((all) => ({ ...all, [task.kind]: r }));
    } finally {
      finishing.current = false;
    }
  };

  // Para sozinha no tempo da tarefa.
  useEffect(() => {
    if (recording && recorder.elapsed >= task.seconds) void finishTask();
  });

  const start = () => {
    setProblem(false);
    recorder.start(task).catch(() => showSnackbar(tk.saveError));
  };

  const next = () => {
    if (index < tasks.length - 1) {
      setIndex(index + 1);
      setProblem(false);
    } else onDone(results);
  };

  return (
    <View style={styles.container}>
      {/* O texto e o tom rolam se não couberem; os botões ficam fixos embaixo. */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
        <ProgressBar progress={index / tasks.length} accessibilityLabel={tk.of(index + 1, tasks.length)} />
        <Text variant="caption" color="textMuted">
          {tk.of(index + 1, tasks.length)}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {tk[task.kind].title}
        </Text>
        <Text>{tk[task.kind].instruction}</Text>
        {task.textId && <ReadingCard ids={[task.textId]} />}
        <View style={styles.readout}>
          <PitchReadout readout={live.readout} />
        </View>
        {recording && <ProgressBar progress={recorder.elapsed / task.seconds} color="danger" />}
        {problem && <Notice tone="warning">{tk.noVoice}</Notice>}
        {!recording && result && !problem && (
          <Text variant="label" align="center">
            {tk.done}
          </Text>
        )}
      </ScrollView>

      <View style={styles.actions}>
        {recording ? (
          <Button label={tk.stop} icon="square" size="main" onPress={() => void finishTask()} />
        ) : result && !problem ? (
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button label={tk.redo} variant="secondary" onPress={start} />
            </View>
            <View style={styles.flex}>
              <Button label={index < tasks.length - 1 ? tk.next : tk.finish} onPress={next} />
            </View>
          </View>
        ) : (
          <Button label={problem ? tk.redo : tk.record} icon="mic" size="main" disabled={live.status !== 'listening'} onPress={start} />
        )}
        {recording && (
          <Text variant="caption" color="textMuted" align="center" accessibilityLiveRegion="polite">
            {tk.recording(Math.max(0, Math.ceil(task.seconds - recorder.elapsed)))}
          </Text>
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, paddingBottom: t.spacing.lg },
  content: { flexGrow: 1, gap: t.spacing.md, paddingHorizontal: t.spacing.screen, paddingBottom: t.spacing.md },
  readout: { flexGrow: 1, justifyContent: 'center', paddingVertical: t.spacing.md },
  actions: { gap: t.spacing.sm, paddingHorizontal: t.spacing.screen },
  row: { flexDirection: 'row', gap: t.spacing.md },
  flex: { flex: 1 },
}));
