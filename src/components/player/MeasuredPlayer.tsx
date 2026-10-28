import { useState } from 'react';

import type { Band } from '@/exercises/criteria';
import type { Exercise } from '@/exercises/model';
import type { RoutineItem } from '@/exercises/results';
import { useLiveVoice } from '@/features/meter/useLiveVoice';
import { MAX_RECORDING_SEC, useMeterRecording } from '@/features/meter/useMeterRecording';
import { useReferenceTone } from '@/features/meter/useReferenceTone';
import { bandCenter, buildDetails, createDetector, exerciseContours, resolveTarget } from '@/features/player/target';
import { useExerciseMeasure } from '@/features/player/useExerciseMeasure';
import { useStepCounter } from '@/features/player/useStepCounter';
import { feedbackHidden, usePlayerClock, usePlayerFlow, type FeedbackMode } from '@/features/player/usePlayerFlow';
import { strings } from '@/i18n/strings';
import { formatClock } from '@/lib/format';
import { showSnackbar } from '@/stores/snackbarStore';

import { ContourMeasure } from './ContourMeasure';
import { DurationMeasure } from './DurationMeasure';
import { PitchMeasure } from './PitchMeasure';
import { PlayerScaffold, type PlayerScaffoldProps } from './PlayerScaffold';
import type { PlayerTool } from './PlayerTools';
import { ResonanceMeasure } from './ResonanceMeasure';

const p = strings.player;

export type PlayerCallbacks = Pick<
  PlayerScaffoldProps,
  'onComplete' | 'onPain' | 'onExit' | 'onSwitchExercise' | 'onExplain' | 'topSlot'
>;

type Props = PlayerCallbacks & {
  exercise: Exercise;
  item?: RoutineItem;
  band: Band | null;
  /** Curva da simulação com IA, em Hz (no lugar das curvas do catálogo). */
  simulatedContour?: { t: number; hz: number }[] | null;
  /** Retorno visual inicial (o plano diminui aos poucos, seção 9.3). */
  initialFeedback?: FeedbackMode;
};

/** Player dos exercícios que usam o microfone (seção 8.3). */
export function MeasuredPlayer({ exercise, item, band, simulatedContour, initialFeedback, ...callbacks }: Props) {
  const flow = usePlayerFlow(exercise, item, initialFeedback);
  const tone = useReferenceTone();
  const live = useLiveVoice({ muted: tone.playing, enabled: flow.phase === 'running' });
  const elapsed = usePlayerClock(flow.phase === 'running' && !live.paused, exercise.maxSec, () => {
    showSnackbar(p.maxSecReached(Math.round((exercise.maxSec ?? 0) / 60)));
    flow.setPhase('finishing');
  });
  const target = resolveTarget(exercise, band);
  const contours = exerciseContours(exercise, band, simulatedContour);
  const [contourIndex, setContourIndex] = useState(0);
  const contour = contours[contourIndex]?.points;
  const counting = !!exercise.stepTargets?.length;
  const measure = useExerciseMeasure(live, () => createDetector(exercise, target, contour), String(contourIndex), !counting);
  const steps = useStepCounter(exercise, flow.step, live, () => createDetector(exercise, target, contour));
  const recorder = useMeterRecording(live, band, { kind: 'exercise', exerciseId: exercise.id });
  const state = measure.state;
  const reps = state?.reps ?? 0;
  const hidden = feedbackHidden(flow.feedback, reps);
  const summaryOnly = flow.feedback === 'summary';

  const noteHz = target.noteHz ?? (band ? bandCenter(band) : null);
  const canListen = exercise.measure === 'contour' ? !!contour : noteHz !== null && exercise.target !== 'none';
  const listen = () => {
    if (tone.playing) tone.stop();
    else if (exercise.measure === 'contour' && contour) void tone.playSpec({ kind: 'contour', points: contour });
    else if (noteHz !== null) void tone.play(noteHz);
  };

  const rec = strings.meter.record;
  const recTime = rec.elapsed(formatClock(recorder.elapsed), formatClock(MAX_RECORDING_SEC));
  const tools: PlayerTool[] = [
    {
      key: 'record',
      label: recorder.recording ? formatClock(recorder.elapsed) : rec.start,
      icon: recorder.recording ? 'square' : 'circle',
      color: 'danger',
      active: recorder.recording,
      disabled: live.paused || live.status !== 'listening',
      accessibilityLabel: recorder.recording ? `${rec.stop}, ${recTime}` : rec.start,
      onPress: recorder.toggle,
    },
    ...(canListen
      ? [
          {
            key: 'listen',
            label: exercise.measure === 'contour' ? p.listenCurve : p.listenNote,
            icon: tone.playing ? ('square' as const) : ('volume-2' as const),
            active: tone.playing,
            disabled: recorder.recording,
            onPress: listen,
          },
        ]
      : []),
  ];

  let view;
  if (exercise.measure === 'resonance') {
    view = <ResonanceMeasure exercise={exercise} reading={live.resonance} state={state} hidden={hidden} summaryOnly={summaryOnly} paused={live.paused} />;
  } else if (exercise.measure === 'contour') {
    view = contours.length > 0 && (
      <ContourMeasure items={contours} index={contourIndex} onIndexChange={setContourIndex} state={state} hidden={hidden} summaryOnly={summaryOnly} />
    );
  } else if (exercise.measure === 'duration') {
    view = <DurationMeasure exercise={exercise} state={state} hidden={hidden} summaryOnly={summaryOnly} />;
  } else {
    view = (
      <PitchMeasure
        exercise={exercise}
        readout={live.readout}
        trace={live.trace}
        target={target}
        state={state}
        hidden={hidden}
        summaryOnly={summaryOnly}
        playingTone={tone.playing}
      />
    );
  }

  return (
    <PlayerScaffold
      {...callbacks}
      exercise={exercise}
      flow={flow}
      elapsed={elapsed}
      reps={reps}
      paused={live.paused}
      onTogglePause={recorder.recording ? () => {} : live.togglePause}
      onManualRep={measure.addManualRep}
      steps={steps}
      measure={view}
      tools={tools}
      getDetails={() => buildDetails(exercise, measure.frames.current, state ?? createDetector(exercise, target).state(), target.band)}
      stopRecording={recorder.stop}
    />
  );
}
