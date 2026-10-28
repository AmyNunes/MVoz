import { useState } from 'react';

import { getActivePlan } from '@/db/guideRepo';
import { effectiveDailyMinutes, type Profile } from '@/guide/profile';
import { toProfile, type GuideDraft, type QuestionId } from '@/guide/questions';
import { strings } from '@/i18n/strings';
import { useLoader } from '@/lib/useLoader';
import { useProfile } from '@/stores/profileStore';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

/** Configurações › Sobre mim: mudar uma resposta do Guia por vez. */
export function useProfileEditor() {
  const profile = useProfile((s) => s.profile);
  const saveProfile = useProfile((s) => s.save);
  const plan = useLoader(getActivePlan);
  const [editing, setEditing] = useState<QuestionId | null>(null);
  const [draft, setDraft] = useState<GuideDraft>({});

  const persist = async (next: Profile) => {
    try {
      await saveProfile(next);
      // Minutos e experiência mudam o limite diário (seção 14.1).
      if (next.dailyMinutes !== profile?.dailyMinutes || next.experience !== profile?.experience) {
        await useSettings.getState().update('training', { dailyLimitMinutes: effectiveDailyMinutes(next) });
      }
      showSnackbar(strings.settings.profile.saved);
    } catch {
      showSnackbar(strings.common.genericError);
    }
  };

  const open = (id: QuestionId) => {
    if (!profile) return;
    setDraft(profile);
    setEditing(id);
  };

  const save = async () => {
    const next = toProfile(draft);
    setEditing(null);
    if (next) await persist(next);
  };

  const planGoal = plan.state.status === 'success' ? (plan.state.data?.goal ?? null) : null;
  return {
    profile,
    goalChanged: !!profile && planGoal !== null && planGoal !== profile.goal,
    editing,
    draft,
    change: (patch: GuideDraft) => setDraft((d) => ({ ...d, ...patch })),
    open,
    close: () => setEditing(null),
    save,
    setAiContext: (value: boolean) => profile && persist({ ...profile, aiIncludeContext: value }),
  };
}
