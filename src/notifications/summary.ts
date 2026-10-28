import type { IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { weekdayInitial, weekdayShort } from '@/lib/dates';
import type { ColorTokens } from '@/theme';

import type { NotificationSettings, NotificationType } from './types';

const c = strings.notifications.center;

/** Ícone Feather e cor de cada tipo. */
export const TYPE_ICONS: Record<NotificationType, { icon: IconName; color: keyof ColorTokens }> = {
  training: { icon: 'play-circle', color: 'primary' },
  checkin: { icon: 'clipboard', color: 'target' },
  useVoice: { icon: 'message-circle', color: 'success' },
  voiceBreak: { icon: 'coffee', color: 'warning' },
  comeback: { icon: 'sunrise', color: 'primary' },
};

const ORDER = [1, 2, 3, 4, 5, 6, 0];

export function daysLabel(days: number[]): string {
  if (days.length === 7) return c.everyDay;
  return ORDER.filter((d) => days.includes(d)).map(weekdayInitial).join(' ');
}

/** Resumo de uma linha ("19:00 · todos os dias"). */
export function typeSummary(type: NotificationType, s: NotificationSettings, checkinWeekday: number): string {
  switch (type) {
    case 'training':
      return `${s.training.time} · ${daysLabel(s.training.days)}`;
    case 'checkin':
      return c.checkinDay(weekdayShort(checkinWeekday), s.checkin.time);
    case 'useVoice':
      return `${c.perDay(s.useVoice.perDay)}, ${s.useVoice.windowStart}–${s.useVoice.windowEnd}`;
    case 'voiceBreak':
      return `${s.voiceBreak.windowStart}–${s.voiceBreak.windowEnd}`;
    case 'comeback':
      return c.afterDays(s.comeback.afterDays);
  }
}
