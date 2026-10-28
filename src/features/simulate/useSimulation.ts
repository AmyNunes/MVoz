import { useCallback, useEffect, useState } from 'react';

import { toAIError, type AIError } from '@/ai/client';
import { simulateExercise } from '@/ai/functions/simulate';
import { loadUserContext } from '@/features/ai/userContext';
import type { Simulation } from '@/ai/schemas/simulate';
import type { Exercise } from '@/exercises/model';
import { useTargetBand } from '@/features/meter/useTargetBand';

export type SimulationState =
  | { status: 'loading' }
  | { status: 'success'; data: Simulation; cached: boolean }
  | { status: 'error'; error: AIError };

/** Simulação do exercício com IA (seção 10.5), com a dúvida "Ainda não entendi…". */
export function useSimulation(exercise: Exercise) {
  const { band } = useTargetBand();
  const low = band?.lowHz ?? null;
  const high = band?.highHz ?? null;
  const [request, setRequest] = useState({ doubt: '', attempt: 0 });
  const [state, setState] = useState<SimulationState>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    const currentBand = low !== null && high !== null ? { lowHz: low, highHz: high } : null;
    // A curva tem que caber na extensão medida no Guia (+ 2 semitons); sem Guia, na faixa.
    loadUserContext()
      .catch(() => null)
      .then((ctx) => {
        const extension = ctx?.start ? { lowHz: ctx.start.minHz, highHz: ctx.start.maxHz } : null;
        return simulateExercise({ exercise, band: currentBand, extension, doubt: request.doubt, ctx });
      })
      .then(
        (result) => alive && setState({ status: 'success', ...result }),
        (error: unknown) => alive && setState({ status: 'error', error: toAIError(error) }),
      );
    return () => {
      alive = false;
    };
  }, [exercise, request, low, high]);

  const ask = useCallback((doubt: string) => {
    setState({ status: 'loading' });
    setRequest((r) => ({ doubt: doubt.trim(), attempt: r.attempt + 1 }));
  }, []);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setRequest((r) => ({ ...r, attempt: r.attempt + 1 }));
  }, []);

  return { state, ask, retry, doubt: request.doubt };
}
