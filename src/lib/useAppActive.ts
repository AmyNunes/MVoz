import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Só conta como fora da tela quando o sistema diz isso; estado desconhecido (ao abrir) conta como na frente. */
function isActive(state: string | null | undefined): boolean {
  return state !== 'background' && state !== 'inactive';
}

/** `true` enquanto o app está na frente; `false` em segundo plano ou com a tela bloqueada. */
export function useAppActive(): boolean {
  const [active, setActive] = useState(() => isActive(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(isActive(state)));
    return () => subscription.remove();
  }, []);

  return active;
}
