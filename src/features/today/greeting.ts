import { strings } from '@/i18n/strings';
import { dayPeriod, formatShortDate } from '@/lib/dates';

/** "Boa tarde" + "seg, 26 out" para o topo de Hoje. */
export function getGreeting(now: Date): { greeting: string; date: string } {
  return {
    greeting: strings.greeting[dayPeriod(now)],
    date: formatShortDate(now),
  };
}
