import { useEffect, useRef, useState } from 'react';

import type { Exercise } from '@/exercises/model';
import type { RoutineItem } from '@/exercises/results';
import { nowIso } from '@/lib/dates';

import { firstStep } from './tasks';

/** Retorno visual (seção 8.5): completo, parcial (1 em cada 3 tentativas sem gráfico) ou só resumo. */
export type FeedbackMode = 'full' | 'partial' | 'summary';
/** Fazendo · respondendo "Como foi?" · parou por dor. */
export type PlayerPhase = 'running' | 'finishing' | 'pain';

const TICK_MS = 250;

/** Estado do player que não depende do microfone: fase, passo atual, retorno visual, metas. */
export function usePlayerFlow(exercise: Exercise, item?: RoutineItem, initialFeedback: FeedbackMode = 'full') {
  const [phase, setPhase] = useState<PlayerPhase>('running');
  // Exercício com tarefas começa já na primeira tarefa (a preparação aparece nela como "Antes:").
  const [step, setStep] = useState(() => firstStep(exercise));
  const [feedback, setFeedback] = useState<FeedbackMode>(initialFeedback);
  const [startedAt] = useState(nowIso);

  return {
    phase,
    setPhase,
    step,
    setStep,
    feedback,
    setFeedback,
    startedAt,
    durationSec: item?.durationSec ?? exercise.durationSec,
    repsTarget: item?.reps ?? exercise.reps ?? null,
  };
}

export type PlayerFlow = ReturnType<typeof usePlayerFlow>;

/**
 * Tempo do exercício, que só corre com `active` (sem pausa e sem o "Como foi?" aberto).
 * `onLimit` é chamado uma vez quando o tempo passa de `limitSec` (ex.: sussurro, 2 min).
 */
export function usePlayerClock(active: boolean, limitSec?: number, onLimit?: () => void): number {
  const [elapsed, setElapsed] = useState(0);
  const total = useRef(0);
  const limitHit = useRef(false);
  const onLimitRef = useRef(onLimit);
  useEffect(() => {
    onLimitRef.current = onLimit;
  });

  useEffect(() => {
    if (!active) return;
    const since = Date.now();
    const base = total.current;
    const timer = setInterval(() => {
      total.current = base + (Date.now() - since) / 1000;
      setElapsed(total.current);
      if (limitSec && !limitHit.current && total.current >= limitSec) {
        limitHit.current = true;
        onLimitRef.current?.();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [active, limitSec]);

  return elapsed;
}

/** A tentativa atual fica sem gráfico? Parcial: 1 em cada 3; só resumo: todas. */
export function feedbackHidden(mode: FeedbackMode, attempt: number): boolean {
  if (mode === 'summary') return true;
  return mode === 'partial' && attempt % 3 === 2;
}
