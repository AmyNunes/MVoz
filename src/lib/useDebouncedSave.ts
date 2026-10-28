import { useCallback, useEffect, useMemo, useRef } from 'react';

/**
 * Salva automaticamente um pouco depois da última mudança.
 * Se a tela fechar antes, salva na hora (nada se perde).
 */
export function useDebouncedSave<T>(save: (value: T) => Promise<void>, delayMs = 600) {
  const saveRef = useRef(save);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = pending.current;
    pending.current = null;
    if (next) await saveRef.current(next.value);
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delayMs);
    },
    [flush, delayMs],
  );

  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return useMemo(() => ({ schedule, flush }), [schedule, flush]);
}
