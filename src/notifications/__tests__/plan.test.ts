import { strings } from '@/i18n/strings';

import { notificationContent } from '../content';
import { isInQuietHours, planNotifications, seededRandom, windowTimes, WINDOW_MIN_GAP_MIN, type PlanInput } from '../plan';
import { notificationSettingsSchema, type NotificationSettings } from '../types';

const n = strings.notifications;
// Segunda-feira, 26/10/2026, 09:00 (hora local).
const NOW = new Date(2026, 9, 26, 9, 0);

const settings = (patch: Partial<NotificationSettings> = {}): NotificationSettings => ({ ...notificationSettingsSchema.parse({}), lastOpenedAt: NOW.toISOString(), ...patch });

const input = (patch: Partial<PlanInput> = {}): PlanInput => ({
  now: NOW,
  settings: settings(),
  checkinWeekday: 0,
  done: { trainingToday: false, checkinThisWeek: false },
  lastComebackAt: null,
  ...patch,
});

const ofType = (list: ReturnType<typeof planNotifications>, type: string) => list.filter((p) => p.type === type);

describe('planNotifications', () => {
  it('padrão: treino às 19:00 todo dia, check-in no domingo às 10:00, retorno gentil após 3 dias', () => {
    const plan = planNotifications(input());
    const training = ofType(plan, 'training');
    expect(training).toHaveLength(7);
    expect(training[0].at).toEqual(new Date(2026, 9, 26, 19, 0));
    expect(ofType(plan, 'checkin').map((p) => p.at)).toEqual([new Date(2026, 10, 1, 10, 0)]);
    expect(ofType(plan, 'comeback').map((p) => p.at)).toEqual([new Date(2026, 9, 29, 10, 0)]);
    expect(ofType(plan, 'useVoice')).toHaveLength(0);
    expect(ofType(plan, 'voiceBreak')).toHaveLength(0);
  });

  it('treino feito hoje cancela só o lembrete de hoje', () => {
    const training = ofType(planNotifications(input({ done: { trainingToday: true, checkinThisWeek: false } })), 'training');
    expect(training).toHaveLength(6);
    expect(training[0].at.getDate()).toBe(27);
  });

  it('check-in desta semana feito: o de domingo some', () => {
    const plan = planNotifications(input({ done: { trainingToday: false, checkinThisWeek: true } }));
    expect(ofType(plan, 'checkin')).toHaveLength(0);
  });

  it('texto discreto (padrão) não cita objetivo nem etapa; sem ele, mostra minutos e etapa', () => {
    const discreet = planNotifications(input({ training: { minutes: 15, stage: 'Ressonância' } }));
    expect(discreet[0].title).toBe(n.discreetTitles.training);
    expect(discreet[0].body).not.toMatch(/Ressonância/);
    const open = planNotifications(input({ settings: settings({ discreet: false }), training: { minutes: 15, stage: 'Ressonância' } }));
    expect(open[0].body).toBe(n.texts.trainingDetailed(15, 'Ressonância'));
  });

  it('desligado, pausado ou no silêncio: nada', () => {
    expect(planNotifications(input({ settings: settings({ enabled: false }) }))).toHaveLength(0);
    expect(planNotifications(input({ settings: settings({ pausedForever: true }) }))).toHaveLength(0);
    const quiet = settings({ quiet: { enabled: true, start: '18:00', end: '08:00' } });
    expect(ofType(planNotifications(input({ settings: quiet })), 'training')).toHaveLength(0);
  });

  it('máximo por dia mantém os de maior prioridade', () => {
    const s = settings({
      maxPerDay: 1,
      order: ['voiceBreak', 'training', 'checkin', 'comeback', 'useVoice'],
      voiceBreak: { enabled: true, windowStart: '14:00', windowEnd: '17:00', days: [0, 1, 2, 3, 4, 5, 6] },
    });
    const today = planNotifications(input({ settings: s })).filter((p) => p.at.getDate() === 26);
    expect(today.map((p) => p.type)).toEqual(['voiceBreak']);
  });

  it('retorno gentil: no máximo 1 por semana', () => {
    const plan = planNotifications(input({ lastComebackAt: new Date(2026, 9, 25, 10, 0) }));
    expect(ofType(plan, 'comeback')).toHaveLength(0);
  });

  it('"Treinar agora" abre Hoje perguntando a voz; check-in abre o check-in', () => {
    const plan = planNotifications(input());
    expect(ofType(plan, 'training')[0].url).toBe('/?start=normal');
    expect(ofType(plan, 'checkin')[0].url).toBe('/checkin');
  });
});

describe('janelas e silêncio', () => {
  it('sorteia horários dentro da janela, com 90 min entre eles', () => {
    const times = windowTimes('10:00', '19:00', 3, seededRandom('x'));
    expect(times).toHaveLength(3);
    expect(times[0]).toBeGreaterThanOrEqual(600);
    expect(times[2]).toBeLessThanOrEqual(1140);
    expect(times[1] - times[0]).toBeGreaterThanOrEqual(WINDOW_MIN_GAP_MIN);
  });

  it('silêncio atravessando a meia-noite', () => {
    const quiet = { enabled: true, start: '22:00', end: '08:00' };
    expect(isInQuietHours(new Date(2026, 0, 1, 23, 0), quiet)).toBe(true);
    expect(isInQuietHours(new Date(2026, 0, 1, 7, 59), quiet)).toBe(true);
    expect(isInQuietHours(new Date(2026, 0, 1, 8, 0), quiet)).toBe(false);
  });

  it('a "Pausa para a voz" não tem botões nem cita a voz treinada', () => {
    const c = notificationContent('voiceBreak', NOW);
    expect(n.texts.voiceBreak).toContain(c.body);
  });
});
