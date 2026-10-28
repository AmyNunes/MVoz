import { usageTotalsSince } from '@/db/aiUsageRepo';
import { Card, Notice, Text, TextField } from '@/components/ui';
import type { AiSettingsForm } from '@/features/settings/useAiSettingsForm';
import { strings } from '@/i18n/strings';
import { startOfMonth } from '@/lib/dates';
import { formatUsd } from '@/lib/format';
import { useLoader } from '@/lib/useLoader';

const s = strings.settings.ai;

type Props = { form: AiSettingsForm };

/** Preços (opcionais), limite mensal e o gasto estimado do mês. */
export function CostCard({ form }: Props) {
  const { state } = useLoader(() => usageTotalsSince(startOfMonth(new Date()).toISOString()));
  const spent = state.status === 'success' ? state.data.cost : null;
  const limit = form.monthlyLimit;

  return (
    <Card title={s.costTitle}>
      <Text variant="caption" color="textMuted">
        {s.costHelper}
      </Text>
      <TextField
        label={s.inputPrice}
        value={form.cost.input}
        onChangeText={(v) => form.changeCost('input', v)}
        keyboardType="decimal-pad"
        placeholder={s.inputPricePlaceholder}
        error={form.costInvalid.input ? s.numberInvalid : undefined}
      />
      <TextField
        label={s.outputPrice}
        value={form.cost.output}
        onChangeText={(v) => form.changeCost('output', v)}
        keyboardType="decimal-pad"
        placeholder={s.outputPricePlaceholder}
        error={form.costInvalid.output ? s.numberInvalid : undefined}
      />
      <TextField
        label={s.monthlyLimit}
        value={form.cost.limit}
        onChangeText={(v) => form.changeCost('limit', v)}
        keyboardType="decimal-pad"
        placeholder={s.monthlyLimitPlaceholder}
        helper={s.monthlyLimitHelper}
        error={form.costInvalid.limit ? s.numberInvalid : undefined}
      />
      {spent != null && (
        <Text variant="label" color="textMuted">
          {limit ? s.spentOfLimit(formatUsd(spent), formatUsd(limit)) : s.spentThisMonth(formatUsd(spent))}
        </Text>
      )}
      {spent != null && limit != null && spent >= limit * 0.8 && (
        <Notice tone="warning">{s.nearLimit}</Notice>
      )}
    </Card>
  );
}
