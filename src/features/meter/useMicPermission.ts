import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, type PermissionResponse } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { useAppActive } from '@/lib/useAppActive';

/**
 * - `ask`: mostrar a explicação antes do pedido do sistema (seção 7.1).
 * - `blocked`: negado de vez; só dá para liberar nas configurações do Android.
 */
export type MicPermission = 'checking' | 'ask' | 'blocked' | 'granted';

function toStatus(response: PermissionResponse): MicPermission {
  if (response.granted) return 'granted';
  return response.canAskAgain ? 'ask' : 'blocked';
}

export function useMicPermission() {
  const appActive = useAppActive();
  const [status, setStatus] = useState<MicPermission>('checking');

  // Confere de novo ao voltar para o app (ex.: depois de liberar nas configurações).
  useEffect(() => {
    if (!appActive) return;
    let alive = true;
    getRecordingPermissionsAsync().then(
      (response) => alive && setStatus(toStatus(response)),
      () => alive && setStatus('ask'),
    );
    return () => {
      alive = false;
    };
  }, [appActive]);

  const request = useCallback(async () => {
    setStatus(toStatus(await requestRecordingPermissionsAsync()));
  }, []);

  const openSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  return { status, request, openSettings };
}
