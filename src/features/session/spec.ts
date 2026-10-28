import { getActivePlan } from '@/db/guideRepo';
import { getRoutine } from '@/db/routinesRepo';
import { currentStage, weekInStage } from '@/guide/plan';
import { blockCount, effectiveDailyMinutes } from '@/guide/profile';
import { buildPlanSession, type SessionVariant } from '@/guide/today';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';

import type { SessionSpec } from './useSessionRunner';

/** Parâmetros da rota `/session`: uma rotina ou o treino do plano (bloco, variante, voz de hoje). */
export type SessionParams = { routineId?: string; block?: string; variant?: string; voice?: string };

const VARIANTS: readonly SessionVariant[] = ['normal', 'minimal', 'light'];
const VOICES = ['good', 'tired', 'hoarse'] as const;

/** Monta o treino a abrir. `null` = rotina ou plano que não existe mais. */
export async function loadSessionSpec(params: SessionParams, now = new Date()): Promise<SessionSpec | null> {
  if (params.routineId) {
    const routine = await getRoutine(params.routineId);
    return routine ? { items: routine.items, origin: 'routine', routineId: routine.id } : null;
  }

  const plan = await getActivePlan();
  const profile = useProfile.getState().profile;
  if (!plan || !profile) return null;
  const variant = VARIANTS.find((v) => v === params.variant) ?? 'normal';
  const voiceToday = VOICES.find((v) => v === params.voice) ?? null;
  const minutes = effectiveDailyMinutes(profile);
  const items = buildPlanSession(currentStage(plan), {
    minutes: minutes / blockCount(minutes),
    week: weekInStage(plan.stageStartedAt, now),
    variant,
  });
  // Aquecimento obrigatório antes de tom e ressonância no treino do plano (seção 14.6).
  const required = useSettings.getState().training.mandatoryWarmup;
  return {
    items: items.map((item) => ({ ...item, required: required && item.role === 'warmup' })),
    origin: variant === 'minimal' ? 'minimal' : 'plan',
    block: params.block === '2' ? 2 : 1,
    stageIndex: plan.stageIndex,
    voiceToday,
  };
}
