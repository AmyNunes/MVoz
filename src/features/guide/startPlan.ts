import { insertPlan } from '@/db/guideRepo';
import type { BaselineMetrics } from '@/guide/baseline';
import { generatePlan } from '@/guide/plan';
import { effectiveDailyMinutes, type Profile } from '@/guide/profile';
import { nowIso } from '@/lib/dates';
import { useSettings } from '@/stores/settingsStore';

/**
 * "Começar este plano": salva o plano (o anterior deixa de valer), liga a faixa-alvo da
 * primeira etapa e o limite diário do perfil (seção 14.1).
 */
export async function startPlan(profile: Profile, baseline: BaselineMetrics): Promise<void> {
  const { plan } = generatePlan(profile, baseline, nowIso());
  await insertPlan(plan);
  await useSettings.getState().update('training', {
    targetEnabled: true,
    targetLowHz: plan.stageTarget.lowHz,
    targetHighHz: plan.stageTarget.highHz,
    dailyLimitMinutes: effectiveDailyMinutes(profile),
  });
}
