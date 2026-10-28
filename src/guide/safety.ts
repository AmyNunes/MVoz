import type { CheckinRecord } from './checkin';
import type { SessionRecord } from './records';

/** Regras de segurança do app (seção 14.6). */

export type SafetyAlert = 'slp-pain' | 'ent-hoarseness';

const HOURS = 3600 * 1000;
/** "Desconforto forte no último treino → no dia seguinte, treino leve." */
const LIGHT_AFTER_HOURS = 36;

const painful = (s: SessionRecord) => s.stoppedForPain || s.discomfort === 2;

/**
 * Sinais de alerta (cartão em Hoje, não bloqueia): dor em 3 treinos seguidos → fono;
 * rouquidão em 3 check-ins seguidos → otorrino. Listas com os mais recentes primeiro.
 */
export function safetyAlerts(sessions: readonly SessionRecord[], checkins: readonly CheckinRecord[]): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const last3 = sessions.slice(0, 3);
  if (last3.length === 3 && last3.every(painful)) alerts.push('slp-pain');
  const lastChecks = checkins.slice(0, 3);
  if (lastChecks.length === 3 && lastChecks.every((c) => c.answers.symptoms.includes('hoarseness'))) alerts.push('ent-hoarseness');
  return alerts;
}

/** Hoje é dia de pegar leve: desconforto forte no último treino ou semana mais leve no plano. */
export function shouldGoLight(lastSession: SessionRecord | null, lighterUntil: string | null, now: Date): boolean {
  if (lighterUntil && new Date(lighterUntil).getTime() > now.getTime()) return true;
  if (!lastSession || !painful(lastSession)) return false;
  return now.getTime() - new Date(lastSession.startedAt).getTime() <= LIGHT_AFTER_HOURS * HOURS;
}

/** Minutos treinados no dia de treino `dayKey`. */
export function minutesOn(sessions: readonly SessionRecord[], dayKey: string): number {
  return Math.round(sessions.filter((s) => s.date === dayKey).reduce((sum, s) => sum + s.minutes, 0));
}
