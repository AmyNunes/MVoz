import { router } from 'expo-router';

import type { AIError } from '@/ai/client';
import { EmptyState, ErrorState, Notice } from '@/components/ui';
import { strings } from '@/i18n/strings';

/** Erro de IA com mensagem amigável: "Configurar IA", "Tentar de novo" ou só o aviso. */
export function AiErrorView({ error, onRetry }: { error: AIError; onRetry: () => void }) {
  if (error.kind === 'notConfigured') {
    return <EmptyState icon="cpu" message={error.messagePt} action={{ label: strings.ai.configure, onPress: () => router.push('/settings/ai') }} />;
  }
  if (error.retryable) return <ErrorState message={error.messagePt} onRetry={onRetry} />;
  return <Notice tone="warning">{error.messagePt}</Notice>;
}
