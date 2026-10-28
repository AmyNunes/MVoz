import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import type { TaskResults } from '@/components/guide/RecordingTasks';
import { BASELINE_TASKS, CHECKIN_TASKS } from '@/guide/baseline';
import { fullRecordingDue, type CheckinAnswers, type CheckinMetrics, type Decision } from '@/guide/checkin';
import { loadPlanOverview } from '@/features/plan/usePlanOverview';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { showSnackbar } from '@/stores/snackbarStore';

import { useAiAction } from '../ai/useAiAction';

import { checkinMetricsFrom, evaluateCheckin, type CheckinOutcome } from './evaluate';
import { openBeforeAfter } from './beforeAfter';
import { saveCheckin } from './save';
import { summarizeWeek, summaryText } from './summary';

export type CheckinStep = 'intro' | 'record' | 'questions' | 'result';

export const DEFAULT_ANSWERS: CheckinAnswers = { effort: 3, fit: 5, comfort: 5, symptoms: [] };

/** Passos do check-in: gravar → perguntas → resultado → confirmar a decisão. */
export function useCheckinFlow() {
  const loader = useLoader(() => loadPlanOverview());
  const overview = loader.state.status === 'success' ? loader.state.data : null;
  const [step, setStep] = useState<CheckinStep>('intro');
  const [recorded, setRecorded] = useState<{ metrics: CheckinMetrics; recordingIds: string[]; readingId: string | null } | null>(null);
  const [answers, setAnswers] = useState<CheckinAnswers>(DEFAULT_ANSWERS);
  const [outcome, setOutcome] = useState<CheckinOutcome | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [saving, setSaving] = useState(false);
  const summary = useAiAction(summarizeWeek);
  // Uma vez por mês, o check-in vira a regravação completa (seção 9.4).
  const full = overview ? fullRecordingDue(overview.lastFullAt, new Date()) : false;

  const onRecorded = (results: TaskResults) => {
    if (!overview) return;
    const frames = Object.fromEntries(Object.entries(results).map(([kind, r]) => [kind, r?.frames ?? []]));
    const metrics = checkinMetricsFrom(frames, { band: overview.plan.stageTarget, floorHz: overview.context.floorHz });
    const recordingIds = Object.values(results).flatMap((r) => (r?.recordingId ? [r.recordingId] : []));
    setRecorded({ metrics, recordingIds, readingId: results.reading?.recordingId ?? null });
    setStep('questions');
  };

  const showResult = () => {
    if (!overview || !recorded) return;
    const result = evaluateCheckin(overview, { metrics: recorded.metrics, answers, now: new Date() });
    setOutcome(result);
    setDecision(result.decision);
    setStep('result');
  };

  const confirm = async () => {
    if (!overview || !recorded || !outcome || !decision) return;
    setSaving(true);
    try {
      const { change, bandRaised } = await saveCheckin({
        overview,
        metrics: recorded.metrics,
        answers,
        decision,
        raiseBand: outcome.raiseBand,
        recordingIds: recorded.recordingIds,
        summaryPt: summary.state.status === 'success' ? summaryText(summary.state.data) : '',
        now: new Date(),
      });
      const c = strings.checkin;
      showSnackbar(bandRaised ? c.bandRaised(Math.round(change.stageTarget.lowHz), Math.round(change.stageTarget.highHz)) : c.saved);
      router.back();
    } catch {
      showSnackbar(strings.checkin.saveError);
      setSaving(false);
    }
  };

  /** "Resumo com IA": explica os números; a decisão continua das regras do app. */
  const { run: runSummary } = summary;
  const summarize = useCallback(() => {
    if (outcome && decision) void runSummary({ outcome, answers, decision });
  }, [outcome, decision, answers, runSummary]);

  return {
    ...loader,
    overview,
    full,
    tasks: full ? BASELINE_TASKS : CHECKIN_TASKS,
    step,
    start: () => setStep('record'),
    onRecorded,
    answers,
    setAnswers,
    showResult,
    outcome,
    decision,
    setDecision,
    saving,
    confirm,
    summary: summary.state,
    summarize,
    /** Regravação mensal: dá para ouvir a leitura do início contra a de hoje. */
    beforeAfter: full && recorded?.readingId ? () => void openBeforeAfter(recorded.readingId ?? '').catch(() => false) : null,
  };
}
