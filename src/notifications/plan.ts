import { addDays, formatTimeOfDay, localDateKey, parseTimeOfDay } from '@/lib/dates';

import { notificationContent, type ContentParams } from './content';
import { normalizedOrder, urlFor, type NotificationSettings, type NotificationType } from './types';

export type PlannedNotification = {
  type: NotificationType;
  at: Date;
  title: string;
  body: string;
  url: string;
};

export type PlanInput = {
  now: Date;
  settings: NotificationSettings;
  /** Dia do check-in (Configurações › Treino). */
  checkinWeekday: number;
  /** Já feito: treino hoje (o lembrete de hoje é cancelado) e check-in desta semana. */
  done: { trainingToday: boolean; checkinThisWeek: boolean };
  /** Último "Retorno gentil" enviado (no máximo 1 por semana). */
  lastComebackAt: Date | null;
  /** Para o texto do treino fora do modo discreto. */
  training?: ContentParams;
};

export const HORIZON_DAYS = 7;
/** Intervalo mínimo entre os "Use a voz hoje" do mesmo dia. */
export const WINDOW_MIN_GAP_MIN = 90;
const MIN_LEAD_MS = 60_000;
const WEEK_MS = 7 * 86_400_000;

const atTime = (day: Date, hhmm: string) => {
  const m = parseTimeOfDay(hhmm);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Math.floor(m / 60), m % 60);
};

const minutesOf = (d: Date) => d.getHours() * 60 + d.getMinutes();

/** O horário cai no silêncio? (a janela pode atravessar a meia-noite, ex.: 22:00–08:00) */
export function isInQuietHours(at: Date, quiet: NotificationSettings['quiet']): boolean {
  if (!quiet.enabled) return false;
  const m = minutesOf(at);
  const start = parseTimeOfDay(quiet.start);
  const end = parseTimeOfDay(quiet.end);
  if (start === end) return false;
  return start < end ? m >= start && m < end : m >= start || m < end;
}

/** Gerador pseudoaleatório com semente (o mesmo dia sorteia sempre os mesmos horários). */
export function seededRandom(seed: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sorteia `count` horários na janela, com pelo menos 90 min entre eles. */
export function windowTimes(windowStart: string, windowEnd: string, count: number, random: () => number): number[] {
  const start = parseTimeOfDay(windowStart);
  const end = parseTimeOfDay(windowEnd);
  const span = end - start;
  if (span <= 0) return [];
  const fits = Math.min(count, Math.floor(span / WINDOW_MIN_GAP_MIN) + 1);
  // Distribui o "tempo livre" (o que sobra além dos intervalos mínimos) ao acaso.
  const free = span - WINDOW_MIN_GAP_MIN * (fits - 1);
  const cuts = Array.from({ length: fits }, () => random() * free).sort((a, b) => a - b);
  return cuts.map((cut, i) => Math.round(start + cut + i * WINDOW_MIN_GAP_MIN));
}

/**
 * O que agendar nos próximos 7 dias (seção 11). Função pura: recebe tudo pronto e
 * devolve a lista em ordem de horário.
 */
export function planNotifications(input: PlanInput): PlannedNotification[] {
  const { now, settings: s } = input;
  if (!s.enabled || s.pausedForever) return [];
  const pausedUntil = s.pausedUntil ? new Date(s.pausedUntil) : null;
  const priority = normalizedOrder(s.order);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out: PlannedNotification[] = [];

  for (let i = 0; i < HORIZON_DAYS; i++) {
    const day = addDays(today, i);
    const weekday = day.getDay();
    const isToday = i === 0;
    const candidates: { type: NotificationType; at: Date; params?: ContentParams }[] = [];
    const random = seededRandom(localDateKey(day));

    if (s.training.enabled && s.training.days.includes(weekday) && !(isToday && input.done.trainingToday)) {
      candidates.push({ type: 'training', at: atTime(day, s.training.time), params: input.training });
    }
    // O check-in desta semana já feito cancela o aviso só até a semana virar (segunda).
    const sameWeekAsToday = i < 7 - ((today.getDay() + 6) % 7);
    if (s.checkin.enabled && weekday === input.checkinWeekday && !(sameWeekAsToday && input.done.checkinThisWeek)) {
      candidates.push({ type: 'checkin', at: atTime(day, s.checkin.time) });
    }
    if (s.useVoice.enabled && s.useVoice.days.includes(weekday)) {
      for (const m of windowTimes(s.useVoice.windowStart, s.useVoice.windowEnd, s.useVoice.perDay, random)) {
        candidates.push({ type: 'useVoice', at: atTime(day, formatTimeOfDay(m)) });
      }
    }
    if (s.voiceBreak.enabled && s.voiceBreak.days.includes(weekday)) {
      for (const m of windowTimes(s.voiceBreak.windowStart, s.voiceBreak.windowEnd, 1, random)) {
        candidates.push({ type: 'voiceBreak', at: atTime(day, formatTimeOfDay(m)) });
      }
    }
    if (s.comeback.enabled) {
      const base = s.lastOpenedAt ? new Date(s.lastOpenedAt) : now;
      const at = atTime(addDays(new Date(base.getFullYear(), base.getMonth(), base.getDate()), s.comeback.afterDays), s.comeback.time);
      const recentlySent = input.lastComebackAt && at.getTime() - input.lastComebackAt.getTime() < WEEK_MS;
      if (localDateKey(at) === localDateKey(day) && !recentlySent) candidates.push({ type: 'comeback', at });
    }

    const allowed = candidates
      .filter((c) => c.at.getTime() > now.getTime() + MIN_LEAD_MS)
      .filter((c) => !pausedUntil || c.at.getTime() >= pausedUntil.getTime())
      .filter((c) => !isInQuietHours(c.at, s.quiet))
      .sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type) || a.at.getTime() - b.at.getTime())
      .slice(0, s.maxPerDay)
      .sort((a, b) => a.at.getTime() - b.at.getTime());

    for (const c of allowed) {
      out.push({ type: c.type, at: c.at, url: urlFor(c.type), ...notificationContent(c.type, c.at, c.params, s.discreet) });
    }
  }

  return out;
}
