import { useCallback, useEffect, useRef, useState } from 'react';

import type { VoiceFrame } from '@/audio/analyzer';
import type { Detector, DetectorState } from '@/exercises/criteria';
import { haptics } from '@/lib/haptics';

import type { LiveVoice } from '../meter/useLiveVoice';

/** Vibração ao entrar no alvo: só depois de 1 s fora, e no máximo 1 vez a cada 3 s (seção 4.4). */
const ENTER_AFTER_OUT_SEC = 1;
const ENTER_EVERY_SEC = 3;

type Carried = { reps: number; values: number[] };

/**
 * Liga as medidas do microfone ao critério de acerto do exercício. Guarda todas as medidas
 * (para as métricas do fim) e vibra a cada repetição e ao entrar no alvo.
 * Quando `key` muda (ex.: outra frase da curva), um detector novo começa e as repetições somam.
 */
export function useExerciseMeasure(
  live: Pick<LiveVoice, 'onFrames'>,
  createDetector: () => Detector,
  key: string,
  /** Desligado quando o exercício conta por passo (quem vibra é a contagem do passo). */
  repHaptics = true,
) {
  const { onFrames } = live;
  const factory = useRef(createDetector);
  useEffect(() => {
    factory.current = createDetector;
  });
  const frames = useRef<VoiceFrame[]>([]);
  /** Repetições e tentativas dos detectores anteriores (outras frases). */
  const previous = useRef<Carried>({ reps: 0, values: [] });
  /** Repetições marcadas à mão ("Fiz"). */
  const manual = useRef(0);
  const [state, setState] = useState<DetectorState | null>(null);

  useEffect(() => {
    const detector = factory.current();
    const before = previous.current;
    let lastReps = 0;
    let outSince: number | null = 0;
    let lastBuzz = -Infinity;

    const publish = (s: DetectorState) =>
      setState({ ...s, reps: before.reps + s.reps + manual.current, values: [...before.values, ...s.values] });
    publish(detector.state());

    const unsubscribe = onFrames((batch) => {
      frames.current.push(...batch);
      const s = detector.push(batch);
      const now = batch[batch.length - 1].t;
      if (s.reps > lastReps) {
        if (repHaptics) haptics.light();
      } else if (s.inTarget && outSince !== null && now - outSince >= ENTER_AFTER_OUT_SEC && now - lastBuzz >= ENTER_EVERY_SEC) {
        haptics.light();
        lastBuzz = now;
      }
      if (s.inTarget) outSince = null;
      else outSince ??= now;
      lastReps = s.reps;
      publish(s);
    });

    return () => {
      unsubscribe();
      const last = detector.state();
      previous.current = { reps: before.reps + last.reps, values: [...before.values, ...last.values] };
    };
  }, [onFrames, key, repHaptics]);

  const addManualRep = useCallback(() => {
    manual.current++;
    setState((s) => (s ? { ...s, reps: s.reps + 1 } : s));
    haptics.light();
  }, []);

  return { state, frames, addManualRep };
}
