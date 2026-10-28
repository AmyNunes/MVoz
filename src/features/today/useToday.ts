import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { getActivePlan, getBaseline, listCheckins } from '@/db/guideRepo';
import { listRoutines } from '@/db/routinesRepo';
import { listSessionRecords } from '@/db/sessionsRepo';
import { strings } from '@/i18n/strings';
import { addDays } from '@/lib/dates';
import { useLoader } from '@/lib/useLoader';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';

import { buildToday, type TodayData } from './today';

const HISTORY_DAYS = 35;

async function loadToday(): Promise<TodayData> {
  const since = addDays(new Date(), -HISTORY_DAYS).toISOString();
  const [plan, baseline, sessions, checkins, routines] = await Promise.all([
    getActivePlan(),
    getBaseline('latest'),
    listSessionRecords({ since }),
    listCheckins(6),
    listRoutines(),
  ]);
  return { plan, baseline: baseline?.metrics ?? null, sessions, checkins, routines };
}

export type StartRequest = { block: 1 | 2; variant: 'normal' | 'minimal' };

/** Tela Hoje (seção 10.1): dados, o que mostrar e o começo do treino (voz de hoje e limite). */
export function useToday() {
  const profile = useProfile((s) => s.profile);
  const limit = useSettings((s) => s.training.dailyLimitMinutes);
  const loader = useLoader(loadToday);
  const [asking, setAsking] = useState<StartRequest | null>(null);
  const [resting, setResting] = useState(false);
  const view = loader.state.status === 'success' ? buildToday(profile, loader.state.data, { dailyLimitMinutes: limit, now: new Date() }) : null;

  /** Começar: passa pelo limite diário e pelo "Como está sua voz hoje?". */
  const requestStart = useCallback(
    (request: StartRequest) => {
      const ask = () => setAsking(request);
      if (!view?.limitReached) return ask();
      Alert.alert(strings.today.limit.title, strings.today.limit.body(view.minutesToday, limit), [
        { text: strings.today.limit.rest, style: 'cancel' },
        { text: strings.today.limit.go, onPress: ask },
      ]);
    },
    [view, limit],
  );

  /** Bem → treino normal; Cansada → leve; Rouca ou doente → sem treino, só orientações. */
  const answerVoice = useCallback(
    (voice: 'good' | 'tired' | 'hoarse') => {
      const request = asking;
      setAsking(null);
      if (!request) return;
      if (voice === 'hoarse') return setResting(true);
      const variant = voice === 'tired' || view?.light ? 'light' : request.variant;
      router.push({ pathname: '/session', params: { block: String(request.block), variant, voice } });
    },
    [asking, view],
  );

  // Notificação "Treinar agora" ou "Retorno gentil": abre já perguntando a voz de hoje.
  const { start } = useLocalSearchParams<{ start?: string }>();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!start || !view || handled.current === start) return;
    handled.current = start;
    router.setParams({ start: undefined });
    if (view.blocked || view.blocks.length === 0) return;
    const block = view.blocks.find((b) => !b.done)?.block ?? 1;
    requestStart({ block, variant: start === 'minimal' ? 'minimal' : 'normal' });
  }, [start, view, requestStart]);

  const startRoutine = useCallback(() => {
    if (view?.routine) router.push({ pathname: '/session', params: { routineId: view.routine.id } });
  }, [view]);

  return {
    ...loader,
    profile,
    view,
    plan: loader.state.status === 'success' ? loader.state.data.plan : null,
    asking: asking !== null,
    cancelAsk: () => setAsking(null),
    resting,
    dismissRest: () => setResting(false),
    requestStart,
    answerVoice,
    startRoutine,
  };
}
