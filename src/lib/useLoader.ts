import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useState } from 'react';

export type LoaderState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'success'; data: T };

/**
 * Carrega dados para uma tela e recarrega sempre que ela volta a aparecer.
 * - `reload()`: mostra "carregando" de novo (usado no "Tentar de novo").
 * - `refresh()`: recarrega em silêncio (usado no "puxar para atualizar").
 * `key` força recarregar quando muda (ex.: o id da tela).
 */
export function useLoader<T>(load: () => Promise<T>, key: string | number = 0) {
  const focused = useIsFocused();
  const [version, setVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<LoaderState<T>>({ status: 'loading' });
  const runLoad = useEffectEvent(load);

  useEffect(() => {
    if (!focused) return;
    let alive = true;
    runLoad().then(
      (data) => {
        if (!alive) return;
        setState({ status: 'success', data });
        setRefreshing(false);
      },
      (error: unknown) => {
        if (!alive) return;
        setState({ status: 'error', error });
        setRefreshing(false);
      },
    );
    return () => {
      alive = false;
    };
  }, [focused, version, key]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setVersion((v) => v + 1);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    setVersion((v) => v + 1);
  }, []);

  return { state, reload, refresh, refreshing };
}
