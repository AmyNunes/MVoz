import { useEffect, useRef, useState } from 'react';

import { testConnection, toAIError } from '@/ai/client';
import { Button, Notice, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';

const s = strings.settings.ai;

type TestState =
  | { status: 'idle' }
  | { status: 'testing'; startedAt: number }
  | { status: 'ok'; model: string }
  | { status: 'error'; message: string; providerMessage: string | null };

type Props = {
  /** Salva o que estiver pendente antes de testar. */
  beforeTest: () => Promise<void>;
};

/** "Testar conexão": faz uma chamada real e mostra "Conectado: modelo X" ou o erro em PT. */
export function ConnectionTest({ beforeTest }: Props) {
  const [state, setState] = useState<TestState>({ status: 'idle' });

  const [seconds, setSeconds] = useState(0);
  const controller = useRef<AbortController | null>(null);

  // Mostra os segundos passando: modelos que "pensam" podem levar um tempo.
  useEffect(() => {
    if (state.status !== 'testing') return;
    const { startedAt } = state;
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async () => {
    controller.current = new AbortController();
    setSeconds(0);
    setState({ status: 'testing', startedAt: Date.now() });
    try {
      await beforeTest();
      const { model } = await testConnection(controller.current.signal);
      setState({ status: 'ok', model });
    } catch (error) {
      const e = toAIError(error);
      if (e.kind === 'cancelled') setState({ status: 'idle' });
      else setState({ status: 'error', message: e.messagePt, providerMessage: e.providerMessage });
    }
  };

  return (
    <>
      <Button
        label={state.status === 'testing' ? s.testingFor(seconds) : s.test}
        icon="zap"
        size="main"
        loading={state.status === 'testing'}
        onPress={run}
      />
      {state.status === 'testing' && (
        <Button label={strings.common.cancel} icon="x" variant="ghost" onPress={() => controller.current?.abort()} />
      )}
      {state.status === 'ok' && <Notice tone="success">{s.connected(state.model)}</Notice>}
      {state.status === 'error' && (
        <Notice tone="error">
          <Text variant="label">{state.message}</Text>
          {state.providerMessage ? (
            <Text variant="caption" color="textMuted">
              {s.providerSaid(state.providerMessage)}
            </Text>
          ) : null}
        </Notice>
      )}
    </>
  );
}
