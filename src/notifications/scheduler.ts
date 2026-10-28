import { getActivePlan, listCheckins } from '@/db/guideRepo';
import { deleteFutureNotificationLogs, insertNotificationLog, lastSentOfType } from '@/db/notificationLogRepo';
import { listSessionRecords } from '@/db/sessionsRepo';
import { weekStartKey } from '@/guide/checkin';
import { currentStage } from '@/guide/plan';
import { effectiveDailyMinutes } from '@/guide/profile';
import { strings } from '@/i18n/strings';
import { addDays, studyDayKey } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';

import { categoryId, ensureChannelsAndCategories } from './channels';
import { getNotifications } from './native';
import { planNotifications, type PlanInput, type PlannedNotification } from './plan';
import type { NotificationType } from './types';

async function gatherInput(now: Date): Promise<PlanInput> {
  const { notifications, training } = useSettings.getState();
  const profile = useProfile.getState().profile;
  const [sessions, checkins, plan, lastComeback] = await Promise.all([
    listSessionRecords({ since: addDays(now, -1).toISOString() }),
    listCheckins(1),
    getActivePlan(),
    lastSentOfType('comeback', now.toISOString()),
  ]);
  const today = studyDayKey(now);
  return {
    now,
    settings: notifications,
    checkinWeekday: training.checkinWeekday,
    done: {
      trainingToday: sessions.some((s) => s.date === today && s.minutes > 0),
      checkinThisWeek: checkins[0]?.weekStart === weekStartKey(now),
    },
    lastComebackAt: lastComeback ? new Date(lastComeback) : null,
    training:
      plan && profile ? { minutes: effectiveDailyMinutes(profile), stage: strings.guide.stages[currentStage(plan).id].name } : undefined,
  };
}

async function schedule(p: PlannedNotification): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const logId = newId();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: { title: p.title, body: p.body, data: { url: p.url, type: p.type, logId }, categoryIdentifier: categoryId(p.type) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: p.type },
  });
  await insertNotificationLog({ id: logId, type: p.type, scheduledFor: p.at.toISOString(), notificationId, openedAt: null });
}

/** Cancela e reagenda os próximos 7 dias (seção 11). */
export async function rescheduleAll(): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  const now = new Date();
  const permission = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await deleteFutureNotificationLogs(now.toISOString());
  if (!permission.granted || !useSettings.getState().notifications.enabled) return 0;

  await ensureChannelsAndCategories();
  const plan = planNotifications(await gatherInput(now));
  for (const p of plan) await schedule(p);
  return plan.length;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<unknown> = Promise.resolve();
const DEBOUNCE_MS = 800;

/** Pede um reagendamento (agrupa vários pedidos seguidos num só). */
export function requestReschedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    running = running.then(() => rescheduleAll()).catch(() => 0);
  }, DEBOUNCE_MS);
}

/** "Enviar teste agora": mostra a notificação em seguida (sem entrar no histórico). */
export async function sendTestNotification(p: Omit<PlannedNotification, 'at'>): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await ensureChannelsAndCategories();
  await Notifications.scheduleNotificationAsync({
    content: { title: p.title, body: p.body, data: { url: p.url, type: p.type }, categoryIdentifier: categoryId(p.type) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: p.type },
  });
}

/** "Mais tarde (+1 h)": agenda de novo o mesmo aviso. Funciona também com o app fechado. */
export async function snooze(content: { title?: string | null; body?: string | null; data?: Record<string, unknown> }, minutes = 60): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const type = (content.data?.type as NotificationType | undefined) ?? 'training';
  await ensureChannelsAndCategories();
  await Notifications.scheduleNotificationAsync({
    content: { title: content.title ?? '', body: content.body ?? '', data: { ...content.data, logId: undefined }, categoryIdentifier: categoryId(type) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: Date.now() + minutes * 60_000, channelId: type },
  });
}
