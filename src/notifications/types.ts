import { z } from 'zod';

/** Tipos de notificação (seção 11), na ordem padrão de prioridade. */
export const NOTIFICATION_TYPES = ['training', 'checkin', 'comeback', 'useVoice', 'voiceBreak'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

const time = z.string().regex(/^\d{2}:\d{2}$/);
const days = z.array(z.number().int().min(0).max(6));
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const notificationSettingsObject = z.object({
  /** Interruptor mestre. */
  enabled: z.boolean().catch(true),
  /** Pausar tudo até esta data (ISO). */
  pausedUntil: z.string().nullable().catch(null),
  /** "Até eu voltar". */
  pausedForever: z.boolean().catch(false),
  quiet: z.object({ enabled: z.boolean(), start: time, end: time }).catch({ enabled: true, start: '22:00', end: '08:00' }),
  maxPerDay: z.number().int().min(1).max(10).catch(4),
  /** Prioridade (arrastar ≡): quando passar do limite do dia, ficam os primeiros. */
  order: z.array(z.enum(NOTIFICATION_TYPES)).catch([...NOTIFICATION_TYPES]),
  /** Texto discreto: nada de objetivo nem "voz feminina/masculina" (seção 11). */
  discreet: z.boolean().catch(true),
  training: z.object({ enabled: z.boolean(), time, days }).catch({ enabled: true, time: '19:00', days: ALL_DAYS }),
  /** O dia vem de Configurações › Treino (`checkinWeekday`). */
  checkin: z.object({ enabled: z.boolean(), time }).catch({ enabled: true, time: '10:00' }),
  useVoice: z
    .object({ enabled: z.boolean(), windowStart: time, windowEnd: time, perDay: z.number().int().min(1).max(3), days })
    .catch({ enabled: false, windowStart: '10:00', windowEnd: '19:00', perDay: 1, days: ALL_DAYS }),
  voiceBreak: z
    .object({ enabled: z.boolean(), windowStart: time, windowEnd: time, days })
    .catch({ enabled: false, windowStart: '14:00', windowEnd: '17:00', days: ALL_DAYS }),
  comeback: z.object({ enabled: z.boolean(), afterDays: z.number().int().min(1).max(14), time }).catch({ enabled: true, afterDays: 3, time: '10:00' }),
  /** Última vez que o app foi aberto (para o "Retorno gentil"). */
  lastOpenedAt: z.string().nullable().catch(null),
});

export const notificationSettingsSchema = notificationSettingsObject.catch(() => notificationSettingsObject.parse({}));

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;

/** Garante que a ordem tenha todos os tipos, sem repetir. */
export function normalizedOrder(order: readonly NotificationType[]): NotificationType[] {
  return [...new Set([...order, ...NOTIFICATION_TYPES])];
}

/**
 * Destino (deep link) de cada tipo (seção 5.3). O treino abre Hoje já perguntando
 * "Como está sua voz hoje?" (seção 10.1), que vem antes do primeiro exercício.
 */
export function urlFor(type: NotificationType): string {
  switch (type) {
    case 'training':
      return '/?start=normal';
    case 'checkin':
      return '/checkin';
    case 'useVoice':
      return '/meter';
    case 'voiceBreak':
      return '/';
    case 'comeback':
      return '/?start=minimal';
  }
}
