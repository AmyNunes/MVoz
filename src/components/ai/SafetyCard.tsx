import { useState } from 'react';

import { HealthSheet } from '@/components/exercises/HealthSheet';
import { Button, Notice, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';

/** Cartão de alerta (seção 14) quando a IA marca `safetyFlag`. */
export function SafetyCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Notice tone="warning" action={<Button label={strings.ai.safetyMore} variant="secondary" onPress={() => setOpen(true)} />}>
        <Text variant="label">{strings.ai.safetyTitle}</Text>
        <Text>{strings.ai.safetyBody}</Text>
      </Notice>
      <HealthSheet visible={open} onClose={() => setOpen(false)} />
    </>
  );
}
