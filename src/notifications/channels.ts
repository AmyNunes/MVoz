import type { NotificationAction } from 'expo-notifications';

import { strings } from '@/i18n/strings';

import { getNotifications } from './native';
import { NOTIFICATION_TYPES, type NotificationType } from './types';

const a = strings.notifications.actions;

export const ACTION_OPEN = 'open';
export const ACTION_LATER = 'later';

/** Categoria (botões) de cada tipo. Sem ":" ou "-" no id. */
export const categoryId = (type: NotificationType) => `cat_${type}`;

/** Botões de cada tipo (tabela da seção 11). "Pausa para a voz" não tem botão. */
export const ACTION_LABELS: Record<NotificationType, string[]> = {
  training: [a.trainNow, a.later],
  checkin: [a.doNow],
  useVoice: [a.openMeter],
  voiceBreak: [],
  comeback: [a.start],
};

let ready = false;

/** Um canal por tipo, com o mesmo nome em PT (dá para controlar também pelo Android). */
export async function ensureChannelsAndCategories(): Promise<void> {
  const Notifications = getNotifications();
  if (ready || !Notifications) return;
  for (const type of NOTIFICATION_TYPES) {
    await Notifications.setNotificationChannelAsync(type, {
      name: strings.notifications.types[type],
      importance: type === 'training' || type === 'checkin' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
    });
    const [open, later] = ACTION_LABELS[type];
    const actions: NotificationAction[] = [];
    if (open) actions.push({ identifier: ACTION_OPEN, buttonTitle: open, options: { opensAppToForeground: true } });
    if (later) actions.push({ identifier: ACTION_LATER, buttonTitle: later, options: { opensAppToForeground: false } });
    await Notifications.setNotificationCategoryAsync(categoryId(type), actions);
  }
  ready = true;
}
