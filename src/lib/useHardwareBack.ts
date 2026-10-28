import { useEffect, useRef } from 'react';
import { BackHandler } from 'react-native';

/** Botão Voltar do Android chama `onBack` (sempre a versão mais nova) no lugar de sair direto. */
export function useHardwareBack(onBack: () => void): void {
  const ref = useRef(onBack);
  useEffect(() => {
    ref.current = onBack;
  });
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      ref.current();
      return true;
    });
    return () => sub.remove();
  }, []);
}
