import { router } from 'expo-router';

import { EmptyState, Notice } from '@/components/ui';
import { planBlocked } from '@/guide/profile';
import { strings } from '@/i18n/strings';
import { useProfile } from '@/stores/profileStore';

const b = strings.today.blocked;

/** Cirurgia recente sem liberação: só leitura dos exercícios (seção 14.6). */
export function BlockedNotice({ full = false }: { full?: boolean }) {
  if (full) return <EmptyState icon="lock" message={b.body} action={{ label: strings.session.back, onPress: () => router.back() }} />;
  return <Notice icon="lock">{b.body}</Notice>;
}

export const usePlanBlocked = () => useProfile((s) => planBlocked(s.profile));
