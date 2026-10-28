import type { NotificationResponse } from 'expo-notifications';
import { router } from 'expo-router';

import { markNotificationOpened } from '@/db/notificationLogRepo';

import { ACTION_LATER } from './channels';
import { getNotifications } from './native';
import { snooze } from './scheduler';

/** Com o app aberto, a notificação aparece normalmente (sem som). */
export function configureForegroundPresentation(): void {
  getNotifications()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const handled = new Set<string>();

/** Toque na notificação ou num botão → navega pelo deep link e registra "aberta". */
export async function handleNotificationResponse(response: NotificationResponse): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const request = response.notification.request;
  const key = `${request.identifier}:${response.actionIdentifier}`;
  if (handled.has(key)) return;
  handled.add(key);

  const data = request.content.data ?? {};
  if (response.actionIdentifier === ACTION_LATER) {
    await snooze(request.content);
    await Notifications.dismissNotificationAsync(request.identifier).catch(() => {});
    return;
  }

  if (typeof data.logId === 'string') {
    await markNotificationOpened(data.logId, new Date().toISOString()).catch(() => {});
  }
  if (typeof data.url === 'string') router.push(data.url);
  await Notifications.dismissNotificationAsync(request.identifier).catch(() => {});
}

/** Ouve os toques enquanto o app está aberto e trata o que abriu o app (início a frio). */
export function listenNotificationResponses(): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => void handleNotificationResponse(r));
  Notifications.getLastNotificationResponseAsync()
    .then(async (r) => {
      if (!r) return;
      await handleNotificationResponse(r);
      await Notifications.clearLastNotificationResponseAsync();
    })
    .catch(() => {});
  return () => sub.remove();
}
