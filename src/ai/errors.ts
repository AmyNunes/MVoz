import { strings } from '@/i18n/strings';

export type AIErrorKind =
  | 'notConfigured'
  | 'offline'
  | 'timeout'
  | 'invalidKey'
  | 'modelNotFound'
  | 'providerLimit'
  | 'dailyLimit'
  | 'noFreeQuota'
  | 'monthlyLimit'
  | 'invalidResponse'
  | 'server'
  | 'badRequest'
  | 'cancelled';

/** Erro de IA com mensagem amigável em português. */
export class AIError extends Error {
  readonly kind: AIErrorKind;
  /** O que o provedor respondeu (em inglês), para mostrar no "Testar conexão". */
  readonly providerMessage: string | null;

  constructor(kind: AIErrorKind, detail?: string, providerMessage?: string | null) {
    super(detail ? `${kind}: ${detail}` : kind);
    this.name = 'AIError';
    this.kind = kind;
    this.providerMessage = providerMessage ?? null;
  }

  get messagePt(): string {
    return strings.ai.errors[this.kind];
  }

  /** Vale a pena oferecer "Tentar de novo"? */
  get retryable(): boolean {
    return ['offline', 'timeout', 'providerLimit', 'invalidResponse', 'server'].includes(this.kind);
  }
}

export function toAIError(error: unknown): AIError {
  return error instanceof AIError ? error : new AIError('server', String(error));
}
