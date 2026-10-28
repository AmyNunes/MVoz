import { useEffect, useState, type ReactNode } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { GestureGuide } from '@/components/navigation/GestureGuide';
import type { NewExerciseResult } from '@/db/sessionsRepo';
import type { Exercise } from '@/exercises/model';
import { EMPTY_RATING, type ResultDetails, type ResultRating } from '@/exercises/results';
import { counterView } from '@/features/player/counter';
import { exerciseTasks, neighborTaskStep } from '@/features/player/tasks';
import { summaryLines } from '@/features/player/summary';
import type { PlayerFlow } from '@/features/player/usePlayerFlow';
import type { StepCounter } from '@/features/player/useStepCounter';
import { strings } from '@/i18n/strings';
import { useHardwareBack } from '@/lib/useHardwareBack';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

import { ExerciseTimer } from './ExerciseTimer';
import { FinishSheet } from './FinishSheet';
import { PainView } from './PainView';
import { footerAction, PlayerFooter } from './PlayerFooter';
import { PlayerHeader } from './PlayerHeader';
import { PlayerMenu } from './PlayerMenu';
import { pauseTool, PlayerTools, type PlayerTool } from './PlayerTools';
import { StepPanel } from './StepPanel';

const p = strings.player;

/** O que o player entrega no fim (a sessão é de quem chamou). */
export type PlayerResult = Omit<NewExerciseResult, 'sessionId'>;

/** Sair sem perguntar se ainda não fez nada. */
const NOTHING_DONE_SEC = 5;
/** Tempo para ver o "Tarefa feita ✓" antes de passar para a próxima. */
const AUTO_NEXT_MS = 1500;

export type PlayerScaffoldProps = {
  exercise: Exercise;
  flow: PlayerFlow;
  elapsed: number;
  reps: number;
  paused: boolean;
  onTogglePause: () => void;
  onManualRep: () => void;
  /** Contagem por passo (exercícios cujos passos pedem coisas diferentes). */
  steps: StepCounter;
  measure: ReactNode;
  /** Ferramentas além do Pausar (Gravar, Ouvir a nota). */
  tools?: readonly PlayerTool[];
  /** Ex.: a barra de progresso do treino. */
  topSlot?: ReactNode;
  getDetails: () => ResultDetails;
  stopRecording?: () => Promise<string | null>;
  onComplete: (result: PlayerResult) => Promise<void>;
  onPain: (result: PlayerResult) => void;
  onExit: () => void;
  onSwitchExercise?: (id: string) => void;
  /** "Explicar com IA" (abre a simulação do exercício). */
  onExplain?: () => void;
};

/**
 * Layout do player (seção 8.5), pensado para caber numa tela: medição (ocupa o espaço que
 * sobra) · cartão do passo com o tempo e a contagem · ferramentas · Fiz/Terminar · "Senti dor".
 */
