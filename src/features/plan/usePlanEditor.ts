import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { getActivePlan, getBaseline, insertPlanEvent, updatePlanProgress, updatePlanStages } from '@/db/guideRepo';
import { currentStage } from '@/guide/plan';
import { effectiveDailyMinutes } from '@/guide/profile';
import { applyDecision } from '@/guide/progression';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

const e = strings.plan.editor;

async function loadPlan() {
  const [plan, baseline] = await Promise.all([getActivePlan(), getBaseline('latest')]);
  return plan && baseline ? { plan, baseline: baseline.metrics } : null;
}

/** Editar plano (seção 9.5): exercícios da etapa, minutos por dia e voltar uma etapa. */
export function usePlanEditor() {
  const loader = useLoader(loadPlan);
  const profile = useProfile((s) => s.profile);
  const saveProfile = useProfile((s) => s.save);
  const [exercises, setExercises] = useState<string[] | null>(null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const data = loader.state.status === 'success' ? loader.state.data : null;
  const stage = data ? currentStage(data.plan) : null;
  const list = exercises ?? stage?.exercises ?? [];

  const add = (id: string) => setExercises(list.includes(id) ? list : [...list, id]);
  const remove = (id: string) => setExercises(list.filter((x) => x !== id));

  const save = async () => {
    if (!data || !stage) return;
    if (list.length === 0) return showSnackbar(e.minExercises);
    setSaving(true);
    try {
      if (exercises) {
        const stages = data.plan.stages.map((s, i) => (i === data.plan.stageIndex ? { ...s, exercises } : s));
        await updatePlanStages(data.plan.id, stages);
        await insertPlanEvent({ planId: data.plan.id, kind: 'edit', fromStage: data.plan.stageIndex, toStage: data.plan.stageIndex, note: 'exercises' });
      }
      if (minutes !== null && profile) {
        const next = { ...profile, dailyMinutes: minutes };
        await saveProfile(next);
        await useSettings.getState().update('training', { dailyLimitMinutes: effectiveDailyMinutes(next) });
      }
      showSnackbar(e.saved);
      router.back();
    } catch {
      showSnackbar(strings.common.genericError);
      setSaving(false);
    }
  };

  const goBack = () => {
    if (!data || data.plan.stageIndex === 0) return;
    const previous = strings.guide.stages[data.plan.stages[data.plan.stageIndex - 1].id].name;
    Alert.alert(e.backTitle, e.backBody(previous), [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: e.back,
        onPress: async () => {
          try {
            const change = applyDecision(data.plan, 'back', { baseline: data.baseline, raiseBand: false, now: new Date() });
            await updatePlanProgress(data.plan.id, change);
            await insertPlanEvent({ planId: data.plan.id, kind: 'back', fromStage: data.plan.stageIndex, toStage: change.stageIndex });
            setExercises(null);
            showSnackbar(e.backDone);
            loader.reload();
          } catch {
            showSnackbar(strings.common.genericError);
          }
        },
      },
    ]);
  };

  return {
    ...loader,
    plan: data?.plan ?? null,
    stage,
    exercises: list,
    add,
    remove,
    minutes: minutes ?? profile?.dailyMinutes ?? null,
    setMinutes,
    dirty: exercises !== null || minutes !== null,
    saving,
    save,
    goBack,
  };
}
