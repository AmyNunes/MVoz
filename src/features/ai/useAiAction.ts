import { useCallback, useEffect, useRef, useState } from 'react';

import { toAIError, type AIError } from '@/ai/client';

export type AiActionState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: AIError };

/** Uma chamada de IA disparada por um botão (explicar gravação, resumo, ajustar plano…). */
export function useAiAction<A extends unknown[], T>(call: (...args: A) => Promise<T>) {
  const [state, setState] = useState<AiActionState<T>>({ status: 'idle' });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const run = useCallback(
    async (...args: A): Promise<T | null> => {
      setState({ status: 'loading' });
      try {
        const data = await call(...args);
        if (alive.current) setState({ status: 'success', data });
        return data;
      } catch (error) {
        if (alive.current) setState({ status: 'error', error: toAIError(error) });
        return null;
      }
    },
    [call],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);
  return { state, run, reset };
}