export function PlayerScaffold(props: PlayerScaffoldProps) {
  const { exercise, flow, elapsed, reps } = props;
  const styles = useStyles();
  const [menu, setMenu] = useState(false);
  const [saving, setSaving] = useState(false);
  const [details, setDetails] = useState<ResultDetails | null>(null);
  const { steps } = props;
  const nextTask = neighborTaskStep(exerciseTasks(exercise), flow.step, 1);
  const counter = counterView({
    steps,
    reps,
    repsTarget: flow.repsTarget,
    elapsedSec: elapsed,
    durationSec: flow.durationSec,
    lastStep: nextTask === null,
    unit: exercise.repsUnit,
  });
  const done = counter.done;

  // Tarefa completada: passa sozinho para a próxima, depois de um instante para ver o ✓.
  const { completed } = steps;
  const { setStep } = flow;
  useEffect(() => {
    if (completed === 0 || nextTask === null) return;
    const timer = setTimeout(() => setStep(nextTask), AUTO_NEXT_MS);
    return () => clearTimeout(timer);
    // Só quando uma tarefa acaba de ser completada (não ao voltar para uma já feita).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completed]);
  const action = footerAction({
    steps,
    lastStep: nextTask === null,
    onNextStep: () => nextTask !== null && flow.setStep(nextTask),
    onManualRep: props.onManualRep,
  });

  const result = (rating: ResultRating, metrics: ResultDetails, recordingId: string | null): PlayerResult => ({
    exerciseId: exercise.id,
    startedAt: flow.startedAt,
    durationSec: Math.round(elapsed),
    repsDone: steps.enabled ? steps.total : reps,
    skipped: false,
    metrics,
    rating,
    recordingId,
  });

  const openFinish = () => {
    setDetails(props.getDetails());
    flow.setPhase('finishing');
  };

  const save = async (rating: ResultRating) => {
    setSaving(true);
    try {
      const recordingId = (await props.stopRecording?.()) ?? null;
      await props.onComplete(result(rating, details ?? props.getDetails(), recordingId));
    } catch {
      showSnackbar(p.saveError);
    } finally {
      setSaving(false);
    }
  };

  const pain = async () => {
    const recording = props.stopRecording?.() ?? Promise.resolve(null);
    flow.setPhase('pain');
    props.onPain(result({ ...EMPTY_RATING, discomfort: 2 }, props.getDetails(), await recording));
  };

  const requestExit = () => {
    const anything = steps.enabled ? steps.total : reps;
    if (flow.phase === 'pain' || (elapsed < NOTHING_DONE_SEC && anything === 0)) return props.onExit();
    Alert.alert(p.exitTitle, p.exitBody, [
      { text: p.exitContinue, style: 'cancel' },
      { text: p.exitDiscard, style: 'destructive', onPress: props.onExit },
      { text: p.exitSave, onPress: openFinish },
    ]);
  };
  useHardwareBack(requestExit);

  if (flow.phase === 'pain') return <PainView onBack={props.onExit} />;

  return (
    <View style={styles.flex}>
      <PlayerHeader title={exercise.name} subtitle={strings.exercises.categories[exercise.category]} onClose={requestExit} onMenu={() => setMenu(true)} />
      {props.topSlot}
      {/* Cabe numa tela; só rola se a fonte ou a tela não deixarem (os controles ficam fixos embaixo). */}
      <ScrollView style={styles.flex} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.measure}>{props.measure}</View>
        <StepPanel exercise={exercise} step={flow.step} onChange={flow.setStep}>
          <ExerciseTimer
            elapsedSec={elapsed}
            durationSec={flow.durationSec}
            progress={counter.progress}
            label={counter.label}
            note={done ? p.done : steps.stepDone ? p.stepDone : counter.holding}
            paused={props.paused}
            onTogglePause={props.onTogglePause}
          />
        </StepPanel>
        <PlayerTools tools={[pauseTool(props.paused, props.onTogglePause), ...(props.tools ?? [])]} />
      </ScrollView>
      <PlayerFooter action={action} done={done} onFinish={openFinish} onPain={pain} />

      <PlayerMenu
        visible={menu}
        onClose={() => setMenu(false)}
        exercise={exercise}
        step={flow.step}
        feedback={flow.feedback}
        onFeedbackChange={flow.setFeedback}
        onSwitchExercise={props.onSwitchExercise}
        onExplain={
          props.onExplain &&
          (() => {
            setMenu(false);
            props.onExplain?.();
          })
        }
      />
      {/* No treino, o guia do treino (deslizar) vem primeiro; este aparece no exercício avulso. */}
      <GestureGuide name="player" when={!props.topSlot} />
      <FinishSheet
        visible={flow.phase === 'finishing'}
        exercise={exercise}
        summary={details ? summaryLines(exercise, elapsed, reps, details) : []}
        saving={saving}
        onCancel={() => flow.setPhase('running')}
        onSave={save}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  body: { flexGrow: 1, gap: t.spacing.md, paddingHorizontal: t.spacing.screen, paddingTop: t.spacing.xs },
  measure: { flexGrow: 1, minHeight: t.sizes.measureMinHeight },
}));
