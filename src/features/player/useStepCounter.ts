import { useCallback, useEffect, useRef, useState } from 'react';

import type { Detector } from '@/exercises/criteria';
import type { Exercise, StepTarget } from '@/exercises/model';
import { haptics } from '@/lib/haptics';

import type { LiveVoice } from '../meter/useLiveVoice';

import { createStepDetector } from './target';

export type StepCounter = {
  /** O exercício conta por passo? (sem isso, vale o contador único do exercício). */
  enabled: boolean;
  /** Contagem do passo atual (`null` = este passo não conta). */
  target: StepTarget | null;
  count: number;
  stepDone: boolean;
  /** Todos os passos com contagem foram feitos. */
  allDone: boolean;
  /** Repetições somadas de todos os passos (vão para o resultado). */
  total: number;
  /** "Fiz": conta uma à mão no passo atual. */
  add: () => void;
  /** Quantas tarefas foram completadas (sobe a cada uma): o player passa sozinho para a próxima. */
  completed: number;
  /**
   * A repetição em andamento, que ainda não contou: segundos segurados ("uuu" por N s) ou
   * semitons do deslize atual. 0 = nenhuma.
   */
  current: number;
};

/** Mudanças menores que isso (segundos ou semitons) não redesenham a tela. */
const CURRENT_STEP = 0.1;

/**
 * Contagem por passo (ex.: canudo: 3 "uuu" de 5 s, depois 5 deslizes). Ouve o microfone só
 * para o passo atual, guarda a contagem de cada passo e vibra a cada uma e ao completar.
 * `live = null` (exercício sem microfone): só o "Fiz".
 */
export function useStepCounter(
  exercise: Exercise,
  step: number,
  live: Pick<LiveVoice, 'onFrames'> | null,
  createMain: () => Detector,
): StepCounter {
  const targets = exercise.stepTargets ?? [];
  const target = targets.find((t) => t.step === step) ?? null;
  const [counts, setCounts] = useState<Record<number, number>>({});
  const countsRef = useRef<Record<number, number>>({});
  const [current, setCurrent] = useState(0);
  const [completed, setCompleted] = useState(0);
  const main = useRef(createMain);
  useEffect(() => {
    main.current = createMain;
  });

  const bump = useCallback((index: number, reps: number, by: number) => {
    const before = countsRef.current[index] ?? 0;
    countsRef.current = { ...countsRef.current, [index]: before + by };
    setCounts(countsRef.current);
    if (before < reps && before + by >= reps) {
      haptics.success();
      setCompleted((n) => n + 1);
    } else haptics.light();
  }, []);

  const onFrames = live?.onFrames ?? null;
  const counting = target && target.count !== 'manual' ? target : null;
  useEffect(() => {
    if (!onFrames || !counting) return;
    const detector = createStepDetector(counting, () => main.current());
    let last = 0;
    let shown = 0;
    const unsubscribe = onFrames((batch) => {
      const s = detector.push(batch);
      if (s.reps > last) {
        bump(counting.step, counting.reps, s.reps - last);
        last = s.reps;
      }
      // "Segurando: 3,2 s de 5 s" / "Deslize agora: 3,2 de 5 semitons": só enquanto não contou.
      const now =
        s.progress >= 1
          ? 0
          : counting.count === 'sound' || counting.count === 'voice'
            ? s.currentSec
            : counting.count === 'glide'
              ? s.progress * (counting.minRangeSt ?? 5)
              : 0;
      if (Math.abs(now - shown) >= CURRENT_STEP || (now === 0 && shown !== 0)) {
        shown = now;
        setCurrent(now);
      }
    });
    return () => {
      unsubscribe();
      setCurrent(0);
    };
  }, [onFrames, counting, bump]);

  const add = useCallback(() => {
    if (target) bump(target.step, target.reps, 1);
  }, [target, bump]);

  const count = target ? (counts[target.step] ?? 0) : 0;
  return {
    enabled: targets.length > 0,
    target,
    count,
    stepDone: target !== null && count >= target.reps,
    allDone: targets.length > 0 && targets.every((t) => t.optional || (counts[t.step] ?? 0) >= t.reps),
    total: Object.values(counts).reduce((sum, n) => sum + n, 0),
    completed,
    add,
    current: target && target.count !== 'main' && target.count !== 'manual' ? current : 0,
  };
}
