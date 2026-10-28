import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { adjustPlan } from '@/ai/functions/adjustPlan';
import type { PlanChangeSuggestion } from '@/ai/schemas/adjustPlan';
import { getActivePlan, insertPlanEvent, updatePlanStages } from '@/db/guideRepo';
import { applyStageEdits } from '@/guide/edits';
import type { Plan } from '@/guide/plan';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

import { loadUserContext } from '../ai/userContext';
import { useAiAction } from '../ai/useAiAction';

/** Etapas que a IA pode mudar: a atual e as próximas. */
export function editableStages(plan: Plan) {
  return plan.stages
    .map((s, index) => ({ index, name: strings.guide.stages[s.id].name, exercises: s.exercises, fixed: s.measureExerciseId }))
    .filter((s) => s.index >= plan.stageIndex);
}

/** "Ajustar com IA" (seção 9.5): pedido em texto → mudanças sugeridas → eu escolho e aplico. */
export function usePlanAdjust() {
  const plan = useLoader(getActivePlan);
  const current = plan.state.status === 'success' ? plan.state.data : null;
  const [request, setRequest] = useState('');
  const [rejected, setRejected] = useState<number[]>([]);
  const [applying, setApplying] = useState(false);

  const call = useCallback(async (p: Plan, text: string) => adjustPlan({ stages: editableStages(p), request: text }, await loadUserContext()), []);
  const ai = useAiAction(call);
  const changes: PlanChangeSuggestion[] = ai.state.status === 'success' ? ai.state.data.changes : [];
  const accepted = changes.filter((_, i) => !rejected.includes(i));

  const send = () => {
    if (!current || request.trim() === '') return;
    setRejected([]);
    void ai.run(current, request.trim());
  };

  const apply = async () => {
    if (!current || accepted.length === 0) return;
    setApplying(true);
    try {
      await updatePlanStages(current.id, applyStageEdits(current.stages, accepted));
      await insertPlanEvent({ planId: current.id, kind: 'edit', fromStage: current.stageIndex, toStage: current.stageIndex, note: 'ai' });
      showSnackbar(strings.ai.adjust.applied);
      router.back();
    } catch {
      showSnackbar(strings.common.genericError);
      setApplying(false);
    }
  };

  return {
    plan,
    current,
    request,
    setRequest,
    send,
    ai: ai.state,
    changes,
    isAccepted: (i: number) => !rejected.includes(i),
    toggle: (i: number) => setRejected((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i])),
    acceptedCount: accepted.length,
    applying,
    apply,
  };
}
