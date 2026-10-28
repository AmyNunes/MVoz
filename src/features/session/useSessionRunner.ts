import { useCallback, useRef, useState } from 'react';

import type { PlayerResult } from '@/components/player/PlayerScaffold';
import { finishSession, insertExerciseResult, startSession, type SessionOrigin } from '@/db/sessionsRepo';
import { emitAppEvent } from '@/features/app/events';
import { EMPTY_RATING, type Discomfort, type RoutineItem } from '@/exercises/results';
import type { Feedback } from '@/guide/today';
import { nowIso } from '@/lib/dates';
import { strings } from '@/i18n/strings';
import { haptics } from '@/lib/haptics';
import { showSnackbar } from '@/stores/snackbarStore';

export type Outcome = 'done' | 'skipped';
export type SessionSummary = { minutes: number; done: number; skipped: number };

/** Maior desconforto do treino e o último "Como foi?" (vão para a sessão). */
export function aggregate(results: readonly PlayerResult[]) {
  const discomforts = results.flatMap((r) => (r.rating.discomfort === null ? [] : [r.rating.discomfort]));
  const feelings = results.flatMap((r) => (r.rating.feeling === null ? [] : [r.rating.feeling]));
  return {
    discomfort: discomforts.length > 0 ? (Math.max(...discomforts) as Discomfort) : null,
    feeling: feelings[feelings.length - 1] ?? null,
  };
}

/**
 * Um exercício do treino; os do plano trazem o retorno visual da semana. `required`: o
 * aquecimento obrigatório do plano (seção 14.6), que não dá para pular.
 */
export type SessionItem = RoutineItem & { feedback?: Feedback; required?: boolean };

export type SessionSpec = {
  items: readonly SessionItem[];
  origin: SessionOrigin;
  routineId?: string | null;
  block?: 1 | 2;
  stageIndex?: number | null;
  voiceToday?: 'good' | 'tired' | 'hoarse' | null;
};

/**
 * Treino do dia ou de uma rotina (seção 10.4): um exercício de cada vez. Avançar sem terminar
 * registra o exercício como pulado. A sessão é criada no primeiro resultado e fechada no fim.
 */
export function useSessionRunner(spec: SessionSpec) {
  const [startedAt] = useState(nowIso);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<number, Outcome>>({});
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const session = useRef<Promise<string> | null>(null);
  const results = useRef<PlayerResult[]>([]);
  const total = spec.items.length;

  const sessionId = useCallback(() => {
    session.current ??= startSession({
      origin: spec.origin,
      routineId: spec.routineId ?? null,
      startedAt,
      block: spec.block,
      stageIndex: spec.stageIndex,
      voiceToday: spec.voiceToday,
    });
    return session.current;
  }, [spec.origin, spec.routineId, spec.block, spec.stageIndex, spec.voiceToday, startedAt]);

  const close = useCallback(
    async (stoppedForPain: boolean) => {
      if (!session.current) return;
      const minutes = (Date.now() - new Date(startedAt).getTime()) / 60_000;
      await finishSession(await session.current, { minutes, ...aggregate(results.current), stoppedForPain });
      // Treino feito: o lembrete de hoje é cancelado (seção 11).
      emitAppEvent('sessionFinished');
    },
    [startedAt],
  );

  const record = useCallback(
    async (result: PlayerResult, outcome: Outcome) => {
      await insertExerciseResult({ ...result, sessionId: await sessionId() });
      if (outcome === 'done') results.current.push(result);
      setOutcomes((o) => ({ ...o, [index]: outcome }));
    },
    [index, sessionId],
  );

  const finish = useCallback(
    async (finalOutcomes: Record<number, Outcome>) => {
      await close(false);
      haptics.success();
      const values = Object.values(finalOutcomes);
      setSummary({
        minutes: Math.max(1, Math.round((Date.now() - new Date(startedAt).getTime()) / 60_000)),
        done: values.filter((v) => v === 'done').length,
        skipped: values.filter((v) => v === 'skipped').length,
      });
    },
    [close, startedAt],
  );

  const advance = useCallback(
    async (outcome: Outcome) => {
      const next = { ...outcomes, [index]: outcome };
      if (index >= total - 1) await finish(next);
      else setIndex(index + 1);
    },
    [finish, index, outcomes, total],
  );

  return {
    index,
    total,
    item: spec.items[index],
    outcomes,
    summary,
    /** Terminou o exercício atual. */
    complete: async (result: PlayerResult) => {
      await record(result, 'done');
      await advance('done');
    },
    /** "Próximo" ou deslizar ←: se não terminou, fica registrado como pulado. */
    next: async () => {
      if (outcomes[index] === 'done') return advance('done');
      const item = spec.items[index];
      if (item.required) return showSnackbar(strings.session.warmupRequired);
      await record(
        { exerciseId: item.exerciseId, startedAt: nowIso(), durationSec: 0, repsDone: 0, skipped: true, metrics: {}, rating: EMPTY_RATING, recordingId: null },
        'skipped',
      );
      await advance('skipped');
    },
    /** "Anterior" ou deslizar →. */
    previous: () => setIndex((i) => Math.max(0, i - 1)),
    /** "Senti dor · parar": salva o exercício e encerra o treino. */
    pain: async (result: PlayerResult) => {
      await record(result, 'done');
      await close(true);
    },
    /** Sair no meio: fecha a sessão com o que foi feito. */
    exit: () => close(false),
  };
}
