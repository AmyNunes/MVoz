/**
 * Datas: salvas em ISO 8601 (UTC) e exibidas no fuso do aparelho.
 * O "dia de estudo" vira numa hora configurável (padrão 04:00): estudar à 1h da
 * manhã ainda conta para o dia anterior.
 */

const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'] as const;
const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'] as const;

export function nowIso(): string {
  return new Date().toISOString();
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "2026-10-19" no fuso do aparelho. */
export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Converte "2026-10-19" em Date à meia-noite local. */
export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Chave do dia de estudo em que `date` cai, respeitando a hora de virada. */
export function studyDayKey(date: Date, rolloverHour = 4): string {
  return localDateKey(startOfStudyDay(date, rolloverHour));
}

/** Momento em que começou o dia de estudo que contém `date`. */
export function startOfStudyDay(date: Date, rolloverHour = 4): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), rolloverHour);
  if (date.getTime() < start.getTime()) start.setDate(start.getDate() - 1);
  return start;
}

/** Momento em que termina o dia de estudo que contém `date` (= início do próximo). */
export function endOfStudyDay(date: Date, rolloverHour = 4): Date {
  const end = startOfStudyDay(date, rolloverHour);
  end.setDate(end.getDate() + 1);
  return end;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

/** Primeiro instante do mês local de `date`. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Segunda-feira 00:00 da semana local de `date`. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

/** Diferença em dias de calendário entre duas chaves "AAAA-MM-DD". */
export function daysBetweenKeys(a: string, b: string): number {
  return Math.round((parseDateKey(b).getTime() - parseDateKey(a).getTime()) / DAY);
}

/** "seg, 19 out" */
export function formatShortDate(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "19 out" */
export function formatDayMonth(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** "out 2026" */
export function formatMonthYear(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** "qui, 23/10" */
export function formatWeekdayDayMonth(date: Date): string {
  return `${WEEKDAYS[date.getDay()]}, ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "08:30" */
export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function weekdayShort(dayIndex: number): string {
  return WEEKDAYS[dayIndex];
}

/** Inicial do dia da semana, começando no domingo (0). */
export function weekdayInitial(dayIndex: number): string {
  return WEEKDAY_INITIALS[dayIndex];
}

export type DayPeriod = 'morning' | 'afternoon' | 'evening';

export function dayPeriod(date: Date): DayPeriod {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'afternoon';
  return 'evening';
}

/** "08:30" → minutos desde a meia-noite. */
export function parseTimeOfDay(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

export function formatTimeOfDay(minutes: number): string {
  return `${pad(Math.floor(minutes / 60) % 24)}:${pad(minutes % 60)}`;
}
