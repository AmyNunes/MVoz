import { Linking } from 'react-native';

import { getNotifications } from './native';

/** `unsupported` = rodando no Expo Go, onde as notificações não existem. */
export type PermissionState = 'granted' | 'undetermined' | 'blocked' | 'unsupported';

/** Situação da permissão de notificações (Android 13+ pede ao usuário). */
export async function notificationPermission(): Promise<PermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unsupported';
  const status = await Notifications.getPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'blocked';
}

/** Pede a permissão (depois da nossa tela de explicação). */
export async function requestNotificationPermission(): Promise<PermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unsupported';
  const status = await Notifications.requestPermissionsAsync();
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'blocked';
}

export function openSystemSettings(): void {
  void Linking.openSettings();
}
