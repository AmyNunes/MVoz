import { strings } from '@/i18n/strings';

import type { NotificationType } from './types';

const n = strings.notifications;

/** Escolhe uma variação de texto de forma estável para o dia (não muda ao reagendar). */
export function pickVariant<T>(variants: readonly T[], date: Date, salt = 0): T {
  const start = new Date(date.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return variants[(dayOfYear + salt) % variants.length];
}

export type ContentParams = {
  /** Treino: minutos e etapa (só fora do texto discreto). */
  minutes?: number;
  stage?: string;
};

/**
 * Título e texto de cada tipo (seção 11). Com o texto discreto (padrão), nada de objetivo,
 * etapa ou "voz feminina/masculina": só textos neutros como "Hora do treino".
 */
export function notificationContent(
  type: NotificationType,
  date: Date,
  params: ContentParams = {},
  discreet = true,
): { title: string; body: string } {
  const title = discreet ? n.discreetTitles[type] : n.types[type];
  switch (type) {
    case 'training':
      if (!discreet && params.minutes && params.stage) return { title, body: n.texts.trainingDetailed(params.minutes, params.stage) };
      return { title, body: pickVariant(n.texts.training, date) };
    case 'checkin':
      return { title, body: pickVariant(n.texts.checkin, date) };
    case 'useVoice':
      return { title, body: pickVariant(n.texts.useVoice, date, date.getHours()) };
    case 'voiceBreak':
      return { title, body: pickVariant(n.texts.voiceBreak, date) };
    case 'comeback':
      return { title, body: pickVariant(n.texts.comeback, date) };
  }
}
